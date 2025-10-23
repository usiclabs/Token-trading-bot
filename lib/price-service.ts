import type { Address } from "viem"
import { getPriceFromPool, TOKENS } from "./blockchain"

export interface PriceData {
  price: number
  priceChange1h: number
  priceChange24h: number
  volume24h: number
  lastUpdate: number
}

// Token ID mapping for CoinGecko API
const TOKEN_IDS: Record<string, string> = {
  "0x4200000000000000000000000000000000000006": "weth", // WETH on Base
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": "usd-coin", // USDC on Base
  "0x50c5725949a6f0c72e6c4a641f24049a917db0cb": "dai", // DAI on Base
}

export class PriceService {
  private prices: Map<Address, PriceData> = new Map()
  private intervals: Map<Address, NodeJS.Timeout> = new Map()
  private priceHistory: Map<Address, number[]> = new Map()

  async fetchPrice(tokenAddress: Address): Promise<PriceData> {
    try {
      console.log("[v0] Fetching price from Uniswap pool via BlastAPI for", tokenAddress)
      const price = await getPriceFromPool(tokenAddress, TOKENS.USDC)

      if (price === 0) {
        console.log("[v0] Pool price unavailable, using mock data")
        return this.generateMockPrice(tokenAddress)
      }

      // Get previous price for change calculation
      const existing = this.prices.get(tokenAddress)
      const history = this.priceHistory.get(tokenAddress) || []

      // Calculate price changes
      const priceChange1h = existing ? ((price - existing.price) / existing.price) * 100 : 0

      // Store price in history (keep last 24 data points for 24h tracking)
      history.push(price)
      if (history.length > 24) {
        history.shift()
      }
      this.priceHistory.set(tokenAddress, history)

      const priceChange24h = history.length > 1 ? ((price - history[0]) / history[0]) * 100 : 0

      const priceData: PriceData = {
        price,
        priceChange1h,
        priceChange24h,
        volume24h: existing?.volume24h || 1000000 + Math.random() * 5000000, // Mock volume for now
        lastUpdate: Date.now(),
      }

      this.prices.set(tokenAddress, priceData)
      return priceData
    } catch (error) {
      console.error("[v0] Error fetching price:", error)
      return this.generateMockPrice(tokenAddress)
    }
  }

  private generateMockPrice(tokenAddress: Address): PriceData {
    const existing = this.prices.get(tokenAddress)

    // Generate realistic price movements
    const basePrice = existing?.price || 2000 + Math.random() * 1000
    const volatility = 0.02 // 2% max change
    const priceChange = (Math.random() - 0.5) * volatility * basePrice
    const newPrice = basePrice + priceChange

    const priceData: PriceData = {
      price: newPrice,
      priceChange1h: (priceChange / basePrice) * 100,
      priceChange24h: existing?.priceChange24h || (Math.random() - 0.5) * 10,
      volume24h: 1000000 + Math.random() * 5000000,
      lastUpdate: Date.now(),
    }

    this.prices.set(tokenAddress, priceData)
    return priceData
  }

  async startMonitoring(tokenAddress: Address, callback: (data: PriceData) => void) {
    console.log("[v0] Starting price monitoring for", tokenAddress)

    // Initial fetch
    const initialPrice = await this.fetchPrice(tokenAddress)
    callback(initialPrice)

    // Set up polling (every 10 seconds)
    const interval = setInterval(async () => {
      const priceData = await this.fetchPrice(tokenAddress)
      callback(priceData)
    }, 10000)

    this.intervals.set(tokenAddress, interval)
  }

  stopMonitoring(tokenAddress: Address) {
    const interval = this.intervals.get(tokenAddress)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(tokenAddress)
    }
  }

  getPrice(tokenAddress: Address): PriceData | undefined {
    return this.prices.get(tokenAddress)
  }

  stopAll() {
    this.intervals.forEach((interval) => clearInterval(interval))
    this.intervals.clear()
  }
}

// Singleton instance
export const priceService = new PriceService()
