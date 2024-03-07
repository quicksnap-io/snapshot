import snapshot from '@snapshot-labs/snapshot.js';

const API_URL = 'https://api.etherscan.io/api?';
const API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY;

export async function getContractName(contract: string): Promise<any> {
  const contractNameUrl = `${API_URL}module=contract&action=getsourcecode&address=${contract}&apikey=${API_KEY}`;

  const result = await snapshot.utils.getJSON(contractNameUrl);
  return result.result[0].ContractName;
}
