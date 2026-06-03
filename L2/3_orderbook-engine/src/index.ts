import { OrderBook } from "./engine/orderbook.js";
import { OrderType, Side } from "./types/index.js";

const book = new OrderBook();

// Listen to our new snapshot event!
book.on('snapshot', (snapshot) => {
    console.log("\n📊 L2 ORDERBOOK SNAPSHOT:");
    console.log("ASKS (Sellers):", snapshot.asks.map(a => `$${a.price}: ${a.quantity} BTC`));
    console.log("BIDS (Buyers): ", snapshot.bids.map(b => `$${b.price}: ${b.quantity} BTC`));
    console.log("------------------------");
});

console.log("1. Adding some Limit Orders (Shopkeepers setting up)...");
book.addOrder({ id: "1", type: OrderType.LIMIT, side: Side.SELL, price: 71000, quantity: 2, timestamp: Date.now() });
book.addOrder({ id: "2", type: OrderType.LIMIT, side: Side.SELL, price: 71000, quantity: 3, timestamp: Date.now() });
book.addOrder({ id: "3", type: OrderType.LIMIT, side: Side.SELL, price: 72000, quantity: 10, timestamp: Date.now() });

book.addOrder({ id: "4", type: OrderType.LIMIT, side: Side.BUY, price: 69000, quantity: 5, timestamp: Date.now() });
book.addOrder({ id: "5", type: OrderType.LIMIT, side: Side.BUY, price: 68500, quantity: 2, timestamp: Date.now() });

setTimeout(() => {
    console.log("\n2. Market Buy Order arrives for 4 BTC! (Hungry Tourist)");
    book.addOrder({ id: "6", type: OrderType.MARKET, side: Side.BUY, price: 0, quantity: 4, timestamp: Date.now() });
}, 1000);
