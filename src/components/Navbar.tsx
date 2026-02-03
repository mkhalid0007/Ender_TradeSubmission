"use client"

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { LogOut, TrendingUp, ChevronDown, Zap, Clock, Moon, Sun } from 'lucide-react'

const markets = [
  { id: 'pjm', name: 'PJM', active: true, path: '/dashboard' },
  { id: 'miso', name: 'MISO', active: false, path: '/markets/miso' },
  { id: 'nyiso', name: 'NYISO', active: false, path: '/markets/nyiso' },
  { id: 'ieso', name: 'IESO', active: false, path: '/markets/ieso' },
]

export function Navbar() {
  const { isAuthenticated, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [marketDropdownOpen, setMarketDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMarketDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">Ender Trades</span>
            </Link>
            
            {isAuthenticated && (
              <div className="flex items-center space-x-4">
                {/* Markets Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setMarketDropdownOpen(!marketDropdownOpen)}
                    className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Zap className="h-4 w-4 text-green-500" />
                    PJM
                    <ChevronDown className={`h-3 w-3 transition-transform ${marketDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {marketDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-background border rounded-lg shadow-lg py-1 z-50">
                      {markets.map((market) => (
                        <Link
                          key={market.id}
                          href={market.path}
                          onClick={() => setMarketDropdownOpen(false)}
                          className={`flex items-center justify-between px-4 py-2 text-sm ${
                            market.active 
                              ? 'text-foreground bg-primary/5' 
                              : 'text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {market.active && <Zap className="h-3 w-3 text-green-500" />}
                            {market.name}
                          </span>
                          {!market.active && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              Soon
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <Link 
                  href="/dashboard" 
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/dashboard/virtuals" 
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Virtuals
                </Link>
                <Link 
                  href="/dashboard/utc" 
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  UTC
                </Link>
                <Link 
                  href="/dashboard/pnl" 
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  PnL
                </Link>
                <Link 
                  href="/dashboard/analytics" 
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Analytics
                </Link>
                <Link 
                  href="/dashboard/comparison" 
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Comparison
                </Link>
                <Link 
                  href="/dashboard/notes" 
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Notes
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="px-2"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>
            {isAuthenticated && (
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
