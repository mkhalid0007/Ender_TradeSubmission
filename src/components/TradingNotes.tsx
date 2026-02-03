"use client"

import React, { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { fetchNotes, saveNotes, deleteNote, NoteTradeType, NoteItem } from '@/lib/api/notes'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  RefreshCw, 
  Save, 
  Plus, 
  Trash2, 
  StickyNote, 
  Calendar,
  FileText
} from 'lucide-react'
import { getTomorrowDate } from '@/lib/utils'

interface NoteEntry {
  tag: string
  text: string
  isNew?: boolean
}

export function TradingNotes() {
  const { traderToken } = useAuth()
  
  const [selectedDate, setSelectedDate] = useState(getTomorrowDate())
  const [tradeType, setTradeType] = useState<NoteTradeType>('virtual')
  
  const [notes, setNotes] = useState<NoteEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  // Load notes
  const loadNotes = useCallback(async () => {
    if (!traderToken) return
    
    setIsLoading(true)
    setError(null)
    setMessage(null)
    
    try {
      const response = await fetchNotes(traderToken, selectedDate, tradeType)
      
      // Convert notes map to array
      const notesArray: NoteEntry[] = Object.entries(response.notes || {}).map(([tag, text]) => ({
        tag,
        text,
      }))
      
      setNotes(notesArray)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes')
      setNotes([])
    } finally {
      setIsLoading(false)
    }
  }, [traderToken, selectedDate, tradeType])

  // Auto-load on mount and when date/type changes
  useEffect(() => {
    if (traderToken) {
      loadNotes()
    }
  }, [traderToken, selectedDate, tradeType, loadNotes])

  // Add a new empty note
  const addNote = () => {
    const newTag = `note_${Date.now()}`
    setNotes(prev => [...prev, { tag: newTag, text: '', isNew: true }])
  }

  // Update a note's tag or text
  const updateNote = (index: number, field: 'tag' | 'text', value: string) => {
    setNotes(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  // Remove a note locally
  const removeNoteLocally = (index: number) => {
    setNotes(prev => prev.filter((_, i) => i !== index))
  }

  // Delete a note from the server
  const handleDeleteNote = async (index: number) => {
    if (!traderToken) return
    
    const note = notes[index]
    
    // If it's a new note (not saved yet), just remove locally
    if (note.isNew) {
      removeNoteLocally(index)
      return
    }
    
    try {
      await deleteNote(traderToken, selectedDate, note.tag, tradeType)
      removeNoteLocally(index)
      setMessage({ type: 'success', text: `Note "${note.tag}" deleted` })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to delete note' })
    }
  }

  // Save all notes
  const handleSaveNotes = async () => {
    if (!traderToken) return
    
    // Filter out empty notes and validate
    const validNotes = notes.filter(n => n.tag.trim() && n.text.trim())
    
    if (validNotes.length === 0) {
      setMessage({ type: 'error', text: 'No valid notes to save. Add a tag and text.' })
      return
    }
    
    // Check for duplicate tags
    const tags = validNotes.map(n => n.tag.trim())
    const uniqueTags = new Set(tags)
    if (uniqueTags.size !== tags.length) {
      setMessage({ type: 'error', text: 'Duplicate tags found. Each note must have a unique tag.' })
      return
    }
    
    setIsSaving(true)
    setMessage(null)
    
    try {
      // Convert to array of { tag, text }
      const notesArray: NoteItem[] = validNotes.map(n => ({
        tag: n.tag.trim(),
        text: n.text.trim(),
      }))
      
      await saveNotes(traderToken, selectedDate, notesArray, tradeType)
      
      // Mark all notes as not new
      setNotes(validNotes.map(n => ({ ...n, isNew: false })))
      
      setMessage({ type: 'success', text: `${validNotes.length} note(s) saved successfully!` })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save notes' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            Trading Notes
          </CardTitle>
          <CardDescription>
            Store notes and context for your trading decisions. Notes are tagged for easy organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="noteDate">Trade Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="noteDate"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-44 pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tradeType">Trade Type</Label>
              <select
                id="tradeType"
                value={tradeType}
                onChange={(e) => setTradeType(e.target.value as NoteTradeType)}
                className="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="virtual">Virtuals</option>
                <option value="utc">UTC</option>
              </select>
            </div>
            
            <Button variant="outline" onClick={loadNotes} disabled={isLoading}>
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
          
          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}
          
          {message && (
            <div className={`p-3 rounded-md text-sm ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notes for {selectedDate} ({tradeType === 'virtual' ? 'Virtuals' : 'UTC'})
            </CardTitle>
            <CardDescription>
              {notes.length === 0 ? 'No notes yet' : `${notes.length} note(s)`}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addNote}>
              <Plus className="h-4 w-4 mr-1" />
              Add Note
            </Button>
            <Button size="sm" onClick={handleSaveNotes} disabled={isSaving || notes.length === 0}>
              {isSaving ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <StickyNote className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No notes for this date.</p>
              <p className="text-sm mt-1">Click &quot;Add Note&quot; to create one.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map((note, index) => (
                <div 
                  key={`${note.tag}-${index}`} 
                  className={`border rounded-lg p-4 space-y-3 ${note.isNew ? 'border-blue-300 bg-blue-50/50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Label htmlFor={`tag-${index}`} className="text-xs text-muted-foreground">
                        Tag (identifier)
                      </Label>
                      <Input
                        id={`tag-${index}`}
                        value={note.tag}
                        onChange={(e) => updateNote(index, 'tag', e.target.value)}
                        placeholder="e.g., strategy, analysis, reminder"
                        className="mt-1"
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-5"
                      onClick={() => handleDeleteNote(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div>
                    <Label htmlFor={`text-${index}`} className="text-xs text-muted-foreground">
                      Note Content
                    </Label>
                    <textarea
                      id={`text-${index}`}
                      value={note.text}
                      onChange={(e) => updateNote(index, 'text', e.target.value)}
                      placeholder="Enter your trading notes, analysis, or decision context..."
                      rows={3}
                      className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                    />
                  </div>
                  
                  {note.isNew && (
                    <p className="text-xs text-blue-600">New note - not saved yet</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
