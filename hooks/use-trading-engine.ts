"use client"

import { useState, useEffect, useCallback } from "react"
import type { TradingStrategy } from "@/lib/trading-engine"

interface EngineStatus {
  isRunning: boolean
  activeStrategies: number
  totalStrategies: number
}

export function useTradingEngine() {
  const [strategies, setStrategies] = useState<TradingStrategy[]>([])
  const [status, setStatus] = useState<EngineStatus>({
    isRunning: false,
    activeStrategies: 0,
    totalStrategies: 0,
  })
  const [loading, setLoading] = useState(false)

  const fetchStrategies = useCallback(async () => {
    try {
      const response = await fetch("/api/strategy")
      const data = await response.json()

      if (data.success) {
        setStrategies(data.strategies)
        setStatus(data.status)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch strategies:", error)
    }
  }, [])

  const addStrategy = useCallback(
    async (strategy: TradingStrategy) => {
      setLoading(true)
      try {
        const response = await fetch("/api/strategy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "add", strategy }),
        })

        const data = await response.json()
        if (data.success) {
          await fetchStrategies()
        }
      } catch (error) {
        console.error("[v0] Failed to add strategy:", error)
      } finally {
        setLoading(false)
      }
    },
    [fetchStrategies],
  )

  const removeStrategy = useCallback(
    async (strategyId: string) => {
      setLoading(true)
      try {
        const response = await fetch("/api/strategy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "remove", strategyId }),
        })

        const data = await response.json()
        if (data.success) {
          await fetchStrategies()
        }
      } catch (error) {
        console.error("[v0] Failed to remove strategy:", error)
      } finally {
        setLoading(false)
      }
    },
    [fetchStrategies],
  )

  const updateStrategy = useCallback(
    async (strategyId: string, updates: Partial<TradingStrategy>) => {
      setLoading(true)
      try {
        const response = await fetch("/api/strategy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update", strategyId, updates }),
        })

        const data = await response.json()
        if (data.success) {
          await fetchStrategies()
        }
      } catch (error) {
        console.error("[v0] Failed to update strategy:", error)
      } finally {
        setLoading(false)
      }
    },
    [fetchStrategies],
  )

  const startEngine = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      })

      const data = await response.json()
      if (data.success) {
        console.log("[v0] Engine started, new status:", data.status)
        setStatus(data.status)
      }
    } catch (error) {
      console.error("[v0] Failed to start engine:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  const stopEngine = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      })

      const data = await response.json()
      if (data.success) {
        setStatus(data.status)
      }
    } catch (error) {
      console.error("[v0] Failed to stop engine:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStrategies()
  }, [fetchStrategies])

  return {
    strategies,
    status,
    loading,
    addStrategy,
    removeStrategy,
    updateStrategy,
    startEngine,
    stopEngine,
    refetch: fetchStrategies,
  }
}
