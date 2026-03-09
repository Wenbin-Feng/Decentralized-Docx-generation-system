import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { CHAIN_ID, CHAIN_CONFIG } from "../constants/contracts";

export function useWallet() {
  const [account, setAccount] = useState<string>("");
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [chainId, setChainId] = useState<number>(0);
  const [ethBalance, setEthBalance] = useState<bigint>(0n);

  const isConnected = !!account;
  const isCorrectChain = chainId === CHAIN_ID;

  const updateBalance = useCallback(
    async (p: ethers.BrowserProvider, addr: string) => {
      try {
        const bal = await p.getBalance(addr);
        setEthBalance(bal);
      } catch {
        /* ignore */
      }
    },
    []
  );

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert("请安装 MetaMask");
      return;
    }
    try {
      const p = new ethers.BrowserProvider(window.ethereum);
      await p.send("eth_requestAccounts", []);
      const s = await p.getSigner();
      const addr = await s.getAddress();
      const net = await p.getNetwork();

      setProvider(p);
      setSigner(s);
      setAccount(addr);
      setChainId(Number(net.chainId));
      updateBalance(p, addr);
    } catch (err) {
      console.error("Connect error:", err);
    }
  }, [updateBalance]);

  const switchWallet = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
      const p = new ethers.BrowserProvider(window.ethereum);
      const s = await p.getSigner();
      const addr = await s.getAddress();
      const net = await p.getNetwork();

      setProvider(p);
      setSigner(s);
      setAccount(addr);
      setChainId(Number(net.chainId));
      updateBalance(p, addr);
    } catch (err) {
      console.error("Switch wallet error:", err);
    }
  }, [updateBalance]);

  const disconnect = useCallback(() => {
    setAccount("");
    setProvider(null);
    setSigner(null);
    setChainId(0);
    setEthBalance(0n);
  }, []);

  const switchChain = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CHAIN_CONFIG.chainId }],
      });
    } catch (err: unknown) {
      if ((err as { code?: number })?.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [CHAIN_CONFIG],
        });
      }
    }
  }, []);

  // Listen for account/chain changes from MetaMask
  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = async (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        disconnect();
      } else {
        const newAddr = accounts[0];
        setAccount(newAddr);
        if (window.ethereum) {
          const p = new ethers.BrowserProvider(window.ethereum);
          const s = await p.getSigner();
          setProvider(p);
          setSigner(s);
          updateBalance(p, newAddr);
        }
      }
    };
    const handleChainChanged = () => window.location.reload();

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);
    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, [disconnect, updateBalance]);

  // Periodic balance refresh
  useEffect(() => {
    if (!provider || !account) return;
    updateBalance(provider, account);
    const id = setInterval(() => updateBalance(provider, account), 15000);
    return () => clearInterval(id);
  }, [provider, account, updateBalance]);

  return {
    account,
    provider,
    signer,
    chainId,
    ethBalance,
    isConnected,
    isCorrectChain,
    connect,
    disconnect,
    switchWallet,
    switchChain,
  };
}
