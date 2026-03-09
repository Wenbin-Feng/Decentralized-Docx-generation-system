import { ethers } from "ethers";
import { createClient } from "@supabase/supabase-js";

// --- Config ---
const RPC_URL = process.env.VITE_RPC_URL || process.env.RPC_URL || "";
const SWAP_ADDRESS =
  process.env.VITE_SZTU_SWAP_ADDRESS || "0xe43780B83403b49DA9daC9cACAf65767fC67DBc1";
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

if (!RPC_URL || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing env vars. Need: RPC_URL/VITE_RPC_URL, SUPABASE_URL, SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const provider = new ethers.JsonRpcProvider(RPC_URL);

const SWAP_ABI = [
  "event Swap(address indexed user, bool ethToSztu, uint256 amountIn, uint256 amountOut)",
  "function getReserves() view returns (uint256 ethReserve, uint256 sztuReserve)",
];

const swapContract = new ethers.Contract(SWAP_ADDRESS, SWAP_ABI, provider);

function calcPrice(ethToSztu: boolean, amountIn: bigint, amountOut: bigint): number {
  // Price = how many SZTU per 1 ETH
  if (ethToSztu) {
    if (amountIn === 0n) return 0;
    return Number(ethers.formatEther(amountOut)) / Number(ethers.formatEther(amountIn));
  } else {
    if (amountOut === 0n) return 0;
    return Number(ethers.formatEther(amountIn)) / Number(ethers.formatEther(amountOut));
  }
}

async function handleSwapEvent(
  user: string,
  ethToSztu: boolean,
  amountIn: bigint,
  amountOut: bigint,
  event: ethers.EventLog
) {
  const block = await event.getBlock();
  const txHash = event.transactionHash;
  const blockNumber = event.blockNumber;
  const timestamp = new Date(block.timestamp * 1000).toISOString();
  const price = calcPrice(ethToSztu, amountIn, amountOut);

  let ethReserve = 0;
  let sztuReserve = 0;
  try {
    const [ethRes, sztuRes] = await swapContract.getReserves();
    ethReserve = Number(ethers.formatEther(ethRes));
    sztuReserve = Number(ethers.formatEther(sztuRes));
  } catch {
    /* ignore */
  }

  const row = {
    tx_hash: txHash,
    block_number: blockNumber,
    timestamp,
    eth_to_sztu: ethToSztu,
    amount_in: Number(ethers.formatEther(amountIn)),
    amount_out: Number(ethers.formatEther(amountOut)),
    price,
    eth_reserve: ethReserve,
    sztu_reserve: sztuReserve,
  };

  console.log(`[Swap] ${ethToSztu ? "ETH→SZTU" : "SZTU→ETH"} price=${price.toFixed(4)} tx=${txHash.slice(0, 16)}...`);

  const { error } = await supabase.from("swap_events").upsert(row, { onConflict: "tx_hash" });
  if (error) {
    console.error("Supabase insert error:", error.message);
  } else {
    console.log("  → Saved to Supabase");
  }
}

async function backfillPastEvents() {
  console.log("Backfilling past Swap events...");
  try {
    const currentBlock = await provider.getBlockNumber();
    const LOOKBACK = 5000;
    const BATCH = 9; // Alchemy free tier: max 10 blocks per eth_getLogs
    const startBlock = Math.max(0, currentBlock - LOOKBACK);
    let totalFound = 0;

    for (let from = startBlock; from <= currentBlock; from += BATCH + 1) {
      const to = Math.min(from + BATCH, currentBlock);
      try {
        const events = await swapContract.queryFilter("Swap", from, to);
        for (const event of events) {
          if (!(event instanceof ethers.EventLog)) continue;
          const [user, ethToSztu, amountIn, amountOut] = event.args;
          await handleSwapEvent(user, ethToSztu, amountIn, amountOut, event);
          totalFound++;
        }
      } catch {
        // skip failed batch
      }
      // throttle to avoid rate limits
      if (from + BATCH < currentBlock) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    console.log(`Backfill complete. Found ${totalFound} Swap events.`);
  } catch (err) {
    console.error("Backfill error:", err);
  }
}

async function main() {
  console.log("=== SZTU Price Listener ===");
  console.log("Swap contract:", SWAP_ADDRESS);
  console.log("Supabase:", SUPABASE_URL);

  await backfillPastEvents();

  console.log("\nListening for new Swap events...");
  swapContract.on("Swap", async (user, ethToSztu, amountIn, amountOut, event) => {
    await handleSwapEvent(user, ethToSztu, amountIn, amountOut, event);
  });

  // Keep alive
  process.on("SIGINT", () => {
    console.log("\nStopping listener...");
    swapContract.removeAllListeners();
    process.exit(0);
  });
}

main().catch(console.error);
