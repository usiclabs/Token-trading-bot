"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, ArrowDownRight, ExternalLink, Trash2, Download } from "lucide-react"
import { useTrades } from "@/hooks/use-trades"

export function TradeHistory() {
  const { trades, stats, clearHistory } = useTrades()

  const exportTrades = () => {
    const csv = [
      ["Time", "Type", "Token", "Amount", "Price", "Total", "Status", "TxHash"].join(","),
      ...trades.map((t) =>
        [
          new Date(t.timestamp).toISOString(),
          t.type,
          t.tokenSymbol,
          t.amount,
          t.price,
          t.total,
          t.status,
          t.txHash,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `trades-${Date.now()}.csv`
    a.click()
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Trade History</h2>
          <p className="text-sm text-muted-foreground">
            {stats.totalTrades} total trades • {stats.winRate.toFixed(1)}% win rate
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportTrades}
            disabled={trades.length === 0}
            className="gap-2 bg-transparent"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearHistory}
            disabled={trades.length === 0}
            className="gap-2 text-destructive hover:text-destructive bg-transparent"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="mb-4 grid grid-cols-4 gap-4 rounded-lg border border-border bg-muted/30 p-4">
        <div>
          <p className="text-xs text-muted-foreground">Total Bought</p>
          <p className="font-mono text-sm font-medium text-foreground">${stats.totalBought.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total Sold</p>
          <p className="font-mono text-sm font-medium text-foreground">${stats.totalSold.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Profit/Loss</p>
          <p className={`font-mono text-sm font-medium ${stats.profitLoss >= 0 ? "text-success" : "text-destructive"}`}>
            {stats.profitLoss >= 0 ? "+" : ""}${stats.profitLoss.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Success Rate</p>
          <p className="font-mono text-sm font-medium text-foreground">
            {stats.successfulTrades}/{stats.totalTrades}
          </p>
        </div>
      </div>

      {/* Trade Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-sm text-muted-foreground">
              <th className="pb-3 font-medium">Time</th>
              <th className="pb-3 font-medium">Type</th>
              <th className="pb-3 font-medium">Token</th>
              <th className="pb-3 font-medium">Amount</th>
              <th className="pb-3 font-medium">Price</th>
              <th className="pb-3 font-medium">Total</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Tx</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id} className="border-b border-border/50 text-sm">
                <td className="py-3 text-muted-foreground">
                  {new Date(trade.timestamp).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1">
                    {trade.type === "buy" ? (
                      <>
                        <ArrowDownRight className="h-4 w-4 text-success" />
                        <span className="text-success">Buy</span>
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="h-4 w-4 text-destructive" />
                        <span className="text-destructive">Sell</span>
                      </>
                    )}
                  </div>
                </td>
                <td className="py-3 font-medium text-foreground">{trade.tokenSymbol}</td>
                <td className="py-3 font-mono text-foreground">{Number.parseFloat(trade.amount).toFixed(4)}</td>
                <td className="py-3 font-mono text-foreground">${trade.price.toFixed(2)}</td>
                <td className="py-3 font-mono text-foreground">${trade.total.toFixed(2)}</td>
                <td className="py-3">
                  <Badge
                    variant={
                      trade.status === "success" ? "default" : trade.status === "failed" ? "destructive" : "secondary"
                    }
                  >
                    {trade.status}
                  </Badge>
                </td>
                <td className="py-3">
                  <a
                    href={`https://basescan.org/tx/${trade.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {trades.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No trades yet. Start the bot to begin trading automatically.
        </p>
      )}
    </Card>
  )
}
