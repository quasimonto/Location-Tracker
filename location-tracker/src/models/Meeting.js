/**
 * Meeting.js
 * Model representing a meeting point in the Location Tracker application
 */

import { errorHandler, ErrorType, ErrorSeverity } from '../utils/errorHandler';

/**
 * Meeting class representing a meeting point on the map
 */
class Meeting {
  /**
   * Create a new Meeting point
   * @param {Object} data - Meeting data
   */
  constructor(data = {}) {
    // Core identity properties
    this.id = data.id || `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.name = data.name || 'New Meeting Point';
    this.description = data.description || '';
    
    // Position data
    this.lat = data.lat !== undefined ? data.lat : 0;
    this.lng = data.lng !== undefined ? data.lng : 0;
    
    // Organizational assignment
    this.group = data.group || null;
    
    // Additional metadata
    this.createdAt = data.createdAt || Date.now();
    this.updatedAt = data.updatedAt || Date.now();
    
    // Display properties (transient, not persisted)
    this._marker = null;
    this._selected = false;
    this._visible = true;
  }
  
  /**
   * Validate the meeting object
   * @returns {boolean} True if valid, false otherwise
   */
  validate() {
    let isValid = true;
    const errors = [];
    
    // Name must be non-empty
    if (!this.name || this.name.trim() === '') {
      errors.push('Name is required');
      isValid = false;
    }
    
    // Latitude and longitude must be numbers
    if (typeof this.lat !== 'number' || isNaN(this.lat)) {
      errors.push('Latitude must be a valid number');
      isValid = false;
    }
    
    if (typeof this.lng !== 'number' || isNaN(this.lng)) {
      errors.push('Longitude must be a valid number');
      isValid = false;
    }
    
    // Log validation errors
    if (!isValid) {
      const errorMessage = `Meeting validation failed: ${errors.join(', ')}`;
      errorHandler.handleError(
        new Error(errorMessage),
        'Meeting Validation',
        ErrorSeverity.WARNING,
        ErrorType.VALIDATION
      );
    }
    
    return isValid;
  }
  
  /**
   * Convert the meeting to a plain object for storage
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      lat: this.lat,
      lng: this.lng,
      group: this.group,
      createdAt: this.createdAt,
      updatedAt: Date.now() // Update timestamp on save
    };
  }
  
  /**
   * Create a meeting instance from a plain object
   * @param {Object} json - Plain object representation
   * @returns {Meeting} Meeting instance
   */
  static fromJSON(json) {
    return new Meeting(json);
  }
  
  /**
   * Set the map marker associated with this meeting
   * @param {Object} marker - Google Maps marker object
   */
  set marker(marker) {
    this._marker = marker;
  }
  
  /**
   * Get the map marker associated with this meeting
   * @returns {Object} Google Maps marker object
   */
  get marker() {
    return this._marker;
  }
  
  /**
   * Set whether this meeting is selected
   * @param {boolean} selected - Whether the meeting is selected
   */
  set selected(selected) {
    this._selected = Boolean(selected);
  }
  
  /**
   * Get whether this meeting is selected
   * @returns {boolean} Whether the meeting is selected
   */
  get selected() {
    return this._selected;
  }
  
  /**
   * Set whether this meeting is visible on the map
   * @param {boolean} visible - Whether the meeting is visible
   */
  set visible(visible) {
    this._visible = Boolean(visible);
    if (this._marker) {
      this._marker.setVisible(this._visible);
    }
  }
  
  /**
   * Get whether this meeting is visible on the map
   * @returns {boolean} Whether the meeting is visible
   */
  get visible() {
    return this._visible;
  }
  
  /**
   * Get the position as a LatLng object for Google Maps
   * @returns {Object} Google Maps LatLng object
   */
  getPosition() {
    return { lat: this.lat, lng: this.lng };
  }
  
  /**
   * Update the position
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   */
  setPosition(lat, lng) {
    this.lat = lat;
    this.lng = lng;
    
    // Update marker position if it exists
    if (this._marker) {
      this._marker.setPosition({ lat, lng });
    }
  }
  
  /**
   * Update the meeting with new data
   * @param {Object} data - New meeting data
   */
  update(data) {
    // Update properties if provided
    if (data.name !== undefined) {
      this.name = data.name;
    }
    
    if (data.description !== undefined) {
      this.description = data.description;
    }
    
    if (data.lat !== undefined && data.lng !== undefined) {
      this.setPosition(data.lat, data.lng);
    }
    
    if (data.group !== undefined) {
      this.group = data.group;
    }
    
    // Update the timestamp
    this.updatedAt = Date.now();
  }
  
  /**
   * Calculate distance to another location or object
   * @param {Object} target - Target with lat and lng properties
   * @returns {number} Distance in meters
   */
  distanceTo(target) {
    if (!target || typeof target.lat !== 'number' || typeof target.lng !== 'number') {
      return Infinity;
    }
    
    // If Google Maps geometry library is available, use it
    if (window.google && window.google.maps && window.google.maps.geometry) {
      const p1 = new window.google.maps.LatLng(this.lat, this.lng);
      const p2 = new window.google.maps.LatLng(target.lat, target.lng);
      return window.google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
    }
    
    // Fallback to simple Haversine formula
    const R = 6371e3; // Earth's radius in meters
    const φ1 = this.lat * Math.PI / 180;
    const φ2 = target.lat * Math.PI / 180;
    const Δφ = (target.lat - this.lat) * Math.PI / 180;
    const Δλ = (target.lng - this.lng) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  }
}

export default Meeting;