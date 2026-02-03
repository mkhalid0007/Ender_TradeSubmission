import { NextRequest, NextResponse } from 'next/server'

const REPORTING_API_URL = 'https://futures.gbe.energy/reporting'

// GET - Fetch submitted trades by market
// Proxies to: GET /api/v1/trades/{market}?accountId=...&date=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const market = searchParams.get('market')
    const accountId = searchParams.get('accountId')
    const date = searchParams.get('date')
    
    if (!market || !accountId || !date) {
      return NextResponse.json(
        { error: 'Missing market, accountId, or date parameter' },
        { status: 400 }
      )
    }
    
    const response = await fetch(
      `${REPORTING_API_URL}/api/v1/trades/${market}?accountId=${accountId}&date=${date}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    const data = await response.text()
    
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to proxy request to Reporting API' },
      { status: 500 }
    )
  }
}
