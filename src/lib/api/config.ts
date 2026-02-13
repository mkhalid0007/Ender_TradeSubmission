// API Proxy URLs (routes through Next.js to avoid CORS)
export const ENDER_PROXY_URL = '/api/ender'
export const REPORTING_PROXY_URL = '/api/reporting'

// Original external URLs (for reference)
export const ENDER_API_URL = 'https://futures.gbe.energy/ender'
export const REPORTING_API_URL = 'https://futures.gbe.energy/reporting'

// Common headers for API calls
// accessToken: Cognito access token for authentication
// traderToken: GBE trader token for API identification
export function getAuthHeaders(accessToken: string, traderToken: string, tradeDate?: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Authorization': `Bearer ${accessToken}`,
    'Trader-Token': traderToken,
  }
  
  if (tradeDate) {
    headers['Trade-Date'] = tradeDate
  }
  
  return headers
}
