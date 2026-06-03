import type { OrderBookEvent } from "../normalizer/bybit.js";

export class OrderBookService {
    private bids = new Map<number,number>();
    private asks = new Map<number,number>();

    public processEvent(event: OrderBookEvent){
        if(event.type === 'ORDERBOOK_SNAPSHOT') {
            this.bids.clear();
            this.asks.clear();
            
            // inserting new maps
            event.bids.forEach(({price,size}) => this.bids.set(price,size));
            event.asks.forEach(({price,size}) => this.asks.set(price,size));
        }
        else if(event.type === 'ORDERBOOK_DELTA') {
            // Loop through event.bids and event.asks.
            // If size is 0, delete it from the map.
            // Otherwise, set it in the map.
            event.bids.forEach(({price,size}) => {
                if(size === 0){
                    this.bids.delete(price);
                } else {
                    this.bids.set(price,size);
                }
            });
            
            event.asks.forEach(({price,size}) => {
                if(size === 0){
                    this.asks.delete(price);
                } else {
                    this.asks.set(price,size);
                }
            });
        }
    }

    public getSnapshot(depth = 50){
        // Maps iterate in insertion order, not numerical order.
        // For an order book, clients expect:
        // Bids: Highest price first (Descending)
        // Asks: Lowest price first (Ascending)
        const sortedBids = Array.from(this.bids.entries())
            .sort((a, b) => b[0] - a[0])
            .slice(0, depth);
            
        const sortedAsks = Array.from(this.asks.entries())
            .sort((a, b) => a[0] - b[0])
            .slice(0, depth);

        return {
            bids: sortedBids,
            asks: sortedAsks,
        };
    }
}