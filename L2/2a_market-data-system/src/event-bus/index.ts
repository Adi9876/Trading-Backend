import {Redis} from 'ioredis';
import type { OrderBookEvent } from '../normalizer/bybit.js';

export class RedisEventBus{
    private pubClient;
    private subClient;
    private channel = 'MARKET_DATA_UPDATES';

    constructor() {
        const redisConfig = {
            host: process.env.REDIS_HOST || 'localhost',
            port: Number(process.env.REDIS_PORT) || 6379,
        };
        this.pubClient = new Redis(redisConfig);
        this.subClient = new Redis(redisConfig);
    }

    async publishOrderBook(event: OrderBookEvent){
        await this.pubClient.publish(this.channel, JSON.stringify(event));
    }

    async subscribeOrderBook(callback: (event: OrderBookEvent) => void){
        await this.subClient.subscribe(this.channel);
        this.subClient.on('message', (channel: string, message: any) => {
            if (channel === this.channel) {
                callback(JSON.parse(message));
            }
        });
    }

    async close() {
        await this.pubClient.quit();
        await this.subClient.quit();
    }
}