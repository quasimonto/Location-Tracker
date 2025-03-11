/**
 * Config.js
 * Model representing application configuration in the Location Tracker application
 */

import { errorHandler, ErrorType, ErrorSeverity } from '../utils/errorHandler';

/**
 * Configuration class for application settings
 */
class Config {
  /**
   * Create a new Config
   * @param {Object} data - Configuration data
   */
  constructor(data = {}) {
    // Appearance settings
    this.appearance = {
      person: {
        icon: data.appearance?.person?.icon || 'default',
        color: data.appearance?.person?.color || '#FF0000'
      },
      meeting: {
        icon: data.appearance?.meeting?.icon || 'blue-dot',
        color: data.appearance?.meeting?.color || '#0000FF'
      },
      group: {
        style: data.appearance?.group?.style || 'circle'
      }
    };
    
    // Auto-grouping settings
    this.autoGrouping = {
      distanceThreshold: data.autoGrouping?.distanceThreshold || 1.0,
      minGroupSize: data.autoGrouping?.minGroupSize || 2,
      maxGroupSize: data.autoGrouping?.maxGroupSize || 20,
      maxGroupSizeDifference: data.autoGrouping?.maxGroupSizeDifference || 5,
      keepFamiliesTogether: data.autoGrouping?.keepFamiliesTogether !== undefined 
        ? data.autoGrouping.keepFamiliesTogether 
        : true,
      requirements: {
        minElders: data.autoGrouping?.requirements?.minElders || 0,
        minServants: data.autoGrouping?.requirements?.minServants || 0,
        minPioneers: data.autoGrouping?.requirements?.minPioneers || 0,
        minLeaders: data.autoGrouping?.requirements?.minLeaders || 1,
        minHelpers: data.autoGrouping?.requirements?.minHelpers || 1,
        minPublishers: data.autoGrouping?.requirements?.minPublishers || 0
      }
    };
    
    // Map settings
    this.map = {
      defaultCenter: data.map?.defaultCenter || { lat: 48.2082, lng: 16.3738 }, // Vienna
      defaultZoom: data.map?.defaultZoom || 13,
      markerAnimations: data.map?.markerAnimations !== undefined 
        ? data.map.markerAnimations 
        : true
    };
    
    // UI settings
    this.ui = {
      showTooltips: data.ui?.showTooltips !== undefined ? data.ui.showTooltips : true,
      sidebarWidth: data.ui?.sidebarWidth || 320,
      darkMode: data.ui?.darkMode || false
    };
  }
  
  /**
   * Validate the configuration
   * @returns {boolean} True if valid, false otherwise
   */
  validate() {
    let isValid = true;
    const errors = [];
    
    // Validate distance threshold
    if (typeof this.autoGrouping.distanceThreshold !== 'number' || 
        this.autoGrouping.distanceThreshold <= 0) {
      errors.push('Distance threshold must be a positive number');
      isValid = false;
    }
    
    // Validate group sizes
    if (this.autoGrouping.minGroupSize < 2) {
      errors.push('Minimum group size must be at least 2');
      isValid = false;
    }
    
    if (this.autoGrouping.maxGroupSize < this.autoGrouping.minGroupSize) {
      errors.push('Maximum group size must be greater than or equal to minimum group size');
      isValid = false;
    }
    
    // Log validation errors
    if (!isValid) {
      const errorMessage = `Configuration validation failed: ${errors.join(', ')}`;
      errorHandler.handleError(
        new Error(errorMessage),
        'Configuration Validation',
        ErrorSeverity.WARNING,
        ErrorType.VALIDATION
      );
    }
    
    return isValid;
  }
  
  /**
   * Convert the config to a plain object for storage
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      appearance: { ...this.appearance },
      autoGrouping: { ...this.autoGrouping },
      map: { ...this.map },
      ui: { ...this.ui }
    };
  }
  
  /**
   * Create a config instance from a plain object
   * @param {Object} json - Plain object representation
   * @returns {Config} Config instance
   */
  static fromJSON(json) {
    return new Config(json);
  }
  
  /**
   * Reset all settings to defaults
   */
  resetToDefaults() {
    const defaults = new Config();
    this.appearance = { ...defaults.appearance };
    this.autoGrouping = { ...defaults.autoGrouping };
    this.map = { ...defaults.map };
    this.ui = { ...defaults.ui };
  }
  
  /**
   * Get a specific configuration value by path
   * @param {string} path - Dot notation path to configuration value
   * @returns {*} Configuration value or undefined if not found
   */
  getValue(path) {
    if (!path) return undefined;
    
    const parts = path.split('.');
    let value = this;
    
    for (const part of parts) {
      if (value === undefined || value === null) {
        return undefined;
      }
      value = value[part];
    }
    
    return value;
  }
  
  /**
   * Update a specific configuration value by path
   * @param {string} path - Dot notation path to configuration value
   * @param {*} value - New value to set
   * @returns {boolean} Success status
   */
  setValue(path, value) {
    if (!path) return false;
    
    const parts = path.split('.');
    const lastPart = parts.pop();
    let current = this;
    
    for (const part of parts) {
      if (current[part] === undefined) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[lastPart] = value;
    return true;
  }
}

export default Config;