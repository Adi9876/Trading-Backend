import express from "express";
import cors from "cors";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const PORT = 4000;
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Main Redis Client for querying history (XRANGE)
const redisClient = createClient({ url: REDIS_URL });

async function startServer() {
    // 1. Connect Main Redis Client
    console.log(`Connecting to Redis for Web Server at ${REDIS_URL}...`);
    redisClient.on("error", (err) => console.error("Redis Server Client Error", err));
    await redisClient.connect();
    console.log("Redis server client connected.");

    // 2. Handle WebSocket Connections (Historical Catchup)
    wss.on("connection", async (ws) => {
        console.log("New WebSocket client connected. Streaming backlog...");
        
        try {
            // Fetch the last 60 transaction entries from the Redis Stream
            // xRevRange returns items newest-first ("+"" to "-")
            const historyMessages = await redisClient.xRevRange("mempool:stream", "+", "-", { COUNT: 60 });
            
            // Map payloads and reverse to send them chronologically (oldest-first)
            const backlog = historyMessages
                .map((msg) => JSON.parse(msg.message.tx))
                .reverse();

            // Push each backlog transaction to the client
            for (const tx of backlog) {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(tx));
                }
            }
            console.log(`Successfully sent backlog of ${backlog.length} transactions to client.`);
        } catch (err) {
            console.error("Error fetching transaction backlog from Redis:", err);
        }
    });

    // 3. Start Redis Stream Consumer Loop (Real-time Broadcast)
    startRedisConsumer();

    // 4. Start HTTP Server
    server.listen(PORT, () => {
        console.log(`WebSocket Server is running on port ${PORT}`);
    });
}

// Dedicated loop for blocking XREAD
async function startRedisConsumer() {
    // Duplicate main connection to prevent blocking commands from freezing queries
    const consumerClient = redisClient.duplicate();
    consumerClient.on("error", (err) => console.error("Redis Consumer Client Error", err));
    await consumerClient.connect();
    
    console.log("Redis Stream Consumer loop started.");
    
    let lastId = "$"; // Read only new entries added after server startup

    while (true) {
        try {
            // Block indefinitely until new transactions are available
            const streams = await consumerClient.xRead(
                { key: "mempool:stream", id: lastId },
                { BLOCK: 0, COUNT: 20 }
            ) as any;

            if (streams) {
                for (const stream of streams) {
                    for (const message of stream.messages) {
                        // Track the last message ID to read next entries
                        lastId = message.id;

                        const txData = message.message.tx;
                        if (txData) {
                            const tx = JSON.parse(txData);

                            // Broadcast the new transaction to all active clients
                            wss.clients.forEach((client) => {
                                if (client.readyState === WebSocket.OPEN) {
                                    client.send(JSON.stringify(tx));
                                }
                            });
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Error in Redis Stream Consumer loop:", err);
            // Throttle connection retries to prevent tight-loop failures
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
    }
}

startServer().catch((err) => {
    console.error("Fatal error starting server:", err);
    process.exit(1);
});