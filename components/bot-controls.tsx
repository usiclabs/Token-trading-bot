"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Play, Pause, Settings, Plus } from "lucide-react"
import { useTradingEngine } from "@/hooks/use-trading-engine"
import { useState } from "react"
import { TOKENS } from "@/lib/blockchain"
import { useToast } from "@/hooks/use-toast"
import { useTradeExecutor } from "@/hooks/use-trade-executor"
import { useAccount } from "wagmi"
import { isAddress } from "viem"

interface BotControlsProps {
  walletConnected: boolean
}

export function BotControls({ walletConnected }: BotControlsProps) {
  const { status, startEngine, stopEngine, addStrategy, loading, strategies } = useTradingEngine()
  const { toast } = useToast()
  const { executeTrade, isExecuting } = useTradeExecutor()
  const { address } = useAccount()

  const [customTokenAddress, setCustomTokenAddress] = useState("")
  const [tokenSymbol, setTokenSymbol] = useState("")
  const [isValidatingToken, setIsValidatingToken] = useState(false)

  const [buyThreshold, setBuyThreshold] = useState(5)
  const [sellThreshold, setSellThreshold] = useState(10)
  const [maxInvestment, setMaxInvestment] = useState(100)
  const [stopLoss, setStopLoss] = useState(5)
  const [takeProfit, setTakeProfit] = useState(15)
  const [slippageTolerance, setSlippageTolerance] = useState(1.0)
  const [maxGasPrice, setMaxGasPrice] = useState(50)

  const validateToken = async () => {
    if (!customTokenAddress || !isAddress(customTokenAddress)) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid ERC20 token address",
        variant: "destructive",
      })
      return
    }

    setIsValidatingToken(true)
    try {
      const response = await fetch(`/api/token-info?address=${customTokenAddress}`)
      const data = await response.json()

      if (data.success) {
        setTokenSymbol(data.symbol)
        toast({
          title: "Token Validated",
          description: `${data.symbol} (${data.decimals} decimals) - Ready to trade`,
        })
      } else {
        toast({
          title: "Invalid Token",
          description: data.error || "Could not fetch token information",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Validation Failed",
        description: "Could not validate token address",
        variant: "destructive",
      })
    } finally {
      setIsValidatingToken(false)
    }
  }

  const executeInitialBuy = async () => {
    if (!address) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      })
      return
    }

    try {
      console.log("[v0] Executing initial $0.1 buy...")

      const activeStrategy = strategies.find((s) => s.enabled)
      if (!activeStrategy) {
        console.log("[v0] No active strategy found for initial buy")
        toast({
          title: "No Strategy",
          description: "Please create a trading strategy first",
          variant: "destructive",
        })
        return
      }

      const result = await executeTrade({
        tokenIn: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`, // USDC
        tokenOut: activeStrategy.tokenAddress as `0x${string}`,
        amountIn: "0.1",
        slippageTolerance,
      })

      if (result.success) {
        console.log("[v0] Initial buy executed successfully:", result.txHash)
        toast({
          title: "Initial Buy Complete",
          description: `Transaction: ${result.txHash.slice(0, 10)}...`,
        })
      }
    } catch (error) {
      console.error("[v0] Initial buy error:", error)
      toast({
        title: "Initial Buy Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  const toggleBot = async () => {
    if (status.isRunning) {
      await stopEngine()
      toast({
        title: "Bot Stopped",
        description: "Trading bot has been paused",
      })
    } else {
      if (strategies.length === 0) {
        toast({
          title: "No Strategies",
          description: "Please create a trading strategy before starting the bot",
          variant: "destructive",
        })
        return
      }

      await startEngine()

      toast({
        title: "Bot Started",
        description: "Executing initial buy and starting monitoring...",
      })

      setTimeout(() => {
        executeInitialBuy()
      }, 500)
    }
  }

  const createStrategy = async () => {
    const tokenAddress = customTokenAddress && isAddress(customTokenAddress) ? customTokenAddress : TOKENS.WETH

    const symbol = tokenSymbol || "WETH"

    const strategy = {
      id: `strategy-${Date.now()}`,
      enabled: true,
      tokenAddress,
      tokenSymbol: symbol,
      buyThreshold,
      sellThreshold,
      maxInvestment,
      stopLoss,
      takeProfit,
      position: {
        hasPosition: false,
        entryPrice: 0,
        amount: "0",
        investedAmount: 0,
      },
    }

    await addStrategy(strategy)
    toast({
      title: "Strategy Created",
      description: `New trading strategy for ${strategy.tokenSymbol} has been added`,
    })

    // Reset custom token fields
    setCustomTokenAddress("")
    setTokenSymbol("")
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Bot Controls</h2>
        <Settings className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="space-y-4">
        {/* Bot Status Toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-4">
          <div>
            <p className="font-medium text-foreground">Trading Bot</p>
            <p className="text-sm text-muted-foreground">
              {status.isRunning ? "Bot is actively trading" : "Bot is paused"}
            </p>
          </div>
          <Button
            onClick={toggleBot}
            disabled={!walletConnected || loading || isExecuting}
            variant={status.isRunning ? "destructive" : "default"}
            className="gap-2"
          >
            {status.isRunning ? (
              <>
                <Pause className="h-4 w-4" />
                Stop Bot
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start Bot
              </>
            )}
          </Button>
        </div>

        {/* Strategy Settings */}
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <Label className="text-foreground font-medium">Custom Token (Optional)</Label>
            <p className="text-xs text-muted-foreground">
              Enter any ERC20 token address on Base to trade against WETH. Leave empty to trade WETH.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="0x... (Token Address)"
                value={customTokenAddress}
                onChange={(e) => setCustomTokenAddress(e.target.value)}
                className="bg-background font-mono text-sm"
              />
              <Button
                onClick={validateToken}
                disabled={!customTokenAddress || isValidatingToken}
                variant="outline"
                size="sm"
              >
                {isValidatingToken ? "Validating..." : "Validate"}
              </Button>
            </div>
            {tokenSymbol && <p className="text-sm text-green-500">✓ Token validated: {tokenSymbol}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="buy-threshold" className="text-foreground">
              Buy Threshold (%)
            </Label>
            <Input
              id="buy-threshold"
              type="number"
              value={buyThreshold}
              onChange={(e) => setBuyThreshold(Number(e.target.value))}
              className="bg-background"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sell-threshold" className="text-foreground">
              Sell Threshold (%)
            </Label>
            <Input
              id="sell-threshold"
              type="number"
              value={sellThreshold}
              onChange={(e) => setSellThreshold(Number(e.target.value))}
              className="bg-background"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="max-investment" className="text-foreground">
              Max Investment (USDC)
            </Label>
            <Input
              id="max-investment"
              type="number"
              value={maxInvestment}
              onChange={(e) => setMaxInvestment(Number(e.target.value))}
              className="bg-background"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="stop-loss" className="text-foreground">
              Stop Loss (%)
            </Label>
            <Input
              id="stop-loss"
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(Number(e.target.value))}
              className="bg-background"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="take-profit" className="text-foreground">
              Take Profit (%)
            </Label>
            <Input
              id="take-profit"
              type="number"
              value={takeProfit}
              onChange={(e) => setTakeProfit(Number(e.target.value))}
              className="bg-background"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="slippage" className="text-foreground">
              Slippage Tolerance (%)
            </Label>
            <Input
              id="slippage"
              type="number"
              step="0.1"
              value={slippageTolerance}
              onChange={(e) => setSlippageTolerance(Number(e.target.value))}
              className="bg-background"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="max-gas" className="text-foreground">
              Max Gas Price (Gwei)
            </Label>
            <Input
              id="max-gas"
              type="number"
              value={maxGasPrice}
              onChange={(e) => setMaxGasPrice(Number(e.target.value))}
              className="bg-background"
            />
          </div>

          <Button onClick={createStrategy} disabled={!walletConnected || loading} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Create Strategy
          </Button>
        </div>

        {!walletConnected && <p className="text-sm text-muted-foreground">Connect your wallet to start trading</p>}
      </div>
    </Card>
  )
}
