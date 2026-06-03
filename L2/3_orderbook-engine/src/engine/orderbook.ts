import { type Order, Side, OrderType, type OrderBookSnapshot } from "../types/index.js";
import EventEmitter from "events";

export class OrderBook extends EventEmitter {
    private bidsMap: Map<number, Order[]> = new Map();
    private bidsPrice: number[] = [];

    private asksMap: Map<number, Order[]> = new Map();
    private asksPrice: number[] = [];

    private activeOrders: Map<string, Order> = new Map();

    // using binary search for better and faster insertion and sorting in price array
    private insertSorted(array: number[], element: number, compareFn: (a: number, b: number) => number) {
        let low = 0;
        let high = array.length;
        while (low < high) {
            let mid = (low + high) >> 1;
            if (compareFn(array[mid]!, element) < 0) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }
        array.splice(low, 0, element);
    }

    public addOrder(order: Order) {
        if (order.type === OrderType.LIMIT) {
            this.addLimitOrder(order);
        }
        else if (order.type === OrderType.MARKET) {
            this.matchMarketOrder(order);
        }
    }

    public addLimitOrder(order: Order) {
        if (order.side === Side.BUY) {
            if (!this.bidsMap.has(order.price)) {
                this.bidsMap.set(order.price, []);
                this.insertSorted(this.bidsPrice, order.price, (a, b) => b - a);
            }
            this.bidsMap.get(order.price)!.push(order);
        } else {
            if (!this.asksMap.has(order.price)) {
                this.asksMap.set(order.price, []);
                this.insertSorted(this.asksPrice, order.price, (a, b) => a - b);
            }
            this.asksMap.get(order.price)!.push(order);
        }

        this.activeOrders.set(order.id, order);

        this.emit('snapshot', this.getSnapshot());
    }

    public cancelOrder(id: string) {
        const order = this.activeOrders.get(id)
        if (!order) return;
        if (order.side === Side.BUY) {
            const orders = this.bidsMap.get(order.price)
            if (orders) {
                const index = orders.findIndex((o) => o.id === id)
                if (index !== -1) {
                    orders.splice(index, 1);
                    this.activeOrders.delete(id);
                    if (orders.length === 0) {
                        this.bidsMap.delete(order.price);
                        this.bidsPrice = this.bidsPrice.filter((p) => p !== order.price);
                    }
                }
            }
        } else {
            const orders = this.asksMap.get(order.price)
            if (orders) {
                const index = orders.findIndex((o) => o.id === id)
                if (index !== -1) {
                    orders.splice(index, 1);
                    this.activeOrders.delete(id);
                    if (orders.length === 0) {
                        this.asksMap.delete(order.price);
                        this.asksPrice = this.asksPrice.filter((p) => p !== order.price);
                    }
                }
            }
        }
        this.emit('snapshot', this.getSnapshot());
    }

    // market 
    public matchMarketOrder(order: Order) {
        if (order.side === Side.BUY) {

            while (order.quantity > 0 && this.asksPrice.length > 0) {
                const bestAskPrice = this.asksPrice[0];
                const queue = this.asksMap.get(bestAskPrice!);

                // oldest order at this price
                const matchingOrder = queue![0];

                const tradeQuantity = Math.min(order.quantity, matchingOrder!.quantity);

                console.log(`Trade Executed with ${tradeQuantity} at ${bestAskPrice}`);

                // logic for partial fill for both orders
                // reduce both order quantities
                order.quantity -= tradeQuantity;
                matchingOrder!.quantity -= tradeQuantity;

                if (matchingOrder?.quantity === 0) {
                    queue?.shift();
                    this.activeOrders.delete(matchingOrder!.id);

                    if (queue?.length === 0) {
                        this.asksPrice.shift();
                        this.asksMap.delete(bestAskPrice!);
                    }
                }

                // if market order still has quantity left 
                if (order.quantity > 0) {
                    console.log(`Market order partially filled. remaining: ${order.quantity}`);
                }
            }
        } else {

            while (order.type === OrderType.MARKET && order.quantity > 0 && this.bidsPrice.length > 0) {
                const bestBidPrice = this.bidsPrice[0];
                const queue = this.bidsMap.get(bestBidPrice!);

                // oldest order at this price
                const matchingOrder = queue![0];

                const tradeQuantity = Math.min(order.quantity, matchingOrder!.quantity);

                console.log(`Trade Executed with ${tradeQuantity} at ${bestBidPrice}`);

                // logic for partial fill for both orders
                // reduce both order quantities
                order.quantity -= tradeQuantity;
                matchingOrder!.quantity -= tradeQuantity;

                if (matchingOrder?.quantity === 0) {
                    queue?.shift();
                    this.activeOrders.delete(matchingOrder!.id);

                    if (queue?.length === 0) {
                        this.bidsPrice.shift();
                        this.bidsMap.delete(bestBidPrice!);
                    }
                }

                // if market order still has quantity left 
                if (order.quantity > 0) {
                    console.log(`Market order partially filled. remaining: ${order.quantity}`);
                }
            }
        }
        this.emit('snapshot', this.getSnapshot());
    }

    public getSnapshot(depth: number = 10): OrderBookSnapshot {
        const bids: { price: number, quantity: number }[] = [];
        const asks: { price: number, quantity: number }[] = [];

        for (let i = 0; i < Math.min(depth, this.bidsPrice.length); i++) {
            const price = this.bidsPrice[i]!;
            const orders = this.bidsMap.get(price)!;
            bids.push({
                price,
                quantity: orders.reduce((acc, o) => acc + o.quantity, 0),
            })
        }

        for (let i = 0; i < Math.min(depth, this.asksPrice.length); i++) {
            const price = this.asksPrice[i]!;
            const orders = this.asksMap.get(price)!;
            asks.push({
                price,
                quantity: orders.reduce((acc, o) => acc + o.quantity, 0),
            })
        }

        return {
            bids,
            asks,
        }
    }
}


