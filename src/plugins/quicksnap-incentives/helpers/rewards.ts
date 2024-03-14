import { BigNumber } from '@ethersproject/bignumber';
import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import { ethers } from 'ethers';
import gql from 'graphql-tag';
import { tokenData } from './quicksnapContracts';
import erc20 from '../abi/erc20.json';
import merkle from '../abi/merkle.json';
import {useConnectButton} from "../composables/onboard"
import { API_ENDPOINT } from "@/plugins/quicksnap-incentives/helpers/constants";

const { ethersProvider, userAddress, connectedChain, getChainInfo } = useConnectButton();

export async function getRewards() {
  try {
    const claims = [];
    let claimInfo = { totalBalance: 0, totalClaimed: 0 };

    if (userAddress.value) {
      const client = new ApolloClient({
        uri: `${API_ENDPOINT}/graphql`,
        cache: new InMemoryCache()
      });

      const claimsQuery = gql`
          query rewarderewards($account: String!, $chainId: Int!) {
              claims(account: $account, chainId: $chainId) {
                  token
                  index
                  amount
                  merkleProof
              }
              claimInfo {
                  totalBalance
                  totalClaimed
              }
          }
      `;
      const { data } = await client.query({
        query: claimsQuery,
        variables: {
          account: userAddress.value,
          chainId: parseInt(connectedChain.value?.id || '0', 16)
        }
      });
      claimInfo = data.claimInfo;

      for (let i = 0; i < data.claims.length; i++) {
        const token = await getTokenInfo(data.claims[i].token);
        const tokendata = await tokenData(data.claims[i].token);
        if (token) {
          const claim = {
            version: 3,
            claimable: parseFloat(
              ethers.utils.formatUnits(data.claims[i].amount, token.decimals)
            ),
            claimableRaw: BigNumber.from(data.claims[i].amount),
            canClaim: true,
            hasClaimed: false,
            rewardToken: token,
            claimData: data.claims[i],
            rewardTokenPrice: tokendata.price,
            rewardTokenLogo: tokendata.logo
          };
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          claims.push(claim);
        }
      }
    }
    return { rewards: claims, claimInfo };
  } catch (e) {
    console.log(e);
    return [];
  }
}

export async function getTokenInfo(tokenAddress): Promise<
  | {
  address: string;
  symbol: string;
  decimals: number;
}
  | undefined
> {
  try {
    const token = new ethers.Contract(
      tokenAddress,
      erc20.abi,
      ethersProvider.value
    );

    const [symbol, decimals] = await Promise.all([
      token.symbol(),
      token.decimals()
    ]);

    return {
      address: tokenAddress,
      symbol,
      decimals: parseInt(decimals)
    };
  } catch (ex) {
    console.log('------------------------------------');
    console.log(`exception thrown in _getTokenInfo(${tokenAddress})`);
    console.log(ex);
    console.log('------------------------------------');
  }
}

export async function getTokenNameBalance(tokenAddress): Promise<
  | {
  name: string;
  symbol: string;
  balance: number;
}
  | undefined
> {
  try {
    const token = new ethers.Contract(
      tokenAddress,
      erc20.abi,
      ethersProvider.value
    );

    const [name, symbol, balance, decimals] = await Promise.all([
      token.name(),
      token.symbol(),
      token.balanceOf(userAddress.value),
      token.decimals()
    ]);

    return {
      name,
      symbol,
      balance: parseFloat(ethers.utils.formatUnits(balance, parseInt(decimals)))
    };
  } catch (ex) {
    console.log('------------------------------------');
    console.log(`exception thrown in _getTokenInfo(${tokenAddress})`);
    console.log(ex);
    console.log('------------------------------------');
  }
}

export async function claimReward(reward) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const signer = ethersProvider.value.getSigner();
  const { merkleAddress } = getChainInfo();
  const merkleContract = await new ethers.Contract(
    merkleAddress,
    merkle.abi,
    signer
  );
  const tx = await merkleContract.claim(
    reward.claimData.token,
    reward.claimData.index,
    userAddress.value,
    reward.claimData.amount,
    reward.claimData.merkleProof
  );
  await tx.wait(1);
  console.log(tx);
}

export async function claimAllRewards(rewards) {
  //prepare array
  const claims = [];
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const signer = ethersProvider.value.getSigner();
  for (let i = 0; i < rewards.length; i++) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    claims.push({
      token: rewards[i].claimData.token,
      index: rewards[i].claimData.index,
      amount: rewards[i].claimData.amount,
      merkleProof: rewards[i].claimData.merkleProof
    });
  }

  const { merkleAddress } = getChainInfo();
  const merkleContract = new ethers.Contract(merkleAddress, merkle.abi, signer);
  const tx = await merkleContract.claimMulti(userAddress.value, claims);
  await tx.wait(1);
  console.log(tx);
}