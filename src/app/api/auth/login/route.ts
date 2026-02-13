import { NextRequest, NextResponse } from 'next/server'

// Auth API base URL (same as reporting)
const AUTH_API_URL = 'https://futures.gbe.energy/ender'

// POST - Login with email/password
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { login, password } = body

    if (!login || !password) {
      return NextResponse.json(
        { error: 'bad_request', message: 'Login and password are required' },
        { status: 400 }
      )
    }

    const apiUrl = `${AUTH_API_URL}/api/v1/auth/login`
    console.log('Auth Login - Calling API:', apiUrl)

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ login, password }),
    })

    const data = await response.json()
    console.log('Auth Login - Response status:', response.status)

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    // Return tokens to client
    return NextResponse.json(data)
  } catch (error) {
    console.error('Auth login error:', error)
    return NextResponse.json(
      { error: 'server_error', message: 'Failed to authenticate' },
      { status: 500 }
    )
  }
}
