import { NextResponse } from "next/server"
import { createPublicClient, http, type Address } from "viem"
import { base } from "viem/chains"

const BASE_RPC_URL = "https://base-mainnet.blastapi.io/d6d4ab7c-d1de-4412-9a48-ae9c7965285c"

const UNISWAP_V3_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481"
const UNISWAP_V3_FACTORY = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD"
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006"

const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
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
] as const

const ROUTER_ABI = [
  {
    inputs: [
      {
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "recipient", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMinimum", type: "uint256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
        name: "params",
        type: "tuple",
      },
    ],
    name: "exactInputSingle",
    outputs: [{ name: "amountOut", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { name: "path", type: "bytes" },
          { name: "recipient", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMinimum", type: "uint256" },
        ],
        name: "params",
        type: "tuple",
      },
    ],
    name: "exactInput",
    outputs: [{ name: "amountOut", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
] as const

const POOL_ABI = [
  {
    inputs: [],
    name: "slot0",
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "observationIndex", type: "uint16" },
      { name: "observationCardinality", type: "uint16" },
      { name: "observationCardinalityNext", type: "uint16" },
      { name: "feeProtocol", type: "uint8" },
      { name: "unlocked", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const

const FACTORY_ABI = [
  {
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "fee", type: "uint24" },
    ],
    name: "getPool",
    outputs: [{ name: "pool", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const

function encodePath(tokens: Address[], fees: number[]): `0x${string}` {
  let path = tokens[0].slice(2) // Remove 0x prefix

  for (let i = 0; i < fees.length; i++) {
    const feeHex = fees[i].toString(16).padStart(6, "0")
    path += feeHex + tokens[i + 1].slice(2)
  }

  return `0x${path}` as `0x${string}`
}

async function getPoolPrice(
  publicClient: any,
  tokenIn: Address,
  tokenOut: Address,
  tokenInDecimals: number,
  tokenOutDecimals: number,
): Promise<{ price: number; poolExists: boolean }> {
  try {
    const poolAddress = await publicClient.readContract({
      address: UNISWAP_V3_FACTORY as Address,
      abi: FACTORY_ABI,
      functionName: "getPool",
      args: [tokenIn, tokenOut, 3000],
    })

    if (poolAddress === "0x0000000000000000000000000000000000000000") {
      return { price: 0, poolExists: false }
    }

    const slot0 = await publicClient.readContract({
      address: poolAddress as Address,
      abi: POOL_ABI,
      functionName: "slot0",
    })

    const sqrtPriceX96 = slot0[0]

    // Calculate raw price from sqrtPriceX96
    const sqrtPrice = Number(sqrtPriceX96) / 2 ** 96
    const rawPrice = sqrtPrice ** 2

    // Determine token ordering (Uniswap orders by address: token0 < token1)
    // sqrtPriceX96 represents price of token1 in terms of token0
    const token0 = tokenIn.toLowerCase() < tokenOut.toLowerCase() ? tokenIn : tokenOut
    const token1 = tokenIn.toLowerCase() < tokenOut.toLowerCase() ? tokenOut : tokenIn
    const token0Decimals = tokenIn.toLowerCase() === token0.toLowerCase() ? tokenInDecimals : tokenOutDecimals
    const token1Decimals = tokenIn.toLowerCase() === token0.toLowerCase() ? tokenOutDecimals : tokenInDecimals

    // rawPrice is token1/token0 in raw units (wei)
    // Convert to human-readable units: divide by 10^(token1Decimals - token0Decimals)
    const priceToken1PerToken0 = rawPrice / 10 ** (token1Decimals - token0Decimals)

    // If tokenIn is token0, we want token1/token0 (which we have)
    // If tokenIn is token1, we want token0/token1 (need to invert)
    const adjustedPrice =
      tokenIn.toLowerCase() === token0.toLowerCase() ? priceToken1PerToken0 : 1 / priceToken1PerToken0

    console.log("[v0] Pool price calculation:", {
      token0,
      token1,
      token0Decimals,
      token1Decimals,
      tokenIn,
      tokenOut,
      sqrtPriceX96: sqrtPriceX96.toString(),
      rawPrice,
      priceToken1PerToken0,
      adjustedPrice,
    })

    return { price: adjustedPrice, poolExists: true }
  } catch (error) {
    console.error("[v0] Error fetching pool price:", error)
    return { price: 0, poolExists: false }
  }
}

export async function POST(request: Request) {
  console.log("[v0] Swap API called")

  try {
    const body = await request.json()
    const { tokenIn, tokenOut, amountIn, slippageTolerance = 1, recipient } = body

    console.log("[v0] Preparing swap:", { tokenIn, tokenOut, amountIn, slippageTolerance, recipient })

    const publicClient = createPublicClient({
      chain: base,
      transport: http(BASE_RPC_URL),
    })

    console.log("[v0] Fetching token decimals...")
    const [tokenInDecimals, tokenOutDecimals] = await Promise.all([
      publicClient.readContract({
        address: tokenIn as Address,
        abi: ERC20_ABI,
        functionName: "decimals",
      }),
      publicClient.readContract({
        address: tokenOut as Address,
        abi: ERC20_ABI,
        functionName: "decimals",
      }),
    ])

    console.log("[v0] Token decimals:", { tokenInDecimals, tokenOutDecimals })

    const directPool = await getPoolPrice(
      publicClient,
      tokenIn as Address,
      tokenOut as Address,
      tokenInDecimals,
      tokenOutDecimals,
    )

    let useMultiHop = false
    let estimatedPrice = directPool.price

    if (!directPool.poolExists) {
      console.log("[v0] No direct pool found, checking multi-hop route through WETH...")

      const wethDecimals = await publicClient.readContract({
        address: WETH_ADDRESS as Address,
        abi: ERC20_ABI,
        functionName: "decimals",
      })

      const pool1 = await getPoolPrice(
        publicClient,
        tokenIn as Address,
        WETH_ADDRESS as Address,
        tokenInDecimals,
        wethDecimals,
      )

      const pool2 = await getPoolPrice(
        publicClient,
        WETH_ADDRESS as Address,
        tokenOut as Address,
        wethDecimals,
        tokenOutDecimals,
      )

      if (!pool1.poolExists || !pool2.poolExists) {
        throw new Error("No liquidity pool found for this token pair (direct or through WETH)")
      }

      estimatedPrice = pool1.price * pool2.price
      useMultiHop = true

      console.log("[v0] Multi-hop route found:", {
        pool1Price: pool1.price,
        pool2Price: pool2.price,
        combinedPrice: estimatedPrice,
      })
    } else {
      console.log("[v0] Direct pool found, using single-hop swap")
    }

    const amountInBigInt = BigInt(amountIn)
    const amountInFloat = Number(amountInBigInt) / 10 ** tokenInDecimals
    const estimatedOutputFloat = amountInFloat * estimatedPrice
    const estimatedOutputBigInt = BigInt(Math.floor(estimatedOutputFloat * 10 ** tokenOutDecimals))
    const minimumOutputBigInt = BigInt(Math.floor(Number(estimatedOutputBigInt) * (1 - slippageTolerance / 100)))

    console.log("[v0] Output calculation:", {
      amountInFloat,
      estimatedOutputFloat,
      estimatedOutputBigInt: estimatedOutputBigInt.toString(),
      minimumOutputBigInt: minimumOutputBigInt.toString(),
      useMultiHop,
    })

    const allowance = await publicClient.readContract({
      address: tokenIn as Address,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [recipient as Address, UNISWAP_V3_ROUTER as Address],
    })

    const needsApproval = allowance < amountInBigInt

    console.log("[v0] Allowance check:", { allowance: allowance.toString(), needsApproval })

    const transactions = []

    if (needsApproval) {
      transactions.push({
        type: "approval",
        to: tokenIn,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [UNISWAP_V3_ROUTER, amountInBigInt.toString()],
      })
    }

    if (useMultiHop) {
      const path = encodePath([tokenIn as Address, WETH_ADDRESS as Address, tokenOut as Address], [3000, 3000])

      transactions.push({
        type: "swap",
        to: UNISWAP_V3_ROUTER,
        abi: ROUTER_ABI,
        functionName: "exactInput",
        args: [
          {
            path,
            recipient: recipient as Address,
            amountIn: amountInBigInt.toString(),
            amountOutMinimum: minimumOutputBigInt.toString(),
          },
        ],
        value: "0",
      })

      console.log("[v0] Multi-hop swap prepared with path:", path)
    } else {
      transactions.push({
        type: "swap",
        to: UNISWAP_V3_ROUTER,
        abi: ROUTER_ABI,
        functionName: "exactInputSingle",
        args: [
          {
            tokenIn: tokenIn as Address,
            tokenOut: tokenOut as Address,
            fee: 3000,
            recipient: recipient as Address,
            amountIn: amountInBigInt.toString(),
            amountOutMinimum: minimumOutputBigInt.toString(),
            sqrtPriceLimitX96: "0",
          },
        ],
        value: "0",
      })

      console.log("[v0] Single-hop swap prepared")
    }

    console.log("[v0] Swap prepared successfully")

    return NextResponse.json({
      success: true,
      transactions,
      needsApproval,
      estimatedOutput: estimatedOutputFloat.toString(),
      minimumOutput: (Number(minimumOutputBigInt) / 10 ** tokenOutDecimals).toString(),
      price: estimatedPrice,
      slippageProtection: `${slippageTolerance}%`,
      routeType: useMultiHop ? "multi-hop" : "direct",
    })
  } catch (error: any) {
    console.error("[v0] Swap API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to prepare swap",
        details: error?.message || String(error),
      },
      { status: 500 },
    )
  }
}
