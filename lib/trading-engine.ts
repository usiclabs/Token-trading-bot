import type { Address } from "viem"

export interface TradingStrategy {
  id: string
  enabled: boolean
  tokenAddress: Address
  tokenSymbol: string
  buyThreshold: number // Price drop % to trigger buy
  sellThreshold: number // Price increase % to trigger sell
  maxInvestment: number // Max USDC per trade
  stopLoss: number // Stop loss %
  takeProfit: number // Take profit %
  position: {
    hasPosition: boolean
    entryPrice: number
    amount: string
    investedAmount: number
  }
}

export interface TradeSignal {
  type: "buy" | "sell" | "hold"
  reason: string
  confidence: number
  suggestedAmount?: string
  currentPrice: number
  targetPrice?: number
}

export class TradingEngine {
  private strategies: Map<string, TradingStrategy> = new Map()
  private priceHistory: Map<Address, number[]> = new Map()
  private isRunning = false

  addStrategy(strategy: TradingStrategy) {
    this.strategies.set(strategy.id, strategy)
    console.log("[v0] Added trading strategy:", strategy.id)
  }

  removeStrategy(strategyId: string) {
    this.strategies.delete(strategyId)
    console.log("[v0] Removed trading strategy:", strategyId)
  }

  updateStrategy(strategyId: string, updates: Partial<TradingStrategy>) {
    const strategy = this.strategies.get(strategyId)
    if (strategy) {
      this.strategies.set(strategyId, { ...strategy, ...updates })
      console.log("[v0] Updated trading strategy:", strategyId)
    }
  }

  getStrategy(strategyId: string): TradingStrategy | undefined {
    return this.strategies.get(strategyId)
  }

  getAllStrategies(): TradingStrategy[] {
    return Array.from(this.strategies.values())
  }

  async analyzeMarket(tokenAddress: Address, currentPrice: number): Promise<TradeSignal> {
    // Get price history
    let history = this.priceHistory.get(tokenAddress) || []
    history.push(currentPrice)

    // Keep last 100 prices
    if (history.length > 100) {
      history = history.slice(-100)
    }
    this.priceHistory.set(tokenAddress, history)

    // Need at least 10 data points for analysis
    if (history.length < 10) {
      return {
        type: "hold",
        reason: "Insufficient data for analysis",
        confidence: 0,
        currentPrice,
      }
    }

    // Calculate indicators
    const sma20 = this.calculateSMA(history, 20)
    const sma50 = this.calculateSMA(history, 50)
    const rsi = this.calculateRSI(history, 14)
    const priceChange = this.calculatePriceChange(history, 24)

    console.log("[v0] Market analysis:", {
      currentPrice,
      sma20,
      sma50,
      rsi,
      priceChange,
    })

    // Generate trading signal
    let signal: TradeSignal = {
      type: "hold",
      reason: "No clear signal",
      confidence: 0,
      currentPrice,
    }

    // Buy signals
    if (rsi < 30 && currentPrice < sma20 && priceChange < -5) {
      signal = {
        type: "buy",
        reason: "Oversold conditions (RSI < 30) and price below SMA",
        confidence: 0.8,
        currentPrice,
        targetPrice: sma20,
      }
    } else if (currentPrice > sma20 && sma20 > sma50 && rsi > 40 && rsi < 70) {
      signal = {
        type: "buy",
        reason: "Bullish trend with healthy RSI",
        confidence: 0.6,
        currentPrice,
        targetPrice: currentPrice * 1.1,
      }
    }
    // Sell signals
    else if (rsi > 70 && currentPrice > sma20 && priceChange > 10) {
      signal = {
        type: "sell",
        reason: "Overbought conditions (RSI > 70) and strong price increase",
        confidence: 0.8,
        currentPrice,
      }
    } else if (currentPrice < sma20 && sma20 < sma50 && rsi < 40) {
      signal = {
        type: "sell",
        reason: "Bearish trend developing",
        confidence: 0.6,
        currentPrice,
      }
    }

    return signal
  }

  async evaluateStrategy(strategy: TradingStrategy, currentPrice: number): Promise<TradeSignal | null> {
    if (!strategy.enabled) {
      return null
    }

    const signal = await this.analyzeMarket(strategy.tokenAddress, currentPrice)

    // Check if we have a position
    if (strategy.position.hasPosition) {
      const priceChange = ((currentPrice - strategy.position.entryPrice) / strategy.position.entryPrice) * 100

      // Check stop loss
      if (priceChange <= -strategy.stopLoss) {
        return {
          type: "sell",
          reason: `Stop loss triggered (${priceChange.toFixed(2)}%)`,
          confidence: 1.0,
          currentPrice,
          suggestedAmount: strategy.position.amount,
        }
      }

      // Check take profit
      if (priceChange >= strategy.takeProfit) {
        return {
          type: "sell",
          reason: `Take profit triggered (${priceChange.toFixed(2)}%)`,
          confidence: 1.0,
          currentPrice,
          suggestedAmount: strategy.position.amount,
        }
      }

      // Check sell threshold
      if (priceChange >= strategy.sellThreshold && signal.type === "sell") {
        return {
          ...signal,
          suggestedAmount: strategy.position.amount,
        }
      }
    } else {
      // No position, check buy signal
      if (signal.type === "buy" && signal.confidence >= 0.6) {
        const amountIn = Math.min(strategy.maxInvestment, 1000) // Cap at 1000 USDC
        return {
          ...signal,
          suggestedAmount: amountIn.toString(),
        }
      }
    }

    return null
  }

  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1]

    const slice = prices.slice(-period)
    const sum = slice.reduce((a, b) => a + b, 0)
    return sum / period
  }

  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50

    const changes = []
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1])
    }

    const recentChanges = changes.slice(-period)
    const gains = recentChanges.filter((c) => c > 0).reduce((a, b) => a + b, 0) / period
    const losses = Math.abs(recentChanges.filter((c) => c < 0).reduce((a, b) => a + b, 0)) / period

    if (losses === 0) return 100
    const rs = gains / losses
    return 100 - 100 / (1 + rs)
  }

  private calculatePriceChange(prices: number[], periods: number): number {
    if (prices.length < periods) return 0

    const oldPrice = prices[prices.length - periods]
    const currentPrice = prices[prices.length - 1]
    return ((currentPrice - oldPrice) / oldPrice) * 100
  }

  start() {
    this.isRunning = true
    console.log("[v0] Trading engine started")
  }

  stop() {
    this.isRunning = false
    console.log("[v0] Trading engine stopped")
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      activeStrategies: Array.from(this.strategies.values()).filter((s) => s.enabled).length,
      totalStrategies: this.strategies.size,
    }
  }
}

// Global trading engine instance
export const tradingEngine = new TradingEngine()
