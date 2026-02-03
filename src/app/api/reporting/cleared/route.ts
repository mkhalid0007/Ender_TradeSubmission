import { NextRequest, NextResponse } from 'next/server'

const REPORTING_API_URL = 'https://futures.gbe.energy/reporting'

// GET - Fetch trades by status (cleared or settled)
// Endpoint: /api/v1/pjm/{market}/trades?accountId=...&status=...&tradeDate=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tradeDate = searchParams.get('tradeDate')
    const traderToken = searchParams.get('traderToken')
    const market = searchParams.get('market') || 'virtuals' // virtuals or utc
    const status = searchParams.get('status') || 'cleared' // cleared or settled
    
    if (!tradeDate || !traderToken) {
      return NextResponse.json(
        { error: 'Missing tradeDate or traderToken parameter' },
        { status: 400 }
      )
    }
    
    const apiUrl = `${REPORTING_API_URL}/api/v1/pjm/${market}/trades?accountId=${traderToken}&status=${status}&tradeDate=${tradeDate}`
    console.log('Fetching trades by status from:', apiUrl)
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    const data = await response.text()
    console.log('Trades by status response:', response.status)
    
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trades: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
