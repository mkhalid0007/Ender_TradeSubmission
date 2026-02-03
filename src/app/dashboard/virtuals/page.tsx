"use client"

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { VirtualsTradeForm } from '@/components/forms/VirtualsTradeForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Edit } from 'lucide-react'

function VirtualsPageContent() {
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
          {isEditMode ? 'Edit Virtual Trades' : 'Submit Virtual Trades'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isEditMode 
            ? 'Modify your existing PJM virtual (INC/DEC) trades'
            : 'Create and submit PJM virtual (INC/DEC) trades'
          }
        </p>
      </div>

      <Card className={isEditMode ? 'border-amber-300' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isEditMode && <Edit className="h-5 w-5 text-amber-600" />}
            {isEditMode ? 'Edit Existing Trades' : 'New Virtual Trade'}
          </CardTitle>
          <CardDescription>
            {isEditMode 
              ? 'Modify your trades below. Saving will REPLACE all trades for this date.'
              : 'Enter the location, date, and bid segments for your virtual trade submission. Increments (INCs) are virtual supply bids, Decrements (DECs) are virtual demand bids.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VirtualsTradeForm />
        </CardContent>
      </Card>
    </div>
  )
}

export default function VirtualsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[80vh]"><div className="animate-pulse text-muted-foreground">Loading...</div></div>}>
      <VirtualsPageContent />
    </Suspense>
  )
}
