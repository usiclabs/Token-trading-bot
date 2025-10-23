import { createPublicClient, http, parseEther, formatEther, type Address } from "viem"
import { base } from "viem/chains"

// Base chain configuration
export const BASE_CHAIN = base

const BASE_RPC_URL = "https://base-mainnet.blastapi.io/d6d4ab7c-d1de-4412-9a48-ae9c7965285c"

// Uniswap V3 contracts on Base
export const UNISWAP_V3_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481" as Address
export const UNISWAP_V3_QUOTER = "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a" as Address
export const UNISWAP_V3_FACTORY = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD" as Address

// Common token addresses on Base
export const TOKENS = {
  WETH: "0x4200000000000000000000000000000000000006" as Address,
  USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address,
  DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb" as Address,
}

let _publicClient: ReturnType<typeof createPublicClient> | null = null

export function getPublicClient() {
  if (!_publicClient) {
    _publicClient = createPublicClient({
      chain: BASE_CHAIN,
      transport: http(BASE_RPC_URL),
    })
  }
  return _publicClient
}

// For backward compatibility
export const publicClient = new Proxy({} as ReturnType<typeof createPublicClient>, {
  get(target, prop) {
    return getPublicClient()[prop as keyof ReturnType<typeof createPublicClient>]
  },
})

// ERC20 ABI for token interactions
export const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
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
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
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
] as const

// Uniswap V3 Quoter ABI (simplified)
export const QUOTER_ABI = [
  {
    inputs: [
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "fee", type: "uint24" },
      { name: "amountIn", type: "uint256" },
      { name: "sqrtPriceLimitX96", type: "uint160" },
    ],
    name: "quoteExactInputSingle",
    outputs: [{ name: "amountOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const

export const FACTORY_ABI = [
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

export const POOL_ABI = [
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
  {
    inputs: [],
    name: "token0",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token1",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const

// Get token price in USDC
export async function getTokenPrice(tokenAddress: Address): Promise<number> {
  try {
    const amountIn = parseEther("1") // 1 token

    const quote = await getPublicClient().readContract({
      address: UNISWAP_V3_QUOTER,
      abi: QUOTER_ABI,
      functionName: "quoteExactInputSingle",
      args: [tokenAddress, TOKENS.USDC, 3000, amountIn, BigInt(0)],
    })

    // USDC has 6 decimals
    return Number(quote) / 1e6
  } catch (error) {
    console.error("Error fetching price:", error)
    return 0
  }
}

// Get token balance
export async function getTokenBalance(tokenAddress: Address, walletAddress: Address): Promise<string> {
  try {
    const balance = await getPublicClient().readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [walletAddress],
    })

    return formatEther(balance)
  } catch (error) {
    console.error("Error fetching balance:", error)
    return "0"
  }
}

// Get token info
export async function getTokenInfo(tokenAddress: Address) {
  try {
    const [symbol, decimals] = await Promise.all([
      getPublicClient().readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "symbol",
      }),
      getPublicClient().readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "decimals",
      }),
    ])

    return { symbol, decimals }
  } catch (error) {
    console.error("Error fetching token info:", error)
    return { symbol: "UNKNOWN", decimals: 18 }
  }
}

export async function getPoolAddress(tokenA: Address, tokenB: Address, fee = 3000): Promise<Address | null> {
  try {
    const pool = await getPublicClient().readContract({
      address: UNISWAP_V3_FACTORY,
      abi: FACTORY_ABI,
      functionName: "getPool",
      args: [tokenA, tokenB, fee],
    })

    if (pool === "0x0000000000000000000000000000000000000000") {
      return null
    }

    return pool as Address
  } catch (error) {
    console.error("[v0] Error getting pool address:", error)
    return null
  }
}

export async function getPriceFromPool(tokenAddress: Address, quoteToken: Address = TOKENS.USDC): Promise<number> {
  try {
    // Get pool address
    const poolAddress = await getPoolAddress(tokenAddress, quoteToken, 3000)

    if (!poolAddress) {
      console.log("[v0] Pool not found for", tokenAddress)
      return 0
    }

    // Get pool data
    const [slot0Data, token0, token1] = await Promise.all([
      getPublicClient().readContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: "slot0",
      }),
      getPublicClient().readContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: "token0",
      }),
      getPublicClient().readContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: "token1",
      }),
    ])

    const sqrtPriceX96 = slot0Data[0]

    // Calculate price from sqrtPriceX96
    // price = (sqrtPriceX96 / 2^96)^2
    const Q96 = 2n ** 96n
    const sqrtPrice = Number(sqrtPriceX96) / Number(Q96)
    let price = sqrtPrice ** 2

    // Adjust for token decimals
    // WETH has 18 decimals, USDC has 6 decimals
    const token0Lower = (token0 as string).toLowerCase()
    const tokenLower = tokenAddress.toLowerCase()

    if (token0Lower === tokenLower) {
      // Token is token0, price is token1/token0
      price = price * 1e12 // Adjust for decimal difference (18-6)
    } else {
      // Token is token1, price is token0/token1
      price = (1 / price) * 1e12 // Invert and adjust for decimals
    }

    console.log("[v0] Fetched price from pool:", price)
    return price
  } catch (error) {
    console.error("[v0] Error fetching price from pool:", error)
    return 0
  }
}
