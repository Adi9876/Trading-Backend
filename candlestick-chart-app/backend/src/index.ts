import express from "express";
import axios from "axios";
import cors from "cors";
import http from "http";
import WebSocket, { WebSocketServer } from "ws";

const app = express();
const PORT = 4000;

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

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

wss.on("connection", (client, request) => {
    console.log("Client connected");

    const url = new URL(request.url || "", "http://localhost:4000");
    const pair = url.searchParams.get('pair') || 'BTCUSDT';
    const interval = url.searchParams.get('interval') || '1m';

    console.log("New Client:", pair, interval);

    const binanceWS = new WebSocket(`wss://stream.binance.com/ws/${pair.toLowerCase()}@kline_${interval}`)

    binanceWS.on("open", () => {
        console.log("Connected to Binance WebSocket");
    })

    binanceWS.on("message", (data: WebSocket.RawData) => {
        const parsed = JSON.parse(data.toString());

        const candle = parsed.k;

        const formattedCandle = {
            time: Math.floor(candle.t / 1000),
            open: parseFloat(candle.o),
            high: parseFloat(candle.h),
            low: parseFloat(candle.l),
            close: parseFloat(candle.c),
            volume: parseFloat(candle.v),
            isFinal: candle.x,
        };

        // broadcast to frontend clients
        // wss.clients.forEach((client: { readyState: any; send: (arg0: string) => void; }) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(formattedCandle));
        }
        // })

    })

    binanceWS.on("error", (error: Error) => {
        console.log("Binance WebSocket error:", error);
    });

    binanceWS.on("close", () => {
        console.log("Binance WebSocket closed");
    });

    client.on("close", () => {
        console.log("Client disconnected");
        // binanceWS.close();
    });


});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
