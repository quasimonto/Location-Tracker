/**
 * Family.js
 * Model representing a family in the Location Tracker application
 */

import { errorHandler, ErrorType, ErrorSeverity } from '../utils/errorHandler';
import { getRandomColor } from '../utils/mapUtils';

/**
 * Family class representing family relationships between persons
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
    
    // Family relationships
    this.headId = data.headId || null;
    this.spouseId = data.spouseId || null;
    this.childrenIds = Array.isArray(data.childrenIds) ? [...data.childrenIds] : [];
    
    // Appearance
    this.color = data.color || getRandomColor();
    
    // Metadata
    this.createdAt = data.createdAt || Date.now();
    this.updatedAt = data.updatedAt || Date.now();
    
    // Transient properties (not persisted)
    this._head = null;
    this._spouse = null;
    this._children = [];
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
      errors.push('Name is required');
      isValid = false;
    }
    
    // Family head is required
    if (!this.headId) {
      errors.push('Family head is required');
      isValid = false;
    }
    
    // Color must be a valid hex color
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!this.color || !hexColorRegex.test(this.color)) {
      errors.push('Color must be a valid hex color (e.g., #FF0000)');
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
      headId: this.headId,
      spouseId: this.spouseId,
      childrenIds: [...this.childrenIds],
      color: this.color,
      createdAt: this.createdAt,
      updatedAt: Date.now() // Update timestamp on save
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
   * Update the family with new data
   * @param {Object} data - New family data
   */
  update(data) {
    // Update properties if provided
    if (data.name !== undefined) {
      this.name = data.name;
    }
    
    if (data.color !== undefined) {
      this.color = data.color;
    }
    
    if (data.headId !== undefined) {
      this.headId = data.headId;
    }
    
    if (data.spouseId !== undefined) {
      this.spouseId = data.spouseId;
    }
    
    if (data.childrenIds !== undefined) {
      this.childrenIds = Array.isArray(data.childrenIds) ? [...data.childrenIds] : [];
    }
    
    // Update the timestamp
    this.updatedAt = Date.now();
  }
  
  /**
   * Set the family head
   * Note: This updates the reference, not the ID
   * @param {Object} head - Person object who is the family head
   */
  set head(head) {
    this._head = head;
    this.headId = head ? head.id : null;
  }
  
  /**
   * Get the family head
   * @returns {Object} Person object who is the family head
   */
  get head() {
    return this._head;
  }
  
  /**
   * Set the spouse
   * Note: This updates the reference, not the ID
   * @param {Object} spouse - Person object who is the spouse
   */
  set spouse(spouse) {
    this._spouse = spouse;
    this.spouseId = spouse ? spouse.id : null;
  }
  
  /**
   * Get the spouse
   * @returns {Object} Person object who is the spouse
   */
  get spouse() {
    return this._spouse;
  }
  
  /**
   * Set the children
   * Note: This updates the references, not the IDs
   * @param {Array} children - Array of Person objects who are children
   */
  set children(children) {
    this._children = Array.isArray(children) ? [...children] : [];
    this.childrenIds = children.map(child => child.id);
  }
  
  /**
   * Get the children
   * @returns {Array} Array of Person objects who are children
   */
  get children() {
    return this._children;
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
  
  /**
   * Get the total number of family members
   * @returns {number} Total number of family members
   */
  get memberCount() {
    return (this.headId ? 1 : 0) + (this.spouseId ? 1 : 0) + this.childrenIds.length;
  }
  
  /**
   * Add a child to the family
   * @param {string} childId - ID of the child to add
   * @returns {boolean} Whether the operation was successful
   */
  addChild(childId) {
    if (!childId || this.childrenIds.includes(childId)) {
      return false;
    }
    
    this.childrenIds.push(childId);
    this.updatedAt = Date.now();
    return true;
  }
  
  /**
   * Remove a child from the family
   * @param {string} childId - ID of the child to remove
   * @returns {boolean} Whether the operation was successful
   */
  removeChild(childId) {
    const index = this.childrenIds.indexOf(childId);
    if (index === -1) {
      return false;
    }
    
    this.childrenIds.splice(index, 1);
    this.updatedAt = Date.now();
    return true;
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
   * Get a person's role in the family
   * @param {string} personId - ID of the person to check
   * @returns {string|null} The person's role ('head', 'spouse', 'child') or null
   */
  getMemberRole(personId) {
    if (this.headId === personId) {
      return 'head';
    } else if (this.spouseId === personId) {
      return 'spouse';
    } else if (this.childrenIds.includes(personId)) {
      return 'child';
    }
    
    return null;
  }
  
  /**
   * Calculate the geographical center of the family
   * @returns {Object|null} Center position with lat and lng properties
   */
  calculateCenter() {
    // Combine head, spouse, and children
    const allMembers = [];
    
    if (this._head) {
      allMembers.push(this._head);
    }
    
    if (this._spouse) {
      allMembers.push(this._spouse);
    }
    
    if (this._children.length > 0) {
      allMembers.push(...this._children);
    }
    
    if (allMembers.length === 0) {
      return null;
    }
    
    // Sum up all coordinates
    const sum = allMembers.reduce(
      (acc, member) => {
        acc.lat += member.lat;
        acc.lng += member.lng;
        return acc;
      },
      { lat: 0, lng: 0 }
    );
    
    // Calculate the average
    return {
      lat: sum.lat / allMembers.length,
      lng: sum.lng / allMembers.length
    };
  }
  
  /**
   * Get family statistics
   * @returns {Object} Family statistics
   */
  getStatistics() {
    // Count roles in the family
    const allMembers = [];
    
    if (this._head) {
      allMembers.push(this._head);
    }
    
    if (this._spouse) {
      allMembers.push(this._spouse);
    }
    
    if (this._children.length > 0) {
      allMembers.push(...this._children);
    }
    
    // Count roles
    const elderCount = allMembers.filter(p => p.elder).length;
    const servantCount = allMembers.filter(p => p.servant).length;
    const pioneerCount = allMembers.filter(p => p.pioneer).length;
    const leaderCount = allMembers.filter(p => p.leader).length;
    const helperCount = allMembers.filter(p => p.helper).length;
    const publisherCount = allMembers.filter(p => p.publisher).length;
    
    return {
      totalMembers: allMembers.length,
      adults: (this._head ? 1 : 0) + (this._spouse ? 1 : 0),
      children: this._children.length,
      elders: elderCount,
      servants: servantCount,
      pioneers: pioneerCount,
      leaders: leaderCount,
      helpers: helperCount,
      publishers: publisherCount
    };
  }
}

export default Family;