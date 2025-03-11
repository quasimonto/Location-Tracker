/**
 * storage.js
 * Utility for interacting with localStorage with added features:
 * - Type conversion (JSON parsing/stringifying)
 * - Namespacing to avoid conflicts
 * - Error handling
 * - Expiration support
 * - Storage detection
 */

import { errorHandler, ErrorType, ErrorSeverity } from './errorHandler';

// App namespace to avoid conflicts with other apps
const APP_NAMESPACE = 'locationTracker';

/**
 * Check if localStorage is available
 * @returns {boolean} Whether localStorage is available
 */
export function isStorageAvailable() {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get a namespaced key to avoid conflicts with other apps
 * @param {string} key - Original key
 * @returns {string} Namespaced key
 */
export function getNamespacedKey(key) {
  return `${APP_NAMESPACE}:${key}`;
}

/**
 * Store data in localStorage
 * @param {string} key - The key to store under
 * @param {*} data - The data to store
 * @param {Object} options - Storage options
 * @param {number} options.expiry - Expiration time in milliseconds
 * @returns {boolean} Whether the operation was successful
 */
export function setItem(key, data, options = {}) {
  if (!isStorageAvailable()) {
    errorHandler.handleError(
      'localStorage is not available',
      'Storage',
      ErrorSeverity.WARNING,
      ErrorType.STORAGE
    );
    return false;
  }
  
  try {
    const namespacedKey = getNamespacedKey(key);
    
    const storageItem = {
      data,
      timestamp: Date.now()
    };
    
    // Add expiration if specified
    if (options.expiry) {
      storageItem.expiry = Date.now() + options.expiry;
    }
    
    localStorage.setItem(namespacedKey, JSON.stringify(storageItem));
    return true;
  } catch (error) {
    // Handle quota exceeded or other errors
    errorHandler.handleError(
      error,
      'Storage',
      ErrorSeverity.ERROR,
      ErrorType.STORAGE
    );
    return false;
  }
}

/**
 * Retrieve data from localStorage
 * @param {string} key - The key to retrieve
 * @param {*} defaultValue - Value to return if key is not found
 * @returns {*} The stored data or defaultValue if not found
 */
export function getItem(key, defaultValue = null) {
  if (!isStorageAvailable()) {
    return defaultValue;
  }
  
  try {
    const namespacedKey = getNamespacedKey(key);
    const item = localStorage.getItem(namespacedKey);
    
    if (item === null) {
      return defaultValue;
    }
    
    const parsedItem = JSON.parse(item);
    
    // Check for expiration
    if (parsedItem.expiry && parsedItem.expiry < Date.now()) {
      localStorage.removeItem(namespacedKey);
      return defaultValue;
    }
    
    return parsedItem.data;
  } catch (error) {
    errorHandler.handleError(
      error,
      'Storage',
      ErrorSeverity.WARNING,
      ErrorType.STORAGE
    );
    return defaultValue;
  }
}

/**
 * Remove an item from localStorage
 * @param {string} key - The key to remove
 * @returns {boolean} Whether the operation was successful
 */
export function removeItem(key) {
  if (!isStorageAvailable()) {
    return false;
  }
  
  try {
    const namespacedKey = getNamespacedKey(key);
    localStorage.removeItem(namespacedKey);
    return true;
  } catch (error) {
    errorHandler.handleError(
      error,
      'Storage',
      ErrorSeverity.WARNING,
      ErrorType.STORAGE
    );
    return false;
  }
}

/**
 * Clear all app-specific items from localStorage
 * @returns {boolean} Whether the operation was successful
 */
export function clearAll() {
  if (!isStorageAvailable()) {
    return false;
  }
  
  try {
    // Only remove items with our namespace
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(APP_NAMESPACE)) {
        localStorage.removeItem(key);
      }
    });
    return true;
  } catch (error) {
    errorHandler.handleError(
      error,
      'Storage',
      ErrorSeverity.ERROR,
      ErrorType.STORAGE
    );
    return false;
  }
}

/**
 * Get all keys for app-specific items
 * @returns {Array} Array of keys (without namespace)
 */
export function getAllKeys() {
  if (!isStorageAvailable()) {
    return [];
  }
  
  try {
    return Object.keys(localStorage)
      .filter(key => key.startsWith(`${APP_NAMESPACE}:`))
      .map(key => key.substring(APP_NAMESPACE.length + 1));
  } catch (error) {
    errorHandler.handleError(
      error,
      'Storage',
      ErrorSeverity.WARNING,
      ErrorType.STORAGE
    );
    return [];
  }
}

/**
 * Check if an item exists and is not expired
 * @param {string} key - The key to check
 * @returns {boolean} Whether the item exists
 */
export function hasItem(key) {
  if (!isStorageAvailable()) {
    return false;
  }
  
  try {
    const namespacedKey = getNamespacedKey(key);
    const item = localStorage.getItem(namespacedKey);
    
    if (item === null) {
      return false;
    }
    
    const parsedItem = JSON.parse(item);
    
    // Check for expiration
    if (parsedItem.expiry && parsedItem.expiry < Date.now()) {
      localStorage.removeItem(namespacedKey);
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get information about localStorage usage
 * @returns {Object} Storage usage information
 */
export function getStorageInfo() {
  if (!isStorageAvailable()) {
    return {
      available: false,
      total: 0,
      used: 0,
      remaining: 0,
      items: 0,
      appItems: 0
    };
  }
  
  try {
    // Estimate total localStorage size (typically 5MB)
    const estimatedTotal = 5 * 1024 * 1024;
    
    // Calculate used storage
    let usedSpace = 0;
    let totalItems = 0;
    let appItems = 0;
    
    Object.keys(localStorage).forEach(key => {
      const value = localStorage.getItem(key);
      usedSpace += (key.length + value.length) * 2; // UTF-16 uses 2 bytes per character
      totalItems++;
      
      if (key.startsWith(`${APP_NAMESPACE}:`)) {
        appItems++;
      }
    });
    
    return {
      available: true,
      total: estimatedTotal,
      used: usedSpace,
      remaining: estimatedTotal - usedSpace,
      items: totalItems,
      appItems: appItems
    };
  } catch (error) {
    return {
      available: true,
      error: error.message,
      items: 0,
      appItems: 0
    };
  }
}

// Export a storage API object
const storage = {
  isAvailable: isStorageAvailable,
  setItem,
  getItem,
  removeItem,
  clearAll,
  getAllKeys,
  hasItem,
  getStorageInfo
};

export default storage;