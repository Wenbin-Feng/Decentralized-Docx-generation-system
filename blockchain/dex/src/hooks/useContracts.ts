import { useMemo } from "react";
import { ethers } from "ethers";
import { SZTU_TOKEN_ADDRESS, SZTU_SWAP_ADDRESS } from "../constants/contracts";
import SZTUTokenABI from "../abi/SZTUToken.json";
import SZTUSwapABI from "../abi/SZTUSwap.json";

export function useContracts(signer: ethers.Signer | null) {
  const tokenContract = useMemo(() => {
    if (!signer || !SZTU_TOKEN_ADDRESS) return null;
    return new ethers.Contract(SZTU_TOKEN_ADDRESS, SZTUTokenABI, signer);
  }, [signer]);

  const swapContract = useMemo(() => {
    if (!signer || !SZTU_SWAP_ADDRESS) return null;
    return new ethers.Contract(SZTU_SWAP_ADDRESS, SZTUSwapABI, signer);
  }, [signer]);

  return { tokenContract, swapContract };
}
