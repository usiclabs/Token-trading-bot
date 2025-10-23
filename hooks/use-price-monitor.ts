"use client"

import { useState, useEffect, useCallback } from "react"
import type { Address } from "viem"

interface PriceData {
  price: number
  priceChange1h: number
  priceChange24h: number
  volume24h?: number
  lastUpdate: number
}

export function usePriceMonitor(tokenAddress: Address | null, enabled = true) {
  const [priceData, setPriceData] = useState<PriceData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPrice = useCallback(async () => {
    if (!tokenAddress || !enabled) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/price?token=${tokenAddress}`)
      const data = await response.json()

      if (data.success) {
        setPriceData({
          price: data.price,
          priceChange1h: data.priceChange1h || 0,
          priceChange24h: data.priceChange24h || 0,
          volume24h: data.volume24h,
          lastUpdate: data.timestamp,
        })
      } else {
        setError(data.error || "Failed to fetch price")
      }
    } catch (err) {
      setError("Network error")
      console.error("[v0] Price fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, [tokenAddress, enabled])

  useEffect(() => {
    if (!enabled || !tokenAddress) return

    // Initial fetch
    fetchPrice()

    // Poll every 10 seconds
    const interval = setInterval(fetchPrice, 10000)

    return () => clearInterval(interval)
  }, [fetchPrice, enabled, tokenAddress])

  return { priceData, loading, error, refetch: fetchPrice }
}
