"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, TrendingUp, TrendingDown, Loader2, X } from "lucide-react"
import { useState, useEffect } from "react"
import { isAddress } from "viem"
import { useToast } from "@/hooks/use-toast"

interface Token {
  address: string
  symbol: string
  name: string
  price: number
  change24h: number
  volume: string
}

const DEFAULT_TOKENS = [
  {
    address: "0x4200000000000000000000000000000000000006",
    symbol: "WETH",
    name: "Wrapped Ether",
  },
  {
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    symbol: "USDC",
    name: "USD Coin",
  },
  {
    address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
    symbol: "DAI",
    name: "Dai Stablecoin",
  },
]

export function TokenList({ walletConnected }: { walletConnected: boolean }) {
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddToken, setShowAddToken] = useState(false)
  const [newTokenAddress, setNewTokenAddress] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [watchlistAddresses, setWatchlistAddresses] = useState<string[]>(DEFAULT_TOKENS.map((t) => t.address))
  const { toast } = useToast()

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const tokenData = await Promise.all(
          watchlistAddresses.map(async (address) => {
            try {
              const [infoResponse, priceResponse] = await Promise.all([
                fetch(`/api/token-info?address=${address}`),
                fetch(`/api/price?token=${address}`),
              ])

              const [infoData, priceData] = await Promise.all([infoResponse.json(), priceResponse.json()])

              if (infoData.success && priceData.success) {
                return {
                  address,
                  symbol: infoData.symbol,
                  name: infoData.name,
                  price: priceData.price,
                  change24h: priceData.priceChange24h,
                  volume: `$${(priceData.volume24h / 1000000).toFixed(1)}M`,
                }
              }
            } catch (error) {
              console.error(`[v0] Failed to fetch data for ${address}:`, error)
            }

            // Fallback to basic info
            return {
              address,
              symbol: "UNKNOWN",
              name: "Unknown Token",
              price: 0,
              change24h: 0,
              volume: "$0",
            }
          }),
        )

        setTokens(tokenData)
      } catch (error) {
        console.error("[v0] Failed to fetch watchlist prices:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPrices()

    const interval = setInterval(fetchPrices, 30000)
    return () => clearInterval(interval)
  }, [watchlistAddresses])

  const addTokenToWatchlist = async () => {
    if (!newTokenAddress || !isAddress(newTokenAddress)) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid ERC20 token address",
        variant: "destructive",
      })
      return
    }

    if (watchlistAddresses.includes(newTokenAddress.toLowerCase())) {
      toast({
        title: "Already Added",
        description: "This token is already in your watchlist",
        variant: "destructive",
      })
      return
    }

    setIsAdding(true)
    try {
      const response = await fetch(`/api/token-info?address=${newTokenAddress}`)
      const data = await response.json()

      if (data.success) {
        setWatchlistAddresses([...watchlistAddresses, newTokenAddress.toLowerCase()])
        setNewTokenAddress("")
        setShowAddToken(false)
        toast({
          title: "Token Added",
          description: `${data.symbol} has been added to your watchlist`,
        })
      } else {
        toast({
          title: "Invalid Token",
          description: "Could not validate token. Make sure it's a valid ERC20 on Base chain.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add token to watchlist",
        variant: "destructive",
      })
    } finally {
      setIsAdding(false)
    }
  }

  const removeToken = (address: string) => {
    setWatchlistAddresses(watchlistAddresses.filter((a) => a !== address))
    toast({
      title: "Token Removed",
      description: "Token has been removed from your watchlist",
    })
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Watchlist</h2>
        <Button
          size="sm"
          variant="outline"
          className="gap-2 bg-transparent"
          onClick={() => setShowAddToken(!showAddToken)}
        >
          <Plus className="h-4 w-4" />
          Add Token
        </Button>
      </div>

      {showAddToken && (
        <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <Input
            placeholder="0x... (Token Address on Base)"
            value={newTokenAddress}
            onChange={(e) => setNewTokenAddress(e.target.value)}
            className="bg-background font-mono text-sm"
          />
          <div className="flex gap-2">
            <Button onClick={addTokenToWatchlist} disabled={isAdding || !newTokenAddress} size="sm" className="flex-1">
              {isAdding ? "Adding..." : "Add to Watchlist"}
            </Button>
            <Button
              onClick={() => {
                setShowAddToken(false)
                setNewTokenAddress("")
              }}
              size="sm"
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {tokens.map((token) => (
            <div
              key={token.address}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/50 group"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{token.symbol}</p>
                  <Badge variant="secondary" className="text-xs">
                    {token.volume}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{token.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-mono text-sm font-medium text-foreground">
                    ${token.price < 10 ? token.price.toFixed(4) : token.price.toFixed(2)}
                  </p>
                  <div className="flex items-center justify-end gap-1">
                    {token.change24h >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-success" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-destructive" />
                    )}
                    <p className={`text-xs ${token.change24h >= 0 ? "text-success" : "text-destructive"}`}>
                      {token.change24h >= 0 ? "+" : ""}
                      {token.change24h.toFixed(2)}%
                    </p>
                  </div>
                </div>
                {!DEFAULT_TOKENS.find((t) => t.address === token.address) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeToken(token.address)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
