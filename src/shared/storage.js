/**
 * localStorage wrapper for easy data persistence
 * All data is stored as JSON in localStorage
 */

export const storage = {
  /**
   * Save data to localStorage
   * @param {string} key - Storage key
   * @param {any} data - Data to save (will be JSON stringified)
   */
  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data))
      console.log(`✅ Saved ${key}:`, data)
    } catch (error) {
      console.error(`❌ Error saving ${key}:`, error)
    }
  },

  /**
   * Load data from localStorage
   * @param {string} key - Storage key
   * @returns {any} Parsed data or null if not found
   */
  load(key) {
    try {
      const data = localStorage.getItem(key)
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
      investmentsDebt: this.load('investments-debt'),
      scenarios: this.load('scenarios') || []
    }
  },

  /**
   * Import data from a JSON object
   * @param {object} data - Data object with profile, income, expenses, etc.
   */
  importAll(data) {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        // Convert camelCase to kebab-case for consistency
        const storageKey = key === 'investmentsDebt' ? 'investments-debt' : key
        this.save(storageKey, value)
      }
    })
    console.log('✅ Data imported successfully')
  },

  /**
   * Clear all app data from localStorage
   */
  clearAll() {
    const keys = ['profile', 'income', 'expenses', 'investments-debt', 'scenarios']
    keys.forEach(key => localStorage.removeItem(key))
    console.log('✅ All data cleared')
  }
}
