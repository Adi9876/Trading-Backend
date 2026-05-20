import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
const PORT = 4000;

app.use(cors());

app.get('/candles', async (req, res) => {
    const pair = (req.query.pair as string) || 'BTCUSDT';
    const interval = (req.query.interval as string) || '1m';
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

    try {
        const response = await axios.get('https://api.binance.com/api/v3/klines',
            {
                params: {
                    symbol: pair,
                    interval: interval,
                    limit: limit
                }
            }
        );

        const candles = response.data.map((candle: any[]) => ({
            time: Math.floor(candle[0] / 1000),
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5])
        }));

        res.json(candles);
    } catch (error) {
        console.error("Error fetching candles:", error);
        res.status(500).json({ error: "Failed to fetch candles" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
    