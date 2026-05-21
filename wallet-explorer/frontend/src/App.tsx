import { useState } from "react";
import axios from "axios";

function App() {
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState("");

  const fetchBalance = async () => {
    try {
      const response = await axios.get(
        `http://localhost:4000/balance/${address}`
      );

      setBalance(response.data.balance);
    } catch (error) {
      alert("Invalid address");
    }
  };

  return (
    <div style={{ padding: "40px" }}>
      <h1>Ethereum Wallet Explorer</h1>

      <input
        type="text"
        placeholder="Enter wallet address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        style={{
          width: "500px",
          padding: "10px",
        }}
      />

      <button
        onClick={fetchBalance}
        style={{
          marginLeft: "10px",
          padding: "10px",
        }}
      >
        Search
      </button>

      {balance && (
        <div style={{ marginTop: "20px" }}>
          <h2>Balance</h2>

          <p>{balance} ETH</p>
        </div>
      )}
    </div>
  );
}

export default App;