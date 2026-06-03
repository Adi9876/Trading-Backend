import {Redis} from "ioredis";
import type { Candle } from "../types/index.js";

export class RedisPublisher {
    private redis: Redis;
    
    constructor(){
        this.redis = new Redis();
        console.log("Connected to Redis");
    }

    public async publishLiveUpdate(candle: Candle): Promise<void>{
        const key = `live_candle:${candle.symbol}:${candle.interval}`;
        await this.redis.set(key, JSON.stringify(candle));

        await this.redis.publish(`candle_updates_topic`, JSON.stringify(candle));

    }

    public saveHistoricalCandles(candle: Candle){
        this.redis.rpush(`history:${candle.symbol}:${candle.interval}`, JSON.stringify(candle));
        console.log(`saved ${candle.symbol}, ${candle.interval} at ${candle.timestamp}`)
    }
}