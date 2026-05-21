import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { ethers } from "ethers";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Type definition for extending provider with custom getHistory
interface CustomProvider extends ethers.JsonRpcProvider {
  getHistory?: (address: string) => Promise<any[]>;
}

// Network configurations
const NETWORKS: Record<string, {
  name: string;
  rpcUrl: string;
  chainId: number;
  nativeCurrency: string;
}> = {
  ethereum: {
    name: "Ethereum",
    rpcUrl: process.env.RPC_URL || "https://cloudflare-eth.com",
    chainId: 1,
    nativeCurrency: "ETH"
  },
  base: {
    name: "Base",
    rpcUrl: "https://mainnet.base.org",
    chainId: 8453,
    nativeCurrency: "ETH"
  },
  arbitrum: {
    name: "Arbitrum",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    chainId: 42161,
    nativeCurrency: "ETH"
  },
  polygon: {
    name: "Polygon",
    rpcUrl: "https://polygon-bor.publicnode.com",
    chainId: 137,
    nativeCurrency: "POL"
  },
  bsc: {
    name: "BSC",
    rpcUrl: "https://bsc.publicnode.com",
    chainId: 56,
    nativeCurrency: "BNB"
  }
};

// ERC-20 contract addresses on each network
const TOKEN_ADDRESSES: Record<string, { USDT?: string; USDC?: string; WETH?: string }> = {
  ethereum: {
    USDT: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
  },
  base: {
    USDT: "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2", // Bridged USDTe
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Native USDC
    WETH: "0x4200000000000000000000000000000000000006"
  },
  arbitrum: {
    USDT: "0xFd086Bc7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
  },
  polygon: {
    USDT: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    WETH: "0x7ceB23fD6bC0adD59662ac23758dF3d5668e2170"
  },
  bsc: {
    USDT: "0x55d398326f99059ff775485246999027b3197955",
    USDC: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
    WETH: "0x2170ed0880ac9a755fd29b2688956bd959f933f8"
  }
};

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

// Cache for providers
const providers: Record<string, CustomProvider> = {};

function getProvider(networkKey: string): CustomProvider {
  const normalizedKey = networkKey.toLowerCase();
  const config = NETWORKS[normalizedKey];
  if (!config) {
    throw new Error(`Unsupported network: ${networkKey}`);
  }

  if (!providers[normalizedKey]) {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl) as CustomProvider;
    
    // Attach custom getHistory method to satisfy "Use: provider.getHistory(address)"
    provider.getHistory = async (address: string): Promise<any[]> => {
      const apiKey = process.env.ETHERSCAN_API_KEY || "";
      const url = `https://api.etherscan.io/v2/api?chainid=${config.chainId}&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc&apikey=${apiKey}`;
      
      const req = new ethers.FetchRequest(url);
      const res = await req.send();
      const data = res.bodyJson;
      
      if (data.status !== "1") {
        if (data.message === "No transactions found") {
          return [];
        }
        throw new Error(data.message || "Failed to fetch transaction history");
      }
      
      return data.result.map((tx: any) => {
        const gasUsed = BigInt(tx.gasUsed || 0);
        const gasPrice = BigInt(tx.gasPrice || 0);
        const gasFee = gasUsed * gasPrice;
        
        return {
          hash: tx.hash,
          value: ethers.formatEther(tx.value || "0"),
          gasFee: ethers.formatEther(gasFee),
          from: tx.from,
          to: tx.to,
          timeStamp: tx.timeStamp
        };
      });
    };

    providers[normalizedKey] = provider;
  }

  return providers[normalizedKey];
}

// 1. Balance Endpoint (with ERC-20 balances)
app.get('/balance/:address', async (req, res) => {
  const { address } = req.params;
  const networkKey = (req.query.network as string) || "ethereum";

  console.log(`Request received for balance: ${address} on network: ${networkKey}`);

  try {
    const provider = getProvider(networkKey);
    const config = NETWORKS[networkKey.toLowerCase()];

    // Fetch native balance
    const nativeBalance = await provider.getBalance(address);

    // Fetch ERC-20 balances in parallel using Promise.allSettled
    const tokenBalances: Record<string, string> = {};
    const tokens = TOKEN_ADDRESSES[networkKey.toLowerCase()];

    if (tokens) {
      const tokenEntries = Object.entries(tokens);
      const results = await Promise.allSettled(
        tokenEntries.map(async ([symbol, tokenAddress]) => {
          if (!tokenAddress) return { symbol, balance: "0.0" };
          const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
          const [balanceVal, decimalsVal] = await Promise.all([
            contract.balanceOf(address),
            contract.decimals().catch(() => 18)
          ]);
          return {
            symbol,
            balance: ethers.formatUnits(balanceVal, decimalsVal)
          };
        })
      );

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          tokenBalances[result.value.symbol] = result.value.balance;
        } else {
          console.error("Token balance fetch failed:", result.reason);
        }
      });
    }

    res.json({
      address,
      network: config.name,
      nativeCurrency: config.nativeCurrency,
      balance: ethers.formatEther(nativeBalance),
      tokens: tokenBalances
    });
  } catch (err: any) {
    console.error('Error in balance route:', err);
    res.status(500).json({ error: err.message || 'Failed to get balance' });
  }
});

// 2. Recent Transactions Endpoint
app.get('/history/:address', async (req, res) => {
  const { address } = req.params;
  const networkKey = (req.query.network as string) || "ethereum";

  console.log(`Request received for transaction history: ${address} on network: ${networkKey}`);

  try {
    const provider = getProvider(networkKey);
    if (!provider.getHistory) {
      throw new Error(`getHistory not configured for provider on network: ${networkKey}`);
    }

    const transactions = await provider.getHistory(address);
    res.json({
      address,
      network: networkKey,
      transactions
    });
  } catch (err: any) {
    console.error('Error in history route:', err);
    res.status(500).json({ error: err.message || 'Failed to get transaction history' });
  }
});

// 3. Block Explorer Endpoint
app.get('/block/:blockNumber', async (req, res) => {
  const { blockNumber } = req.params;
  const networkKey = (req.query.network as string) || "ethereum";

  console.log(`Request received for block: ${blockNumber} on network: ${networkKey}`);

  try {
    const provider = getProvider(networkKey);
    let blockId: string | number = blockNumber;
    if (blockNumber !== "latest" && !isNaN(Number(blockNumber))) {
      blockId = Number(blockNumber);
    }

    const block = await provider.getBlock(blockId);
    if (!block) {
      return res.status(404).json({ error: `Block ${blockNumber} not found` });
    }

    res.json({
      blockNumber: block.number,
      network: networkKey,
      timestamp: block.timestamp,
      txCount: block.transactions.length,
      miner: block.miner || "N/A",
      gasUsed: block.gasUsed.toString()
    });
  } catch (err: any) {
    console.error('Error in block route:', err);
    res.status(500).json({ error: err.message || 'Failed to get block' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
