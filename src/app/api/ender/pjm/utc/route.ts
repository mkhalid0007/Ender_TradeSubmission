import { NextRequest, NextResponse } from 'next/server'

const ENDER_API_URL = 'https://futures.gbe.energy/ender'

// POST - Submit UTC trades
export async function POST(request: NextRequest) {
  try {
    const traderToken = request.headers.get('Trader-Token')
    const tradeDate = request.headers.get('Trade-Date')
    
    if (!traderToken || !tradeDate) {
      return NextResponse.json(
        { error: 'Missing Trader-Token or Trade-Date header' },
        { status: 400 }
      )
    }

    const body = await request.json()
    
    const response = await fetch(`${ENDER_API_URL}/api/v1/trade/pjm/utc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Trader-Token': traderToken,
        'Trade-Date': tradeDate,
      },
      body: JSON.stringify(body),
    })

    const data = await response.text()
    
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to proxy request to Ender API' },
      { status: 500 }
    )
  }
}

// PUT - Replace UTC trades
export async function PUT(request: NextRequest) {
  try {
    const traderToken = request.headers.get('Trader-Token')
    const tradeDate = request.headers.get('Trade-Date')
    
    if (!traderToken || !tradeDate) {
      return NextResponse.json(
        { error: 'Missing Trader-Token or Trade-Date header' },
        { status: 400 }
      )
    }

    const body = await request.json()
    
    const response = await fetch(`${ENDER_API_URL}/api/v1/trade/pjm/utc`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Trader-Token': traderToken,
        'Trade-Date': tradeDate,
      },
      body: JSON.stringify(body),
    })

    const data = await response.text()
    
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to proxy request to Ender API' },
      { status: 500 }
    )
  }
}

// DELETE - Delete UTC trades
export async function DELETE(request: NextRequest) {
  try {
    const traderToken = request.headers.get('Trader-Token')
    const tradeDate = request.headers.get('Trade-Date')
    
    if (!traderToken || !tradeDate) {
      return NextResponse.json(
        { error: 'Missing Trader-Token or Trade-Date header' },
        { status: 400 }
      )
    }
    
    const response = await fetch(`${ENDER_API_URL}/api/v1/trade/pjm/utc`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Trader-Token': traderToken,
        'Trade-Date': tradeDate,
      },
    })

    const data = await response.text()
    
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to proxy request to Ender API' },
      { status: 500 }
    )
  }
}
