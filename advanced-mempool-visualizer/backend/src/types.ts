export interface MempoolTx {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  gasPrice: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce: number;
  data: string;
}
