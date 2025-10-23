import type { Address } from "viem"

export interface TokenData {
  address: Address
  symbol: string
  decimals: number
  price: number
  priceChange24h: number
  balance: string
}

export interface Trade {
  id: string
  timestamp: number
  type: "buy" | "sell"
  tokenAddress: Address
  tokenSymbol: string
  amount: string
  price: number
  total: number
  txHash: string
  status: "pending" | "success" | "failed"
}

export interface TradingStrategy {
  enabled: boolean
  tokenAddress: Address
  buyThreshold: number // Price drop percentage to trigger buy
  sellThreshold: number // Price increase percentage to trigger sell
  maxInvestment: number // Max USDC to invest per trade
  stopLoss: number // Stop loss percentage
  takeProfit: number // Take profit percentage
}

export interface BotStatus {
  isRunning: boolean
  activeStrategies: number
  totalTrades: number
  profitLoss: number
  lastUpdate: number
}
