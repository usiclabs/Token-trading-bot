import { type Address, encodeFunctionData, parseUnits } from "viem"
import { getPublicClient, UNISWAP_V3_ROUTER, ERC20_ABI } from "./blockchain"
import { priceService } from "./price-service"

// Uniswap V3 Router ABI (simplified for swaps)
export const ROUTER_ABI = [
  {
    inputs: [
      {
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "recipient", type: "address" },
          { name: "deadline", type: "uint256" },
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
] as const

export interface SwapParams {
  tokenIn: Address
  tokenOut: Address
  amountIn: string
  slippageTolerance: number
  recipient: Address
}

export async function getTokenDecimals(tokenAddress: Address): Promise<number> {
  try {
    console.log("[v0] Getting decimals for token:", tokenAddress)
    const client = getPublicClient()
    const decimals = await client.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "decimals",
    })
    console.log("[v0] Token decimals:", decimals)
    return Number(decimals)
  } catch (error) {
    console.error("[v0] Error getting token decimals:", error)
    // Default to 18 for WETH, 6 for USDC
    if (tokenAddress.toLowerCase() === "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913") {
      console.log("[v0] Using default decimals for USDC: 6")
      return 6 // USDC
    }
    console.log("[v0] Using default decimals: 18")
    return 18 // Default to 18 for most tokens
  }
}

export async function getSwapQuote(
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
  tokenInDecimals: number,
  tokenOutDecimals: number,
): Promise<bigint> {
  try {
    console.log("[v0] Getting swap quote for:", { tokenIn, tokenOut, amountIn: amountIn.toString() })

    const priceData = await priceService.fetchPrice(tokenOut)
    console.log("[v0] Price data:", priceData)

    // Convert amountIn to decimal number based on token decimals
    const amountInDecimal = Number(amountIn) / Math.pow(10, tokenInDecimals)

    // Calculate output amount in decimal
    const amountOutDecimal = amountInDecimal / priceData.price

    // Convert to token's smallest unit
    const amountOut = BigInt(Math.floor(amountOutDecimal * Math.pow(10, tokenOutDecimals)))

    console.log("[v0] Swap quote:", {
      amountIn: amountInDecimal.toFixed(6),
      tokenPrice: priceData.price.toFixed(2),
      amountOut: amountOutDecimal.toFixed(6),
      amountOutWei: amountOut.toString(),
    })

    return amountOut
  } catch (error) {
    console.error("[v0] Error getting swap quote:", error)
    throw new Error(`Failed to get swap quote: ${error}`)
  }
}

export function calculateMinAmountOut(amountOut: bigint, slippageTolerance: number, decimals = 18): bigint {
  if (slippageTolerance < 0 || slippageTolerance > 50) {
    throw new Error("Slippage tolerance must be between 0% and 50%")
  }

  const slippageMultiplier = BigInt(Math.floor((100 - slippageTolerance) * 100))
  const minAmount = (amountOut * slippageMultiplier) / BigInt(10000)

  console.log("[v0] Slippage protection:", {
    expectedOutput: (Number(amountOut) / Math.pow(10, decimals)).toFixed(6),
    minimumOutput: (Number(minAmount) / Math.pow(10, decimals)).toFixed(6),
    slippage: `${slippageTolerance}%`,
  })

  return minAmount
}

export async function prepareSwapTransaction(params: SwapParams) {
  try {
    const { tokenIn, tokenOut, amountIn, slippageTolerance, recipient } = params

    console.log("[v0] Preparing swap transaction with params:", params)

    // Get token decimals
    console.log("[v0] Fetching token decimals...")
    const tokenInDecimals = await getTokenDecimals(tokenIn)
    const tokenOutDecimals = await getTokenDecimals(tokenOut)

    console.log("[v0] Token decimals:", { tokenIn, tokenInDecimals, tokenOut, tokenOutDecimals })

    // Parse amount with correct decimals
    console.log("[v0] Parsing amount:", amountIn, "with decimals:", tokenInDecimals)
    const amountInWei = parseUnits(amountIn, tokenInDecimals)
    console.log("[v0] Amount in wei:", amountInWei.toString())

    // Get quote with correct decimals
    console.log("[v0] Getting swap quote...")
    const amountOut = await getSwapQuote(tokenIn, tokenOut, amountInWei, tokenInDecimals, tokenOutDecimals)
    const amountOutMinimum = calculateMinAmountOut(amountOut, slippageTolerance, tokenOutDecimals)
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20)

    const swapParams = {
      tokenIn,
      tokenOut,
      fee: 3000,
      recipient,
      deadline,
      amountIn: amountInWei,
      amountOutMinimum,
      sqrtPriceLimitX96: BigInt(0),
    }

    console.log("[v0] Swap params prepared:", {
      ...swapParams,
      amountIn: swapParams.amountIn.toString(),
      amountOutMinimum: swapParams.amountOutMinimum.toString(),
      deadline: swapParams.deadline.toString(),
    })

    return {
      to: UNISWAP_V3_ROUTER,
      params: swapParams,
      value: BigInt(0),
      amountOut,
      amountOutMinimum,
    }
  } catch (error) {
    console.error("[v0] Error in prepareSwapTransaction:", error)
    throw error
  }
}

export async function checkAllowance(tokenAddress: Address, owner: Address, spender: Address): Promise<bigint> {
  try {
    const client = getPublicClient()
    const allowance = await client.readContract({
      address: tokenAddress,
      abi: [
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
      ] as const,
      functionName: "allowance",
      args: [owner, spender],
    })

    return allowance
  } catch (error) {
    console.error("[v0] Error checking allowance:", error)
    return BigInt(0)
  }
}

export function prepareApprovalTransaction(tokenAddress: Address, spender: Address, amount: bigint) {
  const data = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "approve",
    args: [spender, amount],
  })

  return {
    to: tokenAddress,
    data,
    value: BigInt(0),
  }
}

export { priceService as PriceMonitor, type PriceData } from "./price-service"
