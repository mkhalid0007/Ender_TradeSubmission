import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { NodesProvider } from '@/contexts/NodesContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { Navbar } from '@/components/Navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Ender Trades - PJM Virtual Trade Submission',
  description: 'Submit and manage PJM virtual trades and Up-to-Congestion trades',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <NodesProvider>
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <main className="flex-1">
                  {children}
                </main>
              </div>
            </NodesProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
