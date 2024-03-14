let supportedChain = new Map();

if (import.meta.env.VITE_ENV === 'production') {
  supportedChain = new Map([
    [
      1,
      {
        name: 'Ethereum',
        chainId: 1,
        imageUrl:
          'https://s2.coinmarketcap.com/static/img/coins/200x200/1027.png',
        merkleAddress: '0xB6f4b9EDdcc15B5b6eF2374bc91203A0086bc6B6',
        quicksnapAddress: '0xa5544006EACd0D5665033eBd721cAdF761a2BFF8',
        graphEndpoint:
          'https://api.studio.thegraph.com/query/60882/quicksnap/version/latest/'
      }
    ],
    [
      -1,
      {
        chainId: -1,
        name: ' Please connect to Ethereum Mainnet',
        imageUrl: null
      }
    ]
  ]);
} else {
  supportedChain = new Map([
    [
      1337,
      {
        name: 'local',
        chainId: 1337,
        imageUrl:
          'https://s2.coinmarketcap.com/static/img/coins/200x200/1027.png',
        merkleAddress: '0x3489745eff9525ccc3d8c648102fe2cf3485e228',
        quicksnapAddress: '0x43b9ef43d415e84ad9964567002d648b11747a8f',
        graphEndpoint: 'http://localhost:8000/subgraphs/name/quicksnap'
      }
    ],
    [
      11155111,
      {
        name: 'Sepolia',
        chainId: 11155111,
        imageUrl:
          'https://s2.coinmarketcap.com/static/img/coins/200x200/1027.png',
        merkleAddress: '0xb2fDA3e568b8658Df14712306Cc0C0A55293Dc51',
        quicksnapAddress: '0x75BB2081756833e9622B03221b096d24A42ef9e0',
        graphEndpoint:
          'https://subgraph.satsuma-prod.com/ea73c8ead780/quicks-team--4476772/quicksnap-sepolia/api',
        rpcUrl: 'https://ethereum-sepolia.publicnode.com'
      }
    ],
    [
      11155420,
      {
        name: 'optimism-sepolia',
        chainId: 11155420,
        imageUrl:
          'https://s2.coinmarketcap.com/static/img/coins/200x200/11840.png',
        merkleAddress: '0xEC8B116afB4de3F954e519E6b1b490a88571BEbA',
        quicksnapAddress: '0x421C71A62d383176763d371f95A2ebCe4724B189',
        graphEndpoint:
          'https://subgraph.satsuma-prod.com/ea73c8ead780/quicks-team--4476772/quicksnap-optimism-sepolia/api',
        rpcUrl: 'https://sepolia.optimism.io'
      }
    ],
    [
      421614,
      {
        name: 'arbitrum-sepolia',
        chainId: 421614,
        imageUrl:
          'https://s2.coinmarketcap.com/static/img/coins/200x200/11841.png',
        merkleAddress: '0xb2fDA3e568b8658Df14712306Cc0C0A55293Dc51',
        quicksnapAddress: '0x75BB2081756833e9622B03221b096d24A42ef9e0',
        graphEndpoint:
          'https://subgraph.satsuma-prod.com/a7b664722611/jiverrrs-team--4501070/quicksnap-arbitrum-sepolia/api',
        rpcUrl: 'https://arbitrum-sepolia.blockpi.network/v1/rpc/public'
      }
    ],
    [
      137,
      {
        chainId: 137,
        name: 'Polygon',
        imageUrl:
          'https://s3.coinmarketcap.com/static-gravity/image/b8db9a2ac5004c1685a39728cdf4e100.png',
        rpcUrl: 'https://polygon-rpc.com/'
      }
    ],
    [
      -1,
      {
        chainId: -1,
        name: 'Switch Network',
        imageUrl: null
      }
    ]
  ]);
}

const options = Array.from(supportedChain.values()).filter(
  option => option.chainId !== -1
);

console.log(options);
export { supportedChain, options };
