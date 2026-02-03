import { REPORTING_PROXY_URL } from './config'

// Trade status types
export type TradeStatus = 'cleared' | 'settled'
export type MarketType = 'virtuals' | 'utc'

// Cleared Virtual Trade from API (GET /api/v1/pjm/virtuals/trades?status=cleared)
export interface ClearedVirtualTrade {
  id: number
  tradeId: string           // Matches submitted trade's "id" field
  enderTxnId: string
  tradeDate: string
  location: string          // pnodeId as string
  type: 'INC' | 'DEC'
  hour: number
  price: number
  mw: number
  traderId: string
  status: 'CLEARED' | 'REJECTED'
  daLmp: number
}

// Settled Virtual Trade from API (GET /api/v1/pjm/virtuals/trades?status=settled)
export interface SettledVirtualTrade {
  id: number
  tradeId: string           // Matches submitted trade's "id" field
  enderTxnId: string
  tradeDate: string
  traderId: string
  pnodeId: number           // location as number
  tradeType: 'INC' | 'DEC'
  hour: number
  submittedPrice: number
  clearedMw: number
  daLmp: number
  totalLmpRt: number
  priceDiff: number
  pnl: number
  createdAt: string
}

// Cleared UTC Trade from API (GET /api/v1/pjm/utc/trades?status=cleared)
export interface ClearedUTCTrade {
  id: number
  tradeId: string           // Matches submitted trade's "id"
  enderTxnId: string
  tradeDate: string
  sourceLocation: number
  sinkLocation: number
  hour: number
  price: number
  mw: number
  traderId: string
  status: 'CLEARED' | 'REJECTED'
  daSpread: number
}

// Settled UTC Trade from API (GET /api/v1/pjm/utc/trades?status=settled)
export interface SettledUTCTrade {
  id: number
  tradeId: string           // Matches submitted trade's "id"
  tradeDate: string
  traderId: string
  sourceLocation: number
  sinkLocation: number
  hour: number
  submittedPrice: number
  clearedMw: number
  daSpread: number          // Day-ahead spread
  rtSpread: number          // Real-time spread
  spreadDiff: number
  pnl: number
  createdAt: string
}

// Union type for any cleared/settled trade
export type ClearedTrade = ClearedVirtualTrade | SettledVirtualTrade | ClearedUTCTrade | SettledUTCTrade

// Helper to check if response is HTML error page
function isHtmlError(text: string): boolean {
  return text.trim().startsWith('<') || text.includes('<!DOCTYPE') || text.includes('<html')
}

// Fetch trades by status (cleared or settled) for a specific market
export async function fetchTradesByStatus(
  traderToken: string,
  tradeDate: string,
  market: MarketType = 'virtuals',
  status: TradeStatus = 'cleared'
): Promise<ClearedTrade[]> {
  const params = new URLSearchParams({
    tradeDate,
    traderToken,
    market,
    status,
  })
  
  const response = await fetch(
    `${REPORTING_PROXY_URL}/cleared?${params}`,
    {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    if (isHtmlError(error)) {
      throw new Error('API endpoint not available - Backend may be down')
    }
    throw new Error(error || `Failed to fetch ${status} trades`)
  }

  const data = await response.json()
  return Array.isArray(data) ? data : []
}

// Convenience function for cleared virtuals (backward compatible)
export async function fetchClearedTrades(
  traderToken: string,
  tradeDate: string
): Promise<ClearedTrade[]> {
  return fetchTradesByStatus(traderToken, tradeDate, 'virtuals', 'cleared')
}

// Fetch cleared trades for both markets
export async function fetchAllClearedTrades(
  traderToken: string,
  tradeDate: string
): Promise<{ virtuals: ClearedVirtualTrade[]; utc: ClearedUTCTrade[] }> {
  const [virtuals, utc] = await Promise.all([
    fetchTradesByStatus(traderToken, tradeDate, 'virtuals', 'cleared'),
    fetchTradesByStatus(traderToken, tradeDate, 'utc', 'cleared'),
  ])
  return { 
    virtuals: virtuals as ClearedVirtualTrade[], 
    utc: utc as ClearedUTCTrade[] 
  }
}

// Fetch settled trades for both markets
export async function fetchAllSettledTrades(
  traderToken: string,
  tradeDate: string
): Promise<{ virtuals: SettledVirtualTrade[]; utc: SettledUTCTrade[] }> {
  const [virtuals, utc] = await Promise.all([
    fetchTradesByStatus(traderToken, tradeDate, 'virtuals', 'settled'),
    fetchTradesByStatus(traderToken, tradeDate, 'utc', 'settled'),
  ])
  return { 
    virtuals: virtuals as SettledVirtualTrade[], 
    utc: utc as SettledUTCTrade[] 
  }
}

// Fetch all trade data (cleared + settled) for both markets
export async function fetchAllTradeData(
  traderToken: string,
  tradeDate: string
): Promise<{
  clearedVirtuals: ClearedVirtualTrade[]
  clearedUTC: ClearedUTCTrade[]
  settledVirtuals: SettledVirtualTrade[]
  settledUTC: SettledUTCTrade[]
}> {
  const [clearedVirtuals, clearedUTC, settledVirtuals, settledUTC] = await Promise.all([
    fetchTradesByStatus(traderToken, tradeDate, 'virtuals', 'cleared'),
    fetchTradesByStatus(traderToken, tradeDate, 'utc', 'cleared'),
    fetchTradesByStatus(traderToken, tradeDate, 'virtuals', 'settled'),
    fetchTradesByStatus(traderToken, tradeDate, 'utc', 'settled'),
  ])
  return {
    clearedVirtuals: clearedVirtuals as ClearedVirtualTrade[],
    clearedUTC: clearedUTC as ClearedUTCTrade[],
    settledVirtuals: settledVirtuals as SettledVirtualTrade[],
    settledUTC: settledUTC as SettledUTCTrade[],
  }
}
