import { useEffect, useState } from "react";

interface OrderBook {
    bids: [string, string][];
    asks: [string, string][];
}

function App() {
    const [book, setBook] = useState<OrderBook>({
        bids: [],
        asks: []
    });

    const [pair, setPair] = useState("btcusdt");

    useEffect(() => {
        const ws = new WebSocket(
            `ws://localhost:4000?symbol=${pair}`
        );

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setBook({
                bids: data.b || [],
                asks: data.a || []
            });
        }
        return () => {
            ws.close();
        }
    }, [pair])


    // Spread calculation
    const bestBid = book.bids[0]
        ? Number(book.bids[0][0])
        : 0;

    const bestAsk = book.asks[0]
        ? Number(book.asks[0][0])
        : 0;

    const spread = bestAsk - bestBid;

    // max for bars
    const maxBidQty = Math.max(
        ...book.bids.map(([, qty]) => Number(qty)),
        1
    );
    const maxAskQty = Math.max(
        ...book.asks.map(([, qty]) => Number(qty)),
        1
    );
    return (
        <div style={{ padding: "20px" }}>

            <div style={{ marginBottom: "20px" }}>
                <button onClick={() => setPair("btcusdt")}>
                    BTCUSDT
                </button>

                <button onClick={() => setPair("ethusdt")}>
                    ETHUSDT
                </button>

                <button onClick={() => setPair("solusdt")}>
                    SOLUSDT
                </button>
            </div>
            <h1>{pair.toUpperCase()} Live Order Book</h1>

            <div
                style={{
                    display: "flex",
                    gap: "40px",
                }}
            >
                {/* BIDS */}
                <div style={{ color: 'green', minWidth: '250px' }}>
                    <h2>Bids</h2>

                    {book.bids.map(([price, qty], index) => {
                        const barWidth =
                            (Number(qty) / maxBidQty) * 100;

                        return (
                            <div
                                key={index}
                                style={{
                                    position: 'relative',
                                    padding: '4px',
                                    marginBottom: '2px',
                                    overflow: 'hidden'
                                }}
                            >
                                {/* Volume Bar */}
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: `${barWidth}%`,
                                        background: 'rgba(0,255,0,0.2)',
                                        zIndex: 0
                                    }}
                                />

                                {/* Text */}
                                <div
                                    style={{
                                        position: 'relative',
                                        zIndex: 1
                                    }}
                                >
                                    {price} | {qty}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ASKS */}
                <div style={{ color: 'red', minWidth: '250px' }}>
                    <h2>Asks</h2>

                    {book.asks.map(([price, qty], index) => {
                        const barWidth =
                            (Number(qty) / maxAskQty) * 100;

                        return (
                            <div
                                key={index}
                                style={{
                                    position: 'relative',
                                    padding: '4px',
                                    marginBottom: '2px',
                                    overflow: 'hidden'
                                }}
                            >
                                {/* Volume Bar */}
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: `${barWidth}%`,
                                        background: 'rgba(255,0,0,0.2)',
                                        zIndex: 0
                                    }}
                                />

                                {/* Text */}
                                <div
                                    style={{
                                        position: 'relative',
                                        zIndex: 1
                                    }}
                                >
                                    {price} | {qty}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* SPREAD */}
                <div style={{ color: 'white' }}>
                    <h2>Spread</h2>

                    <span>{spread.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
}

export default App;