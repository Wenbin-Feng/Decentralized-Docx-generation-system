import { ethers } from "ethers";

export function formatAmount(wei: bigint, decimals = 18, displayDecimals = 4): string {
  const str = ethers.formatUnits(wei, decimals);
  const parts = str.split(".");
  if (parts.length === 1) return parts[0];
  return `${parts[0]}.${parts[1].slice(0, displayDecimals)}`;
}

export function parseAmount(amount: string, decimals = 18): bigint {
  if (!amount || amount === "" || amount === ".") return 0n;
  return ethers.parseUnits(amount, decimals);
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
