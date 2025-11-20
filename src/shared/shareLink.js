/**
 * Share Link utilities for encoding/decoding app state to URL
 * Uses lz-string for compression to keep URLs reasonably short
 */

import LZString from 'lz-string'
import { storage } from '../core/storage'

/**
 * Generate a shareable link with compressed state in URL hash
 * @returns {string} Full URL with encoded state
 */
export function generateShareLink() {
  try {
    // Export all data
    const data = storage.exportAll()

    // Convert to JSON string
    const jsonString = JSON.stringify(data)

    // Compress using lz-string (URI-safe base64)
    const compressed = LZString.compressToEncodedURIComponent(jsonString)

    // Create URL with hash
    const baseUrl = window.location.origin + window.location.pathname
    const shareUrl = `${baseUrl}#share=${compressed}`

    console.log('📋 Share link generated:', {
      originalSize: `${(jsonString.length / 1024).toFixed(2)} KB`,
      compressedSize: `${(compressed.length / 1024).toFixed(2)} KB`,
      compressionRatio: `${((1 - compressed.length / jsonString.length) * 100).toFixed(1)}%`,
      urlLength: shareUrl.length
    })

    return shareUrl
  } catch (error) {
    console.error('❌ Error generating share link:', error)
    throw new Error('Failed to generate share link')
  }
}

/**
 * Check if current URL contains shared state
 * @returns {boolean} True if share data is present in URL hash
 */
export function hasSharedState() {
  const hash = window.location.hash
  return hash.startsWith('#share=')
}

/**
 * Load state from URL hash if present
 * @returns {object|null} Decoded data object or null if no shared state
 */
export function loadStateFromURL() {
  try {
    const hash = window.location.hash

    if (!hash.startsWith('#share=')) {
      return null
    }

    // Extract compressed data from hash
    const compressed = hash.substring(7) // Remove '#share='

    // Decompress
    const jsonString = LZString.decompressFromEncodedURIComponent(compressed)

    if (!jsonString) {
      console.error('❌ Failed to decompress share link data')
      return null
    }

    // Parse JSON
    const data = JSON.parse(jsonString)

    console.log('✅ Loaded shared state from URL:', {
      keys: Object.keys(data),
      compressedSize: `${(compressed.length / 1024).toFixed(2)} KB`,
      decompressedSize: `${(jsonString.length / 1024).toFixed(2)} KB`
    })

    return data
  } catch (error) {
    console.error('❌ Error loading state from URL:', error)
    return null
  }
}

/**
 * Clear the share hash from URL without page reload
 */
export function clearShareHash() {
  if (window.location.hash.startsWith('#share=')) {
    // Use replaceState to update URL without reload
    history.replaceState(null, '', window.location.pathname)
    console.log('✅ Cleared share hash from URL')
  }
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<void>}
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    console.log('✅ Copied to clipboard')
  } catch (error) {
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    console.log('✅ Copied to clipboard (fallback method)')
  }
}
