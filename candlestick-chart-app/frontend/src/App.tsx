import { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
} from "lightweight-charts";
import "./App.css";

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface IndicatorValue {
  time: number;
  value: number;
}

// -------------------------------------------------------------
// TECHNICAL INDICATORS MATHEMATICS
// -------------------------------------------------------------

function calculateSMA(data: Candle[], period: number): IndicatorValue[] {
  const sma: IndicatorValue[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue;
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    sma.push({ time: data[i].time, value: sum / period });
  }
  return sma;
}

function calculateEMA(data: Candle[], period: number): IndicatorValue[] {
  const ema: IndicatorValue[] = [];
  if (data.length < period) return ema;

  const k = 2 / (period + 1);
  
  // Initialize first EMA point with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  let prevEma = sum / period;
  ema.push({ time: data[period - 1].time, value: prevEma });

  for (let i = period; i < data.length; i++) {
    const curEma = data[i].close * k + prevEma * (1 - k);
    ema.push({ time: data[i].time, value: curEma });
    prevEma = curEma;
  }
  return ema;
}

function calculateRSI(data: Candle[], period: number): IndicatorValue[] {
  const rsi: IndicatorValue[] = [];
  if (data.length <= period) return rsi;

  let gains = 0;
  let losses = 0;

  // First period simple averages
  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  let firstRSI = 100;
  if (avgLoss !== 0) {
    const rs = avgGain / avgLoss;
    firstRSI = 100 - 100 / (1 + rs);
  } else if (avgGain === 0) {
    firstRSI = 50;
  }
  rsi.push({ time: data[period].time, value: firstRSI });

  // Wilder's smoothed average gain/loss
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    let rsiVal = 100;
    if (avgLoss !== 0) {
      const rs = avgGain / avgLoss;
      rsiVal = 100 - 100 / (1 + rs);
    } else if (avgGain === 0) {
      rsiVal = 50;
    }
    rsi.push({ time: data[i].time, value: rsiVal });
  }

  return rsi;
}

// -------------------------------------------------------------
// APP COMPONENT
// -------------------------------------------------------------

const PAIRS = [
  { value: "BTCUSDT", label: "BTC/USDT (Bitcoin)" },
  { value: "ETHUSDT", label: "ETH/USDT (Ethereum)" },
  { value: "SOLUSDT", label: "SOL/USDT (Solana)" },
  { value: "BNBUSDT", label: "BNB/USDT (Binance Coin)" },
  { value: "ADAUSDT", label: "ADA/USDT (Cardano)" },
];

const INTERVALS = [
  { value: "1m", label: "1 Minute" },
  { value: "5m", label: "5 Minutes" },
  { value: "15m", label: "15 Minutes" },
  { value: "1h", label: "1 Hour" },
  { value: "1d", label: "1 Day" },
];

function App() {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const rsiContainerRef = useRef<HTMLDivElement | null>(null);

  const [pair, setPair] = useState("BTCUSDT");
  const [interval, setInterval] = useState("1m");
  
  // Toggles for Technical Indicators
  const [showVolume, setShowVolume] = useState(true);
  const [showSMA, setShowSMA] = useState(false);
  const [showEMA, setShowEMA] = useState(false);
  const [showRSI, setShowRSI] = useState(false);

  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [priceDirection, setPriceDirection] = useState<"up" | "down" | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);

  // Chart References
  const mainChartRef = useRef<any>(null);
  const rsiChartRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const smaSeriesRef = useRef<any>(null);
  const emaSeriesRef = useRef<any>(null);
  const rsiSeriesRef = useRef<any>(null);

  // 1. Chart Creation and WebSocket Stream Lifecycle Effect
  useEffect(() => {
    if (!chartContainerRef.current || !rsiContainerRef.current) return;

    setLivePrice(null);
    setPriceDirection(null);
    setWsStatus("connecting");
    setCandles([]);

    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    // Initialize Main Price Chart
    const mainChart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: showRSI ? 380 : 500,
      layout: {
        background: { color: isDark ? "#1f2028" : "#ffffff" },
        textColor: isDark ? "#9ca3af" : "#6b6375",
      },
      grid: {
        vertLines: { color: isDark ? "#2e303a" : "#e5e4e7" },
        horzLines: { color: isDark ? "#2e303a" : "#e5e4e7" },
      },
      rightPriceScale: {
        borderColor: isDark ? "#2e303a" : "#e5e4e7",
      },
      timeScale: {
        borderColor: isDark ? "#2e303a" : "#e5e4e7",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candlestickSeries = mainChart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    // Initialize Volume Series Overlay
    const volumeSeries = mainChart.addSeries(HistogramSeries, {
      color: "#26a69a",
      priceFormat: { type: "volume" },
      priceScaleId: "", // Overlay configuration
    });

    mainChart.priceScale("").applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Initialize Moving Averages Series
    const smaSeries = mainChart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 2,
      title: "SMA (20)",
    });

    const emaSeries = mainChart.addSeries(LineSeries, {
      color: "#a855f7",
      lineWidth: 2,
      title: "EMA (9)",
    });

    // Initialize Synced RSI Chart
    const rsiChart = createChart(rsiContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 150,
      layout: {
        background: { color: isDark ? "#1f2028" : "#ffffff" },
        textColor: isDark ? "#9ca3af" : "#6b6375",
      },
      grid: {
        vertLines: { color: isDark ? "#2e303a" : "#e5e4e7" },
        horzLines: { color: isDark ? "#2e303a" : "#e5e4e7" },
      },
      rightPriceScale: {
        borderColor: isDark ? "#2e303a" : "#e5e4e7",
      },
      timeScale: {
        borderColor: isDark ? "#2e303a" : "#e5e4e7",
        visible: false, // Synced with main price chart scale
      },
    });

    const rsiSeries = rsiChart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 2,
      title: "RSI (14)",
    });

    // Add boundaries inside RSI pane
    rsiSeries.createPriceLine({
      price: 70,
      color: "#ef5350",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "Overbought (70)",
    });

    rsiSeries.createPriceLine({
      price: 30,
      color: "#26a69a",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "Oversold (30)",
    });

    // Time-scale synchronization between price and RSI charts
    let isSyncing = false;
    mainChart.timeScale().subscribeVisibleTimeRangeChange((range) => {
      if (isSyncing) return;
      isSyncing = true;
      rsiChart.timeScale().setVisibleRange(range || null);
      isSyncing = false;
    });

    rsiChart.timeScale().subscribeVisibleTimeRangeChange((range) => {
      if (isSyncing) return;
      isSyncing = true;
      mainChart.timeScale().setVisibleRange(range || null);
      isSyncing = false;
    });

    // Save refs
    mainChartRef.current = mainChart;
    rsiChartRef.current = rsiChart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;
    smaSeriesRef.current = smaSeries;
    emaSeriesRef.current = emaSeries;
    rsiSeriesRef.current = rsiSeries;

    // Apply active configurations
    volumeSeries.applyOptions({ visible: showVolume });
    smaSeries.applyOptions({ visible: showSMA });
    emaSeries.applyOptions({ visible: showEMA });

    let isMounted = true;

    // Fetch Historical Data
    const fetchHistoricalData = async () => {
      try {
        const response = await axios.get(
          `http://localhost:4000/candles?pair=${pair}&interval=${interval}`
        );
        if (isMounted) {
          const data: Candle[] = response.data;
          setCandles(data);
          candlestickSeries.setData(data);
          if (data.length > 0) {
            setLivePrice(data[data.length - 1].close);
          }
        }
      } catch (error) {
        console.error("Error fetching historical candles:", error);
      }
    };

    fetchHistoricalData();

    // Establish WebSocket Connection
    const ws = new WebSocket(`ws://localhost:4000/?pair=${pair}&interval=${interval}`);

    ws.onopen = () => {
      if (isMounted) setWsStatus("connected");
    };

    ws.onmessage = (event) => {
      if (!isMounted) return;
      try {
        const candle = JSON.parse(event.data);
        const formattedCandle: Candle = {
          time: candle.time,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
        };

        candlestickSeries.update(formattedCandle);

        setCandles((prevCandles) => {
          if (prevCandles.length === 0) return [formattedCandle];
          const lastIndex = prevCandles.length - 1;
          const lastCandle = prevCandles[lastIndex];

          if (lastCandle.time === formattedCandle.time) {
            const updated = [...prevCandles];
            updated[lastIndex] = formattedCandle;
            return updated;
          } else {
            return [...prevCandles, formattedCandle];
          }
        });

        setLivePrice((prevPrice) => {
          if (prevPrice !== null) {
            if (formattedCandle.close > prevPrice) {
              setPriceDirection("up");
            } else if (formattedCandle.close < prevPrice) {
              setPriceDirection("down");
            }
          }
          return formattedCandle.close;
        });
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    };

    ws.onclose = () => {
      if (isMounted) setWsStatus("disconnected");
    };

    ws.onerror = () => {
      if (isMounted) setWsStatus("disconnected");
    };

    const handleResize = () => {
      if (chartContainerRef.current && mainChartRef.current) {
        const width = chartContainerRef.current.clientWidth;
        mainChartRef.current.resize(width, showRSI ? 380 : 500);
        rsiChartRef.current?.resize(width, 150);
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      isMounted = false;
      ws.close();
      window.removeEventListener("resize", handleResize);
      mainChart.remove();
      rsiChart.remove();
      mainChartRef.current = null;
      rsiChartRef.current = null;
      candlestickSeriesRef.current = null;
      volumeSeriesRef.current = null;
      smaSeriesRef.current = null;
      emaSeriesRef.current = null;
      rsiSeriesRef.current = null;
    };
  }, [pair, interval]);

  // 2. Compute Technical Indicators and Set Series Data
  useEffect(() => {
    if (candles.length === 0) return;

    // Volume calculation
    const volumeData = candles.map((c) => ({
      time: c.time,
      value: c.volume,
      color: c.close >= c.open ? "rgba(38, 166, 154, 0.4)" : "rgba(239, 83, 80, 0.4)",
    }));

    // Indicators calculations
    const smaData = calculateSMA(candles, 20);
    const emaData = calculateEMA(candles, 9);
    const rsiData = calculateRSI(candles, 14);

    if (volumeSeriesRef.current) volumeSeriesRef.current.setData(volumeData);
    if (smaSeriesRef.current) smaSeriesRef.current.setData(smaData);
    if (emaSeriesRef.current) emaSeriesRef.current.setData(emaData);
    if (rsiSeriesRef.current) rsiSeriesRef.current.setData(rsiData);
  }, [candles]);

  // 3. Dynamic Toggles / Layout Resize Effect
  useEffect(() => {
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.applyOptions({ visible: showVolume });
    }
    if (smaSeriesRef.current) {
      smaSeriesRef.current.applyOptions({ visible: showSMA });
    }
    if (emaSeriesRef.current) {
      emaSeriesRef.current.applyOptions({ visible: showEMA });
    }

    if (mainChartRef.current && rsiChartRef.current && chartContainerRef.current) {
      const width = chartContainerRef.current.clientWidth;
      if (showRSI) {
        mainChartRef.current.resize(width, 380);
        rsiChartRef.current.resize(width, 150);
      } else {
        mainChartRef.current.resize(width, 500);
      }
    }
  }, [showVolume, showSMA, showEMA, showRSI]);

  return (
    <main className="terminal-container">
      <header className="terminal-header">
        <div className="header-info">
          <h1 id="page-title">Crypto Live Terminal</h1>
          <div className="status-container">
            <span className={`status-badge ${wsStatus}`} id="ws-status-badge">
              <span className="pulse-dot"></span>
              {wsStatus === "connected" && "Live"}
              {wsStatus === "connecting" && "Connecting..."}
              {wsStatus === "disconnected" && "Disconnected"}
            </span>
          </div>
        </div>

        <div className="price-display">
          <span className="price-label">Live Price:</span>
          <span 
            className={`price-value ${priceDirection || ""}`} 
            id="live-price-value"
          >
            {livePrice !== null ? `$${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : "Loading..."}
          </span>
        </div>
      </header>

      <section className="controls-panel">
        <div className="control-group">
          <label htmlFor="pair-select">Trading Pair</label>
          <select
            id="pair-select"
            value={pair}
            onChange={(e) => setPair(e.target.value)}
          >
            {PAIRS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="interval-select">Timeframe</label>
          <select
            id="interval-select"
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
          >
            {INTERVALS.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Technical Indicators Checkboxes Bar */}
      <section className="indicators-bar" id="indicators-bar">
        <span className="indicators-label">Indicators:</span>
        <div className="indicators-toggles">
          <label className="indicator-toggle-label" htmlFor="toggle-volume">
            <input
              id="toggle-volume"
              type="checkbox"
              checked={showVolume}
              onChange={(e) => setShowVolume(e.target.checked)}
            />
            <span>Volume</span>
          </label>

          <label className="indicator-toggle-label" htmlFor="toggle-sma">
            <input
              id="toggle-sma"
              type="checkbox"
              checked={showSMA}
              onChange={(e) => setShowSMA(e.target.checked)}
            />
            <span style={{ color: "#f59e0b" }}>SMA (20)</span>
          </label>

          <label className="indicator-toggle-label" htmlFor="toggle-ema">
            <input
              id="toggle-ema"
              type="checkbox"
              checked={showEMA}
              onChange={(e) => setShowEMA(e.target.checked)}
            />
            <span style={{ color: "#a855f7" }}>EMA (9)</span>
          </label>

          <label className="indicator-toggle-label" htmlFor="toggle-rsi">
            <input
              id="toggle-rsi"
              type="checkbox"
              checked={showRSI}
              onChange={(e) => setShowRSI(e.target.checked)}
            />
            <span style={{ color: "#3b82f6" }}>RSI (14)</span>
          </label>
        </div>
      </section>

      <section className="chart-panel">
        <div ref={chartContainerRef} className="chart-wrapper" id="chart-wrapper" />
        <div 
          ref={rsiContainerRef} 
          className="rsi-wrapper" 
          id="rsi-wrapper"
          style={{ display: showRSI ? "block" : "none", borderTop: "1px solid var(--border)" }} 
        />
      </section>
    </main>
  );
}

export default App;