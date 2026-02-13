# Architecture Documentation

This document provides a deep dive into the technical architecture of the Ender Trades application.

## Table of Contents

1. [Application Flow](#application-flow)
2. [Data Flow](#data-flow)
3. [API Layer](#api-layer)
4. [State Management](#state-management)
5. [Component Architecture](#component-architecture)
6. [Form Handling](#form-handling)
7. [Error Handling](#error-handling)

---

## Application Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App Router                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Pages     │  │ Components  │  │    API Routes       │  │
│  │  /dashboard │  │ TradesList  │  │  /api/ender/*       │  │
│  │  /login     │  │ Forms       │  │  /api/reporting/*   │  │
│  └─────────────┘  └─────────────┘  └──────────┬──────────┘  │
└────────────────────────────────────────────────┼────────────┘
                                                 │
                          ┌──────────────────────┴──────────────────────┐
                          │                                             │
                          ▼                                             ▼
            ┌─────────────────────────┐               ┌─────────────────────────┐
            │     Ender API           │               │    Reporting API        │
            │  futures.gbe.energy     │               │  futures.gbe.energy     │
            │                         │               │                         │
            │ • Trade submission      │               │ • PnL data              │
            │ • Trade cancellation    │               │ • Cleared/Settled       │
            │ • Node lists            │               │ • Notes                 │
            └─────────────────────────┘               └─────────────────────────┘
```

---

## Data Flow

### Trade Submission Flow

```
User fills form
      │
      ▼
┌─────────────────┐
│ Form validation │
│ (client-side)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Build payload   │
│ (group by node) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ API Client      │────▶│ Next.js Proxy   │────▶│ External API    │
│ (lib/api/*.ts)  │     │ (/api/ender/*)  │     │ (Ender)         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                 ┌─────────────────┐
                                                 │ Response        │
                                                 │ (success/error) │
                                                 └────────┬────────┘
                                                          │
         ┌────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ Update UI       │
│ (success msg)   │
│ Reset form      │
└─────────────────┘
```

### Trade Fetching Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    TradesList Component                          │
└─────────────────────────────┬───────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ fetchTrades   │    │ fetchTrades   │    │fetchAllTrade  │
│ ('virtuals')  │    │ ('utc')       │    │    Data()     │
└───────┬───────┘    └───────┬───────┘    └───────┬───────┘
        │                    │                    │
        ▼                    ▼                    ▼
   Submitted            Submitted            Cleared +
   Virtuals              UTC                 Settled
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                             ▼
                    ┌───────────────┐
                    │ Merge data    │
                    │ (match by ID) │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Display with  │
                    │ status + PnL  │
                    └───────────────┘
```

---

## API Layer

### Proxy Architecture

All external API calls go through Next.js API routes to handle authentication and CORS.

```
src/app/api/
├── auth/
│   ├── login/route.ts       # POST - Cognito authentication
│   └── refresh/route.ts     # POST - Token refresh
├── ender/pjm/
│   ├── virtuals/route.ts    # POST, PUT, DELETE
│   └── utc/route.ts         # POST, PUT, DELETE
├── incdec/
│   └── valid-nodes/route.ts # GET nodes for virtuals
├── utc/
│   └── valid-nodes/route.ts # GET nodes for UTC
└── reporting/
    ├── cleared/route.ts     # GET cleared/settled trades
    ├── notes/route.ts       # GET, POST, DELETE notes
    └── pnl/route.ts         # GET PnL data
```

### API Client Functions

Located in `src/lib/api/`:

```typescript
// virtuals.ts (uses accessToken + traderToken)
submitVirtualTrades(accessToken, traderToken, date, payload)
replaceVirtualTrades(accessToken, traderToken, date, payload)
deleteVirtualTrades(accessToken, traderToken, date)

// utc.ts (uses accessToken + traderToken)
submitUTCTrades(accessToken, traderToken, date, payload)
replaceUTCTrades(accessToken, traderToken, date, payload)
deleteUTCTrades(accessToken, traderToken, date)

// trades.ts
fetchTrades(market, token, date)

// cleared.ts
fetchTradesByStatus(token, date, market, status)
fetchAllTradeData(token, date)

// pnl.ts
fetchPnL(token, market, period, leaderboard)

// notes.ts
fetchNotes(token, date, type, market)
saveNotes(token, date, notes, type, market)
deleteNote(token, date, tag, type, market)

// nodes.ts
fetchVirtualsNodes(token)
fetchUTCNodes(token)
```

### Request Headers

| Header | Used For | Value |
|--------|----------|-------|
| `X-Authorization` | Ender API (auth) | `Bearer <accessToken>` |
| `Trader-Token` | Ender API (identification) | User's GBE trader token |
| `gbe-trader-token` | Reporting API | User's GBE trader token |
| `Trade-Date` | Trade operations | YYYY-MM-DD format |
| `Content-Type` | POST/PUT | application/json |
| `X-Refresh-Token` | Token refresh | Cognito refresh token |

---

## State Management

### Context Providers

```
┌─────────────────────────────────────────────────────────────┐
│                      ThemeProvider                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    AuthProvider                        │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │                 NodesProvider                    │  │  │
│  │  │  ┌───────────────────────────────────────────┐  │  │  │
│  │  │  │              App Components               │  │  │  │
│  │  │  └───────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### AuthContext

Manages AWS Cognito authentication with automatic token refresh.

```typescript
// State
accessToken: string | null    // Cognito access token for Ender API
refreshToken: string | null   // Cognito refresh token
traderToken: string | null    // GBE trader token for API identification
tokenExpiry: number | null    // Timestamp when accessToken expires
isAuthenticated: boolean      // Derived from accessToken + traderToken presence
isLoading: boolean            // Loading state during initialization/refresh

// Actions
login(email, password, traderToken) → authenticates with Cognito, stores all tokens
logout() → clears all tokens from state and localStorage
refreshTokens() → refreshes accessToken using refreshToken

// Auto-refresh
- Schedules token refresh 5 minutes before expiry
- Uses setTimeout with dynamic interval based on token expiry
- Preserves traderToken across refreshes
```

#### Token Storage (localStorage)

| Key | Value |
|-----|-------|
| `ender_access_token` | Cognito access token |
| `ender_refresh_token` | Cognito refresh token |
| `ender_trader_token` | GBE trader token |
| `ender_token_expiry` | Token expiry timestamp |

### NodesContext

```typescript
// State
virtualsNodes: Node[]         // Cached node list for virtuals
utcNodes: Node[]              // Cached node list for UTC
isLoading: boolean
error: string | null

// Behavior
- Fetches nodes on mount when authenticated
- Caches to avoid repeated API calls
- Provides nodes to all components via context
```

### ThemeContext

```typescript
// State
theme: 'light' | 'dark'       // Stored in localStorage

// Actions
toggleTheme() → switches between light/dark
setTheme(theme) → sets specific theme

// Behavior
- Reads from localStorage on mount
- Falls back to system preference
- Applies 'dark' class to <html> element
```

---

## Component Architecture

### Form Components

#### VirtualsTradeForm Structure

```
VirtualsTradeForm
├── State
│   ├── incBlocks: NodeBlock[]      # INC configurations
│   ├── decBlocks: NodeBlock[]      # DEC configurations
│   ├── incNotes: TradeNote[]       # Notes for INCs
│   └── decNotes: TradeNote[]       # Notes for DECs
│
├── NodeBlock Interface
│   ├── id: string
│   ├── location: string            # Selected node ID
│   ├── selectedHours: number[]     # [1, 2, 3, ...]
│   ├── segments: number            # Number of price columns
│   └── rows: BidRow[]              # Price/MW data per hour
│
├── Rendering
│   ├── INC Section
│   │   └── For each incBlock → renderBlockGrid()
│   ├── DEC Section
│   │   └── For each decBlock → renderBlockGrid()
│   ├── INC Notes Section
│   └── DEC Notes Section
│
└── Submit Handler
    ├── Validate blocks have data
    ├── Build locationMap (group by node)
    ├── Convert to API payload
    ├── Submit trades
    └── Save notes (if provided)
```

#### Data Transformation

```
Form State                          API Payload
───────────                         ───────────
incBlocks[0]                        trades[0]
  location: "51288"      ───────▶     location: "51288"
  rows: [                             increments: [
    {hour:1, prices:[10], mws:[5]}      {hour:1, price:10, mw:5}
    {hour:2, prices:[12], mws:[5]}      {hour:2, price:12, mw:5}
  ]                                   ]
                                      decrements: []
```

### Display Components

#### TradesList Data Merging

```typescript
// Combines data from multiple sources
const getVirtualTradeData = (trade: VirtualTrade) => {
  const clearedTrade = clearedVirtuals.find(ct => ct.tradeId === trade.id)
  const settledTrade = settledVirtuals.find(st => st.tradeId === trade.id)
  
  return {
    status: clearedTrade?.status || 'PENDING',
    clearedMw: settledTrade?.clearedMw ?? clearedTrade?.mw ?? null,
    pnl: settledTrade?.pnl ?? null,
    daLmp: settledTrade?.daLmp ?? clearedTrade?.daLmp ?? null,
    rtLmp: settledTrade?.totalLmpRt ?? null,
    isSettled: !!settledTrade,
  }
}
```

---

## Form Handling

### Segment Grid System

The trade forms use a dynamic grid system for entering bids:

```
┌─────┬─────────┬─────────┬─────────┬───┐
│ HE  │  Seg 1  │  Seg 2  │  Seg 3  │ + │  ← Add segment
├─────┼─────────┼─────────┼─────────┼───┤
│  1  │ Price   │ Price   │ Price   │   │
│  ▼  │ MW      │ MW      │ MW      │   │
├─────┼─────────┼─────────┼─────────┼───┤
│  2  │ Price   │ Price   │ Price   │   │
│     │ MW      │ MW      │ MW      │   │
└─────┴─────────┴─────────┴─────────┴───┘
```

### Row Data Structure

```typescript
interface BidRow {
  hour: number
  prices: number[]  // One per segment
  mws: number[]     // One per segment
}

// Example: Hour 1 with 3 segments
{
  hour: 1,
  prices: [25.50, 30.00, 35.00],
  mws: [10, 5, 5]
}
```

### Conversion to API Format

```typescript
// Flatten segments into individual trades
function rowsToIncrements(rows: BidRow[], segments: number) {
  const increments = []
  for (const row of rows) {
    for (let seg = 0; seg < segments; seg++) {
      const price = row.prices[seg]
      const mw = row.mws[seg]
      if (mw > 0) {  // Only include non-zero MW
        increments.push({
          hour: row.hour,
          price: price || 0,
          mw: mw
        })
      }
    }
  }
  return increments
}
```

---

## Error Handling

### API Error Detection

```typescript
// Check for HTML error pages (common when API is down)
function isHtmlError(text: string): boolean {
  return text.trim().startsWith('<') || 
         text.includes('<!DOCTYPE') || 
         text.includes('<html')
}

// Usage in API calls
const response = await fetch(url)
if (!response.ok) {
  const error = await response.text()
  if (isHtmlError(error)) {
    throw new Error('API endpoint not available')
  }
  throw new Error(error || 'Request failed')
}
```

### Form Validation

```typescript
// Check if a block has valid data
const blockHasData = (block: NodeBlock): boolean => {
  if (!block.location) return false
  return block.rows.some(row => 
    row.mws.some(mw => mw > 0)  // At least one non-zero MW
  )
}

// Validation before submit
const isValid = useMemo(() => {
  const hasIncData = incBlocks.some(blockHasData)
  const hasDecData = decBlocks.some(blockHasData)
  return hasIncData || hasDecData
}, [incBlocks, decBlocks])
```

### User Feedback

```typescript
// Message state pattern used across components
const [message, setMessage] = useState<{
  type: 'success' | 'error'
  text: string
} | null>(null)

// Display
{message && (
  <div className={message.type === 'success' 
    ? 'bg-green-50 text-green-700' 
    : 'bg-red-50 text-red-700'
  }>
    {message.text}
  </div>
)}
```

---

## Performance Optimizations

### Node Caching

Nodes are fetched once and cached in NodesContext to avoid repeated API calls.

### Parallel API Calls

```typescript
// Fetch multiple data sources in parallel
const [virtuals, utc, tradeData] = await Promise.all([
  fetchTrades('virtuals', token, date),
  fetchTrades('utc', token, date),
  fetchAllTradeData(token, date),
])
```

### Batched Analytics Fetching

For analytics dashboard (date range queries):

```typescript
const batchSize = 2  // 2 dates per batch = 8 concurrent requests
const batchDelay = 200  // ms between batches

for (let i = 0; i < dates.length; i += batchSize) {
  const batch = dates.slice(i, i + batchSize)
  await Promise.all(batch.flatMap(date => [
    fetchTradesByStatus(token, date, 'virtuals', 'settled'),
    fetchTradesByStatus(token, date, 'virtuals', 'cleared'),
    fetchTradesByStatus(token, date, 'utc', 'settled'),
    fetchTradesByStatus(token, date, 'utc', 'cleared'),
  ]))
  
  if (i + batchSize < dates.length) {
    await delay(batchDelay)  // Throttle to prevent server overload
  }
}
```

---

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Pages | `page.tsx` | `app/dashboard/page.tsx` |
| API Routes | `route.ts` | `app/api/ender/route.ts` |
| Components | PascalCase | `TradesList.tsx` |
| Contexts | PascalCase + Context | `AuthContext.tsx` |
| Utilities | camelCase | `export.ts` |
| API Clients | camelCase | `virtuals.ts` |
