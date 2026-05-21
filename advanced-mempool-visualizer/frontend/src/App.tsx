import { useEffect, useState, useRef } from "react";
import { MempoolBlockGrid } from "./components/MempoolBlockGrid";

interface RawTx {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  gasPrice: string;
  data: string;
}

interface Tx extends RawTx {
  to: string; // normal string representation
  decodedType: string;
  ethValue: string;
  gweiGasPrice: string;
}

// Known function selectors to decode transaction types on the frontend
const SELECTORS: { [key: string]: string } = {
  "0xa9059cbb": "ERC20_TRANSFER",
  "0x095ea7b3": "ERC20_APPROVE",
  "0x38ed1739": "UNISWAP_SWAP",
  "0x18cbafe5": "UNISWAP_SWAP",
  "0x5c11d2de": "UNISWAP_SWAP",
  "0x7ff36ab5": "UNISWAP_SWAP",
  "0xf3056c7f": "UNISWAP_SWAP",
  "0x4a25d94a": "UNISWAP_SWAP",
  "0x88316474": "UNISWAP_SWAP",
  "0x2289b18c": "UNISWAP_SWAP",
  "0xac9650d8": "UNISWAP_SWAP",
};

function App() {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [selectedTx, setSelectedTx] = useState<Tx | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [connected, setConnected] = useState(false);

  // Stats
  const [totalCount, setTotalCount] = useState(0);
  const [tps, setTps] = useState("0.0");
  const [avgGas, setAvgGas] = useState("0.0");
  const [totalVolume, setTotalVolume] = useState("0.00");

  // Filters state
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [minGas, setMinGas] = useState<number>(0);
  const [minEth, setMinEth] = useState<number>(0);

  const txTimesRef = useRef<number[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // Decodes the raw input data hex to identify tx type
  const decodeType = (data: string): string => {
    if (!data || data === "0x") {
      return "ETH_TRANSFER";
    }
    const sig = data.slice(0, 10).toLowerCase();
    if (SELECTORS[sig]) {
      return SELECTORS[sig];
    }
    if (data.length > 10) {
      return "CONTRACT_CALL";
    }
    return "UNKNOWN";
  };

  // Convert Wei string to ETH
  const weiToEth = (weiStr: string): string => {
    try {
      const wei = parseFloat(weiStr);
      if (isNaN(wei)) return "0";
      return (wei / 1e18).toString();
    } catch {
      return "0";
    }
  };

  // Convert Wei string to Gwei
  const weiToGwei = (weiStr: string): string => {
    try {
      const wei = parseFloat(weiStr);
      if (isNaN(wei)) return "0";
      return (wei / 1e9).toString();
    } catch {
      return "0";
    }
  };

  // Connect to WebSocket with auto-reconnection
  useEffect(() => {
    const connect = () => {
      console.log("Connecting to WebSocket...");
      const ws = new WebSocket("ws://localhost:4000");
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const rawTx: RawTx = JSON.parse(event.data);
          
          const ethVal = weiToEth(rawTx.value);
          const gweiGas = weiToGwei(rawTx.gasPrice);
          const txType = decodeType(rawTx.data);

          const parsedTx: Tx = {
            ...rawTx,
            to: rawTx.to || "Contract Creation",
            decodedType: txType,
            ethValue: ethVal,
            gweiGasPrice: gweiGas,
          };

          setTotalCount((prev) => prev + 1);

          // Track arrival times for rolling TPS (last 10 seconds)
          const now = Date.now();
          txTimesRef.current.push(now);

          setTxs((prev) => [parsedTx, ...prev.slice(0, 59)]); // Limit pool to 60 in memory
        } catch (err) {
          console.error("Error parsing websocket message", err);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected, retrying in 3s...");
        setConnected(false);
        setTimeout(connect, 3000);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error", error);
        ws.close();
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Update TPS every second based on rolling window
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const cutoff = now - 10000; // 10 seconds ago
      // Filter out times older than 10 seconds
      txTimesRef.current = txTimesRef.current.filter((t) => t > cutoff);
      const currentTps = (txTimesRef.current.length / 10).toFixed(1);
      setTps(currentTps);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Calculate live stats (Average Gas and volume from current list)
  useEffect(() => {
    if (txs.length === 0) return;

    // Average Gas price (Gwei)
    const totalGas = txs.reduce((sum, tx) => sum + parseFloat(tx.gweiGasPrice), 0);
    setAvgGas((totalGas / txs.length).toFixed(1));

    // Total ETH Volume
    const totalEth = txs.reduce((sum, tx) => sum + parseFloat(tx.ethValue), 0);
    setTotalVolume(totalEth.toFixed(4));
  }, [txs]);

  // Handle address/hash copy
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Open inspection drawer/modal
  const handleSelectTx = (tx: Tx) => {
    setSelectedTx(tx);
    setIsModalOpen(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Filtered transactions list
  const filteredTxs = txs.filter((tx) => {
    // Search text filter
    const matchesSearch =
      search === "" ||
      tx.hash.toLowerCase().includes(search.toLowerCase()) ||
      tx.from.toLowerCase().includes(search.toLowerCase()) ||
      tx.to.toLowerCase().includes(search.toLowerCase());

    // Type filter
    const matchesType = filterType === "ALL" || tx.decodedType === filterType;

    // Gas threshold
    const matchesGas = parseFloat(tx.gweiGasPrice) >= minGas;

    // Value threshold
    const matchesValue = parseFloat(tx.ethValue) >= minEth;

    return matchesSearch && matchesType && matchesGas && matchesValue;
  });

  return (
    <>
      <header>
        <div className="brand-section">
          <div className="brand-logo">ETH MEMPOOL VISUALIZER</div>
          <div className="status-badge">
            <span className={`status-dot ${connected ? "connected" : "disconnected"}`} />
            {connected ? "LIVE" : "DISCONNECTED"}
          </div>
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
          FEED BUFFER: {txs.length} / 60
        </div>
      </header>

      {/* Stats Board */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Transactions Detected</div>
          <div className="stat-value">{totalCount}</div>
          <div className="stat-desc">Since session started</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Current Flow TPS</div>
          <div className="stat-value" style={{ color: "var(--accent-purple)" }}>
            {tps} <span style={{ fontSize: "14px", fontWeight: "normal" }}>tx/s</span>
          </div>
          <div className="stat-desc">Rolling 10-second window</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Average Gas Price</div>
          <div className="stat-value" style={{ color: "var(--accent-orange)" }}>
            {avgGas} <span style={{ fontSize: "14px", fontWeight: "normal" }}>Gwei</span>
          </div>
          <div className="stat-desc">Calculated from pool</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Volume Seen</div>
          <div className="stat-value" style={{ color: "var(--accent-cyan)" }}>
            {totalVolume} <span style={{ fontSize: "14px", fontWeight: "normal" }}>ETH</span>
          </div>
          <div className="stat-desc">Accumulated in feed buffer</div>
        </div>
      </section>

      {/* Workspace Area */}
      <main className="dashboard-workspace">
        {/* Left Side: Block Grid Visualizer */}
        <section className="visualizer-container">
          <div className="visualizer-header">
            <div className="visualizer-title">✦ Realtime Transaction Block Grid</div>
            <div style={{ display: "flex", gap: "10px", fontSize: "11px" }}>
              <span style={{ color: "var(--accent-green)" }}>● ETH</span>
              <span style={{ color: "var(--accent-cyan)" }}>● ERC20</span>
              <span style={{ color: "var(--accent-pink)" }}>● Swap</span>
              <span style={{ color: "var(--accent-purple)" }}>● Contract</span>
            </div>
          </div>
          <MempoolBlockGrid
            txs={filteredTxs}
            selectedTx={selectedTx}
            onSelectTx={handleSelectTx}
          />
        </section>

        {/* Right Side: Control & Feed Panel */}
        <section className="sidebar-container">
          {/* Filtering Section */}
          <div className="filter-section">
            <input
              type="text"
              placeholder="Search by address or transaction hash..."
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="filter-row">
              {["ALL", "ETH_TRANSFER", "ERC20_TRANSFER", "UNISWAP_SWAP", "CONTRACT_CALL"].map((type) => (
                <button
                  key={type}
                  className={`filter-btn ${filterType === type ? "active" : ""}`}
                  onClick={() => setFilterType(type)}
                >
                  {type.replace("_", " ")}
                </button>
              ))}
            </div>

            <div className="slider-container">
              <div className="slider-label">
                <span>Min Gas Price:</span>
                <span className="slider-val">{minGas} Gwei</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                step="5"
                value={minGas}
                onChange={(e) => setMinGas(parseInt(e.target.value))}
              />
            </div>

            <div className="slider-container">
              <div className="slider-label">
                <span>Min ETH Value:</span>
                <span className="slider-val">{minEth} ETH</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={minEth}
                onChange={(e) => setMinEth(parseFloat(e.target.value))}
              />
            </div>
          </div>

          {/* List Stream Section */}
          <div className="feed-header">
            <span className="feed-title">Pending Transactions Feed</span>
            <span className="feed-count">{filteredTxs.length} displayed</span>
          </div>

          <div className="feed-list">
            {filteredTxs.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 20px", fontSize: "13px" }}>
                No matching transactions in buffer
              </div>
            ) : (
              filteredTxs.map((tx) => (
                <div
                  key={tx.hash}
                  className={`tx-card ${selectedTx?.hash === tx.hash ? "selected" : ""}`}
                  onClick={() => handleSelectTx(tx)}
                >
                  <div className="tx-card-top">
                    <span className={`tx-badge badge-${
                      tx.decodedType === "ETH_TRANSFER" ? "eth" :
                      tx.decodedType === "ERC20_TRANSFER" ? "erc20" :
                      tx.decodedType === "ERC20_APPROVE" ? "approve" :
                      tx.decodedType === "UNISWAP_SWAP" ? "swap" :
                      tx.decodedType === "CONTRACT_CALL" ? "contract" : "unknown"
                    }`}>
                      {tx.decodedType.replace("_", " ")}
                    </span>
                    <span className="tx-gas">
                      Gas: <span className="tx-gas-value">{parseFloat(tx.gweiGasPrice).toFixed(1)}</span> Gwei
                    </span>
                  </div>

                  <div className="tx-hash" title={tx.hash}>
                    {tx.hash}
                  </div>

                  <div className="tx-card-bottom">
                    <div className="tx-address-flow">
                      <span className="address-short">{tx.from.slice(0, 6)}...{tx.from.slice(-4)}</span>
                      <span>→</span>
                      <span className="address-short">
                        {tx.to === "Contract Creation" ? "Deploy" : `${tx.to.slice(0, 6)}...${tx.to.slice(-4)}`}
                      </span>
                    </div>

                    <div className="tx-value-label">
                      {parseFloat(tx.ethValue) > 0 ? (
                        <>
                          <span className="eth-symbol">Ξ</span>
                          {parseFloat(tx.ethValue).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>-</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Details Inspect Modal */}
      <div className={`modal-overlay ${isModalOpen ? "open" : ""}`} onClick={handleCloseModal}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Transaction Details</h2>
            <button className="close-btn" onClick={handleCloseModal}>&times;</button>
          </div>

          {selectedTx && (
            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <div className="detail-value" style={{ textTransform: "uppercase", fontWeight: "bold", color: "var(--accent-orange)" }}>
                  PENDING IN MEMPOOL
                </div>
              </div>

              <div className="detail-row">
                <span className="detail-label">Decoded Action Type</span>
                <div className="detail-value">
                  <span className={`tx-badge badge-${
                    selectedTx.decodedType === "ETH_TRANSFER" ? "eth" :
                    selectedTx.decodedType === "ERC20_TRANSFER" ? "erc20" :
                    selectedTx.decodedType === "ERC20_APPROVE" ? "approve" :
                    selectedTx.decodedType === "UNISWAP_SWAP" ? "swap" :
                    selectedTx.decodedType === "CONTRACT_CALL" ? "contract" : "unknown"
                  }`}>
                    {selectedTx.decodedType.replace("_", " ")}
                  </span>
                </div>
              </div>

              <div className="detail-row">
                <span className="detail-label">Tx Hash</span>
                <div className="detail-value detail-value-mono">
                  {selectedTx.hash}
                  <button className="copy-btn" onClick={() => handleCopy(selectedTx.hash)}>Copy</button>
                </div>
              </div>

              <div className="detail-row">
                <span className="detail-label">From Address</span>
                <div className="detail-value detail-value-mono">
                  {selectedTx.from}
                  <button className="copy-btn" onClick={() => handleCopy(selectedTx.from)}>Copy</button>
                </div>
              </div>

              <div className="detail-row">
                <span className="detail-label">To Address</span>
                <div className="detail-value detail-value-mono">
                  {selectedTx.to}
                  {selectedTx.to !== "Contract Creation" && (
                    <button className="copy-btn" onClick={() => handleCopy(selectedTx.to)}>Copy</button>
                  )}
                </div>
              </div>

              <div className="detail-row">
                <span className="detail-label">Value</span>
                <div className="detail-value">
                  <span>{parseFloat(selectedTx.ethValue).toLocaleString(undefined, { maximumFractionDigits: 18 })} ETH</span>
                  <span style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                    ({selectedTx.value} wei)
                  </span>
                </div>
              </div>

              <div className="detail-row">
                <span className="detail-label">Gas Price</span>
                <div className="detail-value">
                  <span>{parseFloat(selectedTx.gweiGasPrice).toFixed(4)} Gwei</span>
                  <span style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                    ({selectedTx.gasPrice} wei)
                  </span>
                </div>
              </div>

              <div className="detail-row">
                <span className="detail-label">Raw Hex Input Data</span>
                <div className="detail-value detail-value-mono data-box">
                  {selectedTx.data}
                </div>
                <div style={{ textAlign: "right" }}>
                  <button className="copy-btn" style={{ margin: "4px 0 0" }} onClick={() => handleCopy(selectedTx.data)}>
                    Copy Input Data
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="modal-actions">
            {selectedTx && (
              <a
                href={`https://etherscan.io/tx/${selectedTx.hash}`}
                target="_blank"
                rel="noreferrer"
                className="etherscan-btn"
              >
                Inspect on Etherscan ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default App;