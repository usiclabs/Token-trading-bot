"use server"

import { NextResponse } from "next/server"
import { tradeManager } from "@/lib/trade-manager"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get("limit")
    const tokenAddress = searchParams.get("token")

    let trades
    if (tokenAddress) {
      trades = tradeManager.getTradesByToken(tokenAddress as any)
    } else if (limit) {
      trades = tradeManager.getTrades(Number.parseInt(limit))
    } else {
      trades = tradeManager.getTrades()
    }

    const stats = tradeManager.getTradeStats()

    return NextResponse.json({
      success: true,
      trades,
      stats,
    })
  } catch (error) {
    console.error("[v0] Trades GET error:", error)
    return NextResponse.json({ error: "Failed to fetch trades" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, trade, tradeId, updates } = body

    switch (action) {
      case "add":
        const newTrade = tradeManager.addTrade(trade)
        return NextResponse.json({ success: true, trade: newTrade })

      case "update":
        tradeManager.updateTrade(tradeId, updates)
        return NextResponse.json({ success: true })

      case "clear":
        tradeManager.clearHistory()
        return NextResponse.json({ success: true })

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("[v0] Trades POST error:", error)
    return NextResponse.json({ error: "Failed to process trade action" }, { status: 500 })
  }
}
