"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TradingChart } from "@/components/trading-chart"
import { TokenList } from "@/components/token-list"
import { TradeHistory } from "@/components/trade-history"
import { BotControls } from "@/components/bot-controls"
import { WalletConnect } from "@/components/wallet-connect"
import { Activity, TrendingUp, TrendingDown, DollarSign } from "lucide-react"
import { useTrades } from "@/hooks/use-trades"
import { useTradingEngine } from "@/hooks/use-trading-engine"
import { useAccount } from "wagmi"
import { useAutoTrader } from "@/hooks/use-auto-trader"

export default function TradingDashboard() {
  const { isConnected } = useAccount()
  const { stats } = useTrades()
  const { status } = useTradingEngine()
  useAutoTrader()

  return (
    <div className="min-h-screen bg-background dark">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Activity className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Base Trading Bot</h1>
                <p className="text-sm text-muted-foreground">Automated Token Trading</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={status.isRunning ? "default" : "secondary"} className="px-3 py-1">
                {status.isRunning ? "Active" : "Inactive"}
              </Badge>
              <WalletConnect />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Stats Overview */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Trades</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalTrades}</p>
              </div>
              <Activity className="h-8 w-8 text-primary" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Strategies</p>
                <p className="text-2xl font-bold text-foreground">{status.activeStrategies}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-chart-2" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Profit/Loss</p>
                <p className={`text-2xl font-bold ${stats.profitLoss >= 0 ? "text-success" : "text-destructive"}`}>
                  {stats.profitLoss >= 0 ? "+" : ""}${stats.profitLoss.toFixed(2)}
                </p>
              </div>
              {stats.profitLoss >= 0 ? (
                <TrendingUp className="h-8 w-8 text-success" />
              ) : (
                <TrendingDown className="h-8 w-8 text-destructive" />
              )}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold text-foreground">{stats.winRate.toFixed(1)}%</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Chart & Controls */}
          <div className="space-y-6 lg:col-span-2">
            <TradingChart />
            <BotControls walletConnected={isConnected} />
          </div>

          {/* Right Column - Token List */}
          <div className="space-y-6">
            <TokenList walletConnected={isConnected} />
          </div>
        </div>

        {/* Trade History */}
        <div className="mt-6">
          <TradeHistory />
        </div>
      </main>
    </div>
  )
}
