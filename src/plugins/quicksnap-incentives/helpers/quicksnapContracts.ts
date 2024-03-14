import erc20 from '../abi/erc20.json';
import quicksnap from '../abi/QuickSnap.json';
import { getTokenInfo } from './rewards';
import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import { ethers } from 'ethers';
import {
  PROPOSAL_REDUCED_QUERY,
  TOKEN_DATA_FOR_CHAIN
} from './queries';
import {
  CURRENT_SNAPSHOT_INCENTIVES,
  INCENTIVES_BY_PROPOSAL_QUERY
} from './graphQueries';
import { addIncentiveFee } from './utils';
import {useConnectButton} from "@/plugins/quicksnap-incentives/composables/onboard";
import { API_ENDPOINT } from "@/plugins/quicksnap-incentives/helpers/constants";

const { userAddress, ethersProvider, getChainInfo } = useConnectButton();

const snapshotClient = new ApolloClient({
  uri: `${import.meta.env.VITE_HUB_URL}/graphql`,
  cache: new InMemoryCache()
});

let graphClient = new ApolloClient({
  uri: getChainInfo().graphEndpoint,
  cache: new InMemoryCache()
});

const backendClient = new ApolloClient({
  uri: `${API_ENDPOINT}/graphql`,
  cache: new InMemoryCache()
});

function updateGraphEndpoint() {
  const chainData = getChainInfo();
  if (chainData?.graphEndpoint) {
    graphClient = new ApolloClient({
      uri: chainData.graphEndpoint,
      cache: new InMemoryCache()
    });
  }
}

export async function tokenData(token) {
  let success = false;
  const chainName = getChainInfo()?.coingeckoID || 'ethereum';
  try {
    let { data } = await backendClient.query({
      query: TOKEN_DATA_FOR_CHAIN,
      variables: { token, chainName }
    });
    console.log('data', data.tokenDataForChain);
    const decimals = await getDecimals(token);
    data = { ...data.tokenDataForChain, decimals };

    if (data.price > 0) {
      success = true;
    }
    return { success, ...data };
  } catch (e) {
    console.log(e);
    return {
      success,
      price: 0,
      logo: null,
      name: null,
      symbol: null,
      decimals: null
    };
  }
}

export async function addSnapshotRewardAmount(
  proposal,
  option,
  rewardAmount,
  rewardToken,
  start,
  end
) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const signer = ethersProvider.value.getSigner();
  const token = new ethers.Contract(rewardToken, erc20.abi, signer);
  const decimals = await token.decimals();
  const amount = ethers.utils.parseUnits(rewardAmount.toString(), decimals);
  const quicksnapAddress = getChainInfo()?.quicksnapAddress;

  if (quicksnapAddress) {
    const bribeContract = new ethers.Contract(
      quicksnapAddress,
      quicksnap.abi,
      signer
    );
    const tx = await bribeContract.add_reward_amount(
      proposal,
      option,
      rewardToken,
      amount,
      start,
      end
    );
    await tx.wait(1);
    console.log(tx);
  }
}

export async function getAllowance(tokenAddress, quicksnapAddress) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const signer = ethersProvider.value.getSigner();
  const token = new ethers.Contract(tokenAddress, erc20.abi, signer);
  const allowance = await token.allowance(
    await signer.getAddress(),
    quicksnapAddress.toString()
  );
  const decimals = await token.decimals();
  return ethers.utils.formatUnits(allowance, decimals);
}

export async function getRawAllowance(tokenAddress, quicksnapAddress) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const signer = ethersProvider.value.getSigner();
  const token = new ethers.Contract(tokenAddress, erc20.abi, signer);
  return await token.allowance(
    await signer.getAddress(),
    quicksnapAddress.toString()
  );
}

export async function getTokenBalance(tokenAddress) {
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const signer = ethersProvider.value.getSigner();
    const token = new ethers.Contract(tokenAddress, erc20.abi, signer);
    const balance = await token.balanceOf(await signer.getAddress());
    const decimals = await token.decimals();
    return ethers.utils.formatUnits(balance, decimals);
  } catch (e) {
    console.log(e);
    return '0';
  }
}

export async function getRawTokenBalance(tokenAddress) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const signer = ethersProvider.value.getSigner();
  const token = new ethers.Contract(tokenAddress, erc20.abi, signer);
  return await token.balanceOf(await signer.getAddress());
}

export async function getDecimals(tokenAddress) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const signer = ethersProvider.value.getSigner();
  const token = new ethers.Contract(tokenAddress, erc20.abi, signer);
  const decimals = await token.decimals();
  return parseInt(decimals);
}

export async function approveToken(tokenAddress, quicksnapAddress) {
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const signer = ethersProvider.value.getSigner();
    const token = new ethers.Contract(tokenAddress, erc20.abi, signer);

    const allowance = await token.allowance(
      userAddress.value,
      quicksnapAddress
    );

    // check allowance is bigger than 0 for USDT edge case where a user cannot set allowance if there's already an allowance
    if (
      allowance > 0 &&
      tokenAddress === '0xdAC17F958D2ee523a2206206994597C13D831ec7'
    ) {
      console.log('setting allowance back to 0 before updating allowance');
      const resetAllowanceTx = await token.approve(quicksnapAddress, 0);
      await resetAllowanceTx.wait(1);
    }

    const approveTx = await token.approve(
      quicksnapAddress,
      ethers.constants.MaxUint256
    );
    await approveTx.wait(1);
    console.log(approveTx);
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

export async function getActiveSnapshotIncentives() {
  const activeSnapshotIncentives = [];
  try {
    updateGraphEndpoint();
    const { data } = await graphClient.query({
      query: CURRENT_SNAPSHOT_INCENTIVES,
      variables: { time: Math.floor(Date.now() / 1000), skip: 0 }
    });
    const { rewardAddeds: rewards } = data;

    for (let i = 0; i < rewards.length; i++) {
      // get proposal info
      const proposalData = await snapshotClient.query({
        query: PROPOSAL_REDUCED_QUERY,
        variables: { id: rewards[i].proposal }
      });
      const { proposal } = proposalData.data;

      // get token info
      const { amount } = rewards[i];
      const { price } = await tokenData(rewards[i].reward_token);
      const tokenInfo = await getTokenInfo(rewards[i].reward_token);
      const tokendata = {
        price,
        symbol: tokenInfo.symbol,
        decimals: tokenInfo.decimals
      };
      const formattedAmount = parseFloat(
        ethers.utils.formatUnits(amount, tokenInfo.decimals)
      );
      activeSnapshotIncentives.push({
        formattedAmount: addIncentiveFee(formattedAmount),
        ...rewards[i],
        ...proposal,
        ...tokendata
      });
    }
  } catch (e) {
    console.log(e);
  }

  return activeSnapshotIncentives;
}

export async function getIncentivesForProposal(proposal, choices) {
  const incentivizedChoices = [];
  try {
    updateGraphEndpoint();
    const { data } = await graphClient.query({
      query: INCENTIVES_BY_PROPOSAL_QUERY,
      variables: { id: proposal }
    });
    const { rewardAddeds: rewards } = data;

    console.log(rewards, choices);

    for (let i = 0; i < rewards.length; i++) {
      const { amount, option, reward_token: token } = rewards[i];
      const { price } = await tokenData(token);

      const tokenContract = new ethers.Contract(
        token,
        erc20.abi,
        ethersProvider.value
      );
      const [decimals, symbol] = await Promise.all([
        tokenContract.decimals(),
        tokenContract.symbol()
      ]);
      const formattedAmount = parseFloat(
        ethers.utils.formatUnits(amount, decimals)
      );
      incentivizedChoices.push({
        // include fee in amount
        amount: addIncentiveFee(formattedAmount),
        dollarAmount: addIncentiveFee(formattedAmount * price),
        symbol,
        option:
          BigInt(option) == ethers.constants.MaxUint256
            ? 'All options'
            : choices[parseInt(option) - 1]
      });
    }

    console.log(incentivizedChoices);
    return incentivizedChoices;
  } catch (e) {
    console.log(e);
    return incentivizedChoices;
  }
}
