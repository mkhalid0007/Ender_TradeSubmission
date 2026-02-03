import { NextRequest, NextResponse } from 'next/server'

const REPORTING_API_URL = 'https://futures.gbe.energy/reporting'

// GET - Fetch valid nodes for a market (virtuals or utc)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const market = searchParams.get('market') || 'virtuals'
    const date = searchParams.get('date')
    
    let apiUrl = `${REPORTING_API_URL}/api/v1/markets/pjm/${market}/nodes`
    if (date) {
      apiUrl += `?date=${date}`
    }
    
    console.log('Fetching nodes from:', apiUrl)
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    const data = await response.text()
    console.log('Nodes API Response status:', response.status)
    console.log('Nodes count:', data.length > 100 ? 'large response' : data)
    
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch nodes: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
