// CSV Export utilities

/**
 * Convert an array of objects to CSV string
 */
export function objectsToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns?: { key: keyof T; header: string }[]
): string {
  if (data.length === 0) return ''

  // Use provided columns or generate from object keys
  const headers = columns 
    ? columns.map(c => c.header)
    : Object.keys(data[0])
  
  const keys = columns 
    ? columns.map(c => c.key)
    : Object.keys(data[0]) as (keyof T)[]

  // Create header row
  const headerRow = headers.map(h => `"${h}"`).join(',')

  // Create data rows
  const rows = data.map(item => 
    keys.map(key => {
      const value = item[key]
      // Handle different types
      if (value === null || value === undefined) return ''
      if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`
      if (typeof value === 'number') return value.toString()
      if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
      return `"${String(value).replace(/"/g, '""')}"`
    }).join(',')
  )

  return [headerRow, ...rows].join('\n')
}

/**
 * Download a CSV file
 */
export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

/**
 * Export data to CSV file
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; header: string }[]
) {
  const csv = objectsToCSV(data, columns)
  downloadCSV(csv, filename)
}

/**
 * Format date for filenames
 */
export function formatDateForFilename(date: string): string {
  return date.replace(/-/g, '')
}
