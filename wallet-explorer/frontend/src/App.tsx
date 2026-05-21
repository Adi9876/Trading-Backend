import { useState } from "react";
import axios from "axios";
import "./App.css";

// Network metadata for UI styling
const NETWORK_DETAILS = {
  ethereum: {
    name: "Ethereum",
    color: "#627EEA",
    bgColor: "linear-gradient(135deg, #627eea 0%, #8c8bfb 100%)",
    symbol: "ETH",
    icon: (
      <svg className="net-icon" viewBox="0 0 784 1277" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M392 0L383.5 28.8V867.7L392 876.2L784 645L392 0Z" fill="#343434" fillOpacity="0.4"/>
        <path d="M392 0L0 645L392 876.2V468.8V0Z" fill="#343434" fillOpacity="0.6"/>
        <path d="M392 956L387.2 961.8V1267.8L392 1277L784.3 725.2L392 956Z" fill="#343434" fillOpacity="0.4"/>
        <path d="M392 1277V956L0 725.2L392 1277Z" fill="#343434" fillOpacity="0.6"/>
        <path d="M392 876.2L784 645L392 468.8V876.2Z" fill="#343434" fillOpacity="0.2"/>
        <path d="M0 645L392 876.2V468.8L0 645Z" fill="#343434" fillOpacity="0.5"/>
      </svg>
    )
  },
  base: {
    name: "Base",
    color: "#0052FF",
    bgColor: "linear-gradient(135deg, #0052FF 0%, #0099FF 100%)",
    symbol: "ETH",
    icon: (
      <svg className="net-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="#0052FF"/>
        <circle cx="12" cy="12" r="6" fill="#FFFFFF"/>
      </svg>
    )
  },
  arbitrum: {
    name: "Arbitrum",
    color: "#28A0F0",
    bgColor: "linear-gradient(135deg, #28A0F0 0%, #0052FF 100%)",
    symbol: "ETH",
    icon: (
      <svg className="net-icon" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M128 0C57.3 0 0 57.3 0 128s57.3 128 128 128 128-57.3 128-128S198.7 0 128 0zm68 152H60l34-60h68l34 60z" fill="#28A0F0"/>
      </svg>
    )
  },
  polygon: {
    name: "Polygon",
    color: "#8247E5",
    bgColor: "linear-gradient(135deg, #8247E5 0%, #A066FF 100%)",
    symbol: "POL",
    icon: (
      <svg className="net-icon" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M29.07 9.4L19 3.6L8.93 9.4V21.1L19 26.9L29.07 21.1V9.4ZM19 7.8L26.65 12.2V21L19 25.4L11.35 21V12.2L19 7.8Z" fill="#8247E5"/>
      </svg>
    )
  },
  bsc: {
    name: "BSC",
    color: "#F3BA2F",
    bgColor: "linear-gradient(135deg, #F3BA2F 0%, #FFD56B 100%)",
    symbol: "BNB",
    icon: (
      <svg className="net-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L4 10L6.83 12.83L12 7.66L17.17 12.83L20 10L12 2ZM4 14L12 22L20 14L17.17 11.17L12 16.34L6.83 11.17L4 14Z" fill="#F3BA2F"/>
      </svg>
    )
  }
};

interface WalletData {
  address: string;
  network: string;
  nativeCurrency: string;
  balance: string;
  tokens: {
    USDT?: string;
    USDC?: string;
    WETH?: string;
  };
}

interface Transaction {
  hash: string;
  value: string;
  gasFee: string;
  from: string;
  to: string;
  timeStamp: string;
}

interface BlockData {
  blockNumber: number;
  network: string;
  timestamp: number;
  txCount: number;
  miner: string;
  gasUsed: string;
}

function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"wallet" | "block">("wallet");

  // Selection states
  const [selectedNetwork, setSelectedNetwork] = useState<keyof typeof NETWORK_DETAILS>("ethereum");

  // Wallet Explorer States
  const [walletInput, setWalletInput] = useState("");
  const [searchedAddress, setSearchedAddress] = useState("");
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [walletError, setWalletError] = useState("");

  // Block Explorer States
  const [blockInput, setBlockInput] = useState("");
  const [blockData, setBlockData] = useState<BlockData | null>(null);
  const [loadingBlock, setLoadingBlock] = useState(false);
  const [blockError, setBlockError] = useState("");

  // Copy helper
  const [copiedText, setCopiedText] = useState("");
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(""), 2000);
  };

  // Fetch Wallet Balances and Token Balances
  const handleWalletSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setWalletError("");
    setWalletData(null);
    setTransactions([]);

    const cleanAddress = walletInput.trim();
    if (!cleanAddress) {
      setWalletError("Please enter a wallet address");
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(cleanAddress)) {
      setWalletError("Invalid EVM wallet address format");
      return;
    }

    setSearchedAddress(cleanAddress);
    setLoadingBalances(true);
    setLoadingHistory(true);

    // Fetch Balance & Tokens
    try {
      const response = await axios.get(
        `http://localhost:4000/balance/${cleanAddress}?network=${selectedNetwork}`
      );
      setWalletData(response.data);
    } catch (err: any) {
      console.error(err);
      setWalletError(err.response?.data?.error || "Failed to fetch wallet balances");
    } finally {
      setLoadingBalances(false);
    }

    // Fetch History
    try {
      const response = await axios.get(
        `http://localhost:4000/history/${cleanAddress}?network=${selectedNetwork}`
      );
      setTransactions(response.data.transactions || []);
    } catch (err: any) {
      console.error(err);
      // Don't override main wallet error, just log it, or show empty list
    } finally {
      setLoadingHistory(false);
    }
  };

  // Fetch Block details
  const handleBlockSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setBlockError("");
    setBlockData(null);

    const cleanBlock = blockInput.trim();
    if (!cleanBlock) {
      setBlockError("Please enter a block number or 'latest'");
      return;
    }

    setLoadingBlock(true);

    try {
      const response = await axios.get(
        `http://localhost:4000/block/${cleanBlock}?network=${selectedNetwork}`
      );
      setBlockData(response.data);
    } catch (err: any) {
      console.error(err);
      setBlockError(err.response?.data?.error || `Failed to fetch block details`);
    } finally {
      setLoadingBlock(false);
    }
  };

  // Helper to format timestamps
  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Helper to shorten addresses
  const shortenAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="app-container">
      {/* Dynamic Background Gradients */}
      <div className="glow-mesh glow-violet"></div>
      <div className="glow-mesh glow-blue"></div>

      {/* Header Area */}
      <header className="header-glass">
        <div className="header-brand">
          <div className="brand-logo">🌌</div>
          <div>
            <h1 className="brand-title">Aethera</h1>
            <p className="brand-subtitle">Multi-Chain Web3 Explorer</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="navigation-tabs">
          <button
            onClick={() => setActiveTab("wallet")}
            className={`tab-btn ${activeTab === "wallet" ? "active" : ""}`}
          >
            Wallet Explorer
          </button>
          <button
            onClick={() => setActiveTab("block")}
            className={`tab-btn ${activeTab === "block" ? "active" : ""}`}
          >
            Block Explorer
          </button>
        </div>

        {/* Network Selector */}
        <div className="network-selector">
          {Object.entries(NETWORK_DETAILS).map(([key, details]) => (
            <button
              key={key}
              onClick={() => {
                setSelectedNetwork(key as keyof typeof NETWORK_DETAILS);
                // Clear state when switching network to avoid confusion
                setWalletData(null);
                setTransactions([]);
                setBlockData(null);
                setWalletError("");
                setBlockError("");
              }}
              className={`network-chip ${selectedNetwork === key ? "active" : ""}`}
              style={{
                borderColor: selectedNetwork === key ? details.color : "transparent"
              }}
            >
              {details.icon}
              <span>{details.name}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Main Workspace */}
      <main className="content-container">
        {activeTab === "wallet" ? (
          /* WALLET EXPLORER PANEL */
          <div className="panel-fade-in">
            <div className="search-card card-glass">
              <h2>Explore EVM Wallet</h2>
              <p className="search-desc">Query native balance, ERC20 assets, and recent transaction history.</p>
              
              <form onSubmit={handleWalletSearch} className="search-form">
                <div className="input-group">
                  <span className="input-prefix">0x</span>
                  <input
                    type="text"
                    placeholder="Enter EVM Address (e.g. 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045)"
                    value={walletInput}
                    onChange={(e) => setWalletInput(e.target.value)}
                    className="search-input"
                  />
                </div>
                <button type="submit" disabled={loadingBalances || loadingHistory} className="search-submit">
                  {loadingBalances || loadingHistory ? <div className="spinner-small"></div> : "Search"}
                </button>
              </form>

              {walletError && <div className="error-banner">{walletError}</div>}
            </div>

            {/* Balances Display */}
            {loadingBalances && (
              <div className="loading-card card-glass">
                <div className="spinner-large"></div>
                <p>Retrieving wallet balance & ERC20 tokens...</p>
              </div>
            )}

            {walletData && !loadingBalances && (
              <div className="balances-section">
                <div className="section-title-row">
                  <h3>Assets on {NETWORK_DETAILS[selectedNetwork].name}</h3>
                  <div className="address-badge" onClick={() => handleCopy(walletData.address)}>
                    <span>{shortenAddress(walletData.address)}</span>
                    <button className="copy-btn">
                      {copiedText === walletData.address ? "✓ Copied" : "📋"}
                    </button>
                  </div>
                </div>

                <div className="balance-grid">
                  {/* Native Balance Card */}
                  <div
                    className="balance-card native-card"
                    style={{ background: NETWORK_DETAILS[selectedNetwork].bgColor }}
                  >
                    <div className="card-top">
                      <span className="token-symbol">{NETWORK_DETAILS[selectedNetwork].symbol}</span>
                      <span className="token-label">Native Balance</span>
                    </div>
                    <div className="card-value">{parseFloat(walletData.balance).toFixed(5)}</div>
                    <div className="card-network-label">{NETWORK_DETAILS[selectedNetwork].name}</div>
                  </div>

                  {/* ERC20 USDT Card */}
                  <div className="balance-card token-card card-glass">
                    <div className="card-top">
                      <span className="token-symbol usdt-symbol">USDT</span>
                      <span className="token-label">Tether USD</span>
                    </div>
                    <div className="card-value">
                      {walletData.tokens.USDT ? parseFloat(walletData.tokens.USDT).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : "0.00"}
                    </div>
                  </div>

                  {/* ERC20 USDC Card */}
                  <div className="balance-card token-card card-glass">
                    <div className="card-top">
                      <span className="token-symbol usdc-symbol">USDC</span>
                      <span className="token-label">USD Coin</span>
                    </div>
                    <div className="card-value">
                      {walletData.tokens.USDC ? parseFloat(walletData.tokens.USDC).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : "0.00"}
                    </div>
                  </div>

                  {/* ERC20 WETH Card */}
                  <div className="balance-card token-card card-glass">
                    <div className="card-top">
                      <span className="token-symbol weth-symbol">WETH</span>
                      <span className="token-label">Wrapped Ether</span>
                    </div>
                    <div className="card-value">
                      {walletData.tokens.WETH ? parseFloat(walletData.tokens.WETH).toFixed(5) : "0.00000"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Transactions List */}
            {loadingHistory && (
              <div className="loading-card card-glass">
                <div className="spinner-large"></div>
                <p>Fetching transaction history...</p>
              </div>
            )}

            {!loadingHistory && walletData && (
              <div className="transactions-section card-glass">
                <div className="section-header">
                  <h3>Recent Transactions</h3>
                  <span className="tx-count-label">{transactions.length} fetched</span>
                </div>

                {transactions.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📁</div>
                    <p>No transactions found on this network.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="tx-table">
                      <thead>
                        <tr>
                          <th>Tx Hash</th>
                          <th>Direction</th>
                          <th>Value</th>
                          <th>Gas Fee</th>
                          <th>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx) => {
                          const isOutgoing = tx.from.toLowerCase() === searchedAddress.toLowerCase();
                          return (
                            <tr key={tx.hash}>
                              <td className="font-mono">
                                <div className="hash-row">
                                  <span className="tx-hash-full">{shortenAddress(tx.hash)}</span>
                                  <button className="mini-copy-btn" onClick={() => handleCopy(tx.hash)}>
                                    {copiedText === tx.hash ? "✓" : "📋"}
                                  </button>
                                </div>
                              </td>
                              <td>
                                <span className={`direction-badge ${isOutgoing ? "outgoing" : "incoming"}`}>
                                  {isOutgoing ? "OUT" : "IN"}
                                </span>
                              </td>
                              <td className="bold font-mono">
                                {parseFloat(tx.value).toFixed(6)} {NETWORK_DETAILS[selectedNetwork].symbol}
                              </td>
                              <td className="font-mono text-muted">
                                {parseFloat(tx.gasFee).toFixed(6)} {NETWORK_DETAILS[selectedNetwork].symbol}
                              </td>
                              <td className="text-muted">
                                {formatTime(parseInt(tx.timeStamp))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* BLOCK EXPLORER PANEL */
          <div className="panel-fade-in">
            <div className="search-card card-glass">
              <h2>Block Explorer</h2>
              <p className="search-desc">Query details about a specific block index or fetch the latest block.</p>

              <form onSubmit={handleBlockSearch} className="search-form">
                <div className="input-group">
                  <input
                    type="text"
                    placeholder="Enter block number or 'latest'"
                    value={blockInput}
                    onChange={(e) => setBlockInput(e.target.value)}
                    className="search-input"
                  />
                </div>
                <button type="submit" disabled={loadingBlock} className="search-submit">
                  {loadingBlock ? <div className="spinner-small"></div> : "Fetch Block"}
                </button>
              </form>

              {blockError && <div className="error-banner">{blockError}</div>}
            </div>

            {loadingBlock && (
              <div className="loading-card card-glass">
                <div className="spinner-large"></div>
                <p>Querying block index...</p>
              </div>
            )}

            {blockData && !loadingBlock && (
              <div className="block-details-card card-glass">
                <div className="block-header-row">
                  <h3>Block #{blockData.blockNumber}</h3>
                  <div className="network-pill" style={{ backgroundColor: NETWORK_DETAILS[selectedNetwork].color }}>
                    {NETWORK_DETAILS[selectedNetwork].name}
                  </div>
                </div>

                <div className="block-details-grid">
                  <div className="block-detail-item">
                    <span className="detail-label">Timestamp</span>
                    <span className="detail-value">{formatTime(blockData.timestamp)}</span>
                  </div>

                  <div className="block-detail-item">
                    <span className="detail-label">Transactions Count</span>
                    <span className="detail-value font-mono bold">{blockData.txCount} txs</span>
                  </div>

                  <div className="block-detail-item">
                    <span className="detail-label">Gas Consumed</span>
                    <span className="detail-value font-mono">{parseInt(blockData.gasUsed).toLocaleString()} gas</span>
                  </div>

                  <div className="block-detail-item full-width">
                    <span className="detail-label">Miner Address</span>
                    <div className="miner-row">
                      <span className="detail-value font-mono">{blockData.miner}</span>
                      <button className="copy-btn" onClick={() => handleCopy(blockData.miner)}>
                        {copiedText === blockData.miner ? "✓ Copied" : "📋"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;