/**
 * Utility functions for exporting data to CSV format
 */

/**
 * Escapes a CSV field value
 */
function escapeCSVField(field: string | number | null | undefined): string {
  if (field === null || field === undefined) {
    return ''
  }
  
  const stringValue = String(field)
  
  // If the field contains comma, quote, or newline, wrap it in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  
  return stringValue
}

/**
 * Converts an array of objects to CSV format
 */
export function convertToCSV(data: Record<string, any>[], headers: string[]): string {
  if (data.length === 0) {
    return headers.join(',')
  }

  // Create header row
  const headerRow = headers.map(escapeCSVField).join(',')

  // Create data rows
  const dataRows = data.map(row => {
    return headers.map(header => escapeCSVField(row[header] || '')).join(',')
  })

  return [headerRow, ...dataRows].join('\n')
}

/**
 * Downloads data as a CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // Add BOM for UTF-8 to ensure proper encoding in Excel
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  // Clean up the URL object
  URL.revokeObjectURL(url)
}

