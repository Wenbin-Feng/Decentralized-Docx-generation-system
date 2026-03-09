import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return client;
}

export interface OHLCData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trade_count: number;
}

export interface SwapEvent {
  id: number;
  tx_hash: string;
  timestamp: string;
  eth_to_sztu: boolean;
  amount_in: number;
  amount_out: number;
  price: number;
}

export async function fetchOHLC(): Promise<OHLCData[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from("price_ohlc")
    .select("*")
    .order("time", { ascending: true });

  if (error) {
    console.error("Fetch OHLC error:", error.message);
    return [];
  }
  return (data || []) as OHLCData[];
}

export async function fetchRecentSwaps(limit = 20): Promise<SwapEvent[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from("swap_events")
    .select("id, tx_hash, timestamp, eth_to_sztu, amount_in, amount_out, price")
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Fetch swaps error:", error.message);
    return [];
  }
  return (data || []) as SwapEvent[];
}
