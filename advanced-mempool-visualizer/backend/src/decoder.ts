import { Interface, getAddress } from "ethers";

const selectors: Record<string, string> = {
    "0xa9059cbb": "ERC20_TRANSFER",
    "0x095ea7b3": "ERC20_APPROVE",
    "0x38ed1739": "UNISWAP_V2_SWAP_EXACT_TOKENS",
    "0x18cbafe5": "UNISWAP_V2_SWAP_EXACT_ETH",
};

const uniswapInterface = new Interface([
    // Uniswap V2
    "function swapExactTokensForTokens(uint amountIn,uint amountOutMin,address[] path,address to,uint deadline)",

    "function swapExactETHForTokens(uint amountOutMin,address[] path,address to,uint deadline)",

    // Uniswap V3
    "function exactInputSingle(tuple(address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params)",

    "function exactInput(tuple(bytes path,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum) params)"
]);

async function decodeSwap(txData: string) {
    if (!txData || txData === "0x") {
        return null;
    }

    try {
        const decoded = uniswapInterface.parseTransaction({
            data: txData
        });

        if (!decoded) return null;

        // v2
        if (decoded.name === "swapExactTokensForTokens") {
            const amountIn = decoded.args.amountIn;
            const path = decoded.args.path;

            return {
                protocol: "UniswapV2",
                method: decoded.name,

                tokenIn: getAddress(path[0]),
                tokenOut: getAddress(path[path.length - 1]),

                amountIn: amountIn.toString(),

                // minimum expected out
                amountOut: decoded.args.amountOutMin.toString()
            };
        }

        if (decoded.name === "swapExactETHForTokens") {
            const path = decoded.args.path;

            return {
                protocol: "UniswapV2",
                method: decoded.name,

                tokenIn: "ETH",
                tokenOut: getAddress(path[path.length - 1]),

                amountIn: "msg.value",

                amountOut: decoded.args.amountOutMin.toString()
            };
        }

        // v3
        if (decoded.name === "exactInputSingle") {
            const p = decoded.args.params;

            return {
                protocol: "UniswapV3",
                method: decoded.name,

                tokenIn: getAddress(p.tokenIn),
                tokenOut: getAddress(p.tokenOut),

                amountIn: p.amountIn.toString(),
                amountOut: p.amountOutMinimum.toString()
            };
        }

        return null;

    } catch (err) {
        return null;
    }
}

export async function decodeTransactionInput(data: string) {
    if (!data || data === "0x") {
        return {
            type: "ETH_TRANSFER"
        };
    }

    const methodSelector = data.slice(0, 10);

    const swap = await decodeSwap(data);

    if (swap) {
        return {
            type: "SWAP",
            ...swap
        };
    }

    return {
        type: selectors[methodSelector] || "UNKNOWN",
        selector: methodSelector
    };
}