"use server"

import { NextResponse } from "next/server"
import { tradingEngine } from "@/lib/trading-engine"
import type { TradingStrategy } from "@/lib/trading-engine"

export async function GET() {
  try {
    const strategies = tradingEngine.getAllStrategies()
    const status = tradingEngine.getStatus()

    return NextResponse.json({
      success: true,
      strategies,
      status,
    })
  } catch (error) {
    console.error("[v0] Strategy GET error:", error)
    return NextResponse.json({ error: "Failed to fetch strategies" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, strategy, strategyId, updates } = body

    switch (action) {
      case "add":
        tradingEngine.addStrategy(strategy as TradingStrategy)
        break

      case "remove":
        tradingEngine.removeStrategy(strategyId)
        break

      case "update":
        tradingEngine.updateStrategy(strategyId, updates)
        break

      case "start":
        tradingEngine.start()
        break

      case "stop":
        tradingEngine.stop()
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      status: tradingEngine.getStatus(),
    })
  } catch (error) {
    console.error("[v0] Strategy POST error:", error)
    return NextResponse.json({ error: "Failed to process strategy action" }, { status: 500 })
  }
}
