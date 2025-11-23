import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { generateShareLink, copyToClipboard } from '../shareLink'
import { exportAsJSON, triggerJSONImport } from '../jsonExport'
import { clearAllData } from '../devTools'
import { generateCSVExport, downloadCSV, generateFilename } from '../../features/export/CSVExporter'
import { storage } from '../../core/storage'
import { useScenarioData } from '../../features/scenarios/hooks/useScenarioData'
import ConfirmModal from './ConfirmModal'

function Navigation() {
  const location = useLocation()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notification, setNotification] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)
  const { scenarios, activeScenarioId, setActiveScenario } = useScenarioData()

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/personal-details', label: 'Personal' },
    { path: '/income', label: 'Income' },
    { path: '/expenses', label: 'Expenses' },
    { path: '/taxes', label: 'Taxes' },
    { path: '/investments-debt', label: 'Investments' },
    { path: '/scenarios', label: 'Scenarios' },
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

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold text-gray-900">
            💰 Finance Project
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

            {/* Scenario Switcher */}
            <div className="flex items-center space-x-2 ml-4 pl-4 border-l border-gray-200">
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
            </div>
          </div>

          {/* Tools Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
            >
              ⚙️ Tools
            </button>

            {dropdownOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setDropdownOpen(false)}
                />

                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                  <div className="py-1">
                    {/* Data Management Section */}
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                      Data Management
                    </div>
                    <button
                      onClick={handleShareLink}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      📋 Copy Share Link
                    </button>
                    <button
                      onClick={handleExportJSON}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      📥 Export JSON
                    </button>
                    <button
                      onClick={handleImportJSON}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      📤 Import JSON
                    </button>

                    {/* Developer Tools Section */}
                    <div className="border-t border-gray-200 mt-1 pt-1">
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                        Developer Tools
                      </div>
                      <button
                        onClick={handleClearData}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        🗑️ Clear All Data
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
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
