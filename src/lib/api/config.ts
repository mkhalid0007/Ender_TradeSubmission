// API Proxy URLs (routes through Next.js to avoid CORS)
export const ENDER_PROXY_URL = '/api/ender'
export const REPORTING_PROXY_URL = '/api/reporting'

// Original external URLs (for reference)
export const ENDER_API_URL = 'https://futures.gbe.energy/ender'
export const REPORTING_API_URL = 'https://futures.gbe.energy/reporting'

// Common headers
export function getAuthHeaders(traderToken: string, tradeDate?: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Trader-Token': traderToken,
  }
  
  if (tradeDate) {
    headers['Trade-Date'] = tradeDate
  }
  
  return headers
}
