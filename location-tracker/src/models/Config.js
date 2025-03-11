/**
 * Config.js
 * Model representing application configuration in the Location Tracker application
 */

import { errorHandler, ErrorType, ErrorSeverity } from '../utils/errorHandler';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  // Appearance settings
  appearance: {
    person: {
      icon: 'default',
      color: '#FF0000'
    },
    meeting: {
      icon: 'blue-dot',
      color: '#0000FF'
    },
    group: {
      style: 'circle'
    }
  },
  // Auto-grouping settings
  autoGrouping: {
    distanceThreshold: 1.0, // in kilometers
    minGroupSize: 2,
    maxGroupSize: 20,
    maxGroupSizeDifference: 5,
    keepFamiliesTogether: true,
    requirements: {
      minElders: 0,
      minServants: 0,
      minPioneers: 0,
      minLeaders: 1,
      minHelpers: 1,
      minPublishers: 0
    }
  },
  // Map settings
  map: {
    defaultCenter: { lat: 48.2082, lng: 16.3738 }, // Vienna, Austria
    defaultZoom: 13,
    showTraffic: false,
    mapType: 'roadmap'
  },
  // UI settings
  ui: {
    sidebarWidth: 320,
    theme: 'light',
    showTooltips: true,
    confirmDeletes: true
  }
};

/**
 * Config class representing application configuration
 */
class Config {
  /**
   * Create a new Config
   * @param {Object} data - Configuration data
   */
  constructor(data = {}) {
    // Clone the default configuration
    const defaults = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    
    // Deep merge defaults with provided data
    this._config = this.deepMerge(defaults, data);
    
    // Validate the merged configuration
    this.validate();
  }
  
  /**
   * Deeply merge two objects
   * @param {Object} target - Target object to merge into
   * @param {Object} source - Source object to merge from
   * @returns {Object} Merged object
   * @private
   */
  deepMerge(target, source) {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }
  
  /**
   * Check if value is an object
   * @param {*} item - Item to check
   * @returns {boolean} Whether item is an object
   * @private
   */
  isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }
  
  /**
   * Validate the configuration
   * @returns {boolean} Whether the configuration is valid
   */
  validate() {
    let isValid = true;
    const errors = [];
    
    // Validate appearance settings
    if (!this._config.appearance) {
      errors.push('Appearance settings are missing');
      isValid = false;
    } else {
      // Validate person appearance
      if (!this._config.appearance.person) {
        errors.push('Person appearance settings are missing');
        isValid = false;
      } else if (typeof this._config.appearance.person.color !== 'string') {
        errors.push('Person color must be a string');
        isValid = false;
      }
      
      // Validate meeting appearance
      if (!this._config.appearance.meeting) {
        errors.push('Meeting appearance settings are missing');
        isValid = false;
      } else if (typeof this._config.appearance.meeting.color !== 'string') {
        errors.push('Meeting color must be a string');
        isValid = false;
      }
    }
    
    // Validate auto-grouping settings
    if (!this._config.autoGrouping) {
      errors.push('Auto-grouping settings are missing');
      isValid = false;
    } else {
      // Validate distance threshold
      if (typeof this._config.autoGrouping.distanceThreshold !== 'number' || 
          this._config.autoGrouping.distanceThreshold <= 0) {
        errors.push('Distance threshold must be a positive number');
        isValid = false;
      }
      
      // Validate group size
      if (typeof this._config.autoGrouping.minGroupSize !== 'number' || 
          this._config.autoGrouping.minGroupSize < 1) {
        errors.push('Minimum group size must be at least 1');
        isValid = false;
      }
      
      if (typeof this._config.autoGrouping.maxGroupSize !== 'number' || 
          this._config.autoGrouping.maxGroupSize < this._config.autoGrouping.minGroupSize) {
        errors.push('Maximum group size must be at least the minimum group size');
        isValid = false;
      }
    }
    
    // Validate map settings
    if (!this._config.map) {
      errors.push('Map settings are missing');
      isValid = false;
    } else {
      // Validate default center
      if (!this._config.map.defaultCenter || 
          typeof this._config.map.defaultCenter.lat !== 'number' || 
          typeof this._config.map.defaultCenter.lng !== 'number') {
        errors.push('Default center must have valid lat and lng numbers');
        isValid = false;
      }
      
      // Validate default zoom
      if (typeof this._config.map.defaultZoom !== 'number' || 
          this._config.map.defaultZoom < 1 || 
          this._config.map.defaultZoom > 20) {
        errors.push('Default zoom must be between 1 and 20');
        isValid = false;
      }
    }
    
    // Log validation errors
    if (!isValid) {
      const errorMessage = `Configuration validation failed: ${errors.join(', ')}`;
      errorHandler.handleError(
        new Error(errorMessage),
        'Config Validation',
        ErrorSeverity.WARNING,
        ErrorType.VALIDATION
      );
    }
    
    return isValid;
  }
  
  /**
   * Convert the configuration to a plain object for storage
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return JSON.parse(JSON.stringify(this._config));
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
   * Get the default configuration
   * @returns {Object} Default configuration
   */
  static getDefaults() {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
  
  /**
   * Reset configuration to defaults
   */
  resetToDefaults() {
    this._config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
  
  /**
   * Get a configuration value
   * @param {string} path - Dot notation path to the setting
   * @param {*} defaultValue - Default value if setting does not exist
   * @returns {*} Configuration value
   */
  get(path, defaultValue = undefined) {
    const parts = path.split('.');
    let value = this._config;
    
    for (const part of parts) {
      if (value === undefined || value === null) {
        return defaultValue;
      }
      value = value[part];
    }
    
    return value !== undefined ? value : defaultValue;
  }
  
  /**
   * Set a configuration value
   * @param {string} path - Dot notation path to the setting
   * @param {*} value - Value to set
   * @returns {boolean} Whether the setting was successfully set
   */
  set(path, value) {
    const parts = path.split('.');
    let current = this._config;
    
    // Navigate to the parent object
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current[part] === undefined) {
        current[part] = {};
      } else if (typeof current[part] !== 'object') {
        // Cannot descend further, path is invalid
        return false;
      }
      current = current[part];
    }
    
    // Set the value
    const lastPart = parts[parts.length - 1];
    current[lastPart] = value;
    
    // Validate after setting
    return this.validate();
  }
  
  /**
   * Update multiple configuration values at once
   * @param {Object} updates - Object with path-value pairs
   * @returns {boolean} Whether all updates were successful
   */
  update(updates) {
    let allValid = true;
    
    // Create a backup in case validation fails
    const backup = JSON.parse(JSON.stringify(this._config));
    
    // Apply all updates
    Object.entries(updates).forEach(([path, value]) => {
      this.set(path, value);
    });
    
    // Validate the entire configuration
    if (!this.validate()) {
      // Restore backup if validation fails
      this._config = backup;
      allValid = false;
    }
    
    return allValid;
  }
  
  /**
   * Get all appearance settings
   * @returns {Object} Appearance settings
   */
  getAppearanceSettings() {
    return JSON.parse(JSON.stringify(this._config.appearance));
  }
  
  /**
   * Get all auto-grouping settings
   * @returns {Object} Auto-grouping settings
   */
  getAutoGroupingSettings() {
    return JSON.parse(JSON.stringify(this._config.autoGrouping));
  }
  
  /**
   * Get all map settings
   * @returns {Object} Map settings
   */
  getMapSettings() {
    return JSON.parse(JSON.stringify(this._config.map));
  }
  
  /**
   * Get all UI settings
   * @returns {Object} UI settings
   */
  getUISettings() {
    return JSON.parse(JSON.stringify(this._config.ui));
  }
}

export default Config;