import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time } from "lightweight-charts";
import { fetchOHLC, getSupabase, type OHLCData } from "../hooks/useSupabase";

type Interval = "1h" | "4h" | "1d";

function aggregateOHLC(raw: OHLCData[], interval: Interval): CandlestickData<Time>[] {
  if (raw.length === 0) return [];

  const msMap: Record<Interval, number> = {
    "1h": 3600_000,
    "4h": 14400_000,
    "1d": 86400_000,
  };
  const ms = msMap[interval];

  const buckets = new Map<
    number,
    { open: number; high: number; low: number; close: number; firstTs: number; lastTs: number }
  >();

  for (const row of raw) {
    const t = new Date(row.time).getTime();
    const bucket = Math.floor(t / ms) * ms;
    const existing = buckets.get(bucket);
    if (!existing) {
      buckets.set(bucket, {
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        firstTs: t,
        lastTs: t,
      });
    } else {
      if (t < existing.firstTs) {
        existing.open = row.open;
        existing.firstTs = t;
      }
      if (t > existing.lastTs) {
        existing.close = row.close;
        existing.lastTs = t;
      }
      existing.high = Math.max(existing.high, row.high);
      existing.low = Math.min(existing.low, row.low);
    }
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([ts, d]) => ({
      time: (ts / 1000) as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
}

export default function PriceChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartApiRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [interval, setInterval_] = useState<Interval>("1h");
  const [rawData, setRawData] = useState<OHLCData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastPrice, setLastPrice] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await fetchOHLC();
    setRawData(data);
    if (data.length > 0) {
      setLastPrice(data[data.length - 1].close);
    }
    setLoading(false);
  }, []);

  // Init chart
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = createChart(chartRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      width: chartRef.current.clientWidth,
      height: 320,
      timeScale: {
        timeVisible: true,
        borderColor: "rgba(255,255,255,0.1)",
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.1)",
      },
      crosshair: {
        horzLine: { color: "rgba(255,255,255,0.2)" },
        vertLine: { color: "rgba(255,255,255,0.2)" },
      },
    });

    const series = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    chartApiRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (chartRef.current) {
        chart.applyOptions({ width: chartRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartApiRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Update data when interval or raw data changes
  useEffect(() => {
    if (!seriesRef.current) return;
    const candles = aggregateOHLC(rawData, interval);
    seriesRef.current.setData(candles);
    chartApiRef.current?.timeScale().fitContent();
  }, [rawData, interval]);

  // Load data on mount + subscribe to realtime
  useEffect(() => {
    loadData();

    const sb = getSupabase();
    if (!sb) return;

    const channel = sb
      .channel("swap_events_changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "swap_events" }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [loadData]);

  const intervals: Interval[] = ["1h", "4h", "1d"];
  const labelMap: Record<Interval, string> = { "1h": "1H", "4h": "4H", "1d": "1D" };

  const noData = !loading && rawData.length === 0;

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-4 w-full max-w-2xl mx-auto backdrop-blur mb-6">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-300">ETH / SZTU</h3>
          {lastPrice !== null && (
            <span className="text-lg font-bold text-white">
              {lastPrice.toFixed(2)}
            </span>
          )}
        </div>
        <div className="flex gap-1 bg-gray-800 rounded-lg p-0.5">
          {intervals.map((iv) => (
            <button
              key={iv}
              onClick={() => setInterval_(iv)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                interval === iv
                  ? "bg-gray-700 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {labelMap[iv]}
            </button>
          ))}
        </div>
      </div>

      <div ref={chartRef} className="w-full relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
            加载中...
          </div>
        )}
        {noData && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm h-[320px]">
            暂无交易数据，完成第一笔交易后显示K线图
          </div>
        )}
      </div>
    </div>
  );
}
