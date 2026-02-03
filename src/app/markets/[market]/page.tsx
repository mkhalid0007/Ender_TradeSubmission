"use client"

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Clock, Zap, TrendingUp, BarChart3, FileText } from 'lucide-react'

const marketInfo: Record<string, { name: string; fullName: string; region: string; description: string }> = {
  miso: {
    name: 'MISO',
    fullName: 'Midcontinent Independent System Operator',
    region: 'Central United States & Manitoba',
    description: 'MISO manages the electric grid across 15 U.S. states and Manitoba, Canada. Virtual trading in MISO allows participants to bid on expected differences between day-ahead and real-time prices.'
  },
  nyiso: {
    name: 'NYISO',
    fullName: 'New York Independent System Operator',
    region: 'New York State',
    description: 'NYISO manages the electric grid for New York State. Virtual trading opportunities exist across various zones including NYC, Long Island, and upstate regions.'
  },
  ieso: {
    name: 'IESO',
    fullName: 'Independent Electricity System Operator',
    region: 'Ontario, Canada',
    description: 'IESO manages Ontario\'s power system and electricity market. Virtual trading in IESO offers unique opportunities in the Canadian energy market.'
  },
}

export default function MarketPlaceholderPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const marketId = params.market as string
  const market = marketInfo[marketId]

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!market) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold mb-4">Market Not Found</h1>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Coming Soon Banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-6 mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-amber-100 p-2 rounded-full">
            <Clock className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{market.name} - Coming Soon</h1>
            <p className="text-amber-700">{market.fullName}</p>
          </div>
        </div>
        <p className="text-amber-800 mt-2">
          {market.region}
        </p>
      </div>

      {/* Market Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-muted-foreground" />
            About {market.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{market.description}</p>
        </CardContent>
      </Card>

      {/* Planned Features */}
      <Card>
        <CardHeader>
          <CardTitle>Planned Features</CardTitle>
          <CardDescription>What to expect when {market.name} trading is available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-medium">Virtual Trade Submission</h3>
                <p className="text-sm text-muted-foreground">Submit INC/DEC and UTC trades for {market.name}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <BarChart3 className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium">Market Analytics</h3>
                <p className="text-sm text-muted-foreground">Price analysis and historical data for {market.name}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <FileText className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h3 className="font-medium">Trade Management</h3>
                <p className="text-sm text-muted-foreground">View, modify, and cancel submitted trades</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-medium">Real-time Updates</h3>
                <p className="text-sm text-muted-foreground">Live market data and position tracking</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="mt-8 text-center">
        <p className="text-muted-foreground mb-4">
          Want to be notified when {market.name} trading is available?
        </p>
        <Button variant="outline" disabled>
          Notify Me (Coming Soon)
        </Button>
      </div>
    </div>
  )
}
