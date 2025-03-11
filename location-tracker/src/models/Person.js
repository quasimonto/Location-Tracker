/**
 * Person.js
 * Model representing a person in the Location Tracker application
 */

import { errorHandler, ErrorType, ErrorSeverity } from '../utils/errorHandler';

/**
 * Person class representing an individual on the map
 */
class Person {
  /**
   * Create a new Person
   * @param {Object} data - Person data
   */
  constructor(data = {}) {
    // Core identity properties
    this.id = data.id || `person_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.name = data.name || 'New Person';
    
    // Position data
    this.lat = data.lat !== undefined ? data.lat : 0;
    this.lng = data.lng !== undefined ? data.lng : 0;
    
    // Organizational assignments
    this.group = data.group || null;
    this.familyId = data.familyId || null;
    this.familyRole = data.familyRole || null; // 'head', 'spouse', or 'child'
    this.relationshipIds = Array.isArray(data.relationshipIds) ? [...data.relationshipIds] : [];
    
    // Roles
    this.elder = Boolean(data.elder);
    this.servant = Boolean(data.servant);
    this.pioneer = Boolean(data.pioneer);
    this.publisher = Boolean(data.publisher);
    this.spouse = Boolean(data.spouse);
    this.child = Boolean(data.child);
    this.familyHead = Boolean(data.familyHead);
    this.leader = Boolean(data.leader);
    this.helper = Boolean(data.helper);
    
    // Display properties (transient, not persisted)
    this._marker = null;
    this._selected = false;
    this._visible = true;
  }
  
  /**
   * Validate the person object
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
      const errorMessage = `Person validation failed: ${errors.join(', ')}`;
      errorHandler.handleError(
        new Error(errorMessage),
        'Person Validation',
        ErrorSeverity.WARNING,
        ErrorType.VALIDATION
      );
    }
    
    return isValid;
  }
  
  /**
   * Convert the person to a plain object for storage
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      lat: this.lat,
      lng: this.lng,
      group: this.group,
      familyId: this.familyId,
      familyRole: this.familyRole,
      relationshipIds: [...this.relationshipIds],
      elder: this.elder,
      servant: this.servant,
      pioneer: this.pioneer,
      publisher: this.publisher,
      spouse: this.spouse,
      child: this.child,
      familyHead: this.familyHead,
      leader: this.leader,
      helper: this.helper
    };
  }
  
  /**
   * Create a person instance from a plain object
   * @param {Object} json - Plain object representation
   * @returns {Person} Person instance
   */
  static fromJSON(json) {
    return new Person(json);
  }
  
  /**
   * Set the map marker associated with this person
   * @param {Object} marker - Google Maps marker object
   */
  set marker(marker) {
    this._marker = marker;
  }
  
  /**
   * Get the map marker associated with this person
   * @returns {Object} Google Maps marker object
   */
  get marker() {
    return this._marker;
  }
  
  /**
   * Set whether this person is selected
   * @param {boolean} selected - Whether the person is selected
   */
  set selected(selected) {
    this._selected = Boolean(selected);
  }
  
  /**
   * Get whether this person is selected
   * @returns {boolean} Whether the person is selected
   */
  get selected() {
    return this._selected;
  }
  
  /**
   * Set whether this person is visible on the map
   * @param {boolean} visible - Whether the person is visible
   */
  set visible(visible) {
    this._visible = Boolean(visible);
    if (this._marker) {
      this._marker.setVisible(this._visible);
    }
  }
  
  /**
   * Get whether this person is visible on the map
   * @returns {boolean} Whether the person is visible
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
   * Check if person has a specific role
   * @param {string} role - Role to check ('elder', 'servant', etc.)
   * @returns {boolean} Whether the person has the role
   */
  hasRole(role) {
    switch (role.toLowerCase()) {
      case 'elder': return this.elder;
      case 'servant': return this.servant;
      case 'pioneer': return this.pioneer;
      case 'publisher': return this.publisher;
      case 'spouse': return this.spouse;
      case 'child': return this.child;
      case 'familyhead': return this.familyHead;
      case 'leader': return this.leader;
      case 'helper': return this.helper;
      default: return false;
    }
  }
  
  /**
   * Get a list of all roles this person has
   * @returns {Array} Array of role names
   */
  getRoles() {
    const roles = [];
    
    if (this.elder) roles.push('elder');
    if (this.servant) roles.push('servant');
    if (this.pioneer) roles.push('pioneer');
    if (this.publisher) roles.push('publisher');
    if (this.spouse) roles.push('spouse');
    if (this.child) roles.push('child');
    if (this.familyHead) roles.push('familyHead');
    if (this.leader) roles.push('leader');
    if (this.helper) roles.push('helper');
    
    return roles;
  }
}

export default Person;