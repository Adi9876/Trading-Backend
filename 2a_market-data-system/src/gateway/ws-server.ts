import { WebSocketServer, WebSocket } from "ws";
import { RedisEventBus } from "../event-bus/index.js";
import { OrderBookService } from "../services/orderbook.js";

export class WsGateway{
    private wss: WebSocketServer;

    constructor(
        private eventBus: RedisEventBus, 
        private orderBookService: OrderBookService)
    {
        this.wss = new WebSocketServer({port: 8000});
    }

    public start(){
        this.wss.on('connection', (ws)=> {
            console.log('New Client connected');
            const snapshot = this.orderBookService.getSnapshot(50);
            ws.send(JSON.stringify({ type: 'ORDERBOOK_SNAPSHOT', data: snapshot }));
        });

        this.eventBus.subscribeOrderBook((event)=>{
            this.wss.clients.forEach((client)=> {
                if(client.readyState === WebSocket.OPEN){
                    client.send(JSON.stringify(event))
                }
            });
        });
    }


}