# Real-Time OHLCV Engine

## What I Built

I created a Node.js microservice (`ohlcv-engine`) that sits between the exchange (Bybit) and the internal databases/strategies. 

### The Pipeline

1. **Ingestion (`bybit-ws.ts`)**
   * Connects to Bybit's V5 linear public trade stream.
   * Receives messy, exchange-specific JSON payloads.
   * Normalizes them into clean, universal `TradeEvent` objects.

2. **Time Bucketing (`time.ts`)**
   * Uses `Math.floor(timestampMs / bucketMs) * bucketMs` to mathematically "snap" any trade to the exact minute boundary it belongs to.

3. **The State Machine (`aggregator.ts`)**
   * Maintains a "current candle" in memory.
   * Compares incoming trade buckets against the current candle's bucket.
   * **Updates** the High, Low, Close, and Volume for trades in the current minute.
   * **Closes** the old candle and **Opens** a new one the millisecond a trade arrives for the next minute.
   * *Decoupled*: It extends `EventEmitter` so it only focuses on math, not on storage.

4. **Persistence & Broadcasting (`redis-publisher.ts`)**
   * Listens to the `candle_update` and `candle_closed` events.
   * Updates a static key (`redis.set`) for REST APIs.
   * Broadcasts to a Pub/Sub topic (`redis.publish`) for real-time WebSocket clients.
   * Appends to a historical list (`redis.rpush`) when a candle finalizes.

5. **Multi-Symbol Scaling**
   * Uses a `Map<string, Candle>` to track the state of hundreds of assets simultaneously without cross-contamination.
   
6. **Derived Intervals**
   * Listens to the `1m` output of the Aggregator.
   * Groups five `1m` candles together using mathematical boundary snapping to produce `5m` candles.
   * Emits these derived candles back into Redis without opening additional exchange connections!

## Why This Architecture?

> **Separation of Concerns**
> By splitting the logic into Ingestion, Aggregation, and Storage, I can easily swap parts out later. If I want to connect to Binance tomorrow, I only write a new `binance-ws.ts` ingestion file. The Aggregator and Redis logic remain 100% unchanged!

> **Event-Driven Design**
> Using `EventEmitter` prevents the Aggregator from blocking. It instantly fires the event and goes back to processing trades, allowing Redis to handle the networking I/O in the background.


