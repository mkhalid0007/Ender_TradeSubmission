"use client"

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useNodes } from '@/contexts/NodesContext'
import { fetchTrades } from '@/lib/api/trades'
import { deleteVirtualTrades } from '@/lib/api/virtuals'
import { deleteUTCTrades } from '@/lib/api/utc'
import { fetchAllTradeData, ClearedVirtualTrade, ClearedUTCTrade, SettledVirtualTrade, SettledUTCTrade } from '@/lib/api/cleared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Search, Trash2, RefreshCw, TrendingUp, TrendingDown, Edit, CheckCircle2, Clock, XCircle, Download } from 'lucide-react'
import { getTomorrowDate } from '@/lib/utils'
import { exportToCSV, formatDateForFilename } from '@/lib/export'

// Type definitions for trades
interface VirtualTrade {
  id: string
  enderTxnId?: string
  tradeDate: string
  location: string
  type: 'INC' | 'DEC'
  hour: number
  price: number
  mw: number
  traderId?: string
}

interface UTCTrade {
  id: string
  enderTxnId?: string
  tradeDate: string
  sourceLocation: number        // pnodeId as number
  sinkLocation: number          // pnodeId as number
  hour: number
  price: number
  mw: number
  traderId?: string
  createdAt?: string
}

export function TradesList() {
  const router = useRouter()
  const { traderToken } = useAuth()
  const { virtualsNodes, utcNodes } = useNodes()
  const [selectedDate, setSelectedDate] = useState(getTomorrowDate())
  
  // Helper to look up node name by ID
  const getNodeName = useCallback((nodeId: string | number | undefined, nodes: { id: string; name: string }[]) => {
    if (!nodeId) return '-'
    const id = String(nodeId)
    const node = nodes.find(n => n.id === id)
    return node?.name || id // Return name if found, otherwise show ID
  }, [])

  // Edit handlers - store trades in sessionStorage and navigate to form
  const handleEditVirtuals = () => {
    if (virtualTrades && virtualTrades.length > 0) {
      sessionStorage.setItem('editVirtualTrades', JSON.stringify({
        date: selectedDate,
        trades: virtualTrades
      }))
      router.push('/dashboard/virtuals?mode=edit')
    }
  }

  const handleEditUTC = () => {
    if (utcTrades && utcTrades.length > 0) {
      sessionStorage.setItem('editUTCTrades', JSON.stringify({
        date: selectedDate,
        trades: utcTrades
      }))
      router.push('/dashboard/utc?mode=edit')
    }
  }
  
  // Separate state for Virtuals
  const [virtualTrades, setVirtualTrades] = useState<VirtualTrade[] | null>(null)
  const [virtualsLoading, setVirtualsLoading] = useState(false)
  const [virtualsError, setVirtualsError] = useState<string | null>(null)
  const [virtualsDeleting, setVirtualsDeleting] = useState(false)
  
  // Separate state for UTC
  const [utcTrades, setUtcTrades] = useState<UTCTrade[] | null>(null)
  const [utcLoading, setUtcLoading] = useState(false)
  const [utcError, setUtcError] = useState<string | null>(null)
  const [utcDeleting, setUtcDeleting] = useState(false)
  
  // Cleared trades for status checking (separate for virtuals and UTC)
  const [clearedVirtuals, setClearedVirtuals] = useState<ClearedVirtualTrade[]>([])
  const [clearedUTC, setClearedUTC] = useState<ClearedUTCTrade[]>([])
  
  // Settled trades for PnL and cleared MW (separate for virtuals and UTC)
  const [settledVirtuals, setSettledVirtuals] = useState<SettledVirtualTrade[]>([])
  const [settledUTC, setSettledUTC] = useState<SettledUTCTrade[]>([])
  
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [hasLoadedInitially, setHasLoadedInitially] = useState(false)

  // Auto-load trades on mount for the next day
  useEffect(() => {
    if (traderToken && !hasLoadedInitially) {
      setHasLoadedInitially(true)
      loadAllTrades()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traderToken])

  // Helper to get virtual trade data (status, clearedMw, pnl, daLmp)
  const getVirtualTradeData = useCallback((trade: VirtualTrade) => {
    const clearedTrade = clearedVirtuals.find(ct => ct.tradeId === trade.id)
    const settledTrade = settledVirtuals.find(st => st.tradeId === trade.id)
    
    return {
      status: clearedTrade?.status || 'PENDING' as const,
      clearedMw: settledTrade?.clearedMw ?? clearedTrade?.mw ?? null,
      pnl: settledTrade?.pnl ?? null,
      daLmp: settledTrade?.daLmp ?? clearedTrade?.daLmp ?? null,
      rtLmp: settledTrade?.totalLmpRt ?? null,
      isSettled: !!settledTrade,
    }
  }, [clearedVirtuals, settledVirtuals])

  // Helper to get UTC trade data (status, clearedMw, pnl, spreads)
  const getUTCTradeData = useCallback((trade: UTCTrade) => {
    const clearedTrade = clearedUTC.find(ct => ct.tradeId === trade.id)
    const settledTrade = settledUTC.find(st => st.tradeId === trade.id)
    
    return {
      status: clearedTrade?.status || 'PENDING' as const,
      clearedMw: settledTrade?.clearedMw ?? clearedTrade?.mw ?? null,
      pnl: settledTrade?.pnl ?? null,
      daSpread: settledTrade?.daSpread ?? clearedTrade?.daSpread ?? null,
      rtSpread: settledTrade?.rtSpread ?? null,
      isSettled: !!settledTrade,
    }
  }, [clearedUTC, settledUTC])

  // Keep backward compatible helpers
  const getVirtualStatus = useCallback((trade: VirtualTrade): 'CLEARED' | 'REJECTED' | 'PENDING' => {
    return getVirtualTradeData(trade).status
  }, [getVirtualTradeData])

  const getUTCStatus = useCallback((trade: UTCTrade): 'CLEARED' | 'REJECTED' | 'PENDING' => {
    return getUTCTradeData(trade).status
  }, [getUTCTradeData])

  const loadAllTrades = async () => {
    if (!traderToken) return
    setMessage(null)
    
    // Load both in parallel
    setVirtualsLoading(true)
    setUtcLoading(true)
    setVirtualsError(null)
    setUtcError(null)

    // Fetch Virtuals
    fetchTrades('virtuals', traderToken, selectedDate)
      .then(data => setVirtualTrades(Array.isArray(data) ? data : []))
      .catch(err => setVirtualsError(err instanceof Error ? err.message : 'Failed to fetch'))
      .finally(() => setVirtualsLoading(false))

    // Fetch UTC
    fetchTrades('utc', traderToken, selectedDate)
      .then(data => setUtcTrades(Array.isArray(data) ? data : []))
      .catch(err => setUtcError(err instanceof Error ? err.message : 'Failed to fetch'))
      .finally(() => setUtcLoading(false))

    // Fetch Cleared + Settled trades for both markets (for status, clearedMw, PnL)
    fetchAllTradeData(traderToken, selectedDate)
      .then(data => {
        setClearedVirtuals(data.clearedVirtuals)
        setClearedUTC(data.clearedUTC)
        setSettledVirtuals(data.settledVirtuals)
        setSettledUTC(data.settledUTC)
      })
      .catch(() => {
        setClearedVirtuals([])
        setClearedUTC([])
        setSettledVirtuals([])
        setSettledUTC([])
      }) // Silently fail - just show pending status
  }

  const handleDeleteVirtuals = async () => {
    if (!traderToken) return
    setVirtualsDeleting(true)
    setMessage(null)

    try {
      await deleteVirtualTrades(traderToken, selectedDate)
      setMessage({ type: 'success', text: 'Virtual trades cancelled successfully!' })
      setVirtualTrades([])
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to cancel' })
    } finally {
      setVirtualsDeleting(false)
    }
  }

  // Export handlers
  const handleExportVirtuals = () => {
    if (!virtualTrades || virtualTrades.length === 0) return
    
    const exportData = virtualTrades.map(trade => {
      const data = getVirtualTradeData(trade)
      return {
        type: trade.type,
        hour: trade.hour,
        location: getNodeName(trade.location, virtualsNodes),
        submittedMW: trade.mw,
        clearedMW: data.clearedMw ?? '',
        submittedPrice: trade.price,
        daLmp: data.daLmp ?? '',
        rtLmp: data.rtLmp ?? '',
        pnl: data.pnl ?? '',
        status: data.isSettled ? 'SETTLED' : data.status,
      }
    })
    
    exportToCSV(exportData, `virtuals_${formatDateForFilename(selectedDate)}`, [
      { key: 'type', header: 'Type' },
      { key: 'hour', header: 'HE' },
      { key: 'location', header: 'Node' },
      { key: 'submittedMW', header: 'Submitted MW' },
      { key: 'clearedMW', header: 'Cleared MW' },
      { key: 'submittedPrice', header: 'Submitted Price' },
      { key: 'daLmp', header: 'DA LMP' },
      { key: 'rtLmp', header: 'RT LMP' },
      { key: 'pnl', header: 'PnL' },
      { key: 'status', header: 'Status' },
    ])
  }

  const handleExportUTC = () => {
    if (!utcTrades || utcTrades.length === 0) return
    
    const exportData = utcTrades.map(trade => {
      const data = getUTCTradeData(trade)
      return {
        hour: trade.hour,
        source: getNodeName(trade.sourceLocation, utcNodes),
        sink: getNodeName(trade.sinkLocation, utcNodes),
        submittedMW: trade.mw,
        clearedMW: data.clearedMw ?? '',
        submittedPrice: trade.price,
        daSpread: data.daSpread ?? '',
        rtSpread: data.rtSpread ?? '',
        pnl: data.pnl ?? '',
        status: data.isSettled ? 'SETTLED' : data.status,
      }
    })
    
    exportToCSV(exportData, `utc_${formatDateForFilename(selectedDate)}`, [
      { key: 'hour', header: 'HE' },
      { key: 'source', header: 'Source' },
      { key: 'sink', header: 'Sink' },
      { key: 'submittedMW', header: 'Submitted MW' },
      { key: 'clearedMW', header: 'Cleared MW' },
      { key: 'submittedPrice', header: 'Submitted Price' },
      { key: 'daSpread', header: 'DA Spread' },
      { key: 'rtSpread', header: 'RT Spread' },
      { key: 'pnl', header: 'PnL' },
      { key: 'status', header: 'Status' },
    ])
  }

  const handleDeleteUTC = async () => {
    if (!traderToken) return
    setUtcDeleting(true)
    setMessage(null)

    try {
      await deleteUTCTrades(traderToken, selectedDate)
      setMessage({ type: 'success', text: 'UTC trades cancelled successfully!' })
      setUtcTrades([])
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to cancel' })
    } finally {
      setUtcDeleting(false)
    }
  }

  const isLoading = virtualsLoading || utcLoading

  // Group virtual trades by location
  const groupedVirtuals = virtualTrades?.reduce((acc, trade) => {
    const key = trade.location
    if (!acc[key]) acc[key] = []
    acc[key].push(trade)
    return acc
  }, {} as Record<string, VirtualTrade[]>)

  // Calculate totals (including cleared count and PnL)
  const virtualTotals = virtualTrades?.reduce(
    (acc, t) => {
      const tradeData = getVirtualTradeData(t)
      return {
        totalMW: acc.totalMW + t.mw,
        clearedMW: acc.clearedMW + (tradeData.clearedMw || 0),
        incMW: acc.incMW + (t.type === 'INC' ? t.mw : 0),
        decMW: acc.decMW + (t.type === 'DEC' ? t.mw : 0),
        count: acc.count + 1,
        clearedCount: acc.clearedCount + (tradeData.status === 'CLEARED' ? 1 : 0),
        rejectedCount: acc.rejectedCount + (tradeData.status === 'REJECTED' ? 1 : 0),
        settledCount: acc.settledCount + (tradeData.isSettled ? 1 : 0),
        totalPnL: acc.totalPnL + (tradeData.pnl || 0),
      }
    },
    { totalMW: 0, clearedMW: 0, incMW: 0, decMW: 0, count: 0, clearedCount: 0, rejectedCount: 0, settledCount: 0, totalPnL: 0 }
  )

  const utcTotals = utcTrades?.reduce(
    (acc, t) => {
      const tradeData = getUTCTradeData(t)
      return {
        totalMW: acc.totalMW + t.mw,
        clearedMW: acc.clearedMW + (tradeData.clearedMw || 0),
        count: acc.count + 1,
        clearedCount: acc.clearedCount + (tradeData.status === 'CLEARED' ? 1 : 0),
        rejectedCount: acc.rejectedCount + (tradeData.status === 'REJECTED' ? 1 : 0),
        settledCount: acc.settledCount + (tradeData.isSettled ? 1 : 0),
        totalPnL: acc.totalPnL + (tradeData.pnl || 0),
      }
    },
    { totalMW: 0, clearedMW: 0, count: 0, clearedCount: 0, rejectedCount: 0, settledCount: 0, totalPnL: 0 }
  )

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="queryDate">Trade Date</Label>
          <Input
            id="queryDate"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-48"
          />
        </div>
        <Button onClick={loadAllTrades} disabled={isLoading}>
          {isLoading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Search className="h-4 w-4 mr-2" />
          )}
          {isLoading ? 'Loading...' : 'Fetch Trades'}
        </Button>
      </div>

      {/* Side by Side Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Virtuals Card */}
        <Card className="border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg text-blue-700 flex items-center gap-2 flex-wrap">
                Virtual Trades
                {virtualTotals && virtualTotals.count > 0 && virtualTotals.settledCount > 0 && (
                  <span className="inline-flex items-center text-blue-700 bg-blue-100 px-2 py-0.5 rounded text-xs font-medium">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {virtualTotals.settledCount} Settled
                  </span>
                )}
                {virtualTotals && virtualTotals.count > 0 && virtualTotals.clearedCount > 0 && virtualTotals.settledCount === 0 && (
                  <span className="inline-flex items-center text-green-700 bg-green-100 px-2 py-0.5 rounded text-xs font-medium">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {virtualTotals.clearedCount} Cleared
                  </span>
                )}
                {virtualTotals && virtualTotals.count > 0 && virtualTotals.rejectedCount > 0 && (
                  <span className="inline-flex items-center text-red-700 bg-red-100 px-2 py-0.5 rounded text-xs font-medium">
                    <XCircle className="h-3 w-3 mr-1" />
                    {virtualTotals.rejectedCount} Rejected
                  </span>
                )}
                {virtualTotals && virtualTotals.count > 0 && virtualTotals.clearedCount === 0 && virtualTotals.rejectedCount === 0 && virtualTotals.settledCount === 0 && (
                  <span className="inline-flex items-center text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-xs font-medium">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </span>
                )}
              </CardTitle>
              {virtualTotals && virtualTotals.count > 0 && (
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <p>
                    {virtualTotals.count} trades • 
                    <span className="text-green-600 ml-1">↑ {virtualTotals.incMW} MW INC</span> • 
                    <span className="text-orange-600 ml-1">↓ {virtualTotals.decMW} MW DEC</span>
                  </p>
                  {virtualTotals.settledCount > 0 && (
                    <p className={virtualTotals.totalPnL >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      Total PnL: {virtualTotals.totalPnL >= 0 ? '+' : ''}${virtualTotals.totalPnL.toFixed(2)}
                    </p>
                  )}
                </div>
              )}
            </div>
            {virtualTrades && virtualTrades.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleEditVirtuals}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportVirtuals}>
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={virtualsDeleting}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Cancel All
                    </Button>
                  </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel All Virtual Trades?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will cancel all {virtualTrades.length} virtual trades for {selectedDate}. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Trades</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteVirtuals} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Yes, Cancel All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {virtualsLoading && (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {virtualsError && (
              <p className="text-destructive text-sm">{virtualsError}</p>
            )}
            {!virtualTrades && !virtualsError && !virtualsLoading && (
              <p className="text-muted-foreground text-sm py-4 text-center">
                Click &quot;Fetch Trades&quot; to load
              </p>
            )}
            {virtualTrades && virtualTrades.length === 0 && (
              <p className="text-muted-foreground text-sm py-4 text-center">
                No virtual trades for {selectedDate}
              </p>
            )}
            {groupedVirtuals && Object.keys(groupedVirtuals).length > 0 && (
              <div className="space-y-4 max-h-96 overflow-auto">
                {Object.entries(groupedVirtuals).map(([location, trades]) => {
                  const nodeName = getNodeName(location, virtualsNodes)
                  return (
                  <div key={location} className="border rounded-lg overflow-hidden">
                    <div className="bg-blue-50 px-3 py-2 font-medium text-sm border-b" title={`ID: ${location}`}>
                      📍 {nodeName}
                    </div>
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-2 py-2 text-left font-medium">HE</th>
                          <th className="px-2 py-2 text-left font-medium">Type</th>
                          <th className="px-2 py-2 text-right font-medium">Submitted</th>
                          <th className="px-2 py-2 text-right font-medium">Cleared</th>
                          <th className="px-2 py-2 text-right font-medium">Price</th>
                          <th className="px-2 py-2 text-center font-medium">Status</th>
                          <th className="px-2 py-2 text-right font-medium">PnL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trades.sort((a, b) => a.hour - b.hour).map((trade) => {
                          const tradeData = getVirtualTradeData(trade)
                          return (
                          <tr key={trade.id} className="border-t hover:bg-muted/30">
                            <td className="px-2 py-2">{trade.hour}</td>
                            <td className="px-2 py-2">
                              {trade.type === 'INC' ? (
                                <span className="inline-flex items-center text-green-700 bg-green-100 px-1.5 py-0.5 rounded text-xs font-medium">
                                  <TrendingUp className="h-3 w-3 mr-0.5" />
                                  INC
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded text-xs font-medium">
                                  <TrendingDown className="h-3 w-3 mr-0.5" />
                                  DEC
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-right font-mono text-xs">{trade.mw} MW</td>
                            <td className="px-2 py-2 text-right font-mono text-xs">
                              {tradeData.clearedMw !== null ? (
                                <span className={tradeData.clearedMw === trade.mw ? '' : 'text-amber-600'}>
                                  {tradeData.clearedMw} MW
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-right font-mono text-xs">${trade.price.toFixed(2)}</td>
                            <td className="px-2 py-2 text-center">
                              {tradeData.isSettled ? (
                                <span className="inline-flex items-center text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded text-xs font-medium">
                                  <CheckCircle2 className="h-3 w-3 mr-0.5" />
                                  Settled
                                </span>
                              ) : tradeData.status === 'CLEARED' ? (
                                <span className="inline-flex items-center text-green-700 bg-green-100 px-1.5 py-0.5 rounded text-xs font-medium">
                                  <CheckCircle2 className="h-3 w-3 mr-0.5" />
                                  Cleared
                                </span>
                              ) : tradeData.status === 'REJECTED' ? (
                                <span className="inline-flex items-center text-red-700 bg-red-100 px-1.5 py-0.5 rounded text-xs font-medium">
                                  <XCircle className="h-3 w-3 mr-0.5" />
                                  Rejected
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded text-xs font-medium">
                                  <Clock className="h-3 w-3 mr-0.5" />
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-right font-mono text-xs">
                              {tradeData.pnl !== null ? (
                                <span className={tradeData.pnl >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                  {tradeData.pnl >= 0 ? '+' : ''}${tradeData.pnl.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                          </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* UTC Card */}
        <Card className="border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg text-purple-700 flex items-center gap-2 flex-wrap">
                UTC Trades
                {utcTotals && utcTotals.count > 0 && utcTotals.settledCount > 0 && (
                  <span className="inline-flex items-center text-blue-700 bg-blue-100 px-2 py-0.5 rounded text-xs font-medium">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {utcTotals.settledCount} Settled
                  </span>
                )}
                {utcTotals && utcTotals.count > 0 && utcTotals.clearedCount > 0 && utcTotals.settledCount === 0 && (
                  <span className="inline-flex items-center text-green-700 bg-green-100 px-2 py-0.5 rounded text-xs font-medium">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {utcTotals.clearedCount} Cleared
                  </span>
                )}
                {utcTotals && utcTotals.count > 0 && utcTotals.rejectedCount > 0 && (
                  <span className="inline-flex items-center text-red-700 bg-red-100 px-2 py-0.5 rounded text-xs font-medium">
                    <XCircle className="h-3 w-3 mr-1" />
                    {utcTotals.rejectedCount} Rejected
                  </span>
                )}
                {utcTotals && utcTotals.count > 0 && utcTotals.clearedCount === 0 && utcTotals.rejectedCount === 0 && utcTotals.settledCount === 0 && (
                  <span className="inline-flex items-center text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-xs font-medium">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </span>
                )}
              </CardTitle>
              {utcTotals && utcTotals.count > 0 && (
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <p>
                    {utcTotals.count} trades • {utcTotals.totalMW} MW submitted
                    {utcTotals.clearedMW > 0 && <span className="ml-1">• {utcTotals.clearedMW} MW cleared</span>}
                  </p>
                  {utcTotals.settledCount > 0 && (
                    <p className={utcTotals.totalPnL >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      Total PnL: {utcTotals.totalPnL >= 0 ? '+' : ''}${utcTotals.totalPnL.toFixed(2)}
                    </p>
                  )}
                </div>
              )}
            </div>
            {utcTrades && utcTrades.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleEditUTC}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportUTC}>
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={utcDeleting}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Cancel All
                    </Button>
                  </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel All UTC Trades?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will cancel all {utcTrades.length} UTC trades for {selectedDate}. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Trades</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteUTC} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Yes, Cancel All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {utcLoading && (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {utcError && (
              <p className="text-destructive text-sm">{utcError}</p>
            )}
            {!utcTrades && !utcError && !utcLoading && (
              <p className="text-muted-foreground text-sm py-4 text-center">
                Click &quot;Fetch Trades&quot; to load
              </p>
            )}
            {utcTrades && utcTrades.length === 0 && (
              <p className="text-muted-foreground text-sm py-4 text-center">
                No UTC trades for {selectedDate}
              </p>
            )}
            {utcTrades && utcTrades.length > 0 && (
              <div className="border rounded-lg overflow-hidden max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-purple-50 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium">HE</th>
                      <th className="px-2 py-2 text-left font-medium">Source</th>
                      <th className="px-2 py-2 text-left font-medium">Sink</th>
                      <th className="px-2 py-2 text-right font-medium">Submitted</th>
                      <th className="px-2 py-2 text-right font-medium">Cleared</th>
                      <th className="px-2 py-2 text-right font-medium">Price</th>
                      <th className="px-2 py-2 text-center font-medium">Status</th>
                      <th className="px-2 py-2 text-right font-medium">PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {utcTrades.sort((a, b) => a.hour - b.hour).map((trade) => {
                      // Look up node names by ID
                      const sourceName = getNodeName(trade.sourceLocation, utcNodes)
                      const sinkName = getNodeName(trade.sinkLocation, utcNodes)
                      
                      const tradeData = getUTCTradeData(trade)
                      
                      return (
                        <tr key={trade.id} className="border-t hover:bg-muted/30">
                          <td className="px-2 py-2">{trade.hour}</td>
                          <td className="px-2 py-2 text-xs" title={String(trade.sourceLocation)}>{sourceName}</td>
                          <td className="px-2 py-2 text-xs" title={String(trade.sinkLocation)}>{sinkName}</td>
                          <td className="px-2 py-2 text-right font-mono text-xs">{trade.mw} MW</td>
                          <td className="px-2 py-2 text-right font-mono text-xs">
                            {tradeData.clearedMw !== null ? (
                              <span className={tradeData.clearedMw === trade.mw ? '' : 'text-amber-600'}>
                                {tradeData.clearedMw} MW
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-xs">${trade.price.toFixed(2)}</td>
                          <td className="px-2 py-2 text-center">
                            {tradeData.isSettled ? (
                              <span className="inline-flex items-center text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded text-xs font-medium">
                                <CheckCircle2 className="h-3 w-3 mr-0.5" />
                                Settled
                              </span>
                            ) : tradeData.status === 'CLEARED' ? (
                              <span className="inline-flex items-center text-green-700 bg-green-100 px-1.5 py-0.5 rounded text-xs font-medium">
                                <CheckCircle2 className="h-3 w-3 mr-0.5" />
                                Cleared
                              </span>
                            ) : tradeData.status === 'REJECTED' ? (
                              <span className="inline-flex items-center text-red-700 bg-red-100 px-1.5 py-0.5 rounded text-xs font-medium">
                                <XCircle className="h-3 w-3 mr-0.5" />
                                Rejected
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded text-xs font-medium">
                                <Clock className="h-3 w-3 mr-0.5" />
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-xs">
                            {tradeData.pnl !== null ? (
                              <span className={tradeData.pnl >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                {tradeData.pnl >= 0 ? '+' : ''}${tradeData.pnl.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
