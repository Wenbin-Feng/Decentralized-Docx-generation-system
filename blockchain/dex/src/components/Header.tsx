import { useState, useRef, useEffect } from "react";
import { shortenAddress, formatAmount } from "../utils/format";

interface HeaderProps {
  account: string;
  ethBalance: bigint;
  isConnected: boolean;
  isCorrectChain: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSwitchWallet: () => void;
  onSwitchChain: () => void;
  activePage: "swap" | "pool";
  onPageChange: (page: "swap" | "pool") => void;
}

export default function Header({
  account,
  ethBalance,
  isConnected,
  isCorrectChain,
  onConnect,
  onDisconnect,
  onSwitchWallet,
  onSwitchChain,
  activePage,
  onPageChange,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-6">
        <h1 className="text-xl font-bold text-pink-500 tracking-wide">
          SZTU DEX
        </h1>
        <nav className="flex gap-1 bg-gray-900 rounded-xl p-1">
          <button
            onClick={() => onPageChange("swap")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activePage === "swap"
                ? "bg-gray-800 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            交易
          </button>
          <button
            onClick={() => onPageChange("pool")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activePage === "pool"
                ? "bg-gray-800 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            流动性
          </button>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {isConnected && (
          <span className="text-sm text-gray-400 bg-gray-900 px-3 py-2 rounded-xl">
            {formatAmount(ethBalance)} ETH
          </span>
        )}
        {!isConnected ? (
          <button
            onClick={onConnect}
            className="bg-pink-500 hover:bg-pink-600 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            连接钱包
          </button>
        ) : !isCorrectChain ? (
          <button
            onClick={onSwitchChain}
            className="bg-yellow-500 hover:bg-yellow-600 text-black px-5 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            切换到 Sepolia
          </button>
        ) : (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-xl text-sm font-mono transition-colors flex items-center gap-2"
            >
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              {shortenAddress(account)}
              <svg
                className={`w-3 h-3 text-gray-400 transition-transform ${menuOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
                <button
                  onClick={() => {
                    onSwitchWallet();
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                >
                  切换钱包
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(account);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                >
                  复制地址
                </button>
                <button
                  onClick={() => {
                    window.open(
                      `https://sepolia.etherscan.io/address/${account}`,
                      "_blank"
                    );
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                >
                  Etherscan 查看
                </button>
                <div className="border-t border-gray-700" />
                <button
                  onClick={() => {
                    onDisconnect();
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-gray-800 hover:text-red-300 transition-colors"
                >
                  断开连接
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
