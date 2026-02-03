"use client"

import React, { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  fetchDailyPnL, 
  fetchWeeklyPnL, 
  fetchMonthlyPnL,
  fetchQuarterlyPnL, 
  fetchYTDPnL,
  fetchAllTimePnL,
  PersonalPnLResponse,
  LeaderboardPnLResponse,
  MarketType
} from '@/lib/api/pnl'
import { fetchTradesByStatus, SettledVirtualTrade, ClearedVirtualTrade } from '@/lib/api/cleared'
import { useNodes } from '@/contexts/NodesContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
  RefreshCw, TrendingUp, TrendingDown, DollarSign, Trophy, 
  Calendar, CalendarDays, CalendarRange, BarChart3, Medal, Zap, CalendarCheck
} from 'lucide-react'
import { getTomorrowDate } from '@/lib/utils'

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'ytd' | 'alltime'

export function PnLDashboard() {
  const { traderToken } = useAuth()
  const { virtualsNodes } = useNodes()
  
  // Period selection
  const [activePeriod, setActivePeriod] = useState<PeriodType>('ytd')
  
  // Date params
  const [selectedDate, setSelectedDate] = useState(getTomorrowDate())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3))
  
  // Show leaderboard toggle
  const [showLeaderboard, setShowLeaderboard] = useState(true)
  
  // Data - separate for Virtuals and UTC
  const [virtualsPnL, setVirtualsPnL] = useState<PersonalPnLResponse | null>(null)
  const [utcPnL, setUtcPnL] = useState<PersonalPnLResponse | null>(null)
  const [virtualsLeaderboard, setVirtualsLeaderboard] = useState<LeaderboardPnLResponse | null>(null)
  const [utcLeaderboard, setUtcLeaderboard] = useState<LeaderboardPnLResponse | null>(null)
  const [settledTrades, setSettledTrades] = useState<SettledVirtualTrade[] | null>(null)
  const [clearedTrades, setClearedTrades] = useState<ClearedVirtualTrade[] | null>(null)
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Helper to look up node name by ID
  const getNodeName = useCallback((nodeId: string | number | undefined) => {
    if (!nodeId) return '-'
    const id = String(nodeId)
    const node = virtualsNodes.find(n => n.id === id)
    return node?.name || id
  }, [virtualsNodes])

  const loadPnLData = async () => {
    if (!traderToken) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      // Fetch personal PnL for both markets
      let virtualsData: PersonalPnLResponse
      let utcData: PersonalPnLResponse
      let virtualsLbData: LeaderboardPnLResponse | null = null
      let utcLbData: LeaderboardPnLResponse | null = null
      
      switch (activePeriod) {
        case 'daily':
          virtualsData = await fetchDailyPnL(traderToken, selectedDate, 'virtuals', false) as PersonalPnLResponse
          utcData = await fetchDailyPnL(traderToken, selectedDate, 'utc', false) as PersonalPnLResponse
          if (showLeaderboard) {
            virtualsLbData = await fetchDailyPnL(traderToken, selectedDate, 'virtuals', true) as LeaderboardPnLResponse
            utcLbData = await fetchDailyPnL(traderToken, selectedDate, 'utc', true) as LeaderboardPnLResponse
          }
          // Fetch both cleared and settled trades for daily view
          const [clearedData, settledData] = await Promise.all([
            fetchTradesByStatus(traderToken, selectedDate, 'virtuals', 'cleared'),
            fetchTradesByStatus(traderToken, selectedDate, 'virtuals', 'settled'),
          ])
          setClearedTrades(clearedData as ClearedVirtualTrade[])
          setSettledTrades(settledData as SettledVirtualTrade[])
          break
          
        case 'weekly':
          virtualsData = await fetchWeeklyPnL(traderToken, selectedDate, 'virtuals', false) as PersonalPnLResponse
          utcData = await fetchWeeklyPnL(traderToken, selectedDate, 'utc', false) as PersonalPnLResponse
          if (showLeaderboard) {
            virtualsLbData = await fetchWeeklyPnL(traderToken, selectedDate, 'virtuals', true) as LeaderboardPnLResponse
            utcLbData = await fetchWeeklyPnL(traderToken, selectedDate, 'utc', true) as LeaderboardPnLResponse
          }
          setSettledTrades(null)
          setClearedTrades(null)
          break
          
        case 'monthly':
          virtualsData = await fetchMonthlyPnL(traderToken, selectedMonth, 'virtuals', false) as PersonalPnLResponse
          utcData = await fetchMonthlyPnL(traderToken, selectedMonth, 'utc', false) as PersonalPnLResponse
          if (showLeaderboard) {
            virtualsLbData = await fetchMonthlyPnL(traderToken, selectedMonth, 'virtuals', true) as LeaderboardPnLResponse
            utcLbData = await fetchMonthlyPnL(traderToken, selectedMonth, 'utc', true) as LeaderboardPnLResponse
          }
          setSettledTrades(null)
          setClearedTrades(null)
          break
          
        case 'quarterly':
          virtualsData = await fetchQuarterlyPnL(traderToken, selectedQuarter, selectedYear, 'virtuals', false) as PersonalPnLResponse
          utcData = await fetchQuarterlyPnL(traderToken, selectedQuarter, selectedYear, 'utc', false) as PersonalPnLResponse
          if (showLeaderboard) {
            virtualsLbData = await fetchQuarterlyPnL(traderToken, selectedQuarter, selectedYear, 'virtuals', true) as LeaderboardPnLResponse
            utcLbData = await fetchQuarterlyPnL(traderToken, selectedQuarter, selectedYear, 'utc', true) as LeaderboardPnLResponse
          }
          setSettledTrades(null)
          setClearedTrades(null)
          break
          
        case 'ytd':
          virtualsData = await fetchYTDPnL(traderToken, selectedYear, selectedDate, 'virtuals', false) as PersonalPnLResponse
          utcData = await fetchYTDPnL(traderToken, selectedYear, selectedDate, 'utc', false) as PersonalPnLResponse
          if (showLeaderboard) {
            virtualsLbData = await fetchYTDPnL(traderToken, selectedYear, selectedDate, 'virtuals', true) as LeaderboardPnLResponse
            utcLbData = await fetchYTDPnL(traderToken, selectedYear, selectedDate, 'utc', true) as LeaderboardPnLResponse
          }
          setSettledTrades(null)
          setClearedTrades(null)
          break
          
        case 'alltime':
          virtualsData = await fetchAllTimePnL(traderToken, 'virtuals', false) as PersonalPnLResponse
          utcData = await fetchAllTimePnL(traderToken, 'utc', false) as PersonalPnLResponse
          if (showLeaderboard) {
            virtualsLbData = await fetchAllTimePnL(traderToken, 'virtuals', true) as LeaderboardPnLResponse
            utcLbData = await fetchAllTimePnL(traderToken, 'utc', true) as LeaderboardPnLResponse
          }
          setSettledTrades(null)
          setClearedTrades(null)
          break
          
        default:
          virtualsData = await fetchYTDPnL(traderToken, selectedYear, selectedDate, 'virtuals', false) as PersonalPnLResponse
          utcData = await fetchYTDPnL(traderToken, selectedYear, selectedDate, 'utc', false) as PersonalPnLResponse
      }
      
      console.log('Virtuals PnL:', virtualsData)
      console.log('UTC PnL:', utcData)
      
      setVirtualsPnL(virtualsData)
      setUtcPnL(utcData)
      setVirtualsLeaderboard(virtualsLbData)
      setUtcLeaderboard(utcLbData)
      
    } catch (err) {
      console.error('PnL fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch PnL data')
      setVirtualsPnL(null)
      setUtcPnL(null)
      setVirtualsLeaderboard(null)
      setUtcLeaderboard(null)
      setClearedTrades(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate total PnL
  const totalPnL = (virtualsPnL?.realizedPnl || 0) + (utcPnL?.realizedPnl || 0)

  // Combined trade type for display
  type CombinedTrade = {
    tradeId: string
    hour: number
    tradeType: 'INC' | 'DEC'
    location: string
    mw: number           // submitted/cleared MW
    clearedMw?: number   // from settled
    daLmp?: number
    totalLmpRt?: number
    pnl?: number
    status: 'CLEARED' | 'REJECTED' | 'SETTLED'
  }

  // Combine cleared and settled trades for daily view
  const combinedTrades: CombinedTrade[] | null = React.useMemo(() => {
    if (!clearedTrades && !settledTrades) return null
    
    const combined: CombinedTrade[] = []
    const settledTradeIds = new Set(settledTrades?.map(t => t.tradeId) || [])
    
    // Add settled trades first (they have full data)
    settledTrades?.forEach(trade => {
      combined.push({
        tradeId: trade.tradeId,
        hour: trade.hour,
        tradeType: trade.tradeType,
        location: String(trade.pnodeId),
        mw: trade.clearedMw,
        clearedMw: trade.clearedMw,
        daLmp: trade.daLmp,
        totalLmpRt: trade.totalLmpRt,
        pnl: trade.pnl,
        status: 'SETTLED',
      })
    })
    
    // Add cleared trades that haven't settled yet
    clearedTrades?.forEach(trade => {
      if (!settledTradeIds.has(trade.tradeId)) {
        combined.push({
          tradeId: trade.tradeId,
          hour: trade.hour,
          tradeType: trade.type,
          location: trade.location,
          mw: trade.mw,
          clearedMw: trade.status === 'CLEARED' ? trade.mw : 0,
          daLmp: trade.daLmp,
          pnl: undefined,
          status: trade.status,
        })
      }
    })
    
    return combined
  }, [clearedTrades, settledTrades])

  // Group combined trades by location for daily view
  const groupedTrades = combinedTrades?.reduce((acc, trade) => {
    const key = trade.location || 'Unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(trade)
    return acc
  }, {} as Record<string, CombinedTrade[]>)

  // Period tabs config
  const periods: { id: PeriodType; label: string; icon: React.ReactNode }[] = [
    { id: 'daily', label: 'Daily', icon: <Calendar className="h-4 w-4" /> },
    { id: 'weekly', label: 'Weekly', icon: <CalendarDays className="h-4 w-4" /> },
    { id: 'monthly', label: 'Monthly', icon: <CalendarCheck className="h-4 w-4" /> },
    { id: 'quarterly', label: 'Quarterly', icon: <CalendarRange className="h-4 w-4" /> },
    { id: 'ytd', label: 'YTD', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'alltime', label: 'All-Time', icon: <Trophy className="h-4 w-4" /> },
  ]

  // Render PnL card for a market
  const renderPnLCard = (
    title: string, 
    pnl: PersonalPnLResponse | null, 
    colorClass: string,
    icon: React.ReactNode
  ) => {
    const value = pnl?.realizedPnl || 0
    const isPositive = value >= 0
    
    return (
      <Card className={`${isPositive ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
        <CardHeader className="pb-2">
          <CardTitle className={`text-sm font-medium flex items-center gap-2 ${colorClass}`}>
            {icon}
            {title}
          </CardTitle>
          {pnl?.startDate && pnl?.endDate && (
            <CardDescription className="text-xs">
              {pnl.startDate} to {pnl.endDate}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
            ${isPositive ? '+' : ''}{value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {pnl?.prelim && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-amber-500 rounded-full"></span>
              Preliminary
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  // Render leaderboard card
  const renderLeaderboard = (title: string, data: LeaderboardPnLResponse | null, colorClass: string) => {
    const leaderboard = data?.rows
      ?.filter(e => e && e.traderEmail)
      .sort((a, b) => (b.realizedPnl || 0) - (a.realizedPnl || 0)) || []

    return (
      <Card className="h-fit">
        <CardHeader className="pb-3">
          <CardTitle className={`flex items-center gap-2 text-sm ${colorClass}`}>
            <Trophy className="h-4 w-4 text-amber-500" />
            {title} Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              No data available
            </p>
          ) : (
            <div className="space-y-1.5 max-h-[300px] overflow-auto">
              {leaderboard.slice(0, 10).map((entry, idx) => {
                const isTop3 = idx < 3
                const medalColors = ['text-amber-500', 'text-gray-400', 'text-amber-700']
                const pnl = entry.realizedPnl || 0
                
                return (
                  <div 
                    key={entry.traderEmail || idx} 
                    className={`flex items-center justify-between p-1.5 rounded text-xs ${
                      isTop3 ? 'bg-amber-50' : 'bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        isTop3 ? 'bg-amber-100' : 'bg-muted'
                      }`}>
                        {isTop3 ? (
                          <Medal className={`h-3 w-3 ${medalColors[idx]}`} />
                        ) : (
                          <span className="text-muted-foreground text-[10px]">{idx + 1}</span>
                        )}
                      </div>
                      <span className="font-medium truncate max-w-[100px]">
                        {entry.traderEmail?.split('@')[0] || 'Unknown'}
                      </span>
                    </div>
                    <span className={`font-bold ${pnl >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {pnl >= 0 ? '+' : ''}{(pnl / 1000).toFixed(1)}k
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Period Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-4">
        {periods.map(period => (
          <Button
            key={period.id}
            variant={activePeriod === period.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActivePeriod(period.id)}
            className="gap-2"
          >
            {period.icon}
            {period.label}
          </Button>
        ))}
      </div>

      {/* Date/Period Selector */}
      <div className="flex flex-wrap items-end gap-4">
        {(activePeriod === 'daily' || activePeriod === 'weekly' || activePeriod === 'ytd') && (
          <div className="space-y-2">
            <Label htmlFor="pnlDate">
              {activePeriod === 'daily' ? 'As Of Date' : activePeriod === 'weekly' ? 'Anchor Date' : 'As Of Date'}
            </Label>
            <Input
              id="pnlDate"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-48"
            />
          </div>
        )}
        
        {activePeriod === 'monthly' && (
          <div className="space-y-2">
            <Label htmlFor="month">Month</Label>
            <Input
              id="month"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-48"
            />
          </div>
        )}
        
        {(activePeriod === 'quarterly' || activePeriod === 'ytd') && (
          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Input
              id="year"
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-28"
            />
          </div>
        )}
        
        {activePeriod === 'quarterly' && (
          <div className="space-y-2">
            <Label htmlFor="quarter">Quarter</Label>
            <select
              id="quarter"
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(Number(e.target.value))}
              className="flex h-10 w-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value={1}>Q1</option>
              <option value={2}>Q2</option>
              <option value={3}>Q3</option>
              <option value={4}>Q4</option>
            </select>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showLeaderboard"
            checked={showLeaderboard}
            onChange={(e) => setShowLeaderboard(e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="showLeaderboard" className="text-sm">Show Leaderboard</Label>
        </div>
        
        <Button onClick={loadPnLData} disabled={isLoading}>
          {isLoading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <BarChart3 className="h-4 w-4 mr-2" />
          )}
          {isLoading ? 'Loading...' : 'Fetch PnL'}
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-red-50 text-red-800 border border-red-200">
          {error}
        </div>
      )}

      {/* Main content area */}
      {(virtualsPnL !== null || utcPnL !== null) && (
        <div className="space-y-6">
          {/* Total PnL Summary */}
          <Card className={`${totalPnL >= 0 ? 'border-green-300 bg-gradient-to-r from-green-50 to-white' : 'border-red-300 bg-gradient-to-r from-red-50 to-white'}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Total {activePeriod.charAt(0).toUpperCase() + activePeriod.slice(1)} PnL
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-bold ${totalPnL >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                ${totalPnL >= 0 ? '+' : ''}{totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          {/* Market PnL Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {renderPnLCard(
              'Virtuals PnL', 
              virtualsPnL, 
              'text-blue-700',
              <TrendingUp className="h-4 w-4" />
            )}
            {renderPnLCard(
              'UTC PnL', 
              utcPnL, 
              'text-purple-700',
              <Zap className="h-4 w-4" />
            )}
          </div>

          {/* Leaderboards */}
          {showLeaderboard && (virtualsLeaderboard || utcLeaderboard) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {renderLeaderboard('Virtuals', virtualsLeaderboard, 'text-blue-700')}
              {renderLeaderboard('UTC', utcLeaderboard, 'text-purple-700')}
            </div>
          )}

          {/* Trades Detail (Daily only) */}
          {activePeriod === 'daily' && combinedTrades !== null && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Trades Detail
                </CardTitle>
                <CardDescription>
                  {combinedTrades.length === 0 
                    ? `No trades for ${selectedDate}`
                    : `${combinedTrades.filter(t => t.status === 'SETTLED').length} settled, ${combinedTrades.filter(t => t.status === 'CLEARED').length} cleared, ${combinedTrades.filter(t => t.status === 'REJECTED').length} rejected`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {combinedTrades.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    No trades found for this date.
                  </p>
                ) : (
                  <div className="space-y-4 max-h-[400px] overflow-auto">
                    {groupedTrades && Object.entries(groupedTrades).map(([location, trades]) => {
                      const settledTrades = trades.filter(t => t.status === 'SETTLED')
                      const locationPnL = settledTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
                      const nodeName = getNodeName(location)
                      const clearedCount = trades.filter(t => t.status === 'CLEARED').length
                      const rejectedCount = trades.filter(t => t.status === 'REJECTED').length
                      
                      return (
                        <div key={location} className="border rounded-lg overflow-hidden">
                          <div className="bg-muted/50 px-4 py-2 flex items-center justify-between border-b">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{nodeName}</span>
                              <span className="text-xs text-muted-foreground">
                                ({trades.length} trades
                                {clearedCount > 0 && `, ${clearedCount} cleared`}
                                {rejectedCount > 0 && `, ${rejectedCount} rejected`})
                              </span>
                            </div>
                            {settledTrades.length > 0 ? (
                              <span className={`font-semibold text-sm ${locationPnL >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                {locationPnL >= 0 ? '+' : ''}${locationPnL.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">Pending settlement</span>
                            )}
                          </div>
                          <table className="w-full text-xs">
                            <thead className="bg-muted/30">
                              <tr>
                                <th className="px-2 py-1.5 text-left">HE</th>
                                <th className="px-2 py-1.5 text-left">Type</th>
                                <th className="px-2 py-1.5 text-right">MW</th>
                                <th className="px-2 py-1.5 text-center">Status</th>
                                <th className="px-2 py-1.5 text-right">DA</th>
                                <th className="px-2 py-1.5 text-right">RT</th>
                                <th className="px-2 py-1.5 text-right">PnL</th>
                              </tr>
                            </thead>
                            <tbody>
                              {trades.sort((a, b) => a.hour - b.hour).map((trade, idx) => (
                                <tr key={idx} className={`border-t hover:bg-muted/20 ${trade.status === 'REJECTED' ? 'opacity-60' : ''}`}>
                                  <td className="px-2 py-1.5">{trade.hour}</td>
                                  <td className="px-2 py-1.5">
                                    {trade.tradeType === 'INC' ? (
                                      <span className="text-green-700">
                                        <TrendingUp className="h-3 w-3 inline mr-0.5" />INC
                                      </span>
                                    ) : (
                                      <span className="text-orange-700">
                                        <TrendingDown className="h-3 w-3 inline mr-0.5" />DEC
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-2 py-1.5 text-right font-mono">{trade.clearedMw ?? trade.mw}</td>
                                  <td className="px-2 py-1.5 text-center">
                                    {trade.status === 'SETTLED' ? (
                                      <span className="text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded text-xs">Settled</span>
                                    ) : trade.status === 'CLEARED' ? (
                                      <span className="text-green-700 bg-green-100 px-1.5 py-0.5 rounded text-xs">Cleared</span>
                                    ) : (
                                      <span className="text-red-700 bg-red-100 px-1.5 py-0.5 rounded text-xs">Rejected</span>
                                    )}
                                  </td>
                                  <td className="px-2 py-1.5 text-right font-mono">{trade.daLmp ? `$${trade.daLmp.toFixed(2)}` : '-'}</td>
                                  <td className="px-2 py-1.5 text-right font-mono">{trade.totalLmpRt ? `$${trade.totalLmpRt.toFixed(2)}` : '-'}</td>
                                  <td className={`px-2 py-1.5 text-right font-bold ${trade.pnl !== undefined ? (trade.pnl >= 0 ? 'text-green-700' : 'text-red-700') : 'text-muted-foreground'}`}>
                                    {trade.pnl !== undefined ? `$${trade.pnl.toFixed(2)}` : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Initial state */}
      {virtualsPnL === null && utcPnL === null && !isLoading && !error && (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Select a period and click &quot;Fetch PnL&quot; to view your Virtuals and UTC performance
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
