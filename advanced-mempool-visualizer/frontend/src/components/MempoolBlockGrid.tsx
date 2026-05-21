interface Tx {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  data: string;
  decodedType: string;
  ethValue: string;
  gweiGasPrice: string;
}

interface MempoolBlockGridProps {
  txs: Tx[];
  selectedTx: Tx | null;
  onSelectTx: (tx: Tx) => void;
}

export function MempoolBlockGrid({ txs, selectedTx, onSelectTx }: MempoolBlockGridProps) {
  // Helper to map transaction type to visual properties
  const getTypeColors = (type: string) => {
    switch (type) {
      case "ETH_TRANSFER":
        return {
          color: "#10b981", // Emerald green
          bg: "rgba(16, 185, 129, 0.06)",
          border: "rgba(16, 185, 129, 0.2)",
          hoverBorder: "rgba(16, 185, 129, 0.8)",
          icon: "Ξ"
        };
      case "ERC20_TRANSFER":
        return {
          color: "#06b6d4", // Cyan
          bg: "rgba(6, 182, 212, 0.06)",
          border: "rgba(6, 182, 212, 0.2)",
          hoverBorder: "rgba(6, 182, 212, 0.8)",
          icon: "⇄"
        };
      case "ERC20_APPROVE":
        return {
          color: "#f59e0b", // Amber gold
          bg: "rgba(245, 158, 11, 0.06)",
          border: "rgba(245, 158, 11, 0.2)",
          hoverBorder: "rgba(245, 158, 11, 0.8)",
          icon: "✓"
        };
      case "UNISWAP_SWAP":
        return {
          color: "#ec4899", // Neon pink
          bg: "rgba(236, 72, 153, 0.06)",
          border: "rgba(236, 72, 153, 0.2)",
          hoverBorder: "rgba(236, 72, 153, 0.8)",
          icon: "🦄"
        };
      case "CONTRACT_CALL":
        return {
          color: "#8b5cf6", // Purple
          bg: "rgba(139, 92, 246, 0.06)",
          border: "rgba(139, 92, 246, 0.2)",
          hoverBorder: "rgba(139, 92, 246, 0.8)",
          icon: "⚙"
        };
      default:
        return {
          color: "#9ca3af", // Slate gray
          bg: "rgba(156, 163, 175, 0.06)",
          border: "rgba(156, 163, 175, 0.2)",
          hoverBorder: "rgba(156, 163, 175, 0.8)",
          icon: "?"
        };
    }
  };

  return (
    <div className="block-grid-wrapper">
      <div className="block-grid">
        {txs.map((tx) => {
          const colors = getTypeColors(tx.decodedType);
          const isSelected = selectedTx?.hash === tx.hash;
          const ethVal = parseFloat(tx.ethValue);
          
          return (
            <div
              key={tx.hash}
              className={`tx-block ${isSelected ? "selected" : ""}`}
              style={{
                borderColor: isSelected ? "#ffffff" : colors.border,
                boxShadow: isSelected 
                  ? `0 0 15px ${colors.color}, inset 0 0 8px ${colors.color}`
                  : `0 0 5px rgba(0,0,0,0.5)`,
                background: colors.bg,
                "--hover-border": colors.hoverBorder,
                "--theme-color": colors.color,
              } as React.CSSProperties}
              onClick={() => onSelectTx(tx)}
            >
              <div className="tx-block-icon" style={{ color: colors.color }}>
                {colors.icon}
              </div>
              <div className="tx-block-value">
                {ethVal > 0 ? (
                  ethVal >= 1 ? `${ethVal.toFixed(1)}Ξ` : `${ethVal.toFixed(2)}Ξ`
                ) : (
                  `${Math.round(parseFloat(tx.gweiGasPrice))}G`
                )}
              </div>
              
              {/* Detailed custom hover tooltip card */}
              <div className="tx-block-tooltip">
                <p style={{ fontWeight: 600, color: colors.color, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "4px", marginBottom: "6px" }}>
                  {tx.decodedType.replace("_", " ")}
                </p>
                <p><strong>Hash:</strong> {tx.hash.slice(0, 14)}...</p>
                <p><strong>From:</strong> {tx.from.slice(0, 6)}...{tx.from.slice(-4)}</p>
                <p><strong>To:</strong> {tx.to.slice(0, 6)}...{tx.to.slice(-4)}</p>
                <p><strong>Value:</strong> {ethVal.toLocaleString(undefined, { maximumFractionDigits: 6 })} ETH</p>
                <p><strong>Gas Price:</strong> {parseFloat(tx.gweiGasPrice).toFixed(1)} Gwei</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid-instructions">
        ✦ Click any transaction block to inspect full details
      </div>
    </div>
  );
}
