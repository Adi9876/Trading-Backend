import { ethers } from "ethers";

const selector = {
    "0xa9059cbb": "ERC20_TRANSFER",
    "0x095ea7b3": "ERC20_APPROVE",
    "0x38ed1739": "UNISWAP_SWAP_EXACT_TOKENS",
    "0x18cbafe5": "UNISWAP_SWAP_EXACT_ETH",
}

export async function decodeTransactionInput(data: string) {
    if (!data || data === "0x") {
        return "ETH_TRANSFER";
    }
    const selector: any = data.slice(0, 10);
    return selector[selector] || "UNKNOWN";
}