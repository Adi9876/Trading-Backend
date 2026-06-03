import { EventEmitter } from "events";
import type { Candle } from "../types/index.js";
import { getBucketFloorTimestamp } from "../utils/time.js";

export class DerivedIntervalManager extends EventEmitter {
    private current5mCandles: Map<string, Candle> = new Map();


    public process1mCandle(candle1m: Candle) {
        const bucketTime5m = getBucketFloorTimestamp(candle1m.timestamp, 5);

        let candle5m = this.current5mCandles.get(candle1m.symbol);

        if (!candle5m || bucketTime5m > candle5m.timestamp) {
            // Close previous candle
            if (candle5m) {
                candle5m.isClosed = true;
                this.emit("candle_closed", candle5m);
            }

            candle5m = {
                symbol: candle1m.symbol,
                interval: "5m",
                timestamp: bucketTime5m,
                open: Number(candle1m.open),
                high: Number(candle1m.high),
                low: Number(candle1m.low),
                close: Number(candle1m.close),
                volume: Number(candle1m.volume),
                isClosed: false,
            };
            this.current5mCandles.set(candle1m.symbol, candle5m);
        } 
        else if (bucketTime5m === candle5m.timestamp) {
            candle5m.high = Math.max(candle5m.high, Number(candle1m.high));
            candle5m.low = Math.min(candle5m.low, Number(candle1m.low));
            candle5m.close = Number(candle1m.close);
            candle5m.volume += Number(candle1m.volume);
            this.emit("candle_update", candle5m);
        }
    }


}