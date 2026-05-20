import express from "express";
import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 4000;

app.use(cors());

// const binanceWS = new WebSocket("wss://stream.binance.com:9443/ws/btcusdt@depth");

wss.on("connection", (client, request) => {
    const url = new URL(
        request.url || "",
        "http://localhost:4000"
    );

    const symbol =
        url.searchParams.get("symbol") || "btcusdt";

    console.log("New Client:", symbol);

    client.on("close", () => {
        console.log("Client disconnected", symbol);
    })

    const binanceWS = new WebSocket(
        `wss://stream.binance.com:9443/ws/${symbol}@depth`
    );

    binanceWS.on("open", () => {
        console.log("Connected to Binance WebSocket");
    });

    binanceWS.on("message", (data: WebSocket.RawData) => {
        const parsed = JSON.parse(data.toString());

        // broadcast to frontend client
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(parsed));
            }
        })

    });

    binanceWS.on("close", () => {
        console.log("Disconnected from Binance WebSocket");
    });

    binanceWS.on("error", (error: Error) => {
        console.log(error);
    });
})


server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

/*
Binance
   ↓
Your Backend
   ↓
Frontend Clients
*/