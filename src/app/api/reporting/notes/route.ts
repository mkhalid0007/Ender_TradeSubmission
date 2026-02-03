import { NextRequest, NextResponse } from 'next/server'

// Notes API uses the same reporting base URL
const NOTES_API_URL = 'https://futures.gbe.energy/reporting'

// GET - Fetch notes for the day
// GET /api/v1/reporting/notes/{market}/{type}?tradeDate=YYYY-MM-DD
// Returns: { market, type, tradeDate, notes: { tag: text, ... } }
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const traderToken = searchParams.get('traderToken')
    const market = searchParams.get('market') || 'pjm'       // pjm
    const type = searchParams.get('type') || 'virtual'       // virtual or utc
    const tradeDate = searchParams.get('tradeDate')

    if (!traderToken) {
      return NextResponse.json({ error: 'Trader token is required' }, { status: 400 })
    }

    if (!tradeDate) {
      return NextResponse.json({ error: 'Trade date is required' }, { status: 400 })
    }

    // Build the API URL: /api/v1/reporting/notes/{market}/{type}?tradeDate=YYYY-MM-DD
    const apiUrl = `${NOTES_API_URL}/api/v1/reporting/notes/${market}/${type}?tradeDate=${tradeDate}`

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Trade-Token': traderToken,
      },
    })

    // 404 might mean no notes exist yet - return empty structure
    if (response.status === 404) {
      return NextResponse.json({
        market,
        type,
        tradeDate,
        notes: {}
      })
    }

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: errorText || `API returned ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Notes GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch notes' },
      { status: 500 }
    )
  }
}

// POST - Create/Update notes (batch upsert)
// POST /api/v1/reporting/notes/{market}/{type}?tradeDate=YYYY-MM-DD
// Body: [ { tag: "thesis", text: "..." }, { tag: "macro", text: "..." } ]
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { traderToken, market, type, tradeDate, notes } = body

    if (!traderToken) {
      return NextResponse.json({ error: 'Trader token is required' }, { status: 400 })
    }

    if (!tradeDate) {
      return NextResponse.json({ error: 'Trade date is required' }, { status: 400 })
    }

    // tradeDate goes in query param, body is array of {tag, text}
    const apiUrl = `${NOTES_API_URL}/api/v1/reporting/notes/${market || 'pjm'}/${type || 'virtual'}?tradeDate=${tradeDate}`

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Trade-Token': traderToken,
      },
      body: JSON.stringify(notes),  // Array of { tag, text }
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: errorText || `API returned ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Notes POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save notes' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a note by tag
// DELETE /api/v1/reporting/notes/{market}/{type}?tag=tagName&tradeDate=YYYY-MM-DD
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { traderToken, market, type, tag, tradeDate } = body

    if (!traderToken) {
      return NextResponse.json({ error: 'Trader token is required' }, { status: 400 })
    }

    if (!tag) {
      return NextResponse.json({ error: 'Tag is required for deletion' }, { status: 400 })
    }

    if (!tradeDate) {
      return NextResponse.json({ error: 'Trade date is required' }, { status: 400 })
    }

    const apiUrl = `${NOTES_API_URL}/api/v1/reporting/notes/${market || 'pjm'}/${type || 'virtual'}?tag=${encodeURIComponent(tag)}&tradeDate=${tradeDate}`

    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Trade-Token': traderToken,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: errorText || `API returned ${response.status}` },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notes DELETE error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete note' },
      { status: 500 }
    )
  }
}
