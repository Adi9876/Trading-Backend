// 📝 Assignment 1: Define the core types for the Orderbook

// 1. Define an enum for Side (Buy, Sell)
export enum Side {
    BUY = "BUY",
    SELL = "SELL",
}

// 2. Define an enum for OrderType (Limit, Market)
export enum OrderType {
    LIMIT = "LIMIT",
    MARKET = "MARKET",
}

// 3. Define the Order interface
export interface Order {
    id: string;          // Unique ID for the order
    price: number;       // The price the user wants
    quantity: number;    // How much they want to trade
    side: Side;          // Buy or Sell
    type: OrderType;     // Limit or Market
    timestamp: number;   // When the order was placed
}

export interface OrderBookSnapshot {
    bids: { price: number, quantity: number }[];
    asks: { price: number, quantity: number }[];
}