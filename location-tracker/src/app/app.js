/**
 * App.js
 * Main application initialization and configuration
 */

import { stateManager } from '../services/StateManager';
import { errorHandler, ErrorType, ErrorSeverity } from '../utils/errorHandler';
import { initMapService } from '../services/MapService';
import { createSidebar } from '../ui/components/Sidebar';
import { loadGoogleMapsApi } from '../utils/mapUtils';
import { formManager } from '../ui/components/FormManager';
import { createMapContainer } from '../ui/map';

// Default map configuration
const DEFAULT_CENTER = { lat: 48.2082, lng: 16.3738 }; // Vienna, Austria
const DEFAULT_ZOOM = 13;

// Store global app references
let mapContainer = null;

/**
 * Initialize the application
 */
export async function initApp() {
  try {
    console.log('Initializing Location Tracker application...');
    
    // Set up global error handling for UI
    setupErrorUI();
    
    // Initialize the UI components
    initUI();
    
    // Load Google Maps API and initialize map
    await initMap();
    
    // Load any saved data
    loadSavedData();
    
    // Initialize form manager to handle form events
    initFormManager();
    
    console.log('Application initialized successfully');
  } catch (error) {
    errorHandler.handleError(
      error,
      'Application Initialization',
      ErrorSeverity.CRITICAL,
      ErrorType.UNKNOWN
    );
  }
}

/**
 * Set up error handling UI
 */
function setupErrorUI() {
  // Create container for toast notifications
  const toastContainer = document.createElement('div');
  toastContainer.id = 'toast-container';
  toastContainer.className = 'toast-container';
  document.body.appendChild(toastContainer);
  
  // Listen for errors and display toasts
  errorHandler.addListener((error) => {
    displayErrorToast(error);
  });
}

/**
 * Display an error toast notification
 * @param {Object} error - Error object from errorHandler
 */
function displayErrorToast(error) {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) return;
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${error.severity}`;
  
  // Create toast content
  toast.innerHTML = `
    <div class="toast-header">
      <span class="toast-icon">${getSeverityIcon(error.severity)}</span>
      <span class="toast-title">${getSeverityTitle(error.severity)}</span>
      <button class="toast-close">×</button>
    </div>
    <div class="toast-body">
      ${error.message}
    </div>
  `;
  
  // Add dismiss button handler
  const closeButton = toast.querySelector('.toast-close');
  closeButton.addEventListener('click', () => {
    toast.classList.add('toast-hiding');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300); // Match CSS transition duration
  });
  
  // Add to container
  toastContainer.appendChild(toast);
  
  // Auto-dismiss after delay (except for critical errors)
  if (error.severity !== ErrorSeverity.CRITICAL) {
    const duration = error.severity === ErrorSeverity.WARNING ? 5000 : 3000;
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('toast-hiding');
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 300);
      }
    }, duration);
  }
}

/**
 * Get icon for error severity
 * @param {string} severity - Error severity
 * @returns {string} Icon HTML
 */
function getSeverityIcon(severity) {
  switch (severity) {
    case ErrorSeverity.INFO:
      return '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"></path></svg>';
    case ErrorSeverity.WARNING:
      return '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"></path></svg>';
    case ErrorSeverity.CRITICAL:
      return '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path></svg>';
    case ErrorSeverity.ERROR:
    default:
      return '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path></svg>';
  }
}

/**
 * Get title for error severity
 * @param {string} severity - Error severity
 * @returns {string} Title text
 */
function getSeverityTitle(severity) {
  switch (severity) {
    case ErrorSeverity.INFO:
      return 'Information';
    case ErrorSeverity.WARNING:
      return 'Warning';
    case ErrorSeverity.CRITICAL:
      return 'Critical Error';
    case ErrorSeverity.ERROR:
    default:
      return 'Error';
  }
}

/**
 * Initialize the user interface
 */
function initUI() {
  console.log('Initializing UI components...');
  
  // Initialize sidebar
  const sidebarContainer = document.getElementById('sidebar');
  if (sidebarContainer) {
    createSidebar(sidebarContainer);
  } else {
    errorHandler.handleError(
      new Error('Sidebar container not found'),
      'UI Initialization',
      ErrorSeverity.ERROR,
      ErrorType.UNKNOWN
    );
  }
  
  // Initialize other UI components
  // This will be expanded as we implement more components
}
  
/**
 * Initialize Form Manager
 */
function initFormManager() {
  console.log('Initializing Form Manager...');
  
  // FormManager constructor sets up event subscriptions
  // No additional setup needed as it's handled in the FormManager class
}


/**
 * Initialize the map
 */
async function initMap() {
  console.log('Initializing map...');
  
  try {
    // Get API key from global window object or environment variable
    const apiKey = window.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      throw new Error('Google Maps API key not found. Please set window.GOOGLE_MAPS_API_KEY or process.env.GOOGLE_MAPS_API_KEY');
    }
    
    // Load Google Maps API
    await loadGoogleMapsApi(apiKey);
    
    // Get map container
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      throw new Error('Map container not found');
    }
    
    // Initialize the map service
    await initMapService(mapContainer, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM
    });
    
    console.log('Map initialized successfully');
  } catch (error) {
    errorHandler.handleError(
      error,
      'Map Initialization',
      ErrorSeverity.CRITICAL,
      ErrorType.MAP
    );
    
    // Show fallback message in map container
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
      mapContainer.innerHTML = `
        <div class="map-error">
          <h3>Map Could Not Be Loaded</h3>
          <p>There was a problem initializing the map. Please check your internet connection and try again.</p>
          <button id="retry-map" class="btn btn-primary">Retry</button>
        </div>
      `;
      
      // Add retry button handler
      const retryButton = document.getElementById('retry-map');
      if (retryButton) {
        retryButton.addEventListener('click', initMap);
      }
    }
  }
}

/**
 * Load saved data from localStorage
 */
function loadSavedData() {
  console.log('Loading saved data...');
  
  try {
    // Data loading is handled by StateManager constructor
    // Make sure subscribers are notified of initial state
    stateManager.notifySubscribers('');
    
    console.log('Data loaded successfully');
  } catch (error) {
    errorHandler.handleError(
      error,
      'Data Loading',
      ErrorSeverity.ERROR,
      ErrorType.STORAGE
    );
  }
}