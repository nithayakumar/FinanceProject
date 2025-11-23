/**
 * localStorage wrapper for easy data persistence
 * All data is stored as JSON in localStorage
 *
 * FUTURE: This will be replaced with database calls when auth is added
 */

export const storage = {
  /**
   * Get the actual storage key based on active scenario
   * @param {string} key - Base key
   * @param {string} [scenarioId] - Optional scenario ID to force specific scenario
   * @returns {string} Scenario-specific key
   */
  getScenarioKey(key, scenarioId) {
    const SCENARIO_SPECIFIC_KEYS = ['income', 'expenses', 'investmentsDebt', 'taxes', 'taxLadders', 'gap', 'profile']
    if (!SCENARIO_SPECIFIC_KEYS.includes(key)) return key

    try {
      const activeId = scenarioId || localStorage.getItem('activeScenarioId') || '1'
      return activeId === '1' ? key : `${key}_${activeId}`
    } catch (e) {
      return key
    }
  },

  /**
   * Save data to localStorage
   * @param {string} key - Storage key
   * @param {any} data - Data to save (will be JSON stringified)
   * @param {string} [scenarioId] - Optional scenario ID
   */
  save(key, data, scenarioId) {
    try {
      const actualKey = this.getScenarioKey(key, scenarioId)
      localStorage.setItem(actualKey, JSON.stringify(data))
      // console.log(`✅ Saved ${actualKey}:`, data) // Commented out to reduce console spam

      // Update last modified timestamp for Dashboard refresh detection
      localStorage.setItem('lastModified', Date.now().toString())

      // Dispatch custom event for same-tab updates (native storage event doesn't fire in same tab)
      window.dispatchEvent(new CustomEvent('localStorageChange', {
        detail: { key, data, scenarioKey: actualKey }
      }))
    } catch (error) {
      console.error(`❌ Error saving ${key}:`, error)
    }
  },

  /**
   * Load data from localStorage
   * @param {string} key - Storage key
   * @param {string} [scenarioId] - Optional scenario ID
   * @returns {any} Parsed data or null if not found
   */
  load(key, scenarioId) {
    try {
      const actualKey = this.getScenarioKey(key, scenarioId)
      const data = localStorage.getItem(actualKey)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error(`❌ Error loading ${key}:`, error)
      return null
    }
  },

  /**
   * Export all app data as a JSON object
   * @returns {object} All stored data
   */
  exportAll() {
    return {
      profile: this.load('profile'),
      income: this.load('income'),
      expenses: this.load('expenses'),
      investmentsDebt: this.load('investmentsDebt'),
      taxes: this.load('taxes'),
      taxLadders: this.load('taxLadders'),
      scenarios: this.load('scenarios') || [],
      filingStatusRemapping: this.load('filingStatusRemapping'),
      customTaxLadder: this.load('customTaxLadder')
    }
  },

  /**
   * Import data from a JSON object
   * @param {object} data - Data object with profile, income, expenses, etc.
   */
  importAll(data) {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        this.save(key, value)
      }
    })
    console.log('✅ Data imported successfully')
  },

  /**
   * Clear all app data from localStorage
   */
  clearAll() {
    // Clear all keys from localStorage (including scenario-specific ones)
    localStorage.clear()
    console.log('✅ All data cleared')
  }
}
