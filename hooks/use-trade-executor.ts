"use client"

import { useCallback, useState } from "react"
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useGasPrice } from "wagmi"
import { parseUnits, type Address, formatGwei } from "viem"
import { useToast } from "@/hooks/use-toast"

interface ExecuteTradeParams {
  tokenIn: Address
  tokenOut: Address
  amountIn: string
  slippageTolerance?: number
  maxGasPrice?: number
}

export function useTradeExecutor() {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const { data: currentGasPrice } = useGasPrice()
  const { toast } = useToast()
  const [isExecuting, setIsExecuting] = useState(false)
  const [lastTxHash, setLastTxHash] = useState<Address | undefined>()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: lastTxHash,
  })

  const executeTrade = useCallback(
    async ({ tokenIn, tokenOut, amountIn, slippageTolerance = 0.5, maxGasPrice = 50 }: ExecuteTradeParams) => {
      if (!address) {
        throw new Error("Wallet not connected")
      }

      setIsExecuting(true)
      try {
        console.log("[v0] Executing trade:", { tokenIn, tokenOut, amountIn, slippageTolerance })

        if (currentGasPrice) {
          const gasPriceGwei = Number(formatGwei(currentGasPrice))
          console.log("[v0] Current gas price:", gasPriceGwei, "Gwei")

          if (gasPriceGwei > maxGasPrice) {
            throw new Error(`Gas price too high: ${gasPriceGwei.toFixed(2)} Gwei (max: ${maxGasPrice} Gwei)`)
          }
        }

        const amountInWei = parseUnits(amountIn, 6) // USDC has 6 decimals

        // Get swap transaction data
        const swapResponse = await fetch("/api/swap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tokenIn,
            tokenOut,
            amountIn: amountInWei.toString(),
            slippageTolerance,
            recipient: address,
          }),
        })

        const swapData = await swapResponse.json()

        if (!swapData.success) {
          throw new Error(swapData.error || "Failed to prepare swap")
        }

        const { transactions, needsApproval, estimatedOutput, minimumOutput, price } = swapData

        console.log("[v0] Swap prepared:", {
          needsApproval,
          estimatedOutput,
          minimumOutput,
          price,
          slippageProtection: `${slippageTolerance}%`,
        })

        if (needsApproval) {
          console.log("[v0] Approving token...")
          const approvalTx = transactions.find((tx: any) => tx.type === "approval")

          toast({
            title: "Approval Required",
            description: "Please approve the token spending in your wallet",
          })

          const approvalHash = await writeContractAsync({
            address: approvalTx.to,
            abi: approvalTx.abi,
            functionName: approvalTx.functionName,
            args: approvalTx.args,
          })

          console.log("[v0] Approval tx:", approvalHash)
          setLastTxHash(approvalHash)

          toast({
            title: "Approval Submitted",
            description: "Waiting for confirmation...",
          })

          await new Promise((resolve) => setTimeout(resolve, 10000))
        }

        console.log("[v0] Executing swap with slippage protection...")
        const swapTx = transactions.find((tx: any) => tx.type === "swap")

        toast({
          title: "Swap Pending",
          description: `Slippage: ${slippageTolerance}% | Min output: ${Number(minimumOutput).toFixed(6)}`,
        })

        const swapHash = await writeContractAsync({
          address: swapTx.to,
          abi: swapTx.abi,
          functionName: swapTx.functionName,
          args: swapTx.args,
          value: swapTx.value ? BigInt(swapTx.value) : undefined,
        })

        console.log("[v0] Swap tx submitted:", swapHash)
        setLastTxHash(swapHash)

        const isBuy = tokenOut !== "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
        const amountInFloat = Number(amountIn)
        const estimatedOutputFloat = Number(estimatedOutput)
        const totalValue = isBuy ? amountInFloat : estimatedOutputFloat

        toast({
          title: "Trade Submitted",
          description: `Transaction: ${swapHash.slice(0, 10)}... | Waiting for confirmation`,
        })

        await fetch("/api/trades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add",
            trade: {
              timestamp: Date.now(),
              type: isBuy ? "buy" : "sell",
              tokenAddress: tokenOut,
              tokenSymbol: isBuy ? "WETH" : "USDC",
              amount: isBuy ? estimatedOutputFloat.toFixed(6) : amountInFloat.toFixed(2),
              price: price,
              total: totalValue,
              txHash: swapHash,
              status: "pending",
            },
          }),
        })

        return { success: true, txHash: swapHash }
      } catch (error) {
        console.error("[v0] Trade execution failed:", error)

        let errorMessage = "Unknown error occurred"
        if (error instanceof Error) {
          if (error.message.includes("User rejected")) {
            errorMessage = "Transaction rejected by user"
          } else if (error.message.includes("Gas price")) {
            errorMessage = error.message
          } else if (error.message.includes("insufficient funds")) {
            errorMessage = "Insufficient funds for transaction"
          } else {
            errorMessage = error.message
          }
        }

        toast({
          title: "Trade Failed",
          description: errorMessage,
          variant: "destructive",
        })
        throw error
      } finally {
        setIsExecuting(false)
      }
    },
    [address, writeContractAsync, currentGasPrice, toast],
  )

  return {
    executeTrade,
    isExecuting: isExecuting || isConfirming,
    isConfirmed,
    lastTxHash,
  }
}
