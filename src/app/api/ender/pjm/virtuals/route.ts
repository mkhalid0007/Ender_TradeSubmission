import { NextRequest, NextResponse } from 'next/server'

// Base URL for the Ender API
const ENDER_API_URL = 'https://futures.gbe.energy/ender'

// POST - Submit virtual trades
export async function POST(request: NextRequest) {
  try {
    const xAuthorization = request.headers.get('X-Authorization')
    const traderToken = request.headers.get('Trader-Token')
    const tradeDate = request.headers.get('Trade-Date')
    
    if (!xAuthorization || !traderToken || !tradeDate) {
      return NextResponse.json(
        { error: 'Missing X-Authorization, Trader-Token, or Trade-Date header' },
        { status: 400 }
      )
    }

    const body = await request.json()
    
    const apiUrl = `${ENDER_API_URL}/api/v1/trade/pjm/virtuals`
    console.log('POST Virtuals - Calling API:', apiUrl)
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': xAuthorization,
        'Trader-Token': traderToken,
        'Trade-Date': tradeDate,
      },
      body: JSON.stringify(body),
    })

    const data = await response.text()
    console.log('POST Virtuals - Response status:', response.status)
    
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to proxy request to Ender API: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}

// PUT - Replace virtual trades
export async function PUT(request: NextRequest) {
  try {
    const xAuthorization = request.headers.get('X-Authorization')
    const traderToken = request.headers.get('Trader-Token')
    const tradeDate = request.headers.get('Trade-Date')
    
    if (!xAuthorization || !traderToken || !tradeDate) {
      return NextResponse.json(
        { error: 'Missing X-Authorization, Trader-Token, or Trade-Date header' },
        { status: 400 }
      )
    }

    const body = await request.json()
    
    const apiUrl = `${ENDER_API_URL}/api/v1/trade/pjm/virtuals`
    console.log('PUT Virtuals - Calling API:', apiUrl)
    
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': xAuthorization,
        'Trader-Token': traderToken,
        'Trade-Date': tradeDate,
      },
      body: JSON.stringify(body),
    })

    const data = await response.text()
    console.log('PUT Virtuals - Response status:', response.status)
    
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to proxy request to Ender API: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}

// DELETE - Delete virtual trades
export async function DELETE(request: NextRequest) {
  try {
    const xAuthorization = request.headers.get('X-Authorization')
    const traderToken = request.headers.get('Trader-Token')
    const tradeDate = request.headers.get('Trade-Date')
    
    if (!xAuthorization || !traderToken || !tradeDate) {
      return NextResponse.json(
        { error: 'Missing X-Authorization, Trader-Token, or Trade-Date header' },
        { status: 400 }
      )
    }
    
    const apiUrl = `${ENDER_API_URL}/api/v1/trade/pjm/virtuals`
    console.log('DELETE Virtuals - Calling API:', apiUrl)
    
    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': xAuthorization,
        'Trader-Token': traderToken,
        'Trade-Date': tradeDate,
      },
    })

    const data = await response.text()
    console.log('DELETE Virtuals - Response status:', response.status)
    
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to proxy request to Ender API: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
