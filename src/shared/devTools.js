/**
 * Developer Tools utilities
 * Provides testing helpers like clearing data
 */

import { storage } from '../core/storage'

/**
 * Clear all application data from localStorage
 */
export function clearAllData() {
  try {
    storage.clearAll()
    console.log('✅ All data cleared')

    // Reload page to reset app state
    window.location.reload()
  } catch (error) {
    console.error('❌ Error clearing data:', error)
    throw new Error('Failed to clear data')
  }
}
