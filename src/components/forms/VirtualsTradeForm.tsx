"use client"

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useNodes } from '@/contexts/NodesContext'
import { submitVirtualTrades, replaceVirtualTrades } from '@/lib/api/virtuals'
import { saveNotes } from '@/lib/api/notes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { NodeSelector } from '@/components/ui/node-selector'
import { Plus, Trash2, Send, RefreshCw, Save, StickyNote, ChevronDown, ChevronUp } from 'lucide-react'
import { getTomorrowDate } from '@/lib/utils'
import type { VirtualTrade } from '@/lib/types'

// Interface for trades from the API
interface APIVirtualTrade {
  id?: string
  location: string
  type: 'INC' | 'DEC'
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

// Node block: a location with its own grid
interface NodeBlock {
  id: string // unique ID for React key
  location: string
  rows: BidRow[]
  segments: number[]
}

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i + 1)

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9)

export function VirtualsTradeForm() {
  const searchParams = useSearchParams()
  const isEditMode = searchParams.get('mode') === 'edit'
  
  const { traderToken } = useAuth()
  const [tradeDate, setTradeDate] = useState(getTomorrowDate())
  
  // Default cells and default block creator
  const defaultCells = { 1: { price: 0, mw: 0 }, 2: { price: 0, mw: 0 }, 3: { price: 0, mw: 0 }, 4: { price: 0, mw: 0 } }
  const createDefaultBlock = (): NodeBlock => ({
    id: generateId(),
    location: '',
    rows: [{ hour: 1, cells: { ...defaultCells } }],
    segments: [1, 2, 3, 4],
  })
  
  // Multiple node blocks for INCs and DECs
  const [incBlocks, setIncBlocks] = useState<NodeBlock[]>([createDefaultBlock()])
  const [decBlocks, setDecBlocks] = useState<NodeBlock[]>([createDefaultBlock()])
  
  // Note structure with hour ranges
  interface TradeNote {
    id: string
    hoursStart: number
    hoursEnd: number
    tag: string
    text: string
  }
  
  // Separate notes for INCs and DECs
  const [showIncNotes, setShowIncNotes] = useState(false)
  const [showDecNotes, setShowDecNotes] = useState(false)
  const [incNotes, setIncNotes] = useState<TradeNote[]>([])
  const [decNotes, setDecNotes] = useState<TradeNote[]>([])
  
  // Helper to create a new note
  const createNote = (): TradeNote => ({
    id: generateId(),
    hoursStart: 1,
    hoursEnd: 24,
    tag: '',
    text: '',
  })
  
  // Add/remove/update note helpers for INCs
  const addIncNote = () => setIncNotes(prev => [...prev, createNote()])
  const removeIncNote = (id: string) => setIncNotes(prev => prev.filter(n => n.id !== id))
  const updateIncNote = (id: string, field: keyof TradeNote, value: string | number) => {
    setIncNotes(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n))
  }
  
  // Add/remove/update note helpers for DECs
  const addDecNote = () => setDecNotes(prev => [...prev, createNote()])
  const removeDecNote = (id: string) => setDecNotes(prev => prev.filter(n => n.id !== id))
  const updateDecNote = (id: string, field: keyof TradeNote, value: string | number) => {
    setDecNotes(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n))
  }
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  // Get cached nodes from context
  const { virtualsNodes: nodes, isLoading: nodesLoading, error: nodesError } = useNodes()

  // Load existing trades when in edit mode
  useEffect(() => {
    if (isEditMode) {
      const storedData = sessionStorage.getItem('editVirtualTrades')
      if (storedData) {
        try {
          const { date, trades } = JSON.parse(storedData) as { date: string; trades: APIVirtualTrade[] }
          setTradeDate(date)
          
          // Group trades by type and then by location
          const incTrades = trades.filter(t => t.type === 'INC')
          const decTrades = trades.filter(t => t.type === 'DEC')
          
          // Group by location for INCs
          const incByLocation: { [loc: string]: APIVirtualTrade[] } = {}
          incTrades.forEach(t => {
            if (!incByLocation[t.location]) incByLocation[t.location] = []
            incByLocation[t.location].push(t)
          })
          
          // Group by location for DECs
          const decByLocation: { [loc: string]: APIVirtualTrade[] } = {}
          decTrades.forEach(t => {
            if (!decByLocation[t.location]) decByLocation[t.location] = []
            decByLocation[t.location].push(t)
          })
          
          // Convert to blocks for INCs
          const incBlocksData: NodeBlock[] = Object.entries(incByLocation).map(([location, locTrades]) => {
            const hourGroups: { [hour: number]: BidCell[] } = {}
            locTrades.forEach(t => {
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
              location: String(location),
              rows: rows.length > 0 ? rows : [{ hour: 1, cells: defaultCells }],
              segments: segs,
            }
          })
          
          // Convert to blocks for DECs
          const decBlocksData: NodeBlock[] = Object.entries(decByLocation).map(([location, locTrades]) => {
            const hourGroups: { [hour: number]: BidCell[] } = {}
            locTrades.forEach(t => {
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
              location: String(location),
              rows: rows.length > 0 ? rows : [{ hour: 1, cells: defaultCells }],
              segments: segs,
            }
          })
          
          if (incBlocksData.length > 0) setIncBlocks(incBlocksData)
          if (decBlocksData.length > 0) setDecBlocks(decBlocksData)
          
          // Clear sessionStorage after loading
          sessionStorage.removeItem('editVirtualTrades')
        } catch (e) {
          console.error('Failed to parse edit data:', e)
        }
      }
    }
  }, [isEditMode])

  // Get available hours (not already used)
  const getAvailableHours = (rows: BidRow[], currentHour?: number) => {
    const usedHours = rows.map(r => r.hour).filter(h => h !== currentHour)
    return ALL_HOURS.filter(h => !usedHours.includes(h))
  }

  // Block-level operations for INCs
  const addIncBlock = () => {
    setIncBlocks([...incBlocks, createDefaultBlock()])
  }
  
  const removeIncBlock = (blockId: string) => {
    if (incBlocks.length <= 1) return
    setIncBlocks(incBlocks.filter(b => b.id !== blockId))
  }
  
  const updateIncBlockLocation = (blockId: string, location: string) => {
    setIncBlocks(prev => prev.map(b => b.id === blockId ? { ...b, location } : b))
  }

  // Block-level operations for DECs
  const addDecBlock = () => {
    setDecBlocks([...decBlocks, createDefaultBlock()])
  }
  
  const removeDecBlock = (blockId: string) => {
    if (decBlocks.length <= 1) return
    setDecBlocks(decBlocks.filter(b => b.id !== blockId))
  }
  
  const updateDecBlockLocation = (blockId: string, location: string) => {
    setDecBlocks(prev => prev.map(b => b.id === blockId ? { ...b, location } : b))
  }

  // Row operations for a specific block
  const addRow = (blocks: NodeBlock[], setBlocks: React.Dispatch<React.SetStateAction<NodeBlock[]>>, blockId: string) => {
    setBlocks(prev => prev.map(block => {
      if (block.id !== blockId) return block
      const available = getAvailableHours(block.rows)
      if (available.length === 0) return block
      const newHour = available[0]
      const newCells: { [segment: number]: BidCell } = {}
      block.segments.forEach(seg => { newCells[seg] = { price: 0, mw: 0 } })
      return { ...block, rows: [...block.rows, { hour: newHour, cells: newCells }] }
    }))
  }

  const removeRow = (blocks: NodeBlock[], setBlocks: React.Dispatch<React.SetStateAction<NodeBlock[]>>, blockId: string, rowIndex: number) => {
    setBlocks(prev => prev.map(block => {
      if (block.id !== blockId) return block
      if (block.rows.length <= 1) return block
      return { ...block, rows: block.rows.filter((_, i) => i !== rowIndex) }
    }))
  }

  const updateHour = (blocks: NodeBlock[], setBlocks: React.Dispatch<React.SetStateAction<NodeBlock[]>>, blockId: string, rowIndex: number, hour: number) => {
    setBlocks(prev => prev.map(block => {
      if (block.id !== blockId) return block
      return { ...block, rows: block.rows.map((row, i) => i === rowIndex ? { ...row, hour } : row) }
    }))
  }

  const updateCell = (blocks: NodeBlock[], setBlocks: React.Dispatch<React.SetStateAction<NodeBlock[]>>, blockId: string, rowIndex: number, segment: number, field: 'price' | 'mw', value: number) => {
    setBlocks(prev => prev.map(block => {
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

  const addSegment = (blocks: NodeBlock[], setBlocks: React.Dispatch<React.SetStateAction<NodeBlock[]>>, blockId: string) => {
    setBlocks(prev => prev.map(block => {
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

  const removeSegment = (blocks: NodeBlock[], setBlocks: React.Dispatch<React.SetStateAction<NodeBlock[]>>, blockId: string, segment: number) => {
    setBlocks(prev => prev.map(block => {
      if (block.id !== blockId) return block
      if (block.segments.length <= 1) return block
      return { ...block, segments: block.segments.filter(s => s !== segment) }
    }))
  }

  // Convert rows to API format (only non-zero entries)
  const rowsToIncrements = (rows: BidRow[], segments: number[]) => {
    const increments: { hour: number; bidSegment: { id: number; mw: number; price: number } }[] = []
    
    rows.forEach(row => {
      segments.forEach(segment => {
        const cell = row.cells[segment]
        if (cell && (cell.mw > 0 || cell.price > 0)) {
          increments.push({
            hour: row.hour,
            bidSegment: {
              id: segment,
              mw: cell.mw,
              price: cell.price
            }
          })
        }
      })
    })
    
    return increments
  }

  // Check if a block has valid data
  const blockHasData = (block: NodeBlock) => {
    return block.location && rowsToIncrements(block.rows, block.segments).length > 0
  }

  // Check if form has any data
  const hasIncData = incBlocks.some(blockHasData)
  const hasDecData = decBlocks.some(blockHasData)
  const isValid = hasIncData || hasDecData

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!traderToken || !isValid) return

    setIsSubmitting(true)
    setMessage(null)

    // Build trades array from all blocks
    const trades: VirtualTrade[] = []
    
    // Group by location to combine INCs and DECs for same location
    const locationMap: { [loc: string]: { increments: ReturnType<typeof rowsToIncrements>; decrements: ReturnType<typeof rowsToIncrements> } } = {}
    
    // Process INC blocks
    incBlocks.forEach(block => {
      if (!blockHasData(block)) return
      if (!locationMap[block.location]) {
        locationMap[block.location] = { increments: [], decrements: [] }
      }
      locationMap[block.location].increments.push(...rowsToIncrements(block.rows, block.segments))
    })
    
    // Process DEC blocks
    decBlocks.forEach(block => {
      if (!blockHasData(block)) return
      if (!locationMap[block.location]) {
        locationMap[block.location] = { increments: [], decrements: [] }
      }
      locationMap[block.location].decrements.push(...rowsToIncrements(block.rows, block.segments))
    })
    
    // Convert to trades array
    Object.entries(locationMap).forEach(([location, data]) => {
      trades.push({
        location,
        increments: data.increments,
        decrements: data.decrements,
      })
    })

    try {
      if (isEditMode) {
        await replaceVirtualTrades(traderToken, tradeDate, { trades })
        setMessage({ type: 'success', text: 'Virtual trades updated successfully!' })
      } else {
        await submitVirtualTrades(traderToken, tradeDate, { trades })
        setMessage({ type: 'success', text: 'Virtual trades submitted successfully!' })
      }
      
      // Save notes if provided (combine INC and DEC notes) - only text is required, tag is optional
      const allNotes = [
        ...incNotes.filter(n => n.text.trim()).map(n => ({
          tag: n.tag.trim() 
            ? `INC_HE${n.hoursStart}-${n.hoursEnd}_${n.tag.trim()}`
            : `INC_HE${n.hoursStart}-${n.hoursEnd}`,
          text: n.text.trim(),
        })),
        ...decNotes.filter(n => n.text.trim()).map(n => ({
          tag: n.tag.trim()
            ? `DEC_HE${n.hoursStart}-${n.hoursEnd}_${n.tag.trim()}`
            : `DEC_HE${n.hoursStart}-${n.hoursEnd}`,
          text: n.text.trim(),
        })),
      ]
      
      if (allNotes.length > 0) {
        try {
          await saveNotes(traderToken, tradeDate, allNotes, 'virtual')
        } catch {
          // Note save failed, but trade was successful - don't fail the whole operation
          console.error('Failed to save notes, but trade was submitted')
        }
      }
      
      // Reset form
      setIncBlocks([createDefaultBlock()])
      setDecBlocks([createDefaultBlock()])
      setIncNotes([])
      setDecNotes([])
      setShowIncNotes(false)
      setShowDecNotes(false)
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err instanceof Error ? err.message : 'Failed to submit trades' 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Render a dynamic bid grid table for a specific block
  const renderBlockGrid = (
    block: NodeBlock,
    blocks: NodeBlock[],
    setBlocks: React.Dispatch<React.SetStateAction<NodeBlock[]>>,
    colorClass: string
  ) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className={`${colorClass}`}>
            <th className="border p-2 w-20 text-center font-medium">HE</th>
            {block.segments.map(seg => (
              <th key={seg} className="border p-2 min-w-[100px]">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-medium text-xs">Seg {seg}</span>
                  {block.segments.length > 1 && (
                    <button 
                      type="button"
                      onClick={() => removeSegment(blocks, setBlocks, block.id, seg)}
                      className="text-destructive hover:text-destructive/80 p-0.5"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </th>
            ))}
            <th className="border p-2 w-10">
              <Button type="button" variant="ghost" size="sm" onClick={() => addSegment(blocks, setBlocks, block.id)} className="h-6 w-6 p-0" title="Add segment">
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
                  onChange={(e) => updateHour(blocks, setBlocks, block.id, rowIndex, parseInt(e.target.value))}
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
                      onChange={(e) => updateCell(blocks, setBlocks, block.id, rowIndex, seg, 'price', parseFloat(e.target.value) || 0)}
                      className="h-6 text-xs px-1"
                    />
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      placeholder="MW"
                      value={row.cells[seg]?.mw || ''}
                      onChange={(e) => updateCell(blocks, setBlocks, block.id, rowIndex, seg, 'mw', Math.max(0, parseFloat(e.target.value) || 0))}
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
                    onClick={() => removeRow(blocks, setBlocks, block.id, rowIndex)}
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
        onClick={() => addRow(blocks, setBlocks, block.id)}
        className="mt-2"
        disabled={getAvailableHours(block.rows).length === 0}
      >
        <Plus className="h-3 w-3 mr-1" /> Add Hour
      </Button>
    </div>
  )

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

      {/* Increments Section */}
      <Card className="border-blue-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-blue-700">Increments (INCs)</CardTitle>
              <CardDescription>Virtual supply bids - you get paid when DA &gt; RT</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addIncBlock}
              className="text-blue-700 border-blue-300 hover:bg-blue-50"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Node
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {incBlocks.map((block, blockIndex) => (
            <div key={block.id} className="space-y-4 p-4 border border-blue-100 rounded-lg bg-blue-50/30">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {nodesLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Loading nodes...
                    </div>
                  ) : (
                    <NodeSelector
                      nodes={nodes}
                      value={block.location}
                      onChange={(id) => updateIncBlockLocation(block.id, id)}
                      label={incBlocks.length > 1 ? `INC Location ${blockIndex + 1}` : "INC Location (PNode)"}
                      placeholder="Search node for increments..."
                    />
                  )}
                </div>
                {incBlocks.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeIncBlock(block.id)}
                    className="text-destructive hover:text-destructive/80 mt-6"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {nodesError && (
                <p className="text-xs text-amber-600">{nodesError}</p>
              )}
              
              {renderBlockGrid(block, incBlocks, setIncBlocks, 'bg-blue-50')}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Decrements Section */}
      <Card className="border-orange-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-orange-700">Decrements (DECs)</CardTitle>
              <CardDescription>Virtual demand bids - you get paid when RT &gt; DA</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addDecBlock}
              className="text-orange-700 border-orange-300 hover:bg-orange-50"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Node
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {decBlocks.map((block, blockIndex) => (
            <div key={block.id} className="space-y-4 p-4 border border-orange-100 rounded-lg bg-orange-50/30">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {nodesLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Loading nodes...
                    </div>
                  ) : (
                    <NodeSelector
                      nodes={nodes}
                      value={block.location}
                      onChange={(id) => updateDecBlockLocation(block.id, id)}
                      label={decBlocks.length > 1 ? `DEC Location ${blockIndex + 1}` : "DEC Location (PNode)"}
                      placeholder="Search node for decrements..."
                    />
                  )}
                </div>
                {decBlocks.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDecBlock(block.id)}
                    className="text-destructive hover:text-destructive/80 mt-6"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {renderBlockGrid(block, decBlocks, setDecBlocks, 'bg-orange-50')}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* INC Notes Section */}
      <div className="border border-green-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowIncNotes(!showIncNotes)}
          className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-green-700">
            <StickyNote className="h-4 w-4" />
            INC Notes ({incNotes.length})
          </span>
          {showIncNotes ? <ChevronUp className="h-4 w-4 text-green-700" /> : <ChevronDown className="h-4 w-4 text-green-700" />}
        </button>
        
        {showIncNotes && (
          <div className="p-4 space-y-3 border-t border-green-200">
            {incNotes.map((note) => (
              <div key={note.id} className="p-3 bg-green-50/50 rounded border border-green-100 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Label className="text-xs whitespace-nowrap">HE</Label>
                    <Input
                      type="number"
                      min={1}
                      max={24}
                      value={note.hoursStart}
                      onChange={(e) => updateIncNote(note.id, 'hoursStart', parseInt(e.target.value) || 1)}
                      className="h-8 w-16 text-center"
                    />
                    <span className="text-xs">to</span>
                    <Input
                      type="number"
                      min={1}
                      max={24}
                      value={note.hoursEnd}
                      onChange={(e) => updateIncNote(note.id, 'hoursEnd', parseInt(e.target.value) || 24)}
                      className="h-8 w-16 text-center"
                    />
                  </div>
                  <Input
                    value={note.tag}
                    onChange={(e) => updateIncNote(note.id, 'tag', e.target.value)}
                    placeholder="Tag (e.g., thesis)"
                    className="h-8 w-32"
                  />
                  <button
                    type="button"
                    onClick={() => removeIncNote(note.id)}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <Input
                  value={note.text}
                  onChange={(e) => updateIncNote(note.id, 'text', e.target.value)}
                  placeholder="Your INC rationale for these hours..."
                  className="h-8"
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addIncNote}
              className="text-green-700 border-green-300 hover:bg-green-50"
            >
              <Plus className="h-4 w-4 mr-1" /> Add INC Note
            </Button>
          </div>
        )}
      </div>

      {/* DEC Notes Section */}
      <div className="border border-orange-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowDecNotes(!showDecNotes)}
          className="w-full flex items-center justify-between p-3 bg-orange-50 hover:bg-orange-100 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-orange-700">
            <StickyNote className="h-4 w-4" />
            DEC Notes ({decNotes.length})
          </span>
          {showDecNotes ? <ChevronUp className="h-4 w-4 text-orange-700" /> : <ChevronDown className="h-4 w-4 text-orange-700" />}
        </button>
        
        {showDecNotes && (
          <div className="p-4 space-y-3 border-t border-orange-200">
            {decNotes.map((note) => (
              <div key={note.id} className="p-3 bg-orange-50/50 rounded border border-orange-100 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Label className="text-xs whitespace-nowrap">HE</Label>
                    <Input
                      type="number"
                      min={1}
                      max={24}
                      value={note.hoursStart}
                      onChange={(e) => updateDecNote(note.id, 'hoursStart', parseInt(e.target.value) || 1)}
                      className="h-8 w-16 text-center"
                    />
                    <span className="text-xs">to</span>
                    <Input
                      type="number"
                      min={1}
                      max={24}
                      value={note.hoursEnd}
                      onChange={(e) => updateDecNote(note.id, 'hoursEnd', parseInt(e.target.value) || 24)}
                      className="h-8 w-16 text-center"
                    />
                  </div>
                  <Input
                    value={note.tag}
                    onChange={(e) => updateDecNote(note.id, 'tag', e.target.value)}
                    placeholder="Tag (e.g., thesis)"
                    className="h-8 w-32"
                  />
                  <button
                    type="button"
                    onClick={() => removeDecNote(note.id)}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <Input
                  value={note.text}
                  onChange={(e) => updateDecNote(note.id, 'text', e.target.value)}
                  placeholder="Your DEC rationale for these hours..."
                  className="h-8"
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addDecNote}
              className="text-orange-700 border-orange-300 hover:bg-orange-50"
            >
              <Plus className="h-4 w-4 mr-1" /> Add DEC Note
            </Button>
          </div>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting || !isValid} className="w-full">
        {isEditMode ? <Save className="h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
        {isSubmitting 
          ? (isEditMode ? 'Saving...' : 'Submitting...') 
          : (isEditMode ? 'Save Changes (Replace All)' : 'Submit Virtual Trades')
        }
      </Button>
      
      {!isValid && (
        <p className="text-sm text-muted-foreground text-center">
          Select a location and enter at least one Price/MW to submit
        </p>
      )}
    </form>
  )
}
