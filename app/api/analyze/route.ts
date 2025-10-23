"use server"

import { NextResponse } from "next/server"
import { tradingEngine } from "@/lib/trading-engine"
import type { Address } from "viem"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tokenAddress, currentPrice, strategyId } = body

    if (!tokenAddress || !currentPrice) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    let signal

    if (strategyId) {
      // Evaluate specific strategy
      const strategy = tradingEngine.getStrategy(strategyId)
      if (!strategy) {
        return NextResponse.json({ error: "Strategy not found" }, { status: 404 })
      }
      signal = await tradingEngine.evaluateStrategy(strategy, currentPrice)
    } else {
      // General market analysis
      signal = await tradingEngine.analyzeMarket(tokenAddress as Address, currentPrice)
    }

    return NextResponse.json({
      success: true,
      signal,
    })
  } catch (error) {
    console.error("[v0] Analyze API error:", error)
    return NextResponse.json({ error: "Failed to analyze market" }, { status: 500 })
  }
}
