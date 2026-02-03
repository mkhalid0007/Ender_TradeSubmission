"use client"

import React, { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNodes } from '@/contexts/NodesContext'
import { fetchAllTradeData, SettledVirtualTrade, SettledUTCTrade, ClearedVirtualTrade, ClearedUTCTrade } from '@/lib/api/cleared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, TrendingUp, TrendingDown, DollarSign, Zap, BarChart3, Download } from 'lucide-react'
import { getTomorrowDate } from '@/lib/utils'
import { exportToCSV, formatDateForFilename } from '@/lib/export'

// Unified display type for comparison
interface ComparisonTrade {
  id: string
  tradeType: 'INC' | 'DEC' | 'UTC'
  hour: number
  location: string // For virtuals: node name, For UTC: source → sink
  submittedPrice: number
  clearedMw: number
  daPrice: number // DA LMP for virtuals, DA Spread for UTC
  rtPrice: number // RT LMP for virtuals, RT Spread for UTC
  priceDiff: number
  pnl: number
  status: 'SETTLED' | 'CLEARED' | 'REJECTED'
}

export function TradeComparison() {
  const { traderToken } = useAuth()
  const { virtualsNodes, utcNodes } = useNodes()
  const [selectedDate, setSelectedDate] = useState(getTomorrowDate())
  const [isLoading, setIsLoading] = useState(false)
  const [trades, setTrades] = useState<ComparisonTrade[]>([])
  const [error, setError] = useState<string | null>(null)

  // Helper to look up node name by ID
  const getNodeName = useCallback((nodeId: string | number | undefined, nodes: { id: string; name: string }[]) => {
    if (!nodeId) return '-'
    const id = String(nodeId)
    const node = nodes.find(n => n.id === id)
    return node?.name || id
  }, [])

  const loadComparison = async () => {
    if (!traderToken) {
      setError('Please log in to view trade comparison')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await fetchAllTradeData(traderToken, selectedDate)
      
      const comparisonTrades: ComparisonTrade[] = []

      // Process settled virtuals (have full DA/RT data)
      data.settledVirtuals.forEach((trade: SettledVirtualTrade) => {
        comparisonTrades.push({
          id: trade.tradeId,
          tradeType: trade.tradeType,
          hour: trade.hour,
          location: getNodeName(trade.pnodeId, virtualsNodes),
          submittedPrice: trade.submittedPrice,
          clearedMw: trade.clearedMw,
          daPrice: trade.daLmp,
          rtPrice: trade.totalLmpRt,
          priceDiff: trade.priceDiff,
          pnl: trade.pnl,
          status: 'SETTLED',
        })
      })

      // Process cleared virtuals (DA only, no RT yet)
      data.clearedVirtuals.forEach((trade: ClearedVirtualTrade) => {
        // Don't add if already in settled
        if (comparisonTrades.some(t => t.id === trade.tradeId)) return
        
        comparisonTrades.push({
          id: trade.tradeId,
          tradeType: trade.type,
          hour: trade.hour,
          location: getNodeName(trade.location, virtualsNodes),
          submittedPrice: trade.price,
          clearedMw: trade.mw,
          daPrice: trade.daLmp,
          rtPrice: 0, // Not settled yet
          priceDiff: 0,
          pnl: 0,
          status: trade.status === 'REJECTED' ? 'REJECTED' : 'CLEARED',
        })
      })

      // Process settled UTC (have full spread data)
      data.settledUTC.forEach((trade: SettledUTCTrade) => {
        comparisonTrades.push({
          id: trade.tradeId,
          tradeType: 'UTC',
          hour: trade.hour,
          location: `${getNodeName(trade.sourceLocation, utcNodes)} → ${getNodeName(trade.sinkLocation, utcNodes)}`,
          submittedPrice: trade.submittedPrice,
          clearedMw: trade.clearedMw,
          daPrice: trade.daSpread,
          rtPrice: trade.rtSpread,
          priceDiff: trade.spreadDiff,
          pnl: trade.pnl,
          status: 'SETTLED',
        })
      })

      // Process cleared UTC (DA only)
      data.clearedUTC.forEach((trade: ClearedUTCTrade) => {
        if (comparisonTrades.some(t => t.id === trade.tradeId)) return
        
        comparisonTrades.push({
          id: trade.tradeId,
          tradeType: 'UTC',
          hour: trade.hour,
          location: `${getNodeName(trade.sourceLocation, utcNodes)} → ${getNodeName(trade.sinkLocation, utcNodes)}`,
          submittedPrice: trade.price,
          clearedMw: trade.mw,
          daPrice: trade.daSpread,
          rtPrice: 0,
          priceDiff: 0,
          pnl: 0,
          status: trade.status === 'REJECTED' ? 'REJECTED' : 'CLEARED',
        })
      })

      // Sort by hour, then type
      comparisonTrades.sort((a, b) => {
        if (a.hour !== b.hour) return a.hour - b.hour
        return a.tradeType.localeCompare(b.tradeType)
      })

      setTrades(comparisonTrades)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trade data')
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate summary stats
  const settledTrades = trades.filter(t => t.status === 'SETTLED')
  const totalPnL = settledTrades.reduce((sum, t) => sum + t.pnl, 0)
  const winners = settledTrades.filter(t => t.pnl > 0)
  const losers = settledTrades.filter(t => t.pnl < 0)
  const winRate = settledTrades.length > 0 ? (winners.length / settledTrades.length) * 100 : 0

  // Group by type for display
  const incTrades = trades.filter(t => t.tradeType === 'INC')
  const decTrades = trades.filter(t => t.tradeType === 'DEC')
  const utcTrades = trades.filter(t => t.tradeType === 'UTC')

  // Export handler
  const handleExport = () => {
    if (trades.length === 0) return
    
    const exportData = trades.map(t => ({
      tradeType: t.tradeType,
      hour: t.hour,
      location: t.location,
      clearedMW: t.clearedMw,
      submittedPrice: t.submittedPrice,
      daPrice: t.daPrice,
      rtPrice: t.rtPrice,
      priceDiff: t.priceDiff,
      pnl: t.pnl,
      status: t.status,
    }))
    
    exportToCSV(exportData, `trade_comparison_${formatDateForFilename(selectedDate)}`, [
      { key: 'tradeType', header: 'Type' },
      { key: 'hour', header: 'HE' },
      { key: 'location', header: 'Location' },
      { key: 'clearedMW', header: 'Cleared MW' },
      { key: 'submittedPrice', header: 'Submitted Price' },
      { key: 'daPrice', header: 'DA Price' },
      { key: 'rtPrice', header: 'RT Price' },
      { key: 'priceDiff', header: 'Price Diff' },
      { key: 'pnl', header: 'PnL' },
      { key: 'status', header: 'Status' },
    ])
  }

  const formatPrice = (price: number) => {
    return price !== 0 ? `$${price.toFixed(2)}` : '-'
  }

  const formatPnL = (pnl: number, status: string) => {
    if (status !== 'SETTLED') return '-'
    const color = pnl >= 0 ? 'text-green-600' : 'text-red-600'
    return <span className={color}>${pnl.toFixed(2)}</span>
  }

  const renderTradeTable = (
    title: string,
    tradesToRender: ComparisonTrade[],
    typeColor: string,
    description: string
  ) => {
    if (tradesToRender.length === 0) return null

    const typePnL = tradesToRender.filter(t => t.status === 'SETTLED').reduce((sum, t) => sum + t.pnl, 0)

    return (
      <Card className={`border-l-4 ${typeColor}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </div>
            <div className={`text-lg font-bold ${typePnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${typePnL.toFixed(2)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2 font-medium">HE</th>
                  <th className="text-left p-2 font-medium">Location</th>
                  <th className="text-right p-2 font-medium">Cleared MW</th>
                  <th className="text-right p-2 font-medium">Submitted</th>
                  <th className="text-right p-2 font-medium">DA</th>
                  <th className="text-right p-2 font-medium">RT</th>
                  <th className="text-right p-2 font-medium">Diff</th>
                  <th className="text-right p-2 font-medium">PnL</th>
                  <th className="text-center p-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {tradesToRender.map((trade, idx) => (
                  <tr key={`${trade.id}-${idx}`} className="border-b hover:bg-muted/30">
                    <td className="p-2 font-medium">{trade.hour}</td>
                    <td className="p-2 max-w-[200px] truncate" title={trade.location}>
                      {trade.location}
                    </td>
                    <td className="p-2 text-right">{trade.clearedMw} MW</td>
                    <td className="p-2 text-right">{formatPrice(trade.submittedPrice)}</td>
                    <td className="p-2 text-right text-blue-600">{formatPrice(trade.daPrice)}</td>
                    <td className="p-2 text-right text-orange-600">
                      {trade.status === 'SETTLED' ? formatPrice(trade.rtPrice) : '-'}
                    </td>
                    <td className="p-2 text-right">
                      {trade.status === 'SETTLED' ? (
                        <span className={trade.priceDiff >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {trade.priceDiff >= 0 ? '+' : ''}{trade.priceDiff.toFixed(2)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-2 text-right font-medium">{formatPnL(trade.pnl, trade.status)}</td>
                    <td className="p-2 text-center">
                      {trade.status === 'SETTLED' && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Settled</span>
                      )}
                      {trade.status === 'CLEARED' && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">Cleared</span>
                      )}
                      {trade.status === 'REJECTED' && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">Rejected</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Trade Comparison
        </h2>
        <p className="text-muted-foreground">
          Compare submitted prices vs DA vs RT prices with profit/loss analysis
        </p>
      </div>

      {/* Date Selection */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="compDate">Trade Date</Label>
              <Input
                id="compDate"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-[180px]"
              />
            </div>
            <Button onClick={loadComparison} disabled={isLoading}>
              <Search className="h-4 w-4 mr-2" />
              {isLoading ? 'Loading...' : 'Load Comparison'}
            </Button>
            {trades.length > 0 && (
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Summary Stats */}
      {trades.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total PnL</span>
              </div>
              <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${totalPnL.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="text-sm text-muted-foreground">Winners</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{winners.length}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                <span className="text-sm text-muted-foreground">Losers</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{losers.length}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Win Rate</span>
              </div>
              <p className="text-2xl font-bold">{winRate.toFixed(0)}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trade Tables */}
      {trades.length > 0 ? (
        <div className="space-y-6">
          {renderTradeTable(
            'INC Trades (Short DA)',
            incTrades,
            'border-l-red-500',
            'Sell DA, Buy RT → Profit when DA > RT'
          )}
          {renderTradeTable(
            'DEC Trades (Long DA)',
            decTrades,
            'border-l-green-500',
            'Buy DA, Sell RT → Profit when RT > DA'
          )}
          {renderTradeTable(
            'UTC Trades',
            utcTrades,
            'border-l-purple-500',
            'Congestion spread arbitrage → Profit when RT Spread > DA Spread'
          )}
        </div>
      ) : !isLoading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a date and click "Load Comparison" to view trade analysis</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
