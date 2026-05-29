import { z } from 'zod';

const bookEntrySchema = z.array(
    z.tuple([
        z.string(),
        z.string()
    ])
);

const BybitOrderBookMessageSchema = z.object({
    topic: z.string(),
    type: z.enum(['snapshot', 'delta']),
    cs: z.boolean().optional(),
    ts: z.number(),
    data: z.object({
        s: z.string(),
        b: bookEntrySchema,
        a: bookEntrySchema,
        seq: z.number().optional()
    })
});

export type OrderBookEvent = {
    type: 'ORDERBOOK_SNAPSHOT' | 'ORDERBOOK_DELTA';
    symbol: string;
    bids: Array<{ price: number; size: number }>;
    asks: Array<{ price: number; size: number }>;
    timestamp: number;
}


export function normalizeBybitMessage(rawMsg: any): OrderBookEvent | null {
    // Ignore ping/pong and subscription success messages quietly
    if (rawMsg.op === 'ping' || rawMsg.success === true) {
        return null;
    }

    const parsed = BybitOrderBookMessageSchema.safeParse(rawMsg);
    
    if (!parsed.success) {
        console.error('Failed to parse Bybit message:', parsed.error);
        return null;
    }

    const {data: validDara} = parsed;
    const eventType = validDara.type === 'snapshot' ? 'ORDERBOOK_SNAPSHOT' : 'ORDERBOOK_DELTA';
    
    return {
        type: eventType,
        symbol: validDara.data.s,
        bids: validDara.data.b.map(([price, size]) => ({
            price: parseFloat(price),
            size: parseFloat(size)
        })),
        asks: validDara.data.a.map(([price, size]) => ({
            price: parseFloat(price),
            size: parseFloat(size)
        })),
        timestamp: validDara.ts
    };
}