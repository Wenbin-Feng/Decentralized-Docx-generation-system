export const SZTU_TOKEN_ADDRESS =
  import.meta.env.VITE_SZTU_TOKEN_ADDRESS ||
  "0x8Cfefa0C5CB669E329f271e02c94B7eF02a72681";

export const SZTU_SWAP_ADDRESS =
  import.meta.env.VITE_SZTU_SWAP_ADDRESS || "";

export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 11155111);

export const CHAIN_CONFIG = {
  chainId: `0x${CHAIN_ID.toString(16)}`,
  chainName: "Sepolia Testnet",
  rpcUrls: [import.meta.env.VITE_RPC_URL || "https://rpc.sepolia.org"],
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
};
