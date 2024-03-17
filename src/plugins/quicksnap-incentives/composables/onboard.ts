// onboard.ts
import { ref, watch } from 'vue';
import { ethers } from 'ethers';
import { useOnboard } from '@web3-onboard/vue';
import { init as onboardInit } from '@web3-onboard/vue';
import injectedModule from '@web3-onboard/injected-wallets';
import { ProviderLabel } from '@web3-onboard/injected-wallets';
import walletConnectModule from '@web3-onboard/walletconnect';
import { supportedChain } from '../helpers/supportedChains';
import {
  DEFAULT_MERKLE_ADDRESS,
  DEFAULT_QUICKSNAP_ADDRESS, DEFAULT_WEB3_RPC,
  GRAPH_ENDPOINT
} from "@/plugins/quicksnap-incentives/helpers/constants";

const injected = injectedModule({
  displayUnavailable: [ProviderLabel.MetaMask, ProviderLabel.Trust],
  filter: {
    MetaMask: true,
    inject: true,
    walletConnect: true,
    [ProviderLabel.Detected]: ['Android', 'desktop']
  },
  walletUnavailableMessage: wallet => {
    if (wallet.label === 'MetaMask') {
      return 'MetaMask is not installed. Please install it to continue.';
    } else if (wallet.label === 'WalletConnect') {
      return 'WalletConnect is not installed. Please install it to continue.';
    } else if (wallet.label === 'Trust Wallet') {
      return 'Trust is not installed. Please install it to continue.';
    }
    return `${wallet.label} is not available.`;
  },
  sort: wallets => {
    const metaMask = wallets.find(
      ({ label }) => label === ProviderLabel.MetaMask
    );
    const trustWallet = wallets.find(
      ({ label }) => label === ProviderLabel.Trust
    );

    if (metaMask && trustWallet) {
      return [
        metaMask,
        trustWallet,
        ...wallets.filter(
          ({ label }) =>
            label !== ProviderLabel.MetaMask && label !== ProviderLabel.Trust
        )
      ] as any[];
    }

    // Always return MetaMask first, regardless of whether it's detected or not
    if (metaMask) {
      return [
        metaMask,
        ...wallets.filter(({ label }) => label !== ProviderLabel.MetaMask)
      ] as any[];
    }

    // If MetaMask is not detected and TrustWallet is installed, return TrustWallet first
    if (trustWallet) {
      return [
        trustWallet,
        ...wallets.filter(({ label }) => label !== ProviderLabel.Trust)
      ] as any[];
    }

    // If neither are installed, return the original order
    return wallets;
  }
});

const appMetadata = {
  name: 'quicksnap',
  icon: 'https://ucarecdn.com/4164e416-4ec2-48e0-a42f-d88f38a8089b/-/preview/440x60/-/format/auto/-/quality/smart_retina/',
  logo: 'https://ucarecdn.com/4164e416-4ec2-48e0-a42f-d88f38a8089b/-/preview/440x60/-/format/auto/-/quality/smart_retina/',
  // logo: 'https://ucarecdn.com/e5324492-8026-4aff-93a8-b17c3ea5aeb8/-/preview/440x60/-/format/auto/-/quality/smart_retina/',
  description: 'quicksnap is successfully integrated',
  recommendedInjectedWallets: [
    { name: 'MetaMask', url: 'https://metamask.io' },
    { name: 'Trust', url: 'https://trustwallet.com/' }
  ]
};

const walletConnect = walletConnectModule({
  version: 2,
  projectId: '55f8e4a3ce3a3ad37353e8582b8db050',
  requiredChains: [1],
  dappUrl: 'https://app.quicksnap.finance'
});

const rpcUrl = DEFAULT_WEB3_RPC;

let chains;
if (import.meta.env.VITE_ENV === 'production') {
  chains = [
    {
      id: 1,
      token: 'ETH',
      label: 'Ethereum Mainnet',
      rpcUrl
    },
    {
      id: 42161,
      token: 'ARB-ETH',
      label: 'Arbitrum One',
      rpcUrl: 'https://arb1.arbitrum.io/rpc'
    },
    {
      id: 10,
      token: 'OP-ETH',
      label: 'Optimism',
      rpcUrl: 'https://mainnet.optimism.io'
    }
  ];
} else {
  chains = [
    {
      id: 1337,
      token: 'ETH',
      label: 'Local fork',
      rpcUrl
    },
    {
      id: 11155111,
      token: 'SepoliaETH',
      label: 'Ethereum Sepolia',
      rpcUrl: 'https://ethereum-sepolia.publicnode.com'
    },
    {
      id: 421614,
      token: 'ARB-ETH',
      label: 'Arbitrum Sepolia',
      rpcUrl: 'https://arbitrum-sepolia.blockpi.network/v1/rpc/public'
    },
    {
      id: 11155420,
      token: 'OP-ETH',
      label: 'Optimism Sepolia',
      rpcUrl: 'https://sepolia.optimism.io'
    }
  ];
}

onboardInit({
  appMetadata,
  wallets: [injected, walletConnect],
  chains,
  accountCenter: {
    desktop: {
      position: 'bottomRight',
      enabled: false,
      minimal: true
    },
    mobile: {
      position: 'bottomRight',
      enabled: false,
      minimal: true
    },
    hideTransactionProtectionBtn: true
  },
  connect: {
    autoConnectLastWallet: true,
    removeWhereIsMyWalletWarning: true
  }
});

export function useConnectButton() {
  const userAddress = ref('');
  const ethersProvider = ref<ethers.providers.Web3Provider>();

  const {
    connectWallet,
    connectedWallet,
    connectedChain,
    setChain,
    disconnectConnectedWallet,
    connectingWallet
  } = useOnboard();

  const connect = async () => {
    await connectWallet();
  };

  // const set = () => setChain({ wallet: 'MetaMask', chainId: '0xa4ba' });

  const setChainId = (wallet: string, chainId: string) =>
    setChain({ wallet: wallet, chainId: chainId });

  const getChainInfo = () => {
    const defaultConfig = {
      name: 'Ethereum',
      imageUrl:
        'https://s2.coinmarketcap.com/static/img/coins/200x200/1027.png',
      merkleAddress: DEFAULT_MERKLE_ADDRESS,
      quicksnapAddress: DEFAULT_QUICKSNAP_ADDRESS,
      graphEndpoint: GRAPH_ENDPOINT
    };

    const chainData = supportedChain.get(
      parseInt(connectedChain.value?.id || '0', 16)
    );
    console.log('current chain: ', chainData?.name);
    return chainData ? chainData : defaultConfig;
  };
  const disconnect = async () => {
    await disconnectConnectedWallet();
  };

  watch(connectedWallet, newWallet => {
    if (newWallet && newWallet.provider) {
      userAddress.value = newWallet.accounts[0].address;
      ethersProvider.value = new ethers.providers.Web3Provider(
        newWallet.provider,
        'any'
      );
    }
  });
  // userAddress.value = wallets?.value[0]?.accounts[0]?.address;

  return {
    connect,
    connectedWallet,
    connectedChain,
    getChainInfo,
    setChainId,
    disconnect,
    userAddress,
    ethersProvider,
    connectingWallet
  };
}