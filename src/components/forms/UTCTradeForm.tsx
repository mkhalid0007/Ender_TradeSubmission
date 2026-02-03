"use client"

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useNodes } from '@/contexts/NodesContext'
import { submitUTCTrades, replaceUTCTrades } from '@/lib/api/utc'
import { saveNotes } from '@/lib/api/notes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { NodeSelector } from '@/components/ui/node-selector'
import { Plus, Trash2, Send, RefreshCw, Save, StickyNote, ChevronDown, ChevronUp } from 'lucide-react'
import { getTomorrowDate } from '@/lib/utils'
import type { UTCTrade } from '@/lib/types'

// Interface for trades from the API
interface APIUTCTrade {
  id?: string
  source?: string
  sink?: string
  sourceLocation?: string
  sinkLocation?: string
  sourcePnodeId?: string | number
  sinkPnodeId?: string | number
  hour: number
  price: number
  mw: number
}

// Grid cell data structure
interface BidCell {
  price: number
  mw: number
}

// Row structure: hour selection + segment cells
interface BidRow {
  hour: number
  cells: { [segment: number]: BidCell }
}

// Path block: a source/sink pair with its own bid grid
interface PathBlock {
  id: string
  sourceLocation: string
  sinkLocation: string
  rows: BidRow[]
  segments: number[]
}

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i + 1)

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9)

export function UTCTradeForm() {
  const searchParams = useSearchParams()
  const isEditMode = searchParams.get('mode') === 'edit'
  
  const { traderToken } = useAuth()
  const [tradeDate, setTradeDate] = useState(getTomorrowDate())
  
  // Default cells and default block creator
  const defaultCells = { 1: { price: 0, mw: 0 }, 2: { price: 0, mw: 0 }, 3: { price: 0, mw: 0 }, 4: { price: 0, mw: 0 } }
  const createDefaultBlock = (): PathBlock => ({
    id: generateId(),
    sourceLocation: '',
    sinkLocation: '',
    rows: [{ hour: 1, cells: { ...defaultCells } }],
    segments: [1, 2, 3, 4],
  })
  
  // Multiple path blocks for different source/sink pairs
  const [pathBlocks, setPathBlocks] = useState<PathBlock[]>([createDefaultBlock()])
  
  // Note structure with hour ranges
  interface TradeNote {
    id: string
    hoursStart: number
    hoursEnd: number
    tag: string
    text: string
  }
  
  // Notes for UTC trades
  const [showNotes, setShowNotes] = useState(false)
  const [utcNotes, setUtcNotes] = useState<TradeNote[]>([])
  
  // Helper to create a new note
  const createNote = (): TradeNote => ({
    id: generateId(),
    hoursStart: 1,
    hoursEnd: 24,
    tag: '',
    text: '',
  })
  
  // Add/remove/update note helpers
  const addNote = () => setUtcNotes(prev => [...prev, createNote()])
  const removeNote = (id: string) => setUtcNotes(prev => prev.filter(n => n.id !== id))
  const updateNote = (id: string, field: keyof TradeNote, value: string | number) => {
    setUtcNotes(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n))
  }
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  // Get cached nodes from context
  const { utcNodes: nodes, isLoading: nodesLoading, error: nodesError } = useNodes()

  // Load existing trades when in edit mode
  useEffect(() => {
    if (isEditMode) {
      const storedData = sessionStorage.getItem('editUTCTrades')
      if (storedData) {
        try {
          const { date, trades } = JSON.parse(storedData) as { date: string; trades: APIUTCTrade[] }
          setTradeDate(date)
          
          if (trades.length > 0) {
            // Group trades by source/sink pair
            const pathGroups: { [key: string]: { source: string; sink: string; trades: APIUTCTrade[] } } = {}
            
            trades.forEach(t => {
              const source = String(t.source || t.sourceLocation || t.sourcePnodeId || '')
              const sink = String(t.sink || t.sinkLocation || t.sinkPnodeId || '')
              const key = `${source}|${sink}`
              
              if (!pathGroups[key]) {
                pathGroups[key] = { source, sink, trades: [] }
              }
              pathGroups[key].trades.push(t)
            })
            
            // Convert to path blocks
            const newBlocks: PathBlock[] = Object.values(pathGroups).map(group => {
              // Group trades by hour within this path
              const hourGroups: { [hour: number]: BidCell[] } = {}
              group.trades.forEach(t => {
                if (!hourGroups[t.hour]) hourGroups[t.hour] = []
                hourGroups[t.hour].push({ price: t.price, mw: t.mw })
              })
              
              const maxSegs = Math.max(...Object.values(hourGroups).map(g => g.length), 4)
              const segs = Array.from({ length: maxSegs }, (_, i) => i + 1)
              
              const rows: BidRow[] = Object.entries(hourGroups).map(([hour, cells]) => {
                const cellsObj: { [seg: number]: BidCell } = {}
                segs.forEach((seg, i) => {
                  cellsObj[seg] = cells[i] || { price: 0, mw: 0 }
                })
                return { hour: parseInt(hour), cells: cellsObj }
              })
              
              return {
                id: generateId(),
                sourceLocation: group.source,
                sinkLocation: group.sink,
                rows: rows.length > 0 ? rows : [{ hour: 1, cells: defaultCells }],
                segments: segs,
              }
            })
            
            if (newBlocks.length > 0) {
              setPathBlocks(newBlocks)
            }
          }
          
          // Clear sessionStorage after loading
          sessionStorage.removeItem('editUTCTrades')
        } catch (e) {
          console.error('Failed to parse edit data:', e)
        }
      }
    }
  }, [isEditMode])

  // Get available hours for a block (not already used)
  const getAvailableHours = (rows: BidRow[], currentHour?: number) => {
    const usedHours = rows.map(r => r.hour).filter(h => h !== currentHour)
    return ALL_HOURS.filter(h => !usedHours.includes(h))
  }

  // Block-level operations
  const addPathBlock = () => {
    setPathBlocks([...pathBlocks, createDefaultBlock()])
  }
  
  const removePathBlock = (blockId: string) => {
    if (pathBlocks.length <= 1) return
    setPathBlocks(pathBlocks.filter(b => b.id !== blockId))
  }
  
  const updateBlockSource = (blockId: string, sourceLocation: string) => {
    setPathBlocks(prev => prev.map(b => b.id === blockId ? { ...b, sourceLocation } : b))
  }
  
  const updateBlockSink = (blockId: string, sinkLocation: string) => {
    setPathBlocks(prev => prev.map(b => b.id === blockId ? { ...b, sinkLocation } : b))
  }

  // Row operations for a specific block
  const addRow = (blockId: string) => {
    setPathBlocks(prev => prev.map(block => {
      if (block.id !== blockId) return block
      const available = getAvailableHours(block.rows)
      if (available.length === 0) return block
      const newHour = available[0]
      const newCells: { [segment: number]: BidCell } = {}
      block.segments.forEach(seg => { newCells[seg] = { price: 0, mw: 0 } })
      return { ...block, rows: [...block.rows, { hour: newHour, cells: newCells }] }
    }))
  }

  const removeRow = (blockId: string, rowIndex: number) => {
    setPathBlocks(prev => prev.map(block => {
      if (block.id !== blockId) return block
      if (block.rows.length <= 1) return block
      return { ...block, rows: block.rows.filter((_, i) => i !== rowIndex) }
    }))
  }

  const updateHour = (blockId: string, rowIndex: number, hour: number) => {
    setPathBlocks(prev => prev.map(block => {
      if (block.id !== blockId) return block
      return { ...block, rows: block.rows.map((row, i) => i === rowIndex ? { ...row, hour } : row) }
    }))
  }

  const updateCell = (blockId: string, rowIndex: number, segment: number, field: 'price' | 'mw', value: number) => {
    setPathBlocks(prev => prev.map(block => {
      if (block.id !== blockId) return block
      return {
        ...block,
        rows: block.rows.map((row, i) =>
          i === rowIndex
            ? { ...row, cells: { ...row.cells, [segment]: { ...row.cells[segment], [field]: value } } }
            : row
        )
      }
    }))
  }

  const addSegment = (blockId: string) => {
    setPathBlocks(prev => prev.map(block => {
      if (block.id !== blockId) return block
      const newSeg = Math.max(...block.segments) + 1
      return {
        ...block,
        segments: [...block.segments, newSeg],
        rows: block.rows.map(row => ({
          ...row,
          cells: { ...row.cells, [newSeg]: { price: 0, mw: 0 } }
        }))
      }
    }))
  }

  const removeSegment = (blockId: string, segment: number) => {
    setPathBlocks(prev => prev.map(block => {
      if (block.id !== blockId) return block
      if (block.segments.length <= 1) return block
      return { ...block, segments: block.segments.filter(s => s !== segment) }
    }))
  }

  // Convert rows to API format (multiple entries per hour for different segments)
  const rowsToHours = (rows: BidRow[], segments: number[]) => {
    const hours: { hour: number; price: number; mw: number }[] = []
    
    rows.forEach(row => {
      segments.forEach(segment => {
        const cell = row.cells[segment]
        if (cell && (cell.mw > 0 || cell.price > 0)) {
          hours.push({
            hour: row.hour,
            price: cell.price,
            mw: cell.mw
          })
        }
      })
    })
    
    return hours
  }

  // Check if a block has valid data
  const blockHasData = (block: PathBlock) => {
    return block.sourceLocation && block.sinkLocation && rowsToHours(block.rows, block.segments).length > 0
  }

  // Check if form has any valid blocks
  const isValid = pathBlocks.some(blockHasData)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!traderToken || !isValid) return

    setIsSubmitting(true)
    setMessage(null)

    // Build trades array from all valid blocks
    const trades: UTCTrade[] = pathBlocks
      .filter(blockHasData)
      .map(block => ({
        sourceLocation: block.sourceLocation,
        sinkLocation: block.sinkLocation,
        hours: rowsToHours(block.rows, block.segments),
      }))

    try {
      if (isEditMode) {
        await replaceUTCTrades(traderToken, tradeDate, { trades })
        setMessage({ type: 'success', text: 'UTC trades updated successfully!' })
      } else {
        await submitUTCTrades(traderToken, tradeDate, { trades })
        setMessage({ type: 'success', text: 'UTC trades submitted successfully!' })
      }
      
      // Save notes if provided - only text is required, tag is optional
      const allNotes = utcNotes
        .filter(n => n.text.trim())
        .map(n => ({
          tag: n.tag.trim()
            ? `UTC_HE${n.hoursStart}-${n.hoursEnd}_${n.tag.trim()}`
            : `UTC_HE${n.hoursStart}-${n.hoursEnd}`,
          text: n.text.trim(),
        }))
      
      if (allNotes.length > 0) {
        try {
          await saveNotes(traderToken, tradeDate, allNotes, 'utc')
        } catch {
          // Note save failed, but trade was successful - don't fail the whole operation
          console.error('Failed to save notes, but trade was submitted')
        }
      }
      
      // Reset form
      setPathBlocks([createDefaultBlock()])
      setUtcNotes([])
      setShowNotes(false)
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err instanceof Error ? err.message : 'Failed to submit trades' 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="tradeDate">Trade Date</Label>
        <Input
          id="tradeDate"
          type="date"
          value={tradeDate}
          onChange={(e) => setTradeDate(e.target.value)}
          className="max-w-xs"
          required
        />
      </div>

      {/* Transmission Paths */}
      <Card className="border-purple-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-purple-700">Transmission Paths</CardTitle>
              <CardDescription>Add one or more source/sink pairs with hourly bids</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPathBlock}
              className="text-purple-700 border-purple-300 hover:bg-purple-50"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Path
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {pathBlocks.map((block, blockIndex) => (
            <div key={block.id} className="space-y-4 p-4 border border-purple-100 rounded-lg bg-purple-50/30">
              {/* Path Header with Remove Button */}
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-purple-700">
                  {pathBlocks.length > 1 ? `Path ${blockIndex + 1}` : 'Transmission Path'}
                </h4>
                {pathBlocks.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePathBlock(block.id)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove Path
                  </Button>
                )}
              </div>
              
              {/* Source/Sink Selectors */}
              {nodesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading UTC nodes...
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <NodeSelector
                    nodes={nodes}
                    value={block.sourceLocation}
                    onChange={(id) => updateBlockSource(block.id, id)}
                    label="Source Location"
                    placeholder="Search source node..."
                    required
                  />
                  <NodeSelector
                    nodes={nodes}
                    value={block.sinkLocation}
                    onChange={(id) => updateBlockSink(block.id, id)}
                    label="Sink Location"
                    placeholder="Search sink node..."
                    required
                  />
                </div>
              )}
              {nodesError && (
                <p className="text-xs text-amber-600">{nodesError}</p>
              )}
              
              {/* Bid Grid for this path */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-purple-50">
                      <th className="border p-2 w-20 text-center font-medium">HE</th>
                      {block.segments.map(seg => (
                        <th key={seg} className="border p-2 min-w-[100px]">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-medium text-xs">Seg {seg}</span>
                            {block.segments.length > 1 && (
                              <button 
                                type="button"
                                onClick={() => removeSegment(block.id, seg)}
                                className="text-destructive hover:text-destructive/80 p-0.5"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </th>
                      ))}
                      <th className="border p-2 w-10">
                        <Button type="button" variant="ghost" size="sm" onClick={() => addSegment(block.id)} className="h-6 w-6 p-0" title="Add segment">
                          <Plus className="h-3 w-3" />
                        </Button>
                      </th>
                      <th className="border p-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-muted/30">
                        <td className="border p-1 bg-muted/20">
                          <select 
                            value={row.hour}
                            onChange={(e) => updateHour(block.id, rowIndex, parseInt(e.target.value))}
                            className="w-full h-[52px] text-center font-medium bg-transparent border-0 text-sm"
                          >
                            {[...new Set([...getAvailableHours(block.rows, row.hour), row.hour])].sort((a, b) => a - b).map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </td>
                        {block.segments.map(seg => (
                          <td key={seg} className="border p-1">
                            <div className="space-y-1">
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Price"
                                value={row.cells[seg]?.price || ''}
                                onChange={(e) => updateCell(block.id, rowIndex, seg, 'price', parseFloat(e.target.value) || 0)}
                                className="h-6 text-xs px-1"
                              />
                              <Input
                                type="number"
                                step="0.1"
                                min="0.1"
                                placeholder="MW"
                                value={row.cells[seg]?.mw || ''}
                                onChange={(e) => updateCell(block.id, rowIndex, seg, 'mw', Math.max(0, parseFloat(e.target.value) || 0))}
                                className="h-6 text-xs px-1"
                              />
                            </div>
                          </td>
                        ))}
                        <td className="border p-1"></td>
                        <td className="border p-1">
                          {block.rows.length > 1 && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => removeRow(block.id, rowIndex)}
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive/80"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => addRow(block.id)}
                  className="mt-2"
                  disabled={getAvailableHours(block.rows).length === 0}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Hour
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* UTC Notes Section */}
      <div className="border border-purple-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowNotes(!showNotes)}
          className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-purple-700">
            <StickyNote className="h-4 w-4" />
            UTC Notes ({utcNotes.length})
          </span>
          {showNotes ? <ChevronUp className="h-4 w-4 text-purple-700" /> : <ChevronDown className="h-4 w-4 text-purple-700" />}
        </button>
        
        {showNotes && (
          <div className="p-4 space-y-3 border-t border-purple-200">
            {utcNotes.map((note) => (
              <div key={note.id} className="p-3 bg-purple-50/50 rounded border border-purple-100 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Label className="text-xs whitespace-nowrap">HE</Label>
                    <Input
                      type="number"
                      min={1}
                      max={24}
                      value={note.hoursStart}
                      onChange={(e) => updateNote(note.id, 'hoursStart', parseInt(e.target.value) || 1)}
                      className="h-8 w-16 text-center"
                    />
                    <span className="text-xs">to</span>
                    <Input
                      type="number"
                      min={1}
                      max={24}
                      value={note.hoursEnd}
                      onChange={(e) => updateNote(note.id, 'hoursEnd', parseInt(e.target.value) || 24)}
                      className="h-8 w-16 text-center"
                    />
                  </div>
                  <Input
                    value={note.tag}
                    onChange={(e) => updateNote(note.id, 'tag', e.target.value)}
                    placeholder="Tag (e.g., thesis)"
                    className="h-8 w-32"
                  />
                  <button
                    type="button"
                    onClick={() => removeNote(note.id)}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <Input
                  value={note.text}
                  onChange={(e) => updateNote(note.id, 'text', e.target.value)}
                  placeholder="Your UTC rationale for these hours..."
                  className="h-8"
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addNote}
              className="text-purple-700 border-purple-300 hover:bg-purple-50"
            >
              <Plus className="h-4 w-4 mr-1" /> Add Note
            </Button>
          </div>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting || !isValid} className="w-full">
        {isEditMode ? <Save className="h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
        {isSubmitting 
          ? (isEditMode ? 'Saving...' : 'Submitting...') 
          : (isEditMode ? 'Save Changes (Replace All)' : 'Submit UTC Trades')
        }
      </Button>
      
      {!isValid && (
        <p className="text-sm text-muted-foreground text-center">
          Select source & sink locations and enter at least one Price/MW to submit
        </p>
      )}
    </form>
  )
}
