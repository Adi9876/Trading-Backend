import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { ethers } from "ethers";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

app.get('/balance/:address', async (req, res) => {
    console.log('Request received for balance')
    try{
        const {address} = req.params;
        const balance = await provider.getBalance(address);
        res.json({
            address,
            balance: ethers.formatEther(balance)
        })
    }catch(err){
        console.error('Error in balance route:', err);
        res.status(500).json({ error: 'Failed to get balance' });
    }
})

app.get('/latest-block', async (req, res) => {
    console.log('Request received for latest block')
    try{
        const block = await provider.getBlock('latest');
        res.json({block});
    }catch(err){
        console.error('Error in latest block route:', err);
        res.status(500).json({ error: 'Failed to get latest block' });
    }
})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
