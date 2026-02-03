"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, ArrowRight, Loader2, AlertCircle } from 'lucide-react'

// Validate token by making a test API call
async function validateToken(token: string): Promise<{ valid: boolean; error?: string }> {
  try {
    // Try to fetch trades - this will return 401 if token is invalid
    const today = new Date().toISOString().split('T')[0]
    const response = await fetch(`/api/reporting/trades?market=virtuals&accountId=${token}&date=${today}`)
    
    if (response.status === 401) {
      return { valid: false, error: 'Invalid trader token. Please check and try again.' }
    }
    
    if (response.status === 403) {
      return { valid: false, error: 'Access denied. Your token may not have the required permissions.' }
    }
    
    // Any other successful response means the token is valid
    if (response.ok || response.status === 200) {
      return { valid: true }
    }
    
    // For other errors, we'll still allow login but warn
    return { valid: true }
  } catch (error) {
    // Network error - allow login, will fail later if truly invalid
    console.error('Token validation error:', error)
    return { valid: true } // Allow through, will fail on actual API calls
  }
}

export default function LoginPage() {
  const { setToken, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [token, setTokenInput] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim()) return
    
    setError(null)
    setIsValidating(true)
    
    try {
      const result = await validateToken(token.trim())
      
      if (!result.valid) {
        setError(result.error || 'Invalid token')
        setIsValidating(false)
        return
      }
      
      // Token is valid, proceed
      setToken(token.trim())
      router.push('/dashboard')
    } catch {
      setError('Failed to validate token. Please try again.')
      setIsValidating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome to Ender Trades</CardTitle>
          <CardDescription>
            Enter your Trader Token to manage PJM virtual trades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Trader Token</Label>
              <Input
                id="token"
                type="password"
                placeholder="Enter your trader token"
                value={token}
                onChange={(e) => {
                  setTokenInput(e.target.value)
                  setError(null) // Clear error when user types
                }}
                required
                autoComplete="off"
                disabled={isValidating}
                className={error ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              <p className="text-xs text-muted-foreground">
                This token is used for API authentication with Ender endpoints
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={!token.trim() || isValidating}>
              {isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  Continue to Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
