import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import TokenInput from "./TokenInput";
import Toast, { ToastData } from "./Toast";
import { formatAmount, parseAmount } from "../utils/format";
import { SZTU_SWAP_ADDRESS } from "../constants/contracts";

interface SwapCardProps {
  swapContract: ethers.Contract | null;
  tokenContract: ethers.Contract | null;
  account: string;
  isConnected: boolean;
  isCorrectChain: boolean;
  onConnect: () => void;
  ethBalance: bigint;
}

type TxStage = "idle" | "approving" | "swapping" | "confirming";

export default function SwapCard({
  swapContract,
  tokenContract,
  account,
  isConnected,
  isCorrectChain,
  onConnect,
  ethBalance,
}: SwapCardProps) {
  const [ethToSztu, setEthToSztu] = useState(true);
  const [inputAmount, setInputAmount] = useState("");
  const [outputAmount, setOutputAmount] = useState("");
  const [sztuBalance, setSztuBalance] = useState<bigint>(0n);
  const [reserves, setReserves] = useState<{ eth: bigint; sztu: bigint }>({
    eth: 0n,
    sztu: 0n,
  });
  const [stage, setStage] = useState<TxStage>("idle");
  const [slippage] = useState(0.5);
  const [toast, setToast] = useState<ToastData | null>(null);

  const fetchData = useCallback(async () => {
    if (!swapContract || !tokenContract || !account) return;
    try {
      const [ethRes, sztuRes] = await swapContract.getReserves();
      setReserves({ eth: ethRes, sztu: sztuRes });
      const bal = await tokenContract.balanceOf(account);
      setSztuBalance(bal);
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
    if (!swapContract || !inputAmount || reserves.eth === 0n) {
      setOutputAmount("");
      return;
    }
    try {
      const amtIn = parseAmount(inputAmount);
      if (amtIn === 0n) {
        setOutputAmount("");
        return;
      }
      const [resIn, resOut] = ethToSztu
        ? [reserves.eth, reserves.sztu]
        : [reserves.sztu, reserves.eth];
      const out = getAmountOut(amtIn, resIn, resOut);
      setOutputAmount(ethers.formatEther(out));
    } catch {
      setOutputAmount("");
    }
  }, [inputAmount, ethToSztu, reserves, swapContract]);

  function getAmountOut(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
    if (amountIn === 0n || reserveIn === 0n || reserveOut === 0n) return 0n;
    const amountInWithFee = amountIn * 997n;
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn * 1000n + amountInWithFee;
    return numerator / denominator;
  }

  const flipDirection = () => {
    setEthToSztu(!ethToSztu);
    setInputAmount(outputAmount);
    setOutputAmount(inputAmount);
  };

  const handleSwap = async () => {
    if (!swapContract || !tokenContract || !inputAmount) return;
    try {
      const amtIn = parseAmount(inputAmount);
      const amtOut = parseAmount(outputAmount || "0");
      const minOut = (amtOut * BigInt(Math.floor((100 - slippage) * 10))) / 1000n;

      let txHash = "";

      if (ethToSztu) {
        setStage("swapping");
        setToast({ type: "info", title: "交易提交中", message: "请在 MetaMask 中确认..." });
        const tx = await swapContract.swapETHForSZTU(minOut, { value: amtIn });
        txHash = tx.hash;
        setStage("confirming");
        setToast({ type: "info", title: "等待链上确认", message: `Tx: ${txHash.slice(0, 18)}...`, txHash });
        await tx.wait();
      } else {
        const allowance = await tokenContract.allowance(account, SZTU_SWAP_ADDRESS);
        if (allowance < amtIn) {
          setStage("approving");
          setToast({ type: "info", title: "授权 SZTU", message: "请在 MetaMask 中确认授权..." });
          const approveTx = await tokenContract.approve(SZTU_SWAP_ADDRESS, amtIn);
          await approveTx.wait();
        }
        setStage("swapping");
        setToast({ type: "info", title: "交易提交中", message: "请在 MetaMask 中确认..." });
        const tx = await swapContract.swapSZTUForETH(amtIn, minOut);
        txHash = tx.hash;
        setStage("confirming");
        setToast({ type: "info", title: "等待链上确认", message: `Tx: ${txHash.slice(0, 18)}...`, txHash });
        await tx.wait();
      }

      setToast({
        type: "success",
        title: "交易成功",
        message: `${inputAmount} ${ethToSztu ? "ETH" : "SZTU"} → ${outputAmount.slice(0, 10)} ${ethToSztu ? "SZTU" : "ETH"}`,
        txHash,
      });
      setInputAmount("");
      setOutputAmount("");
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { reason?: string; message?: string })?.reason
        || (err as Error)?.message
        || "未知错误";
      const shortMsg = msg.length > 120 ? msg.slice(0, 120) + "..." : msg;
      setToast({ type: "error", title: "交易失败", message: shortMsg });
    } finally {
      setStage("idle");
    }
  };

  const inputToken = ethToSztu ? "ETH" : "SZTU";
  const outputToken = ethToSztu ? "SZTU" : "ETH";
  const inputBal = ethToSztu
    ? formatAmount(ethBalance)
    : formatAmount(sztuBalance);
  const rate =
    reserves.eth > 0n
      ? `1 ETH = ${formatAmount((reserves.sztu * 10n ** 18n) / reserves.eth, 18, 2)} SZTU`
      : "暂无流动性";

  const stageText: Record<TxStage, string> = {
    idle: "Swap",
    approving: "授权中...",
    swapping: "等待确认...",
    confirming: "链上确认中...",
  };

  const getButtonText = () => {
    if (!isConnected) return "连接钱包";
    if (!isCorrectChain) return "切换到 Sepolia";
    if (!inputAmount) return "输入数量";
    if (reserves.eth === 0n) return "暂无流动性";
    if (stage !== "idle") return stageText[stage];
    return "Swap";
  };

  const isButtonDisabled =
    !isConnected || !isCorrectChain || !inputAmount || reserves.eth === 0n || stage !== "idle";

  return (
    <>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-4 w-full max-w-md mx-auto backdrop-blur">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">交易</h2>
          <span className="text-xs text-gray-500">滑点: {slippage}%</span>
        </div>

        <TokenInput
          label="卖出"
          token={inputToken}
          value={inputAmount}
          onChange={setInputAmount}
          balance={inputBal}
        />

        <div className="flex justify-center -my-2 relative z-10">
          <button
            onClick={flipDirection}
            className="bg-gray-800 border-4 border-gray-950 rounded-xl p-2 hover:bg-gray-700 transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        <TokenInput
          label="买入"
          token={outputToken}
          value={outputAmount}
          onChange={() => {}}
          readOnly
        />

        {reserves.eth > 0n && inputAmount && (
          <div className="mt-3 px-2 text-xs text-gray-400 space-y-1">
            <div className="flex justify-between">
              <span>汇率</span>
              <span>{rate}</span>
            </div>
            <div className="flex justify-between">
              <span>手续费</span>
              <span>0.3%</span>
            </div>
          </div>
        )}

        <button
          onClick={isConnected ? handleSwap : onConnect}
          disabled={isConnected && isButtonDisabled}
          className={`w-full mt-4 py-4 rounded-2xl text-lg font-semibold transition-colors ${
            isButtonDisabled && isConnected
              ? "bg-gray-800 text-gray-500 cursor-not-allowed"
              : "bg-pink-500 hover:bg-pink-600 text-white"
          }`}
        >
          {getButtonText()}
        </button>
      </div>
    </>
  );
}
