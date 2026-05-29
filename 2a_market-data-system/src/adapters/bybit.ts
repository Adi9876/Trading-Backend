import {WebSocket} from 'ws';

const BYBIT_WS_URL = 'wss://stream.bybit.com/v5/public/linear';

export function connectBybitOrderBook(symbol: string, onMessage: (data: any) => void) {
    const ws = new WebSocket(BYBIT_WS_URL);
    let pingInterval: NodeJS.Timeout;

    ws.on('open', () => {
        console.log(`Connected to Bybit WebSocket for ${symbol}`);

        // Send a ping heartbeat every 20 seconds to keep the connection alive
        pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ op: 'ping' }));
            }
        }, 20000);

        // Subscribe to the 50-level orderbook
        const sub = {
            reqId: '123',
            op: 'subscribe',
            args: [`orderbook.50.${symbol}`]
        };

        ws.send(JSON.stringify(sub));
    });

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            // Pass the parsed message out to our callback instead of just logging it
            onMessage(msg);
        } catch (err) {
            console.error('Failed to parse Bybit message:', err);
        }
    });

    ws.on('error', (err) => {
        console.error('Bybit WebSocket Error:', err);
        clearInterval(pingInterval);
    });

    ws.on('close', () => {
        console.log('Bybit WebSocket Closed. Reconnecting in 3 seconds...');
        clearInterval(pingInterval);
        
        // Auto-reconnect logic!
        setTimeout(() => {
            connectBybitOrderBook(symbol, onMessage);
        }, 3000);
    });

    return ws;
}