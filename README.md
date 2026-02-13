# Ender Trades - PJM Virtual Trade Submission

A web application for submitting and managing PJM virtual trades (Increments/Decrements) and Up-to-Congestion (UTC) trades, with comprehensive PnL tracking and analytics.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Features](#features)
- [API Integration](#api-integration)
- [Components Guide](#components-guide)
- [Contexts](#contexts)
- [Styling & Theming](#styling--theming)

---

## Overview

This application enables energy traders to:
- Submit virtual trades (INCs and DECs) for PJM market
- Submit Up-to-Congestion (UTC) trades
- Track realized and unrealized PnL
- Analyze trading performance with detailed analytics
- Compare submitted prices vs Day-Ahead (DA) vs Real-Time (RT) prices
- Manage trading notes for decision tracking

### Trading Concepts

| Trade Type | Position | Action | Profit Condition |
|------------|----------|--------|------------------|
| **INC** | Short DA | Sell DA, Buy RT | DA > RT |
| **DEC** | Long DA | Buy DA, Sell RT | RT > DA |
| **UTC** | Spread | Congestion arbitrage | RT Spread > DA Spread |

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Charts:** Recharts
- **State Management:** React Context API
- **Authentication:** AWS Cognito (with automatic token refresh)

---

## Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── api/                      # API proxy routes
│   │   ├── auth/                 # Authentication proxies
│   │   │   ├── login/            # POST login (Cognito)
│   │   │   └── refresh/          # POST token refresh
│   │   ├── ender/                # Trade submission proxies
│   │   │   └── pjm/
│   │   │       ├── virtuals/     # POST/PUT/DELETE virtuals
│   │   │       └── utc/          # POST/PUT/DELETE UTC
│   │   ├── incdec/               # Node fetching
│   │   └── reporting/            # Reporting API proxies
│   │       ├── cleared/          # Cleared/settled trades
│   │       ├── notes/            # Trading notes
│   │       └── pnl/              # PnL data
│   ├── dashboard/                # Main dashboard pages
│   │   ├── analytics/            # Analytics dashboard
│   │   ├── comparison/           # Trade comparison
│   │   ├── notes/                # Trading notes
│   │   ├── pnl/                  # PnL tracking
│   │   ├── utc/                  # UTC trade form
│   │   └── virtuals/             # Virtuals trade form
│   ├── login/                    # Login page
│   ├── markets/[market]/         # Placeholder for other markets
│   ├── globals.css               # Global styles + dark mode
│   ├── layout.tsx                # Root layout with providers
│   └── page.tsx                  # Landing page
│
├── components/                   # React components
│   ├── forms/                    # Trade submission forms
│   │   ├── VirtualsTradeForm.tsx # INCs/DECs submission
│   │   └── UTCTradeForm.tsx      # UTC submission
│   ├── ui/                       # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── node-selector.tsx     # Searchable node dropdown
│   │   └── ...
│   ├── AnalyticsDashboard.tsx    # Performance analytics
│   ├── Navbar.tsx                # Navigation + theme toggle
│   ├── PnLDashboard.tsx          # PnL tracking
│   ├── TradeComparison.tsx       # DA/RT price comparison
│   ├── TradesList.tsx            # View/manage submitted trades
│   └── TradingNotes.tsx          # Notes management
│
├── contexts/                     # React Context providers
│   ├── AuthContext.tsx           # Authentication state
│   ├── NodesContext.tsx          # Cached node data
│   └── ThemeContext.tsx          # Dark/light mode
│
├── lib/                          # Utilities and API clients
│   ├── api/                      # API client functions
│   │   ├── cleared.ts            # Fetch cleared/settled trades
│   │   ├── config.ts             # API URL configuration
│   │   ├── nodes.ts              # Fetch available nodes
│   │   ├── notes.ts              # Notes CRUD operations
│   │   ├── pnl.ts                # PnL data fetching
│   │   ├── trades.ts             # Fetch submitted trades
│   │   ├── utc.ts                # UTC trade operations
│   │   └── virtuals.ts           # Virtuals trade operations
│   ├── export.ts                 # CSV export utilities
│   └── utils.ts                  # Helper functions
│
└── types/                        # TypeScript type definitions
```

---

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Ender_TradeSubmission

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

Create a `.env.local` file (optional - defaults are configured):

```env
# API endpoints are configured in src/lib/api/config.ts
# No environment variables required for basic setup
```

### Running the Application

```bash
# Development
npm run dev

# Production build
npm run build
npm start
# Linting
npm run lint
```

Access the application at `http://localhost:3000`

---

## Features

### 1. Trade Submission

#### Virtuals (INCs/DECs)
- Multi-node support: Submit trades for multiple nodes in one form
- Segment-based pricing: Add multiple price/MW segments per hour
- Hour selection: Choose specific hours (HE 1-24)
- Notes integration: Add trading notes per INC/DEC with hour ranges

#### UTC (Up-to-Congestion)
- Multi-path support: Submit trades for multiple source/sink pairs
- Segment-based pricing: Multiple segments per hour per path
- Notes integration: Add trading notes with hour ranges

### 2. Trade Management

- **View Trades:** See all submitted trades for a selected date
- **Edit Trades:** Modify existing trades (Replace All)
- **Cancel Trades:** Delete all trades for a date
- **Export:** Download trades as CSV

### 3. PnL Tracking

- **Periods:** Daily, Weekly, Monthly, All-time
- **Leaderboard:** Compare performance with other traders
- **Breakdown:** Separate PnL for Virtuals and UTC

### 4. Analytics Dashboard

- **Cumulative PnL:** Line chart over time
- **Daily PnL:** Bar chart
- **Win/Loss Ratio:** Pie chart
- **Trade Status:** Cleared vs Rejected distribution
- **Metrics:** Win rate, clear rate, average MW

### 5. Trade Comparison

- Compare submitted price vs DA price vs RT price
- Calculate actual profit/loss per trade
- Grouped by trade type (INC/DEC/UTC)
- Export comparison data

### 6. Trading Notes

- Create notes with custom tags
- Associate notes with trade dates
- Filter by trade type (Virtuals/UTC)
- Hour-range specific notes from trade forms

### 7. Dark Mode

- Toggle via navbar (Moon/Sun icon)
- Persists preference to localStorage
- Respects system preference on first visit

---

## API Integration

### Base URLs (configured in `src/lib/api/config.ts`)

```typescript
ENDER_API_URL = 'https://futures.gbe.energy/ender'
REPORTING_API_URL = 'https://futures.gbe.energy/reporting'
```

### Authentication

The application uses AWS Cognito for user authentication with a dual-token system:

| Token Type | Purpose | Storage |
|------------|---------|---------|
| **Access Token** | Cognito authentication (expires ~1 hour) | localStorage |
| **Refresh Token** | Obtain new access tokens | localStorage |
| **Trader Token** | GBE API identification | localStorage |

**Login requires:**
- Email (Cognito username)
- Password (Cognito password)
- Trader Token (GBE-specific identifier, e.g., `5zWpE9tB`)

**API Headers by Service:**

| API | Headers Required |
|-----|-----------------|
| **Ender API** | `X-Authorization: Bearer <accessToken>`, `Trader-Token: <traderToken>` |
| **Reporting API** | `gbe-trader-token: <traderToken>` |

**Token Refresh:** Access tokens are automatically refreshed 5 minutes before expiry using the refresh token.

### Key Endpoints

| Feature | Method | Endpoint |
|---------|--------|----------|
| Submit Virtuals | POST | `/api/v1/trades/pjm/virtuals` |
| Submit UTC | POST | `/api/v1/trades/pjm/utc` |
| Get Virtuals | GET | `/api/v1/trades/virtuals` |
| Get UTC | GET | `/api/v1/trades/utc` |
| Delete Virtuals | DELETE | `/api/v1/trades/pjm/virtuals` |
| Delete UTC | DELETE | `/api/v1/trades/pjm/utc` |
| Cleared Trades | GET | `/api/v1/pjm/{market}/trades?status=cleared` |
| Settled Trades | GET | `/api/v1/pjm/{market}/trades?status=settled` |
| PnL Data | GET | `/api/v1/reporting/pnl/{market}/{period}` |
| Notes | GET/POST/DELETE | `/api/v1/reporting/notes/{market}/{type}` |
| Nodes | GET | `/api/incdec/valid-nodes` or `/api/utc/valid-nodes` |

### Proxy Routes

All external API calls go through Next.js API routes (`/api/*`) to:
- Add authentication headers
- Handle CORS
- Transform requests/responses

---

## Components Guide

### Trade Forms

#### `VirtualsTradeForm.tsx`
- Manages multiple "node blocks" for INCs and DECs
- Each block has: node selection, hour selection, segment grid
- Supports edit mode (pre-populates from existing trades)
- Integrates notes with hour ranges

#### `UTCTradeForm.tsx`
- Manages multiple "path blocks" (source → sink pairs)
- Each block has: source/sink selection, hour selection, segment grid
- Supports edit mode
- Integrates notes with hour ranges

### Data Display

#### `TradesList.tsx`
- Fetches and displays submitted trades
- Shows status (Pending/Cleared/Rejected/Settled)
- Shows cleared MW and PnL for settled trades
- Actions: Edit, Export, Cancel All

#### `TradeComparison.tsx`
- Fetches cleared and settled trade data
- Displays submitted vs DA vs RT prices
- Calculates and shows profit/loss
- Groups by trade type

#### `PnLDashboard.tsx`
- Fetches PnL for selected period
- Shows realized PnL breakdown
- Displays leaderboard rankings

#### `AnalyticsDashboard.tsx`
- Fetches data across date range
- Renders multiple charts (Recharts)
- Calculates aggregate statistics

### UI Components

#### `NodeSelector.tsx`
- Searchable dropdown for node selection
- Filters nodes as user types
- Shows node name and ID

---

## Contexts

### `AuthContext`
```typescript
interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  traderToken: string | null    // GBE trader token for API calls
  accessToken: string | null    // Cognito access token for authentication
  login: (email: string, password: string, traderToken: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  refreshTokens: () => Promise<boolean>
}
```

**Features:**
- Automatic token refresh before expiry (5-minute buffer)
- Persistent storage in localStorage
- Session restoration on page reload

### `NodesContext`
```typescript
interface NodesContextType {
  virtualsNodes: Node[]
  utcNodes: Node[]
  isLoading: boolean
  error: string | null
  refreshNodes: () => Promise<void>
}
```
Caches node data to avoid repeated API calls.

### `ThemeContext`
```typescript
interface ThemeContextType {
  theme: 'light' | 'dark'
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}
```

---

## Styling & Theming

### Tailwind CSS

The project uses Tailwind CSS with custom CSS variables for theming.

### Dark Mode

CSS variables are defined in `globals.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  /* ... light mode variables */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... dark mode variables */
}
```

### shadcn/ui Components

Pre-built components in `src/components/ui/`:
- Button, Card, Input, Label
- AlertDialog, Select
- Custom NodeSelector

---

## Trade Data Structures

### Virtual Trade (Submission)
```typescript
interface VirtualTradePayload {
  trades: {
    location: string        // pnodeId
    increments: { hour: number; price: number; mw: number }[]
    decrements: { hour: number; price: number; mw: number }[]
  }[]
}
```

### UTC Trade (Submission)
```typescript
interface UTCTradePayload {
  trades: {
    sourceLocation: string  // source pnodeId
    sinkLocation: string    // sink pnodeId
    hours: { hour: number; price: number; mw: number }[]
  }[]
}
```

### Settled Trade (Response)
```typescript
interface SettledVirtualTrade {
  tradeId: string
  tradeType: 'INC' | 'DEC'
  hour: number
  submittedPrice: number
  clearedMw: number
  daLmp: number
  totalLmpRt: number
  priceDiff: number
  pnl: number
}
```

---

## Future Enhancements

- [ ] MISO market integration
- [ ] NYISO market integration
- [ ] IESO market integration
- [ ] Price charts (DA/RT historical)
- [ ] Trade templates
- [ ] Position summary view
- [ ] Keyboard shortcuts

---

## License

Proprietary - GBE Energy

---

## Support

For questions or issues, contact the development team.
