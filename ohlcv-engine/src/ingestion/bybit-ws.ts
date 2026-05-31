import WebSocket from 'ws';
import type { Candle, TradeEvent } from '../types/index.js';
import { OHLCVAggregator } from '../engine/aggregator.js';
import { RedisPublisher } from '../storage/redis-publisher.js';
import { DerivedIntervalManager } from '../engine/derived-intervals.js';

class ByBitWS {
    private ws: WebSocket | null = null;
    private readonly url: string;

    private aggregator = new OHLCVAggregator();
    private redis = new RedisPublisher();
    private derivedManager = new DerivedIntervalManager();

    constructor(url: string = "wss://stream.bybit.com/v5/public/linear") {
        this.url = url;

        this.aggregator.on('candle_update', (candle1m: Candle) => {
            this.redis.publishLiveUpdate(candle1m);
        });

        // for 1m candle
        this.aggregator.on('candle_closed', (candle1m: Candle) => {
            this.redis.saveHistoricalCandles(candle1m);

            this.derivedManager.process1mCandle(candle1m);
        });

        // for 5m candle
        this.derivedManager.on('candle_closed', (candle5m: Candle)=>{
            this.redis.saveHistoricalCandles(candle5m);
        });

        // for 5m candle
        this.derivedManager.on('candle_update', (candle5m: Candle)=>{
            this.redis.publishLiveUpdate(candle5m);
        })
    }

    connect(): void {
        this.ws = new WebSocket(this.url);
        this.ws.on('open', () => {
            console.log('Connected to Bybit');
            this.subscribe();
        });

        this.ws.on('message', (message) => {
            this.handleMessage(message);

        });

        this.ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });

        this.ws.on('close', () => {
            console.log('Disconnected from Bybit');
        });
    }

    private subscribe(): void {
        if (this.ws) {
            // Sample subscription for BTC/USDT trades
            const subscribeMessage = {
                reqID: "1",
                op: "subscribe",
                args: [
                    "publicTrade.BTCUSDT",
                    "publicTrade.ETHUSDT",
                    "publicTrade.XRPUSDT",
                    "publicTrade.BNBUSDT"
                ]
            };
            this.ws.send(JSON.stringify(subscribeMessage));
        }
    }

    private handleMessage(message: WebSocket.Data): void {
        try {
            const data = JSON.parse(message.toString());
            // console.log('Received message:', data);

            if (data.topic && data.topic.startsWith("publicTrade")) {
                data.data.forEach((trade: any) => {

                    let obj: TradeEvent = {
                        symbol: trade.s,
                        price: trade.p,
                        quantity: trade.v,
                        timestamp: trade.T
                    }

                    this.aggregator.processTrade(obj);
                

                });
            }



        } catch (error) {
            console.error('Error parsing message:', error);
        }
    }

    close(): void {
        if (this.ws) {
            this.ws.close();
        }
    }
}

const feed = new ByBitWS();
feed.connect();


 /**
                     * Received message: {
  topic: 'publicTrade.BTCUSDT',
  type: 'snapshot',
  ts: 1780142093283,
  data: [
    {
      T: 1780142093282,
      s: 'BTCUSDT',
      S: 'Buy',
      v: '0.024',
      p: '73560.40',
      L: 'PlusTick',
      i: 'b849ced9-e35c-53d8-8ae6-f871e2cf0006',
      BT: false,
      RPI: false,
      seq: 580963970424
    }
  ]
}
                     */