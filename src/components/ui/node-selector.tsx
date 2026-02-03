"use client"

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Search, X, ChevronDown } from 'lucide-react'

export interface PJMNode {
  id: string
  name: string
}

interface NodeSelectorProps {
  nodes: PJMNode[]
  value: string
  onChange: (nodeId: string) => void
  label?: string
  placeholder?: string
  required?: boolean
}

export function NodeSelector({
  nodes,
  value,
  onChange,
  label,
  placeholder = "Search by name or ID...",
  required = false,
}: NodeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Find selected node name for display
  const selectedNode = nodes?.find(n => n.id === value)

  // Filter nodes based on search
  const filteredNodes = useMemo(() => {
    if (!nodes || nodes.length === 0) return []
    if (!searchTerm) return nodes.slice(0, 100) // Show first 100 when no search
    
    const term = searchTerm.toLowerCase()
    return nodes
      .filter(node => 
        node.name?.toLowerCase().includes(term) || 
        node.id?.includes(term)
      )
      .slice(0, 100) // Limit results for performance
  }, [nodes, searchTerm])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (node: PJMNode) => {
    onChange(node.id)
    setSearchTerm('')
    setIsOpen(false)
  }

  const handleClear = () => {
    onChange('')
    setSearchTerm('')
    inputRef.current?.focus()
  }

  return (
    <div className="space-y-2" ref={containerRef}>
      {label && <Label>{label}{required && <span className="text-destructive ml-1">*</span>}</Label>}
      
      <div className="relative">
        {/* Display selected value or search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={selectedNode ? `${selectedNode.name} (${selectedNode.id})` : placeholder}
            value={isOpen ? searchTerm : (selectedNode ? `${selectedNode.name} (${selectedNode.id})` : '')}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              if (!isOpen) setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            className={cn(
              "pl-10 pr-16",
              selectedNode && !isOpen && "text-foreground"
            )}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )} />
          </div>
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-64 overflow-auto">
            {filteredNodes.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground text-center">
                No nodes found
              </div>
            ) : (
              <>
                {filteredNodes.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => handleSelect(node)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-muted flex justify-between items-center",
                      node.id === value && "bg-primary/10"
                    )}
                  >
                    <span className="truncate">{node.name}</span>
                    <span className="text-xs text-muted-foreground ml-2 shrink-0">{node.id}</span>
                  </button>
                ))}
                {filteredNodes.length === 100 && (
                  <div className="p-2 text-xs text-muted-foreground text-center border-t">
                    Showing first 100 results. Type to search more...
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
