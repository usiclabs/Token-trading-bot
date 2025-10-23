import { NextResponse } from "next/server"
import { priceService } from "@/lib/price-service"
import type { Address } from "viem"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tokenAddress = searchParams.get("token") as Address

    if (!tokenAddress) {
      return NextResponse.json({ error: "Token address required" }, { status: 400 })
    }

    const priceData = await priceService.fetchPrice(tokenAddress)

    return NextResponse.json({
      success: true,
      price: priceData.price,
      priceChange1h: priceData.priceChange1h,
      priceChange24h: priceData.priceChange24h,
      volume24h: priceData.volume24h,
      timestamp: priceData.lastUpdate,
    })
  } catch (error) {
    console.error("[v0] Price API error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch price",
        success: false,
      },
      { status: 500 },
    )
  }
}
