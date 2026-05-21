import express from "express"
import cors from "cors"
import http from "http"
import { startMempoolListner } from "./mempool"
import { WebSocketServer } from "ws";

const app = express();
const PORT = 4000;

app.use(cors());

const server = http.createServer(app);

const wss = new WebSocketServer({ server });

wss.on("connection", () => {
    console.log("Client connected");
})

startMempoolListner((tx) => {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(tx));
        }
    });
});

server.listen(PORT,() => {
    console.log(`Server is running on port ${PORT}`);
});