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
    <div className="min-h-screen flex flex-col">
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

      <main className="flex-1 flex flex-col items-center pt-8 px-4">
        {activePage === "swap" && <PriceChart />}
        {activePage === "swap" ? (
          <SwapCard
            swapContract={swapContract}
            tokenContract={tokenContract}
            account={wallet.account}
            isConnected={wallet.isConnected}
            isCorrectChain={wallet.isCorrectChain}
            onConnect={wallet.connect}
            ethBalance={wallet.ethBalance}
          />
        ) : (
          <PoolCard
            swapContract={swapContract}
            tokenContract={tokenContract}
            account={wallet.account}
            isConnected={wallet.isConnected}
            isCorrectChain={wallet.isCorrectChain}
            onConnect={wallet.connect}
            ethBalance={wallet.ethBalance}
          />
        )}
      </main>

      <footer className="text-center text-gray-600 text-xs py-4">
        SZTU DEX &middot; Sepolia Testnet &middot; AMM 0.3% Fee
      </footer>
    </div>
  );
}
