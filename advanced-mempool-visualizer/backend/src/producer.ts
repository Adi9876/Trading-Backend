import { ethers } from "ethers";
import { createClient } from "redis";
import { decodeTransactionInput } from "./decoder";
import dotenv from "dotenv";

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const RPC_WSS = process.env.RPC_WSS!;

if (!RPC_WSS) {
    console.error("Missing RPC_WSS in environment configuration.");
    process.exit(1);
}

async function main() {
    // 1. Initialize and Connect Redis Client
    console.log(`Connecting to Redis at ${REDIS_URL}...`);
    const redisClient = createClient({ url: REDIS_URL });
    
    redisClient.on("error", (err) => console.error("Redis Client Error", err));
    await redisClient.connect();
    console.log("Redis client connected successfully.");

    // 2. Initialize Ethereum WSS Provider
    console.log("Connecting to Ethereum WebSocket Provider...");
    const provider = new ethers.WebSocketProvider(RPC_WSS);
    
    // Resolve connection state
    try {
        const blockNumber = await provider.getBlockNumber();
        console.log(`Ethereum WSS Connected. Current Block: ${blockNumber}`);
    } catch (err) {
        console.error("Failed to connect to Ethereum WSS Provider:", err);
        process.exit(1);
    }

    // 3. Listen to Ethereum Pending Transactions
    console.log("Mempool Ingestion active. Listening for pending transactions...");
    
    provider.on("pending", async (txHash: string) => {
        try {
            // Fetch transaction details
            const tx = await provider.getTransaction(txHash);
            if (!tx) return;

            // Run rich decoding on the transaction data input
            const decodedInfo = await decodeTransactionInput(tx.data);

            // Construct transaction payload
            const parsedTx = {
                hash: tx.hash,
                from: tx.from!,
                to: tx.to || "Contract Creation",
                value: tx.value.toString(),
                gasPrice: tx.gasPrice?.toString() || "0",
                maxFeePerGas: tx.maxFeePerGas?.toString(),
                maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toString(),
                nonce: tx.nonce,
                data: tx.data,
                decodedInfo
            };

            // Serialize payload as a JSON string
            const txJson = JSON.stringify(parsedTx);

            // Publish to Redis Stream: mempool:stream
            // We use approximate trimming (MAXLEN ~ 1000) for extremely high performance
            await redisClient.xAdd("mempool:stream", "*", { tx: txJson }, {
                TRIM: {
                    strategy: "MAXLEN",
                    strategyModifier: "~",
                    threshold: 500
                }
            });

            console.log(`[Ingested] Tx: ${txHash.slice(0, 10)}... | Type: ${decodedInfo.type} | Value: ${ethers.formatEther(tx.value)} ETH`);

        } catch (error) {
            // Soft suppress RPC failures or stream delays to ensure ingestion pipeline keeps listening
            // e.g. transaction drops out before we can fetch it, which is standard in mempools
        }
    });
}

main().catch((err) => {
    console.error("Fatal error in mempool producer:", err);
    process.exit(1);
});
