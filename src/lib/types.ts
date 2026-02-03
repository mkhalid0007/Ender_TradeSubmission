// Authentication Types
export interface LoginRequest {
  login: string
  password: string
}

export interface AuthTokens {
  tokenType: string
  expiresIn: number
  accessToken: string
  idToken: string
  refreshToken: string
}

export interface RefreshRequest {
  refreshToken: string
}

// PJM Virtual Trade Types
export interface BidSegment {
  id: number
  mw: number
  price: number
}

export interface VirtualIncrement {
  hour: number
  bidSegment: BidSegment
}

export interface VirtualDecrement {
  hour: number
  bidSegment: BidSegment
}

export interface VirtualTrade {
  location: string
  increments: VirtualIncrement[]
  decrements: VirtualDecrement[]
}

export interface VirtualTradesRequest {
  trades: VirtualTrade[]
}

// PJM UTC Trade Types
export interface UTCHour {
  hour: number
  price: number
  mw: number
}

export interface UTCTrade {
  sourceLocation: string
  sinkLocation: string
  hours: UTCHour[]
}

export interface UTCTradesRequest {
  trades: UTCTrade[]
}

// Delete Response
export interface DeleteResponse {
  traderEmail: string
  location: number
  tradeDate: string
  success: boolean
  message: string
}

// API Error
export interface ApiError {
  message: string
  status: number
}

// Trade Types for display
export type MarketType = 'virtuals' | 'utc'

export interface TradeQueryParams {
  market: MarketType
  accountId: string
  date: string
}
