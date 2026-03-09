import { useState } from "react";
import Header from "./components/Header";
import PriceChart from "./components/PriceChart";
import SwapCard from "./components/SwapCard";
import PoolCard from "./components/PoolCard";
import { useWallet } from "./hooks/useWallet";
import { useContracts } from "./hooks/useContracts";

export default function App() {
  const [activePage, setActivePage] = useState<"swap" | "pool">("swap");
  const wallet = useWallet();
  const { tokenContract, swapContract } = useContracts(wallet.signer);

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0e11]">
      <Header
        account={wallet.account}
        ethBalance={wallet.ethBalance}
        isConnected={wallet.isConnected}
        isCorrectChain={wallet.isCorrectChain}
        onConnect={wallet.connect}
        onDisconnect={wallet.disconnect}
        onSwitchWallet={wallet.switchWallet}
        onSwitchChain={wallet.switchChain}
        activePage={activePage}
        onPageChange={setActivePage}
      />

      {activePage === "swap" ? (
        <main className="flex-1 flex min-h-0">
          {/* Left: Chart */}
          <div className="flex-1 min-w-0 flex flex-col border-r border-[#1b1f27]">
            <PriceChart />
          </div>

          {/* Right: Swap panel */}
          <div className="w-[400px] shrink-0 flex flex-col items-center justify-start pt-6 px-4 overflow-y-auto">
            <SwapCard
              swapContract={swapContract}
              tokenContract={tokenContract}
              account={wallet.account}
              isConnected={wallet.isConnected}
              isCorrectChain={wallet.isCorrectChain}
              onConnect={wallet.connect}
              ethBalance={wallet.ethBalance}
            />
          </div>
        </main>
      ) : (
        <main className="flex-1 flex items-start justify-center pt-10 px-4">
          <PoolCard
            swapContract={swapContract}
            tokenContract={tokenContract}
            account={wallet.account}
            isConnected={wallet.isConnected}
            isCorrectChain={wallet.isCorrectChain}
            onConnect={wallet.connect}
            ethBalance={wallet.ethBalance}
          />
        </main>
      )}
    </div>
  );
}
