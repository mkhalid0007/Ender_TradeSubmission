import { NextRequest, NextResponse } from 'next/server'

const REPORTING_API_URL = 'https://futures.gbe.energy/reporting'

// GET - Fetch PnL data (supports daily, weekly, quarterly, ytd, alltime)
// Now supports market-specific endpoints: /api/reporting/pnl/{market}/{period}
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'ytd' // daily, weekly, quarterly, ytd, alltime
    const market = searchParams.get('market') || 'virtuals' // virtuals or utc
    // Support both header and query param for trader token
    const traderToken = request.headers.get('gbe-trader-token') || searchParams.get('traderToken')
    
    if (!traderToken) {
      return NextResponse.json(
        { error: 'Missing traderToken parameter' },
        { status: 400 }
      )
    }

    // Build the API URL
    // Most endpoints: /api/reporting/pnl/{market}/{period}
    // Monthly endpoint: /api/reporting/pnl/monthly (no market in path)
    let apiUrl: string
    const queryParams = new URLSearchParams()
    
    // Add period-specific required params
    switch (period) {
      case 'daily':
        apiUrl = `${REPORTING_API_URL}/api/reporting/pnl/${market}/daily`
        const asOf = searchParams.get('asOf')
        if (!asOf) {
          return NextResponse.json({ error: 'asOf date required for daily PnL' }, { status: 400 })
        }
        queryParams.set('asOf', asOf)
        break
        
      case 'weekly':
        apiUrl = `${REPORTING_API_URL}/api/reporting/pnl/${market}/weekly`
        const anchorDate = searchParams.get('anchorDate')
        if (!anchorDate) {
          return NextResponse.json({ error: 'anchorDate required for weekly PnL' }, { status: 400 })
        }
        queryParams.set('anchorDate', anchorDate)
        break
        
      case 'monthly':
        apiUrl = `${REPORTING_API_URL}/api/reporting/pnl/${market}/monthly`
        const month = searchParams.get('month')
        if (!month) {
          return NextResponse.json({ error: 'month required for monthly PnL (YYYY-MM format)' }, { status: 400 })
        }
        queryParams.set('month', month)
        break
        
      case 'quarterly':
        apiUrl = `${REPORTING_API_URL}/api/reporting/pnl/${market}/quarterly`
        const quarter = searchParams.get('quarter')
        const qYear = searchParams.get('year')
        if (!quarter) {
          return NextResponse.json({ error: 'quarter required for quarterly PnL' }, { status: 400 })
        }
        queryParams.set('quarter', quarter)
        if (qYear) queryParams.set('year', qYear)
        break
        
      case 'ytd':
        apiUrl = `${REPORTING_API_URL}/api/reporting/pnl/${market}/ytd`
        const ytdYear = searchParams.get('year')
        if (ytdYear) queryParams.set('year', ytdYear)
        const ytdAsOf = searchParams.get('asOf')
        if (ytdAsOf) queryParams.set('asOf', ytdAsOf)
        break
        
      case 'alltime':
      default:
        apiUrl = `${REPORTING_API_URL}/api/reporting/pnl/${market}/alltime`
        // No specific params needed
        break
    }
    
    // Optional params for all
    const traderEmail = searchParams.get('traderEmail')
    if (traderEmail) queryParams.set('traderEmail', traderEmail)
    
    // Leaderboard - defaults to false for personal PnL
    const leaderboard = searchParams.get('leaderboard') ?? 'false'
    queryParams.set('leaderboard', leaderboard)
    
    apiUrl += '?' + queryParams.toString()
    console.log('Fetching PnL from:', apiUrl)
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'gbe-trader-token': traderToken,
      },
    })

    const data = await response.text()
    console.log('PnL response status:', response.status)
    
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
    })
  } catch (error) {
    console.error('PnL proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch PnL: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
