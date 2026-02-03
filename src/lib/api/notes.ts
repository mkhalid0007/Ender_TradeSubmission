import { REPORTING_PROXY_URL } from './config'

// Notes response structure from API
// Notes are returned as a map: tag -> text
export interface NotesResponse {
  market: string
  type: string
  tradeDate: string
  notes: Record<string, string>  // { tag: text, tag2: text2, ... }
}

// Trade type for notes endpoint (virtual or utc)
export type NoteTradeType = 'virtual' | 'utc'

// Fetch notes for a specific market, type, and date
// GET /api/v1/reporting/notes/{market}/{type}?tradeDate=YYYY-MM-DD
export async function fetchNotes(
  traderToken: string,
  tradeDate: string,
  type: NoteTradeType = 'virtual',
  market: string = 'pjm'
): Promise<NotesResponse> {
  const params = new URLSearchParams({
    traderToken,
    market,
    type,
    tradeDate,
  })

  const response = await fetch(`${REPORTING_PROXY_URL}/notes?${params}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || 'Failed to fetch notes')
  }

  return response.json()
}

// Note item for saving
export interface NoteItem {
  tag: string
  text: string
}

// Create or update notes (batch upsert)
// POST /api/v1/reporting/notes/{market}/{type}?tradeDate=YYYY-MM-DD
// Body: [ { tag: "thesis", text: "..." }, { tag: "macro", text: "..." } ]
export async function saveNotes(
  traderToken: string,
  tradeDate: string,
  notes: NoteItem[],  // Array of { tag, text }
  type: NoteTradeType = 'virtual',
  market: string = 'pjm'
): Promise<NotesResponse> {
  const response = await fetch(`${REPORTING_PROXY_URL}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      traderToken,
      market,
      type,
      tradeDate,
      notes,  // Array of { tag, text }
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || 'Failed to save notes')
  }

  return response.json()
}

// Delete a note by tag
// DELETE /api/v1/reporting/notes/{market}/{type}?tag=tagName&tradeDate=YYYY-MM-DD
export async function deleteNote(
  traderToken: string,
  tradeDate: string,
  tag: string,
  type: NoteTradeType = 'virtual',
  market: string = 'pjm'
): Promise<void> {
  const response = await fetch(`${REPORTING_PROXY_URL}/notes`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      traderToken,
      market,
      type,
      tradeDate,
      tag,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || 'Failed to delete note')
  }
}
