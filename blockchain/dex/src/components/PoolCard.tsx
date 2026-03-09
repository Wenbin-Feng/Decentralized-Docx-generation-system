import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import TokenInput from "./TokenInput";
import Toast, { ToastData } from "./Toast";
import { formatAmount, parseAmount } from "../utils/format";
import { SZTU_SWAP_ADDRESS } from "../constants/contracts";

interface PoolCardProps {
  swapContract: ethers.Contract | null;
  tokenContract: ethers.Contract | null;
  account: string;
  isConnected: boolean;
  isCorrectChain: boolean;
  onConnect: () => void;
  ethBalance: bigint;
}

type TxStage = "idle" | "approving" | "submitting" | "confirming";

export default function PoolCard({
  swapContract,
  tokenContract,
  account,
  isConnected,
  isCorrectChain,
  onConnect,
  ethBalance,
}: PoolCardProps) {
  const [tab, setTab] = useState<"add" | "remove">("add");
  const [ethInput, setEthInput] = useState("");
  const [sztuInput, setSztuInput] = useState("");
  const [lpInput, setLpInput] = useState("");
  const [sztuBalance, setSztuBalance] = useState<bigint>(0n);
  const [lpBalance, setLpBalance] = useState<bigint>(0n);
  const [lpTotalSupply, setLpTotalSupply] = useState<bigint>(0n);
  const [reserves, setReserves] = useState<{ eth: bigint; sztu: bigint }>({
    eth: 0n,
    sztu: 0n,
  });
  const [stage, setStage] = useState<TxStage>("idle");
  const [toast, setToast] = useState<ToastData | null>(null);

  const fetchData = useCallback(async () => {
    if (!swapContract || !tokenContract || !account) return;
    try {
      const [ethRes, sztuRes] = await swapContract.getReserves();
      setReserves({ eth: ethRes, sztu: sztuRes });
      setSztuBalance(await tokenContract.balanceOf(account));
      setLpBalance(await swapContract.balanceOf(account));
      setLpTotalSupply(await swapContract.totalSupply());
    } catch {
      /* pool might not exist yet */
    }
  }, [swapContract, tokenContract, account]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 10000);
    return () => clearInterval(id);
  }, [fetchData]);

  useEffect(() => {
    if (tab !== "add" || !ethInput || reserves.eth === 0n) {
      if (tab === "add") setSztuInput("");
      return;
    }
    const ethAmt = parseAmount(ethInput);
    if (ethAmt === 0n) {
      setSztuInput("");
      return;
    }
    if (reserves.eth === 0n) return;
    const sztuNeeded = (ethAmt * reserves.sztu) / reserves.eth;
    setSztuInput(ethers.formatEther(sztuNeeded));
  }, [ethInput, reserves, tab]);

  const withdrawEth =
    lpInput && lpTotalSupply > 0n
      ? (parseAmount(lpInput) * reserves.eth) / lpTotalSupply
      : 0n;
  const withdrawSztu =
    lpInput && lpTotalSupply > 0n
      ? (parseAmount(lpInput) * reserves.sztu) / lpTotalSupply
      : 0n;

  const handleAddLiquidity = async () => {
    if (!swapContract || !tokenContract || !ethInput || !sztuInput) return;
    try {
      const ethAmt = parseAmount(ethInput);
      const sztuAmt = parseAmount(sztuInput);

      const allowance = await tokenContract.allowance(account, SZTU_SWAP_ADDRESS);
      if (allowance < sztuAmt) {
        setStage("approving");
        setToast({ type: "info", title: "授权 SZTU", message: "请在 MetaMask 中确认授权..." });
        const approveTx = await tokenContract.approve(SZTU_SWAP_ADDRESS, sztuAmt);
        await approveTx.wait();
      }

      setStage("submitting");
      setToast({ type: "info", title: "添加流动性", message: "请在 MetaMask 中确认..." });
      const tx = await swapContract.addLiquidity(sztuAmt, { value: ethAmt });
      setStage("confirming");
      setToast({ type: "info", title: "等待链上确认", message: `Tx: ${tx.hash.slice(0, 18)}...`, txHash: tx.hash });
      await tx.wait();

      setToast({
        type: "success",
        title: "添加流动性成功",
        message: `${ethInput} ETH + ${sztuInput.slice(0, 10)} SZTU`,
        txHash: tx.hash,
      });
      setEthInput("");
      setSztuInput("");
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { reason?: string; message?: string })?.reason
        || (err as Error)?.message || "未知错误";
      setToast({ type: "error", title: "添加流动性失败", message: msg.length > 120 ? msg.slice(0, 120) + "..." : msg });
    } finally {
      setStage("idle");
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!swapContract || !lpInput) return;
    try {
      setStage("submitting");
      setToast({ type: "info", title: "移除流动性", message: "请在 MetaMask 中确认..." });
      const lpAmt = parseAmount(lpInput);
      const tx = await swapContract.removeLiquidity(lpAmt);
      setStage("confirming");
      setToast({ type: "info", title: "等待链上确认", message: `Tx: ${tx.hash.slice(0, 18)}...`, txHash: tx.hash });
      await tx.wait();

      setToast({
        type: "success",
        title: "移除流动性成功",
        message: `取回 ${formatAmount(withdrawEth)} ETH + ${formatAmount(withdrawSztu, 18, 2)} SZTU`,
        txHash: tx.hash,
      });
      setLpInput("");
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { reason?: string; message?: string })?.reason
        || (err as Error)?.message || "未知错误";
      setToast({ type: "error", title: "移除流动性失败", message: msg.length > 120 ? msg.slice(0, 120) + "..." : msg });
    } finally {
      setStage("idle");
    }
  };

  const poolShare =
    lpTotalSupply > 0n && lpBalance > 0n
      ? ((Number(lpBalance) / Number(lpTotalSupply)) * 100).toFixed(2)
      : "0";

  const stageText: Record<TxStage, string> = {
    idle: "",
    approving: "授权中...",
    submitting: "等待确认...",
    confirming: "链上确认中...",
  };

  const addBtnText = !isConnected
    ? "连接钱包"
    : !isCorrectChain
      ? "切换到 Sepolia"
      : stage !== "idle"
        ? stageText[stage]
        : "添加流动性";

  const removeBtnText = !isConnected
    ? "连接钱包"
    : !isCorrectChain
      ? "切换到 Sepolia"
      : stage !== "idle"
        ? stageText[stage]
        : "移除流动性";

  return (
    <>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-4 w-full max-w-md mx-auto backdrop-blur">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">流动性</h2>
        </div>

        {reserves.eth > 0n && (
          <div className="bg-gray-800/50 rounded-2xl p-4 mb-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>池中 ETH</span>
              <span className="text-white">{formatAmount(reserves.eth)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>池中 SZTU</span>
              <span className="text-white">{formatAmount(reserves.sztu, 18, 2)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>你的 LP</span>
              <span className="text-white">
                {formatAmount(lpBalance)} ({poolShare}%)
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-1 bg-gray-800 rounded-xl p-1 mb-4">
          <button
            onClick={() => setTab("add")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "add" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            添加
          </button>
          <button
            onClick={() => setTab("remove")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "remove" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            移除
          </button>
        </div>

        {tab === "add" ? (
          <>
            <TokenInput
              label="ETH 数量"
              token="ETH"
              value={ethInput}
              onChange={setEthInput}
              balance={formatAmount(ethBalance)}
            />
            <div className="h-2" />
            <TokenInput
              label={reserves.eth === 0n ? "SZTU 数量（首次自定义）" : "SZTU 数量（自动计算）"}
              token="SZTU"
              value={sztuInput}
              onChange={reserves.eth === 0n ? setSztuInput : () => {}}
              balance={formatAmount(sztuBalance)}
              readOnly={reserves.eth > 0n}
            />
            <button
              onClick={isConnected ? handleAddLiquidity : onConnect}
              disabled={isConnected && (!ethInput || !sztuInput || stage !== "idle" || !isCorrectChain)}
              className={`w-full mt-4 py-4 rounded-2xl text-lg font-semibold transition-colors ${
                isConnected && (!ethInput || !sztuInput || stage !== "idle" || !isCorrectChain)
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                  : "bg-pink-500 hover:bg-pink-600 text-white"
              }`}
            >
              {addBtnText}
            </button>
          </>
        ) : (
          <>
            <TokenInput
              label="LP Token 数量"
              token="SZTU-LP"
              value={lpInput}
              onChange={setLpInput}
              balance={formatAmount(lpBalance)}
            />
            {lpInput && withdrawEth > 0n && (
              <div className="bg-gray-800/50 rounded-2xl p-3 mt-2 text-sm space-y-1">
                <div className="flex justify-between text-gray-400">
                  <span>获得 ETH</span>
                  <span className="text-white">{formatAmount(withdrawEth)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>获得 SZTU</span>
                  <span className="text-white">{formatAmount(withdrawSztu, 18, 2)}</span>
                </div>
              </div>
            )}
            <button
              onClick={isConnected ? handleRemoveLiquidity : onConnect}
              disabled={isConnected && (!lpInput || stage !== "idle" || !isCorrectChain)}
              className={`w-full mt-4 py-4 rounded-2xl text-lg font-semibold transition-colors ${
                isConnected && (!lpInput || stage !== "idle" || !isCorrectChain)
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                  : "bg-pink-500 hover:bg-pink-600 text-white"
              }`}
            >
              {removeBtnText}
            </button>
          </>
        )}
      </div>
    </>
  );
}
