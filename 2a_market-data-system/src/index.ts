import dotenv from 'dotenv';
dotenv.config();

import { RedisEventBus } from './event-bus/index.js';
import { OrderBookService } from './services/orderbook.js';
import { WsGateway } from './gateway/ws-server.js';
import { connectBybitOrderBook } from './adapters/bybit.js';
import { normalizeBybitMessage } from './normalizer/bybit.js';

async function bootstrap() {
    console.log('STarting Market Data System!!');
    
    const eventBus = new RedisEventBus();
    const orderBookService = new OrderBookService();
    const wsGateway = new WsGateway(eventBus, orderBookService);
    wsGateway.start();
    console.log('Websocket Gateway Started on ws://localhost:8000');

    const symbol = 'BTCUSDT';
    console.log('Connecting to Bybit for symbol:', symbol);

    eventBus.subscribeOrderBook((event)=> {
        orderBookService.processEvent(event);        
    })

    connectBybitOrderBook(symbol, async (message)=>{
        const normalized = normalizeBybitMessage(message);
        if(normalized){
            await eventBus.publishOrderBook(normalized);
        }
    });
}

bootstrap().catch(console.error);