import { REPORTING_PROXY_URL } from './config'

// API response format for nodes
export interface PJMNodeAPI {
  pnodeId: number
  pnodeName: string
  pnodePrice: number | null
}

// API response wrapper
export interface NodesAPIResponse {
  effectiveBeginningDate: string | null
  effectiveEndingDate: string | null
  nodes: PJMNodeAPI[]
}

// Normalized node format for the app
export interface NormalizedNode {
  id: string
  name: string
}

// Helper to check if response is HTML error page
function isHtmlError(text: string): boolean {
  return text.trim().startsWith('<') || text.includes('<!DOCTYPE') || text.includes('<html')
}

// Fetch valid nodes for virtuals or UTC
export async function fetchValidNodes(
  market: 'virtuals' | 'utc',
  date?: string
): Promise<NormalizedNode[]> {
  const params = new URLSearchParams({ market })
  if (date) {
    params.append('date', date)
  }
  
  const url = `${REPORTING_PROXY_URL}/nodes?${params.toString()}`
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.text()
    if (isHtmlError(error)) {
      throw new Error('API endpoint not available (404) - Backend may be down')
    }
    throw new Error(error || 'Failed to fetch nodes')
  }

  const parsed: NodesAPIResponse | PJMNodeAPI[] = await response.json()
  
  // Handle both response formats:
  // 1. Object with { nodes: [...] } wrapper
  // 2. Direct array of nodes
  let nodesArray: PJMNodeAPI[]
  if (Array.isArray(parsed)) {
    nodesArray = parsed
  } else if (parsed && 'nodes' in parsed && Array.isArray(parsed.nodes)) {
    nodesArray = parsed.nodes
  } else {
    nodesArray = []
  }
  
  // Normalize to our app's format
  return nodesArray.map(node => ({
    id: String(node.pnodeId),
    name: node.pnodeName
  }))
}

// Fetch valid nodes for INC/DEC reference prices
export async function fetchIncDecValidNodes(): Promise<NormalizedNode[]> {
  const response = await fetch(`${REPORTING_PROXY_URL}/incdec-nodes`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.text()
    if (isHtmlError(error)) {
      throw new Error('API endpoint not available (404) - Backend may be down')
    }
    throw new Error(error || 'Failed to fetch INC/DEC nodes')
  }

  const data: PJMNodeAPI[] = await response.json()
  
  return (Array.isArray(data) ? data : []).map(node => ({
    id: String(node.pnodeId),
    name: node.pnodeName
  }))
}
