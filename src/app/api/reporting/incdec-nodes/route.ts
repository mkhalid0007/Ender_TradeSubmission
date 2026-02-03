import { NextRequest, NextResponse } from 'next/server'

const REPORTING_API_URL = 'https://futures.gbe.energy/reporting'

// GET - Fetch valid INC/DEC nodes
export async function GET(request: NextRequest) {
  try {
    const apiUrl = `${REPORTING_API_URL}/api/incdec/valid-nodes`
    
    console.log('Fetching INC/DEC nodes from:', apiUrl)
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    })

    const data = await response.text()
    console.log('INC/DEC Nodes API Response status:', response.status)
    
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch INC/DEC nodes: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
