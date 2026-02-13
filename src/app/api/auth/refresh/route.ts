import { NextRequest, NextResponse } from 'next/server'

// Auth API base URL
const AUTH_API_URL = 'https://futures.gbe.energy/ender'

// POST - Refresh tokens
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { refreshToken } = body

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'bad_request', message: 'refreshToken is required' },
        { status: 400 }
      )
    }

    const apiUrl = `${AUTH_API_URL}/api/v1/auth/refresh`
    console.log('Auth Refresh - Calling API:', apiUrl)

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Refresh-Token': refreshToken,
      },
      body: JSON.stringify({ refreshToken }),
    })

    const data = await response.json()
    console.log('Auth Refresh - Response status:', response.status)

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    // Return new tokens to client
    return NextResponse.json(data)
  } catch (error) {
    console.error('Auth refresh error:', error)
    return NextResponse.json(
      { error: 'server_error', message: 'Failed to refresh tokens' },
      { status: 500 }
    )
  }
}
