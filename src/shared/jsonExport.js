/**
 * JSON Import/Export utilities
 * Handles downloading and uploading app data as JSON files
 */

import { storage } from '../core/storage'

/**
 * Export all data as JSON file download
 * @param {string} filename - Optional custom filename
 */
export function exportAsJSON(filename = null) {
  try {
    // Get all data
    const allData = storage.exportAll()

    // DISABLED: Scenarios feature - remove scenarios from export
    const { scenarios, ...data } = allData

    // Convert to formatted JSON
    const jsonString = JSON.stringify(data, null, 2)

    // Generate filename with timestamp if not provided
    const defaultFilename = `finance-project-${new Date().toISOString().split('T')[0]}.json`
    const finalFilename = filename || defaultFilename

    // Create blob and download
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = finalFilename
    link.style.display = 'none'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Cleanup
    setTimeout(() => URL.revokeObjectURL(url), 100)

    console.log('✅ Exported data as JSON:', {
      filename: finalFilename,
      size: `${(jsonString.length / 1024).toFixed(2)} KB`,
      keys: Object.keys(data)
    })

    return true
  } catch (error) {
    console.error('❌ Error exporting JSON:', error)
    throw new Error('Failed to export data as JSON')
  }
}

/**
 * Import data from JSON file
 * @param {File} file - JSON file to import
 * @returns {Promise<object>} Imported data object
 */
export async function importFromJSON(file) {
  try {
    // Validate file type
    if (!file.name.endsWith('.json')) {
      throw new Error('Please select a valid JSON file')
    }

    // Read file
    const text = await file.text()

    // Parse JSON
    let data
    try {
      data = JSON.parse(text)
    } catch (parseError) {
      throw new Error('Invalid JSON file format')
    }

    // Validate data structure
    // DISABLED: Scenarios feature - removed 'scenarios' from valid keys
    const validKeys = ['profile', 'income', 'expenses', 'investmentsDebt', 'taxes', 'taxLadders', 'filingStatusRemapping', 'customTaxLadder']
    const dataKeys = Object.keys(data)
    const hasValidKeys = dataKeys.some(key => validKeys.includes(key))

    if (!hasValidKeys) {
      throw new Error('JSON file does not contain valid Net Worth Project data')
    }

    console.log('✅ Imported data from JSON:', {
      filename: file.name,
      size: `${(text.length / 1024).toFixed(2)} KB`,
      keys: dataKeys
    })

    return data
  } catch (error) {
    console.error('❌ Error importing JSON:', error)
    throw error
  }
}

/**
 * Load data from JSON and save to localStorage
 * @param {File} file - JSON file to import
 * @param {boolean} merge - If true, merge with existing data. If false, replace all data.
 * @returns {Promise<void>}
 */
export async function importAndLoad(file, merge = false) {
  try {
    const data = await importFromJSON(file)

    if (merge) {
      // Merge with existing data
      const existing = storage.exportAll()
      const merged = { ...existing, ...data }
      storage.importAll(merged)
      console.log('✅ Merged imported data with existing data')
    } else {
      // Replace all data
      storage.importAll(data)
      console.log('✅ Replaced all data with imported data')
    }

    // Trigger page reload to refresh all components
    window.location.reload()
  } catch (error) {
    console.error('❌ Error loading imported data:', error)
    throw error
  }
}

/**
 * Trigger file picker and import JSON
 * @param {boolean} merge - If true, merge with existing data
 * @returns {Promise<void>}
 */
export function triggerJSONImport(merge = false) {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.style.display = 'none'

    input.onchange = async (event) => {
      try {
        const file = event.target.files[0]
        if (!file) {
          reject(new Error('No file selected'))
          return
        }

        await importAndLoad(file, merge)
        resolve()
      } catch (error) {
        reject(error)
      } finally {
        document.body.removeChild(input)
      }
    }

    input.oncancel = () => {
      document.body.removeChild(input)
      reject(new Error('Import cancelled'))
    }

    document.body.appendChild(input)
    input.click()
  })
}
