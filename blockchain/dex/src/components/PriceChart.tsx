import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  Time,
  CrosshairMode,
  LineStyle,
  ColorType,
} from "lightweight-charts";
import { fetchAllSwaps, getSupabase, type SwapEvent } from "../hooks/useSupabase";

type Interval = "5m" | "15m" | "1h" | "4h" | "1d";

const INTERVAL_MS: Record<Interval, number> = {
  "5m": 300_000,
  "15m": 900_000,
  "1h": 3_600_000,
  "4h": 14_400_000,
  "1d": 86_400_000,
};

const BG = "#131722";
const UP = "#26a69a";
const DOWN = "#ef5350";

const TZ_OFFSET_SEC = -new Date().getTimezoneOffset() * 60;

interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function invertPrice(p: number): number {
  return p > 0 ? 1 / p : 0;
}

function swapsToOHLCV(swaps: SwapEvent[], interval: Interval): OHLCV[] {
  if (swaps.length === 0) return [];
  const ms = INTERVAL_MS[interval];
  const buckets = new Map<number, OHLCV>();

  for (const s of swaps) {
    const t = new Date(s.timestamp).getTime();
    const bucket = Math.floor(t / ms) * ms;
    const p = invertPrice(s.price);
    const existing = buckets.get(bucket);
    if (!existing) {
      buckets.set(bucket, { time: bucket, open: p, high: p, low: p, close: p, volume: s.amount_in });
    } else {
      existing.high = Math.max(existing.high, p);
      existing.low = Math.min(existing.low, p);
      existing.close = p;
      existing.volume += s.amount_in;
    }
  }

  const sorted = Array.from(buckets.values()).sort((a, b) => a.time - b.time);
  if (sorted.length === 0) return [];

  const now = Date.now();
  const nowBucket = Math.floor(now / ms) * ms;
  const filled: OHLCV[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    let cursor = prev.time + ms;
    while (cursor < sorted[i].time) {
      filled.push({ time: cursor, open: prev.close, high: prev.close, low: prev.close, close: prev.close, volume: 0 });
      cursor += ms;
      if (filled.length > 3000) break;
    }
    filled.push(sorted[i]);
  }

  const last = filled[filled.length - 1];
  let cursor = last.time + ms;
  while (cursor <= nowBucket) {
    filled.push({ time: cursor, open: last.close, high: last.close, low: last.close, close: last.close, volume: 0 });
    cursor += ms;
    if (filled.length > 3000) break;
  }

  return filled;
}

// 把绝对价格转换为相对于 basePrice 的百分比变化
function toPercent(value: number, base: number): number {
  if (base === 0) return 0;
  return ((value - base) / base) * 100;
}

function formatPrice(n: number): string {
  if (n === 0) return "0";
  if (n < 0.0001) return n.toFixed(10);
  if (n < 0.01) return n.toFixed(8);
  if (n < 1) return n.toFixed(6);
  return n.toFixed(4);
}

function formatTime(ts: string) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

export default function PriceChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const volRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const basePriceRef = useRef<number>(0);

  const [interval, setInterval_] = useState<Interval>("15m");
  const [swaps, setSwaps] = useState<SwapEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState(0);
  // hover 时显示真实价格 OHLC
  const [hoverInfo, setHoverInfo] = useState<{ o: number; h: number; l: number; c: number; v: number; pct: number } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await fetchAllSwaps();
    setSwaps(data);
    if (data.length > 0) {
      const last = invertPrice(data[data.length - 1].price);
      const first = invertPrice(data[0].price);
      setLastPrice(last);
      setPriceChange(first > 0 ? ((last - first) / first) * 100 : 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: BG },
        textColor: "#787b86",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#1e222d" },
        horzLines: { color: "#1e222d" },
      },
      width: el.clientWidth,
      height: el.clientHeight || 460,
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { width: 1, color: "rgba(120,123,134,0.3)", style: LineStyle.Dashed, labelBackgroundColor: "#2a2e39" },
        horzLine: { width: 1, color: "rgba(120,123,134,0.3)", style: LineStyle.Dashed, labelBackgroundColor: "#2a2e39" },
      },
      timeScale: {
        borderColor: "#2a2e39",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 4,
        barSpacing: 7,
        minBarSpacing: 3,
      },
      rightPriceScale: {
        borderColor: "#2a2e39",
        scaleMargins: { top: 0.05, bottom: 0.28 },
      },
      localization: {
        priceFormatter: (price: number) => `${price >= 0 ? "+" : ""}${price.toFixed(2)}%`,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: UP,
      downColor: DOWN,
      borderUpColor: UP,
      borderDownColor: DOWN,
      wickUpColor: UP,
      wickDownColor: DOWN,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => `${price >= 0 ? "+" : ""}${price.toFixed(2)}%`,
      },
    });

    const lineSeries = chart.addLineSeries({
      color: "rgba(41,98,255,0.45)",
      lineWidth: 1,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => `${price >= 0 ? "+" : ""}${price.toFixed(2)}%`,
      },
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.75, bottom: 0 },
    });

    chartRef.current = chart;
    candleRef.current = candleSeries;
    lineRef.current = lineSeries;
    volRef.current = volumeSeries;

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) { setHoverInfo(null); return; }
      const d = param.seriesData.get(candleSeries) as CandlestickData<Time> | undefined;
      const v = param.seriesData.get(volumeSeries) as HistogramData<Time> | undefined;
      if (d) {
        const base = basePriceRef.current;
        // 从百分比还原出真实价格
        const realO = base * (1 + d.open / 100);
        const realH = base * (1 + d.high / 100);
        const realL = base * (1 + d.low / 100);
        const realC = base * (1 + d.close / 100);
        setHoverInfo({ o: realO, h: realH, l: realL, c: realC, v: v?.value ?? 0, pct: d.close });
      }
    });

    const ro = new ResizeObserver((entries) => {
      for (const e of entries) chart.applyOptions({ width: e.contentRect.width, height: e.contentRect.height });
    });
    ro.observe(el);

    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; candleRef.current = null; lineRef.current = null; volRef.current = null; };
  }, []);

  useEffect(() => {
    if (!candleRef.current || !lineRef.current || !volRef.current || !chartRef.current) return;

    const ohlcv = swapsToOHLCV(swaps, interval);
    if (ohlcv.length === 0) return;

    const basePrice = ohlcv[0].open;
    basePriceRef.current = basePrice;

    const candles: CandlestickData<Time>[] = ohlcv.map((d) => ({
      time: (d.time / 1000 + TZ_OFFSET_SEC) as Time,
      open: toPercent(d.open, basePrice),
      high: toPercent(d.high, basePrice),
      low: toPercent(d.low, basePrice),
      close: toPercent(d.close, basePrice),
    }));

    const lineData = ohlcv.map((d) => ({
      time: (d.time / 1000 + TZ_OFFSET_SEC) as Time,
      value: toPercent(d.close, basePrice),
    }));

    const volumes: HistogramData<Time>[] = ohlcv.map((d) => ({
      time: (d.time / 1000 + TZ_OFFSET_SEC) as Time,
      value: d.volume,
      color: d.close >= d.open ? "rgba(38,166,154,0.5)" : "rgba(239,83,80,0.5)",
    }));

    candleRef.current.setData(candles);
    lineRef.current.setData(lineData);
    volRef.current.setData(volumes);

    chartRef.current.timeScale().scrollToRealTime();
  }, [swaps, interval]);

  useEffect(() => {
    loadData();
    const sb = getSupabase();
    if (!sb) return;
    const ch = sb.channel("swap_rt_chart")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "swap_events" }, () => loadData())
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [loadData]);

  const intervals: Interval[] = ["5m", "15m", "1h", "4h", "1d"];
  const noData = !loading && swaps.length === 0;
  const recentTrades = [...swaps].reverse().slice(0, 10);

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#131722]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[#2a2e39]">
        <img src="/sztu.png" alt="" className="w-5 h-5 rounded-full" />
        <span className="text-white font-semibold text-sm">SZTU/ETH</span>
        <span className="text-[#787b86] text-xs">·</span>
        {intervals.map((iv) => (
          <button
            key={iv}
            onClick={() => setInterval_(iv)}
            className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
              interval === iv ? "text-white bg-[#2962ff]" : "text-[#787b86] hover:text-[#d1d4dc]"
            }`}
          >
            {iv}
          </button>
        ))}
      </div>

      {/* Price + OHLC info */}
      <div className="flex items-center gap-3 px-4 py-1.5 text-xs min-h-[28px]">
        {lastPrice !== null && (
          <span className="text-white font-semibold text-base tabular-nums">
            {formatPrice(lastPrice)} <span className="text-[#787b86] text-xs font-normal">ETH</span>
          </span>
        )}
        {priceChange !== 0 && (
          <span className={`font-semibold text-sm tabular-nums ${priceChange >= 0 ? "text-[#26a69a]" : "text-[#ef5350]"}`}>
            {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
          </span>
        )}

        {/* 只在鼠标 hover 蜡烛时显示 OHLC 真实价格 */}
        {hoverInfo && (
          <div className="flex items-center gap-3 text-[11px] ml-3 border-l border-[#2a2e39] pl-3">
            <span className="text-[#787b86]">开 <span className="text-[#d1d4dc] tabular-nums">{formatPrice(hoverInfo.o)}</span></span>
            <span className="text-[#787b86]">高 <span className="text-[#26a69a] tabular-nums">{formatPrice(hoverInfo.h)}</span></span>
            <span className="text-[#787b86]">低 <span className="text-[#ef5350] tabular-nums">{formatPrice(hoverInfo.l)}</span></span>
            <span className="text-[#787b86]">收 <span className="text-[#d1d4dc] tabular-nums">{formatPrice(hoverInfo.c)}</span></span>
            <span className={`font-medium tabular-nums ${hoverInfo.pct >= 0 ? "text-[#26a69a]" : "text-[#ef5350]"}`}>
              {hoverInfo.pct >= 0 ? "+" : ""}{hoverInfo.pct.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0 relative">
        <div ref={containerRef} className="absolute inset-0" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-[#787b86] text-sm">
              <div className="w-4 h-4 border-2 border-[#2962ff]/30 border-t-[#2962ff] rounded-full animate-spin" />
              加载中
            </div>
          </div>
        )}
        {noData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#787b86] text-sm z-10 gap-2">
            <svg className="w-8 h-8 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13l4-4 4 4 4-8 4 4M3 17h18" />
            </svg>
            暂无交易数据
          </div>
        )}
      </div>

      {/* Recent trades */}
      {recentTrades.length > 0 && (
        <div className="border-t border-[#2a2e39]">
          <div className="px-4 py-1.5 text-[11px] text-[#787b86] font-medium border-b border-[#1e222d]">近期成交</div>
          <div className="max-h-[120px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-[#131722]">
                <tr className="text-[#545b66]">
                  <th className="text-left pl-4 pr-2 py-1 font-normal">时间</th>
                  <th className="text-left px-2 py-1 font-normal">类型</th>
                  <th className="text-right px-2 py-1 font-normal">价格 (ETH)</th>
                  <th className="text-right pl-2 pr-4 py-1 font-normal">数量 (SZTU)</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((t) => {
                  const buy = t.eth_to_sztu;
                  const displayP = invertPrice(t.price);
                  // 买入(ETH→SZTU): SZTU数量=amount_out; 卖出(SZTU→ETH): SZTU数量=amount_in
                  const sztuAmount = buy ? t.amount_out : t.amount_in;
                  return (
                    <tr key={t.id} className="hover:bg-[#1e222d]/60">
                      <td className="pl-4 pr-2 py-[3px] text-[#787b86] tabular-nums">{formatTime(t.timestamp)}</td>
                      <td className={`px-2 py-[3px] font-medium ${buy ? "text-[#26a69a]" : "text-[#ef5350]"}`}>{buy ? "买入" : "卖出"}</td>
                      <td className={`px-2 py-[3px] text-right tabular-nums ${buy ? "text-[#26a69a]" : "text-[#ef5350]"}`}>{formatPrice(displayP)}</td>
                      <td className="pl-2 pr-4 py-[3px] text-right text-[#787b86] tabular-nums">{sztuAmount.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
