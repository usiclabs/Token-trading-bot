"use client"

import { useState, useEffect, useCallback } from "react"
import type { Trade } from "@/lib/trading-types"

interface TradeStats {
  totalTrades: number
  successfulTrades: number
  failedTrades: number
  pendingTrades: number
  totalBought: number
  totalSold: number
  profitLoss: number
  winRate: number
}

export function useTrades(limit?: number) {
  const [trades, setTrades] = useState<Trade[]>([])
  const [stats, setStats] = useState<TradeStats>({
    totalTrades: 0,
    successfulTrades: 0,
    failedTrades: 0,
    pendingTrades: 0,
    totalBought: 0,
    totalSold: 0,
    profitLoss: 0,
    winRate: 0,
  })
  const [loading, setLoading] = useState(false)

  const fetchTrades = useCallback(async () => {
    try {
      setLoading(true)
      const url = limit ? `/api/trades?limit=${limit}` : "/api/trades"
      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setTrades(data.trades)
        setStats(data.stats)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch trades:", error)
    } finally {
      setLoading(false)
    }
  }, [limit])

  const addTrade = useCallback(
    async (trade: Omit<Trade, "id">) => {
      try {
        const response = await fetch("/api/trades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "add", trade }),
        })

        const data = await response.json()
        if (data.success) {
          await fetchTrades()
          return data.trade
        }
      } catch (error) {
        console.error("[v0] Failed to add trade:", error)
      }
    },
    [fetchTrades],
  )

  const updateTrade = useCallback(
    async (tradeId: string, updates: Partial<Trade>) => {
      try {
        const response = await fetch("/api/trades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update", tradeId, updates }),
        })

        const data = await response.json()
        if (data.success) {
          await fetchTrades()
        }
      } catch (error) {
        console.error("[v0] Failed to update trade:", error)
      }
    },
    [fetchTrades],
  )

  const clearHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear" }),
      })

      const data = await response.json()
      if (data.success) {
        await fetchTrades()
      }
    } catch (error) {
      console.error("[v0] Failed to clear history:", error)
    }
  }, [fetchTrades])

  useEffect(() => {
    fetchTrades()

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchTrades, 5000)
    return () => clearInterval(interval)
  }, [fetchTrades])

  return {
    trades,
    stats,
    loading,
    addTrade,
    updateTrade,
    clearHistory,
    refetch: fetchTrades,
  }
}
