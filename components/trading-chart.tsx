"use client"

import { Card } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useState, useEffect } from "react"
import { usePriceMonitor } from "@/hooks/use-price-monitor"
import { TOKENS } from "@/lib/blockchain"
import { TrendingUp, TrendingDown } from "lucide-react"

export function TradingChart() {
  const [data, setData] = useState<Array<{ time: string; price: number }>>([])
  const { priceData } = usePriceMonitor(TOKENS.WETH, true)

  useEffect(() => {
    if (priceData) {
      const now = new Date()
      const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}`

      setData((prev) => {
        const newData = [...prev, { time: timeStr, price: priceData.price }]
        // Keep last 24 data points
        return newData.slice(-24)
      })
    }
  }, [priceData])

  // Generate initial mock data if empty
  useEffect(() => {
    if (data.length === 0) {
      const mockData = Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        price: 1800 + Math.random() * 200,
      }))
      setData(mockData)
    }
  }, [data.length])

  const currentPrice = priceData?.price || data[data.length - 1]?.price || 0
  const priceChange = priceData?.priceChange1h || 0

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Price Chart</h2>
          <p className="text-sm text-muted-foreground">WETH/USDC - Live</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">${currentPrice.toFixed(2)}</p>
          <div className="flex items-center justify-end gap-1">
            {priceChange >= 0 ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
            <p className={`text-sm ${priceChange >= 0 ? "text-success" : "text-destructive"}`}>
              {priceChange >= 0 ? "+" : ""}
              {priceChange.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} />
            <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--foreground))",
              }}
            />
            <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
