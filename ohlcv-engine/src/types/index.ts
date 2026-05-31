// We will define our TradeEvent type here soon
export interface TradeEvent {
    symbol: string;
    price: string;
    quantity: string;
    timestamp: number;
}

export interface Candle{
    symbol: string,
    interval: string,
    timestamp: number,
    open: number,
    high: number,
    low: number,
    close: number,
    volume: number
    isClosed: boolean,
}