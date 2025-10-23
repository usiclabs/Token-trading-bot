"use client"

import { useEffect, useState } from "react"
import { useAccount } from "wagmi"
import { useTradingEngine } from "./use-trading-engine"
import { useTradeExecutor } from "./use-trade-executor"
import type { Address } from "viem"

export function useAutoTrader() {
  const { address } = useAccount()
  const { strategies, status } = useTradingEngine()
  const { executeTrade, isExecuting } = useTradeExecutor()
  const [lastCheck, setLastCheck] = useState<number>(0)

  useEffect(() => {
    console.log("[v0] Auto-trader monitoring status", {
      isRunning: status.isRunning,
      strategiesCount: strategies.length,
      address: address ? "connected" : "not connected",
    })

    if (!status.isRunning) {
      return
    }

    // Set up monitoring loop for regular trades
    const checkTrades = async () => {
      if (!address || !status.isRunning || isExecuting) {
        return
      }

      console.log("[v0] Checking for trade opportunities...")

      for (const strategy of strategies) {
        if (!strategy.enabled) continue

        try {
          // Get current price
          const priceResponse = await fetch(`/api/price?token=${strategy.tokenAddress}`)
          const priceData = await priceResponse.json()

          if (!priceData.success) continue

          const currentPrice = priceData.price

          // Analyze strategy
          const analysisResponse = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              strategyId: strategy.id,
              currentPrice,
            }),
          })

          const { signal } = await analysisResponse.json()

          if (!signal || signal.type === "hold") continue

          console.log("[v0] Trade signal generated:", signal)

          // Execute trade based on signal
          if (signal.type === "buy" && signal.suggestedAmount) {
            console.log("[v0] Executing BUY order...")
            await executeTrade({
              tokenIn: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address, // USDC
              tokenOut: strategy.tokenAddress,
              amountIn: signal.suggestedAmount,
            })
          } else if (signal.type === "sell" && signal.suggestedAmount && strategy.position.hasPosition) {
            console.log("[v0] Executing SELL order...")
            await executeTrade({
              tokenIn: strategy.tokenAddress,
              tokenOut: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address, // USDC
              amountIn: signal.suggestedAmount,
            })
          }
        } catch (error) {
          console.error("[v0] Error checking strategy:", strategy.id, error)
        }
      }

      setLastCheck(Date.now())
    }

    const interval = setInterval(checkTrades, 30000) // Check every 30 seconds
    const timeout = setTimeout(checkTrades, 30000) // Initial check after 30 seconds

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [status.isRunning, address, strategies, isExecuting, executeTrade])

  return {
    lastCheck,
    isChecking: isExecuting,
  }
}
