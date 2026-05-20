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

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:4000');

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
    }, [])

    return (
        <div style={{ padding: "20px" }}>
            <h1>BTCUSDT Live Order Book</h1>

            <div
                style={{
                    display: "flex",
                    gap: "40px",
                }}
            >
                {/* BIDS */}
                <div>
                    <h2>Bids</h2>

                    {book.bids.map(([price, qty], index) => (
                        <div key={index}>
                            <span>{price}</span>
                            {" | "}
                            <span>{qty}</span>
                        </div>
                    ))}
                </div>

                {/* ASKS */}
                <div>
                    <h2>Asks</h2>

                    {book.asks.map(([price, qty], index) => (
                        <div key={index}>
                            <span>{price}</span>
                            {" | "}
                            <span>{qty}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default App;