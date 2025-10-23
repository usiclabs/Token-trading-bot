import { type NextRequest, NextResponse } from "next/server"
import { getPublicClient } from "@/lib/blockchain"
import { isAddress, type Address } from "viem"

const ERC20_ABI = [
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get("address")

    if (!address || !isAddress(address)) {
      return NextResponse.json({ success: false, error: "Invalid token address" }, { status: 400 })
    }

    console.log("[v0] Fetching token info for:", address)

    const client = getPublicClient()

    // Fetch token information
    const [symbol, decimals, name] = await Promise.all([
      client.readContract({
        address: address as Address,
        abi: ERC20_ABI,
        functionName: "symbol",
      }),
      client.readContract({
        address: address as Address,
        abi: ERC20_ABI,
        functionName: "decimals",
      }),
      client.readContract({
        address: address as Address,
        abi: ERC20_ABI,
        functionName: "name",
      }),
    ])

    console.log("[v0] Token info fetched:", { symbol, decimals, name })

    return NextResponse.json({
      success: true,
      address,
      symbol,
      decimals: Number(decimals),
      name,
    })
  } catch (error) {
    console.error("[v0] Token info error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch token information. Make sure this is a valid ERC20 token on Base chain.",
      },
      { status: 500 },
    )
  }
}
