import type { Trade } from "./trading-types"
import type { Address } from "viem"

export class TradeManager {
  private trades: Trade[] = []
  private listeners: Set<(trades: Trade[]) => void> = new Set()

  addTrade(trade: Omit<Trade, "id">) {
    const newTrade: Trade = {
      ...trade,
      id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }

    this.trades.unshift(newTrade) // Add to beginning
    this.notifyListeners()

    console.log("[v0] Trade added:", newTrade)
    return newTrade
  }

  updateTrade(tradeId: string, updates: Partial<Trade>) {
    const index = this.trades.findIndex((t) => t.id === tradeId)
    if (index !== -1) {
      this.trades[index] = { ...this.trades[index], ...updates }
      this.notifyListeners()
      console.log("[v0] Trade updated:", tradeId)
    }
  }

  getTrades(limit?: number): Trade[] {
    return limit ? this.trades.slice(0, limit) : this.trades
  }

  getTradesByToken(tokenAddress: Address): Trade[] {
    return this.trades.filter((t) => t.tokenAddress === tokenAddress)
  }

  getTradeStats() {
    const successfulTrades = this.trades.filter((t) => t.status === "success")
    const buyTrades = successfulTrades.filter((t) => t.type === "buy")
    const sellTrades = successfulTrades.filter((t) => t.type === "sell")

    const totalBought = buyTrades.reduce((sum, t) => sum + t.total, 0)
    const totalSold = sellTrades.reduce((sum, t) => sum + t.total, 0)
    const profitLoss = totalSold - totalBought

    return {
      totalTrades: this.trades.length,
      successfulTrades: successfulTrades.length,
      failedTrades: this.trades.filter((t) => t.status === "failed").length,
      pendingTrades: this.trades.filter((t) => t.status === "pending").length,
      totalBought,
      totalSold,
      profitLoss,
      winRate: sellTrades.length > 0 ? (sellTrades.filter((t) => t.total > 0).length / sellTrades.length) * 100 : 0,
    }
  }

  subscribe(listener: (trades: Trade[]) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.trades))
  }

  clearHistory() {
    this.trades = []
    this.notifyListeners()
    console.log("[v0] Trade history cleared")
  }
}

// Global trade manager instance
export const tradeManager = new TradeManager()
