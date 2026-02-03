"use client"

import React, { useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { fetchTradesByStatus, SettledVirtualTrade, ClearedVirtualTrade, SettledUTCTrade, ClearedUTCTrade } from '@/lib/api/cleared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RefreshCw, TrendingUp, TrendingDown, BarChart3, PieChart, Target, CheckCircle2, Scale } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts'

interface DailyPnL {
  date: string
  pnl: number
  cumulativePnl: number
  tradesCount: number
}

interface TradeStats {
  totalSubmitted: number
  totalCleared: number
  totalRejected: number
  totalSettled: number
  wins: number
  losses: number
  totalPnL: number
  avgPnL: number
  totalMW: number
  avgMW: number
}

const COLORS = {
  green: '#22c55e',
  red: '#ef4444',
  blue: '#3b82f6',
  amber: '#f59e0b',
  purple: '#8b5cf6',
}

export function AnalyticsDashboard() {
  const { traderToken } = useAuth()
  
  // Date range for analysis
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30) // Default to last 30 days
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  
  // Data states
  const [dailyPnLData, setDailyPnLData] = useState<DailyPnL[]>([])
  const [stats, setStats] = useState<TradeStats | null>(null)

  // Helper function to add delay between batches
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  // Fetch data for date range
  const loadAnalytics = useCallback(async () => {
    if (!traderToken) return
    
    setIsLoading(true)
    setError(null)
    setProgress({ current: 0, total: 0 })
    
    try {
      // Generate date range
      const dates: string[] = []
      const current = new Date(startDate)
      const end = new Date(endDate)
      
      while (current <= end) {
        dates.push(current.toISOString().split('T')[0])
        current.setDate(current.getDate() + 1)
      }
      
      setProgress({ current: 0, total: dates.length })
      
      // Fetch data for each date (in parallel batches)
      const allSettledVirtuals: SettledVirtualTrade[] = []
      const allClearedVirtuals: ClearedVirtualTrade[] = []
      const allSettledUTC: SettledUTCTrade[] = []
      const allClearedUTC: ClearedUTCTrade[] = []
      
      // Conservative batch size to avoid overwhelming the server
      // 2 dates per batch = 8 concurrent requests (2 dates × 4 API calls each)
      const batchSize = 2
      // 200ms delay between batches
      const batchDelay = 200
      
      for (let i = 0; i < dates.length; i += batchSize) {
        const batch = dates.slice(i, i + batchSize)
        const batchPromises = batch.flatMap(date => [
          fetchTradesByStatus(traderToken, date, 'virtuals', 'settled').catch(() => []),
          fetchTradesByStatus(traderToken, date, 'virtuals', 'cleared').catch(() => []),
          fetchTradesByStatus(traderToken, date, 'utc', 'settled').catch(() => []),
          fetchTradesByStatus(traderToken, date, 'utc', 'cleared').catch(() => []),
        ])
        
        const results = await Promise.all(batchPromises)
        
        // Process results
        for (let j = 0; j < batch.length; j++) {
          const baseIdx = j * 4
          allSettledVirtuals.push(...(results[baseIdx] as SettledVirtualTrade[]))
          allClearedVirtuals.push(...(results[baseIdx + 1] as ClearedVirtualTrade[]))
          allSettledUTC.push(...(results[baseIdx + 2] as SettledUTCTrade[]))
          allClearedUTC.push(...(results[baseIdx + 3] as ClearedUTCTrade[]))
        }
        
        // Update progress
        setProgress({ current: Math.min(i + batchSize, dates.length), total: dates.length })
        
        // Small delay between batches to avoid overwhelming the server
        if (i + batchSize < dates.length) {
          await delay(batchDelay)
        }
      }
      
      // Calculate daily PnL
      const pnlByDate: Record<string, { pnl: number; count: number }> = {}
      
      allSettledVirtuals.forEach(trade => {
        const date = trade.tradeDate
        if (!pnlByDate[date]) pnlByDate[date] = { pnl: 0, count: 0 }
        pnlByDate[date].pnl += trade.pnl || 0
        pnlByDate[date].count += 1
      })
      
      allSettledUTC.forEach(trade => {
        const date = trade.tradeDate
        if (!pnlByDate[date]) pnlByDate[date] = { pnl: 0, count: 0 }
        pnlByDate[date].pnl += trade.pnl || 0
        pnlByDate[date].count += 1
      })
      
      // Sort by date and calculate cumulative
      const sortedDates = Object.keys(pnlByDate).sort()
      let cumulative = 0
      const dailyData: DailyPnL[] = sortedDates.map(date => {
        cumulative += pnlByDate[date].pnl
        return {
          date,
          pnl: pnlByDate[date].pnl,
          cumulativePnl: cumulative,
          tradesCount: pnlByDate[date].count,
        }
      })
      
      setDailyPnLData(dailyData)
      
      // Calculate stats
      const settledTradeIds = new Set([
        ...allSettledVirtuals.map(t => t.tradeId),
        ...allSettledUTC.map(t => t.tradeId),
      ])
      
      // Count cleared trades that aren't settled yet
      const clearedNotSettled = [
        ...allClearedVirtuals.filter(t => !settledTradeIds.has(t.tradeId)),
        ...allClearedUTC.filter(t => !settledTradeIds.has(t.tradeId)),
      ]
      
      const clearedCount = clearedNotSettled.filter(t => t.status === 'CLEARED').length
      const rejectedCount = [
        ...allClearedVirtuals.filter(t => t.status === 'REJECTED'),
        ...allClearedUTC.filter(t => t.status === 'REJECTED'),
      ].length
      
      const allSettled = [...allSettledVirtuals, ...allSettledUTC]
      const wins = allSettled.filter(t => (t.pnl || 0) > 0).length
      const losses = allSettled.filter(t => (t.pnl || 0) < 0).length
      const totalPnL = allSettled.reduce((sum, t) => sum + (t.pnl || 0), 0)
      
      // Calculate total MW across all trades (cleared + settled)
      // Cleared trades use 'mw', Settled trades use 'clearedMw'
      const clearedMWTotal = clearedNotSettled.reduce((sum, t) => sum + (t.mw || 0), 0)
      const settledMWTotal = allSettled.reduce((sum, t) => sum + (t.clearedMw || 0), 0)
      const totalMW = clearedMWTotal + settledMWTotal
      const totalTradeCount = allSettled.length + clearedCount + rejectedCount
      
      setStats({
        totalSubmitted: totalTradeCount,
        totalCleared: clearedCount + allSettled.length, // Cleared includes settled
        totalRejected: rejectedCount,
        totalSettled: allSettled.length,
        wins,
        losses,
        totalPnL,
        avgPnL: allSettled.length > 0 ? totalPnL / allSettled.length : 0,
        totalMW,
        avgMW: totalTradeCount > 0 ? totalMW / totalTradeCount : 0,
      })
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }, [traderToken, startDate, endDate])

  // Pie chart data for win/loss
  const winLossData = useMemo(() => {
    if (!stats) return []
    return [
      { name: 'Wins', value: stats.wins, color: COLORS.green },
      { name: 'Losses', value: stats.losses, color: COLORS.red },
    ].filter(d => d.value > 0)
  }, [stats])

  // Pie chart data for trade status
  const statusData = useMemo(() => {
    if (!stats) return []
    return [
      { name: 'Settled', value: stats.totalSettled, color: COLORS.blue },
      { name: 'Cleared', value: stats.totalCleared - stats.totalSettled, color: COLORS.green },
      { name: 'Rejected', value: stats.totalRejected, color: COLORS.red },
    ].filter(d => d.value > 0)
  }, [stats])

  const winRate = stats && (stats.wins + stats.losses) > 0 
    ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1)
    : '0'

  const clearRate = stats && stats.totalSubmitted > 0
    ? (((stats.totalCleared) / stats.totalSubmitted) * 100).toFixed(1)
    : '0'

  return (
    <div className="space-y-6">
      {/* Date Range Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics Dashboard
          </CardTitle>
          <CardDescription>
            Analyze your trading performance over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button onClick={loadAnalytics} disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Load Analytics
                </>
              )}
            </Button>
          </div>
          
          {/* Progress indicator */}
          {isLoading && progress.total > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Fetching data...</span>
                <span>{progress.current} / {progress.total} days</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
          
          {error && (
            <p className="text-destructive text-sm mt-4">{error}</p>
          )}
        </CardContent>
      </Card>

      {stats && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total PnL</p>
                    <p className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(2)}
                    </p>
                  </div>
                  {stats.totalPnL >= 0 ? (
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  ) : (
                    <TrendingDown className="h-8 w-8 text-red-500" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Win Rate</p>
                    <p className="text-2xl font-bold">{winRate}%</p>
                    <p className="text-xs text-muted-foreground">{stats.wins}W / {stats.losses}L</p>
                  </div>
                  <Target className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Clear Rate</p>
                    <p className="text-2xl font-bold">{clearRate}%</p>
                    <p className="text-xs text-muted-foreground">{stats.totalCleared} / {stats.totalSubmitted}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg PnL/Trade</p>
                    <p className={`text-2xl font-bold ${stats.avgPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.avgPnL >= 0 ? '+' : ''}${stats.avgPnL.toFixed(2)}
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Trade Size</p>
                    <p className="text-2xl font-bold">{stats.avgMW.toFixed(1)} MW</p>
                    <p className="text-xs text-muted-foreground">Total: {stats.totalMW.toFixed(1)} MW</p>
                  </div>
                  <Scale className="h-8 w-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* PnL Over Time */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Cumulative PnL Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                {dailyPnLData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyPnLData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => {
                          const date = new Date(value)
                          return `${date.getMonth() + 1}/${date.getDate()}`
                        }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cumulative PnL']}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cumulativePnl" 
                        stroke={COLORS.blue}
                        strokeWidth={2}
                        dot={{ fill: COLORS.blue, strokeWidth: 2, r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No PnL data for selected period
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Win/Loss Ratio */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Win/Loss Ratio</CardTitle>
              </CardHeader>
              <CardContent>
                {winLossData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsPieChart>
                      <Pie
                        data={winLossData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {winLossData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [value, 'Trades']} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    No settled trades
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Second Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Daily PnL Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Daily PnL</CardTitle>
              </CardHeader>
              <CardContent>
                {dailyPnLData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dailyPnLData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => {
                          const date = new Date(value)
                          return `${date.getMonth() + 1}/${date.getDate()}`
                        }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Daily PnL']}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Bar 
                        dataKey="pnl" 
                        fill={COLORS.blue}
                        radius={[4, 4, 0, 0]}
                      >
                        {dailyPnLData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? COLORS.green : COLORS.red} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    No PnL data for selected period
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trade Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Trade Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsPieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [value, 'Trades']} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    No trade data
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Stats Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detailed Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Total Trades</p>
                  <p className="font-semibold">{stats.totalSubmitted}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Cleared Trades</p>
                  <p className="font-semibold text-green-600">{stats.totalCleared}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Rejected Trades</p>
                  <p className="font-semibold text-red-600">{stats.totalRejected}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Settled Trades</p>
                  <p className="font-semibold text-blue-600">{stats.totalSettled}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Winning Trades</p>
                  <p className="font-semibold text-green-600">{stats.wins}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Losing Trades</p>
                  <p className="font-semibold text-red-600">{stats.losses}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Win Rate</p>
                  <p className="font-semibold">{winRate}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Clear Rate</p>
                  <p className="font-semibold">{clearRate}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Total MW</p>
                  <p className="font-semibold">{stats.totalMW.toFixed(1)} MW</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Avg Trade Size</p>
                  <p className="font-semibold text-amber-600">{stats.avgMW.toFixed(1)} MW</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!stats && !isLoading && (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              Select a date range and click &quot;Load Analytics&quot; to view your trading performance.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
