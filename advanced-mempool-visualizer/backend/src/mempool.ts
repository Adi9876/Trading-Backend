import express from "express"
import { MempoolTx } from "./types";
import { decodeTransactionInput } from "./decoder";
import dotenv from "dotenv";
import { ethers } from "ethers";
dotenv.config();

const app = express();

const provider = new ethers.WebSocketProvider(process.env.RPC_WSS!);

const memPool: MempoolTx[] = [];


const startMempoolListner = (onTransaction: (tx: any) => void) => {
    provider.on("pending", async (txHash) => {
        try {
            const tx = await provider.getTransaction(txHash);
            if (!tx) {
                return;
            }
            const decodedType = decodeTransactionInput(
                tx.data
            );

            const parsedTx: MempoolTx = {
                hash: tx.hash,
                from: tx.from!,
                to: tx.to!,
                value: tx.value.toString(),
                gasPrice: tx.gasPrice?.toString()!,
                maxFeePerGas: tx.maxFeePerGas?.toString(),
                maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toString(),
                nonce: tx.nonce,
                data: tx.data,
            };

            memPool.unshift(parsedTx);
            if (memPool.length > 1000) {
                memPool.pop();
            }
            onTransaction(parsedTx);

        } catch (error) {

        }
    })
}

export { startMempoolListner };