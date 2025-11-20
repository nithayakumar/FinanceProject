/**
 * ShareLinkLoader component
 * Checks for shared state in URL on mount and prompts user to load it
 */

import { useEffect, useState } from 'react'
import { hasSharedState, loadStateFromURL, clearShareHash } from '../shareLink'
import { storage } from '../../core/storage'
import ConfirmModal from './ConfirmModal'

function ShareLinkLoader() {
  const [showModal, setShowModal] = useState(false)
  const [sharedData, setSharedData] = useState(null)

  useEffect(() => {
    // Check for shared state in URL
    if (hasSharedState()) {
      console.log('🔗 Detected shared state in URL')

      const data = loadStateFromURL()

      if (data) {
        setSharedData(data)
        setShowModal(true)
      } else {
        console.error('❌ Failed to load shared state from URL')
        clearShareHash()
      }
    }
  }, [])

  const handleConfirm = () => {
    if (sharedData) {
      storage.importAll(sharedData)
      console.log('✅ Loaded shared data into localStorage')
      clearShareHash()
      // Reload to refresh all components with new data
      window.location.reload()
    }
  }

  const handleCancel = () => {
    clearShareHash()
    setShowModal(false)
  }

  return (
    <ConfirmModal
      isOpen={showModal}
      title="Load Shared Data"
      message="This link contains shared financial data. Would you like to load it?

Note: This will replace your current data. Make sure to export your current data first if you want to keep it."
      type="info"
      confirmText="Load Data"
      cancelText="Cancel"
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  )
}

export default ShareLinkLoader
