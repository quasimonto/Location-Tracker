/**
 * errorHandler.js
 * Centralized error handling for the Location Tracker application
 */

// Severity levels for errors
export const ErrorSeverity = {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical'
  };
  
  // Error types for categorization
  export const ErrorType = {
    VALIDATION: 'validation',
    API: 'api',
    NETWORK: 'network',
    STORAGE: 'storage',
    MAP: 'map',
    STATE: 'state',
    UNKNOWN: 'unknown'
  };
  
  /**
   * Class to handle errors throughout the application
   */
  class ErrorHandler {
    constructor() {
      this.listeners = [];
      
      // Capture unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(event.reason, 'Unhandled Promise Rejection', ErrorSeverity.ERROR, ErrorType.UNKNOWN);
      });
      
      // Capture global errors
      window.addEventListener('error', (event) => {
        this.handleError(event.error, event.message, ErrorSeverity.ERROR, ErrorType.UNKNOWN);
      });
    }
    
    /**
     * Add a listener for errors
     * @param {Function} listener - Function to call when an error occurs
     * @returns {Function} Function to remove the listener
     */
    addListener(listener) {
      this.listeners.push(listener);
      return () => {
        this.listeners = this.listeners.filter(l => l !== listener);
      };
    }
    
    /**
     * Handle an error
     * @param {Error|string} error - The error object or message
     * @param {string} context - Where the error occurred
     * @param {string} severity - Error severity from ErrorSeverity
     * @param {string} type - Error type from ErrorType
     */
    handleError(error, context = '', severity = ErrorSeverity.ERROR, type = ErrorType.UNKNOWN) {
      // Create a standardized error object
      const errorObject = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : new Error().stack,
        context,
        severity,
        type,
        timestamp: new Date().toISOString()
      };
      
      // Log to console with appropriate level
      switch (severity) {
        case ErrorSeverity.INFO:
          console.info(`[${type}] ${context}:`, error);
          break;
        case ErrorSeverity.WARNING:
          console.warn(`[${type}] ${context}:`, error);
          break;
        case ErrorSeverity.CRITICAL:
          console.error(`[CRITICAL] [${type}] ${context}:`, error);
          break;
        case ErrorSeverity.ERROR:
        default:
          console.error(`[${type}] ${context}:`, error);
      }
      
      // Notify all listeners
      this.listeners.forEach(listener => {
        try {
          listener(errorObject);
        } catch (listenerError) {
          console.error('Error in error listener:', listenerError);
        }
      });
      
      // Log to analytics service in production environment
      // if (process.env.NODE_ENV === 'production') {
      //   this.logToAnalytics(errorObject);
      // }
      
      // Show UI notification for user-facing errors (except INFO level)
      if (severity !== ErrorSeverity.INFO) {
        this.showUserNotification(errorObject);
      }
      
      return errorObject;
    }
    
    /**
     * Show a user-facing notification about the error
     * @param {Object} errorObject - The standardized error object
     */
    showUserNotification(errorObject) {
      // Customize message based on severity and type
      let message = 'An error occurred.';
      let duration = 5000; // Default duration in ms
      
      switch (errorObject.severity) {
        case ErrorSeverity.WARNING:
          message = `Warning: ${this.getUserFriendlyMessage(errorObject)}`;
          break;
        case ErrorSeverity.CRITICAL:
          message = `Critical Error: ${this.getUserFriendlyMessage(errorObject)}`;
          duration = 0; // Stay until dismissed
          break;
        case ErrorSeverity.ERROR:
        default:
          message = `Error: ${this.getUserFriendlyMessage(errorObject)}`;
      }
      
      // Create or use toast/notification component
      // This will be replaced with actual UI component later
      this.createToast(message, errorObject.severity, duration);
    }
    
    /**
     * Get a user-friendly error message
     * @param {Object} errorObject - The standardized error object
     * @returns {string} User-friendly message
     */
    getUserFriendlyMessage(errorObject) {
      // Map technical errors to user-friendly messages
      const friendlyMessages = {
        [ErrorType.VALIDATION]: 'Please check your input and try again.',
        [ErrorType.API]: 'There was a problem communicating with the server.',
        [ErrorType.NETWORK]: 'Please check your internet connection.',
        [ErrorType.STORAGE]: 'There was a problem saving your data.',
        [ErrorType.MAP]: 'There was a problem with the map service.',
        [ErrorType.STATE]: 'There was a problem with the application state.',
        [ErrorType.UNKNOWN]: 'Something went wrong. Please try again.'
      };
      
      // Use context-specific message if available
      if (errorObject.context && typeof friendlyMessages[errorObject.context] === 'string') {
        return friendlyMessages[errorObject.context];
      }
      
      // Fall back to type-based message
      return friendlyMessages[errorObject.type] || friendlyMessages[ErrorType.UNKNOWN];
    }
    
    /**
     * Create a toast notification
     * This is a placeholder for now - will be replaced with proper UI component
     * @param {string} message - Message to display
     * @param {string} severity - Severity level
     * @param {number} duration - How long to show the toast in ms (0 = until dismissed)
     */
    createToast(message, severity, duration) {
      // This will be implemented with the UI components
      console.log(`TOAST [${severity}]: ${message} (${duration}ms)`);
      
      // For now, show alert for critical errors that should block the UI
      if (severity === ErrorSeverity.CRITICAL) {
        alert(message);
      }
    }
    
    /**
     * Log error to analytics service
     * @param {Object} errorObject - The standardized error object
     */
    logToAnalytics(errorObject) {
      // This will be implemented when analytics are integrated
      console.log('Would log to analytics:', errorObject);
    }
  }
  
  // Export a singleton instance
  export const errorHandler = new ErrorHandler();
  export default errorHandler;