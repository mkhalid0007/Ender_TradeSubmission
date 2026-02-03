"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { fetchValidNodes } from '@/lib/api/nodes'
import type { PJMNode } from '@/lib/nodes'

interface NodesContextType {
  virtualsNodes: PJMNode[]
  utcNodes: PJMNode[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const NodesContext = createContext<NodesContextType | undefined>(undefined)

export function NodesProvider({ children }: { children: ReactNode }) {
  const [virtualsNodes, setVirtualsNodes] = useState<PJMNode[]>([])
  const [utcNodes, setUtcNodes] = useState<PJMNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAllNodes = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Fetch both in parallel
      const [virtuals, utc] = await Promise.all([
        fetchValidNodes('virtuals'),
        fetchValidNodes('utc')
      ])
      
      setVirtualsNodes(virtuals || [])
      setUtcNodes(utc || [])
    } catch (err) {
      console.error('Failed to fetch nodes:', err)
      setError(err instanceof Error ? err.message : 'Failed to load nodes')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch nodes on mount
  useEffect(() => {
    fetchAllNodes()
  }, [])

  return (
    <NodesContext.Provider value={{
      virtualsNodes,
      utcNodes,
      isLoading,
      error,
      refetch: fetchAllNodes
    }}>
      {children}
    </NodesContext.Provider>
  )
}

export function useNodes() {
  const context = useContext(NodesContext)
  if (context === undefined) {
    throw new Error('useNodes must be used within a NodesProvider')
  }
  return context
}
