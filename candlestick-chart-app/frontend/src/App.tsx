import { useEffect, useRef } from "react";
import axios from "axios";
import {
  createChart,
  CandlestickSeries,
} from "lightweight-charts";

function App() {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const chart = createChart(chartContainerRef.current!, {
      width: 1000,
      height: 600,
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries);

    const fetchCandles = async () => {
      const response = await axios.get(
        "http://localhost:4000/candles?pair=BTCUSDT"
      );

      candlestickSeries.setData(response.data);
    };

    fetchCandles();

    return () => {
      chart.remove();
    };
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>BTCUSDT Candlestick Chart</h1>

      <div ref={chartContainerRef} />
    </div>
  );
}

export default App;