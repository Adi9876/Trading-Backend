import type { Candle, TradeEvent } from "../types/index.js";
import { getBucketFloorTimestamp } from "../utils/time.js";
import EventEmitter from "node:events";

export class OHLCVAggregator extends EventEmitter {

    private currentCandle: Map<string, Candle>  = new Map();

    public processTrade(trade: TradeEvent){
        const bucketTime = getBucketFloorTimestamp(trade.timestamp);

        let candle = this.currentCandle.get(trade.symbol);



        if(candle == undefined || bucketTime > candle.timestamp){
            if(candle){
                candle.isClosed = true;
                // console.log("Closed Candle: ", this.currentCandle);
                this.emit('candle_closed', candle);
            }

            candle = {
                symbol: trade.symbol,
                interval: "1m",
                timestamp: bucketTime,
                open: Number(trade.price),
                high: Number(trade.price),
                low: Number(trade.price),
                close: Number(trade.price),
                volume: Number(trade.quantity),
                isClosed: false,
            }

            // update and save current candle
            this.currentCandle.set(trade.symbol, candle);
        }else if(bucketTime === candle.timestamp){
            candle.high = Math.max(candle.high, Number(trade.price));
            candle.low = Math.min(candle.low, Number(trade.price));
            candle.close = Number(trade.price);
            candle.volume += Number(trade.quantity);
            
            // console.log("Updated Candle: ", this.currentCandle);    
            this.emit('candle_update', candle);
        }
    }
}