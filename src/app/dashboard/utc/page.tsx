"use client"

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { UTCTradeForm } from '@/components/forms/UTCTradeForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Edit } from 'lucide-react'

function UTCPageContent() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEditMode = searchParams.get('mode') === 'edit'

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

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">
          {isEditMode ? 'Edit UTC Trades' : 'Submit UTC Trades'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isEditMode 
            ? 'Modify your existing PJM Up-to-Congestion trades'
            : 'Create and submit PJM Up-to-Congestion trades'
          }
        </p>
      </div>

      <Card className={isEditMode ? 'border-amber-300' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isEditMode && <Edit className="h-5 w-5 text-amber-600" />}
            {isEditMode ? 'Edit Existing Trades' : 'New UTC Trade'}
          </CardTitle>
          <CardDescription>
            {isEditMode 
              ? 'Modify your trades below. Saving will REPLACE all trades for this date.'
              : 'Enter the source/sink locations, date, and hourly positions for your UTC trade submission. UTC trades allow you to profit from congestion between two locations.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UTCTradeForm />
        </CardContent>
      </Card>
    </div>
  )
}

export default function UTCPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[80vh]"><div className="animate-pulse text-muted-foreground">Loading...</div></div>}>
      <UTCPageContent />
    </Suspense>
  )
}
