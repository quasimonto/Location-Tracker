/**
 * Family.js
 * Model representing a family unit in the Location Tracker application
 */

import { errorHandler, ErrorType, ErrorSeverity } from '../utils/errorHandler';

/**
 * Family class representing a family unit with relationships between people
 */
class Family {
  /**
   * Create a new Family
   * @param {Object} data - Family data
   */
  constructor(data = {}) {
    // Core identity properties
    this.id = data.id || `family_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.name = data.name || 'New Family';
    this.color = data.color || this.generateRandomColor();
    
    // Member references
    this.headId = data.headId || null;
    this.spouseId = data.spouseId || null;
    this.childrenIds = Array.isArray(data.childrenIds) ? [...data.childrenIds] : [];
    
    // Display properties (transient, not persisted)
    this._visible = true;
    this._selected = false;
  }
  
  /**
   * Validate the family object
   * @returns {boolean} True if valid, false otherwise
   */
  validate() {
    let isValid = true;
    const errors = [];
    
    // Name must be non-empty
    if (!this.name || this.name.trim() === '') {
      errors.push('Family name is required');
      isValid = false;
    }
    
    // A family must have a head
    if (!this.headId) {
      errors.push('Family head is required');
      isValid = false;
    }
    
    // Log validation errors
    if (!isValid) {
      const errorMessage = `Family validation failed: ${errors.join(', ')}`;
      errorHandler.handleError(
        new Error(errorMessage),
        'Family Validation',
        ErrorSeverity.WARNING,
        ErrorType.VALIDATION
      );
    }
    
    return isValid;
  }
  
  /**
   * Convert the family to a plain object for storage
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      headId: this.headId,
      spouseId: this.spouseId,
      childrenIds: [...this.childrenIds]
    };
  }
  
  /**
   * Create a family instance from a plain object
   * @param {Object} json - Plain object representation
   * @returns {Family} Family instance
   */
  static fromJSON(json) {
    return new Family(json);
  }
  
  /**
   * Generate a random color for the family
   * @returns {string} Random color as hex
   */
  generateRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }
  
  /**
   * Add a child to the family
   * @param {string} personId - ID of the person to add as a child
   * @returns {boolean} Success status
   */
  addChild(personId) {
    if (!personId) return false;
    
    // Check if already a child in this family
    if (this.childrenIds.includes(personId)) return false;
    
    // Add to children
    this.childrenIds.push(personId);
    return true;
  }
  
  /**
   * Remove a child from the family
   * @param {string} personId - ID of the child to remove
   * @returns {boolean} Success status
   */
  removeChild(personId) {
    const index = this.childrenIds.indexOf(personId);
    if (index === -1) return false;
    
    this.childrenIds.splice(index, 1);
    return true;
  }
  
  /**
   * Set the family head
   * @param {string} personId - ID of the person to set as head
   * @returns {boolean} Success status
   */
  setHead(personId) {
    if (!personId) return false;
    
    // If this person is currently a child, remove from children
    this.removeChild(personId);
    
    // If this person is currently the spouse, clear spouse
    if (this.spouseId === personId) {
      this.spouseId = null;
    }
    
    this.headId = personId;
    return true;
  }
  
  /**
   * Set the family spouse
   * @param {string} personId - ID of the person to set as spouse
   * @returns {boolean} Success status
   */
  setSpouse(personId) {
    if (!personId) return false;
    
    // If this person is currently a child, remove from children
    this.removeChild(personId);
    
    // If this person is currently the head, can't be spouse
    if (this.headId === personId) return false;
    
    this.spouseId = personId;
    return true;
  }
  
  /**
   * Get the total number of family members
   * @returns {number} Number of family members
   */
  get memberCount() {
    let count = 0;
    if (this.headId) count++;
    if (this.spouseId) count++;
    count += this.childrenIds.length;
    return count;
  }
  
  /**
   * Check if a person is a member of this family
   * @param {string} personId - ID of the person to check
   * @returns {boolean} Whether the person is a member
   */
  isMember(personId) {
    return (
      this.headId === personId ||
      this.spouseId === personId ||
      this.childrenIds.includes(personId)
    );
  }
  
  /**
   * Get the role of a person in the family
   * @param {string} personId - ID of the person to check
   * @returns {string|null} Role ('head', 'spouse', 'child') or null if not a member
   */
  getMemberRole(personId) {
    if (this.headId === personId) return 'head';
    if (this.spouseId === personId) return 'spouse';
    if (this.childrenIds.includes(personId)) return 'child';
    return null;
  }
  
  /**
   * Remove a member from the family
   * @param {string} personId - ID of the person to remove
   * @returns {boolean} Success status
   */
  removeMember(personId) {
    if (this.headId === personId) {
      this.headId = null;
      return true;
    }
    
    if (this.spouseId === personId) {
      this.spouseId = null;
      return true;
    }
    
    return this.removeChild(personId);
  }
  
  /**
   * Set whether this family is visible
   * @param {boolean} visible - Whether the family is visible
   */
  set visible(visible) {
    this._visible = Boolean(visible);
  }
  
  /**
   * Get whether this family is visible
   * @returns {boolean} Whether the family is visible
   */
  get visible() {
    return this._visible;
  }
  
  /**
   * Set whether this family is selected
   * @param {boolean} selected - Whether the family is selected
   */
  set selected(selected) {
    this._selected = Boolean(selected);
  }
  
  /**
   * Get whether this family is selected
   * @returns {boolean} Whether the family is selected
   */
  get selected() {
    return this._selected;
  }
}

export default Family;