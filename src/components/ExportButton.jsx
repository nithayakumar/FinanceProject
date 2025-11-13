/**
 * Export Button Component
 * Triggers CSV export generation and download
 */

import { useState } from 'react'
import { generateCSVExport, downloadCSV, generateFilename } from '../features/export/CSVExporter'

export default function ExportButton({ appData }) {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState(null)

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)

    try {
      console.log('Starting CSV export...')

      // Generate CSV
      const csv = generateCSVExport(appData)

      // Generate filename
      const filename = generateFilename(appData.profile)

      // Download
      downloadCSV(csv, filename)

      console.log('Export completed successfully')
    } catch (err) {
      console.error('Export failed:', err)
      setError(err.message || 'Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleExport}
        disabled={isExporting}
        className={`px-4 py-2 rounded-md font-medium transition ${
          isExporting
            ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
            : 'bg-green-600 text-white hover:bg-green-700'
        }`}
        title="Export all financial projections to CSV"
      >
        {isExporting ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Generating...
          </span>
        ) : (
          'Export CSV'
        )}
      </button>

      {error && (
        <div className="absolute top-full mt-2 right-0 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm whitespace-nowrap z-10">
          {error}
        </div>
      )}
    </div>
  )
}
