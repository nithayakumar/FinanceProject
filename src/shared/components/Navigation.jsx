import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { generateShareLink, copyToClipboard } from '../shareLink'
import { exportAsJSON, triggerJSONImport } from '../jsonExport'
import { clearAllData } from '../devTools'
import { generateCSVExport, downloadCSV, generateFilename } from '../../features/export/CSVExporter'
import { storage } from '../../core/storage'
import { calculateIncomeProjections } from '../../features/income/Income.calc'
import { calculateExpenseProjections } from '../../features/expenses/Expenses.calc'
import { calculateGapProjections } from '../../features/gap/Gap.calc'
// DISABLED: Scenarios feature
// import { useScenarioData } from '../../features/scenarios/hooks/useScenarioData'
import ConfirmModal from './ConfirmModal'

function Navigation() {
  const location = useLocation()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notification, setNotification] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)
  // DISABLED: Scenarios feature
  // const { scenarios, activeScenarioId, setActiveScenario } = useScenarioData()

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/personal-details', label: 'Personal' },
    { path: '/income', label: 'Income' },
    { path: '/expenses', label: 'Expenses' },
    { path: '/investments', label: 'Investments' },
    { path: '/taxes', label: 'Taxes' },
    // DISABLED: Scenarios feature
    // { path: '/scenarios', label: 'Scenarios' },
  ]

  const colorMap = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    purple: 'bg-purple-600',
    gray: 'bg-gray-600'
  }

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleShareLink = async () => {
    try {
      const shareUrl = generateShareLink()
      await copyToClipboard(shareUrl)
      showNotification('Share link copied to clipboard!')
      setDropdownOpen(false)
    } catch (error) {
      showNotification(error.message || 'Failed to generate share link', 'error')
    }
  }

  const handleExportJSON = () => {
    try {
      exportAsJSON()
      showNotification('Data exported as JSON!')
      setDropdownOpen(false)
    } catch (error) {
      showNotification(error.message || 'Failed to export JSON', 'error')
    }
  }

  const handleImportJSON = async () => {
    setDropdownOpen(false)
    setConfirmModal({
      title: 'Import Data',
      message: 'Import will replace all current data. Continue?',
      type: 'warning',
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          await triggerJSONImport(false)
          // Page will reload after import
        } catch (error) {
          if (error.message !== 'Import cancelled') {
            showNotification(error.message || 'Failed to import JSON', 'error')
          }
        }
      },
      onCancel: () => setConfirmModal(null)
    })
  }

  const handleClearData = () => {
    setDropdownOpen(false)
    setConfirmModal({
      title: 'Clear All Data',
      message: 'This will delete ALL your data. Are you sure?',
      type: 'danger',
      confirmText: 'Delete All',
      onConfirm: () => {
        setConfirmModal(null)
        clearAllData()
        // Page will reload after clear
      },
      onCancel: () => setConfirmModal(null)
    })
  }

  const handleExportCSV = () => {
    setDropdownOpen(false)
    try {
      // Load data from storage
      const profile = storage.load('profile')
      const incomeData = storage.load('income')
      const expensesData = storage.load('expenses')
      const investmentsData = storage.load('investmentsDebt')

      // Validate required data
      if (!profile || !incomeData || !expensesData || !investmentsData) {
        showNotification('Missing required data for export. Please complete all sections first.', 'error')
        return
      }

      // Enrich profile
      const enrichedProfile = {
        ...profile,
        yearsToRetirement: profile.retirementAge - profile.age,
        currentAge: profile.age
      }

      // Calculate projections
      const incomeProjections = calculateIncomeProjections(incomeData, enrichedProfile)
      const expenseProjections = calculateExpenseProjections(expensesData, enrichedProfile, incomeProjections.projections)

      const incomeWithProjections = {
        ...incomeData,
        projections: incomeProjections.projections
      }
      const expensesWithProjections = {
        ...expensesData,
        projections: expenseProjections.projections
      }
      const gapProjections = calculateGapProjections(incomeWithProjections, expensesWithProjections, investmentsData, enrichedProfile)

      // Build data object
      const data = {
        profile: enrichedProfile,
        incomeData,
        expensesData,
        investmentsData,
        incomeProjections,
        expenseProjections,
        gapProjections
      }

      // Generate and download CSV
      const csv = generateCSVExport(data)
      const filename = generateFilename(enrichedProfile)
      downloadCSV(csv, filename)

      showNotification('CSV exported successfully!')
    } catch (error) {
      console.error('CSV export failed:', error)
      showNotification(error.message || 'Failed to export CSV', 'error')
    }
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold text-gray-900">
            💰 Net Worth Project
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            {navItems.slice(1).map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${location.pathname === item.path
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                {item.label}
              </Link>
            ))}

            {/* DISABLED: Scenario Switcher */}
            {/* <div className="flex items-center space-x-2 ml-4 pl-4 border-l border-gray-200">
              <span className="text-xs font-medium text-gray-500 uppercase hidden lg:inline">Scenario</span>
              {scenarios.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveScenario(s.id)}
                  className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${activeScenarioId === s.id
                    ? `${colorMap[s.color] || 'bg-gray-600'} text-white shadow-sm ring-2 ring-offset-1 ring-${s.color}-200`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  title={s.name}
                >
                  {s.id}
                </button>
              ))}
            </div> */}
          </div>

          {/* Actions Area */}
          <div className="flex items-center space-x-2">
            {/* Share Link Button */}
            <button
              onClick={handleShareLink}
              className="p-2 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition"
              title="Copy Share Link"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>

            {/* Tools Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
                title="Tools"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {dropdownOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setDropdownOpen(false)}
                  />

                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                    <div className="py-1">
                      <button
                        onClick={handleExportCSV}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <span>📊</span> Export CSV
                      </button>
                      <button
                        onClick={handleExportJSON}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <span>💾</span> Save (Export JSON)
                      </button>
                      <button
                        onClick={handleImportJSON}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <span>📂</span> Load (Import JSON)
                      </button>

                      <div className="border-t border-gray-100 my-1"></div>

                      <button
                        onClick={handleClearData}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <span>🗑️</span> Clear All Data
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`px-6 py-3 rounded-md shadow-lg ${notification.type === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-green-500 text-white'
              }`}
          >
            {notification.message}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <ConfirmModal
          isOpen={true}
          title={confirmModal.title}
          message={confirmModal.message}
          type={confirmModal.type}
          confirmText={confirmModal.confirmText}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
        />
      )}
    </nav>
  )
}

export default Navigation
