/**
 * Family.js
 * Model representing a family unit in the Location Tracker application
 */

import { errorHandler, ErrorType, ErrorSeverity } from '../utils/errorHandler';

/**
 * Family class representing a family unit with relationships
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
    
    // Relationship IDs
    this.headId = data.headId || null;
    this.spouseId = data.spouseId || null;
    this.childrenIds = Array.isArray(data.childrenIds) ? [...data.childrenIds] : [];
    
    // Private properties
    this._members = new Set(); // For temporary tracking of members (not persisted)
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
    
    // A family must have at least a head
    if (!this.headId) {
      errors.push('Family must have a head');
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
   * Check if a person is a member of this family
   * @param {string} personId - Person ID to check
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
   * Get the role of a person in this family
   * @param {string} personId - Person ID to check
   * @returns {string|null} Role ('head', 'spouse', 'child') or null if not a member
   */
  getMemberRole(personId) {
    if (this.headId === personId) return 'head';
    if (this.spouseId === personId) return 'spouse';
    if (this.childrenIds.includes(personId)) return 'child';
    return null;
  }
  
  /**
   * Add a person as the head of the family
   * @param {string} personId - Person ID to add as head
   * @returns {boolean} Success of the operation
   */
  setHead(personId) {
    if (!personId) return false;
    
    // Cannot be already in the family in another role
    if (this.spouseId === personId || this.childrenIds.includes(personId)) {
      return false;
    }
    
    this.headId = personId;
    return true;
  }
  
  /**
   * Add a person as the spouse
   * @param {string} personId - Person ID to add as spouse
   * @returns {boolean} Success of the operation
   */
  setSpouse(personId) {
    if (!personId) return false;
    
    // Cannot be already in the family in another role
    if (this.headId === personId || this.childrenIds.includes(personId)) {
      return false;
    }
    
    this.spouseId = personId;
    return true;
  }
  
  /**
   * Add a child to the family
   * @param {string} personId - Person ID to add as child
   * @returns {boolean} Success of the operation
   */
  addChild(personId) {
    if (!personId) return false;
    
    // Cannot be already in the family in another role
    if (this.headId === personId || this.spouseId === personId) {
      return false;
    }
    
    // Don't add if already a child
    if (this.childrenIds.includes(personId)) {
      return false;
    }
    
    this.childrenIds.push(personId);
    return true;
  }
  
  /**
   * Remove a person from the family
   * @param {string} personId - Person ID to remove
   * @returns {Object} Result with success status and details
   */
  removeMember(personId) {
    if (!personId) {
      return { success: false, message: 'Person ID is required' };
    }
    
    // Handle based on role
    const role = this.getMemberRole(personId);
    
    switch (role) {
      case 'head':
        // If there's a spouse, promote to head
        if (this.spouseId) {
          const oldSpouseId = this.spouseId;
          this.headId = oldSpouseId;
          this.spouseId = null;
          return { 
            success: true, 
            message: 'Head removed, spouse promoted to head',
            role: 'head',
            promotedMember: oldSpouseId
          };
        }
        
        // No spouse, so we would need to dissolve the family
        return { 
          success: false, 
          message: 'Cannot remove head without a spouse to promote',
          dissolveRequired: true
        };
        
      case 'spouse':
        this.spouseId = null;
        return { 
          success: true, 
          message: 'Spouse removed',
          role: 'spouse'
        };
        
      case 'child':
        this.childrenIds = this.childrenIds.filter(id => id !== personId);
        return { 
          success: true, 
          message: 'Child removed',
          role: 'child'
        };
        
      default:
        return { 
          success: false, 
          message: 'Person is not a member of this family'
        };
    }
  }
  
  /**
   * Get total number of members in the family
   * @returns {number} Number of members
   */
  getMemberCount() {
    // Count head if exists
    let count = this.headId ? 1 : 0;
    
    // Add spouse if exists
    count += this.spouseId ? 1 : 0;
    
    // Add number of children
    count += this.childrenIds.length;
    
    return count;
  }
  
  /**
   * Generate a random color for the family
   * @returns {string} Random color in hex format
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
   * Check if this family can be merged with another
   * @param {Family} otherFamily - Another family to check for merge possibility
   * @returns {Object} Result with merge possibility status and details
   */
  canMergeWith(otherFamily) {
    if (!otherFamily || !(otherFamily instanceof Family)) {
      return { possible: false, reason: 'Invalid family object' };
    }
    
    // Cannot merge a family with itself
    if (this.id === otherFamily.id) {
      return { possible: false, reason: 'Cannot merge a family with itself' };
    }
    
    // Check for overlapping members
    const thisMembers = [this.headId, this.spouseId, ...this.childrenIds].filter(Boolean);
    const otherMembers = [otherFamily.headId, otherFamily.spouseId, ...otherFamily.childrenIds].filter(Boolean);
    
    const overlappingMembers = thisMembers.filter(id => otherMembers.includes(id));
    if (overlappingMembers.length > 0) {
      return { possible: false, reason: 'Families have overlapping members', overlappingMembers };
    }
    
    // Basic merge checks passed
    return { possible: true };
  }
  
  /**
   * Merge this family with another
   * @param {Family} otherFamily - Family to merge with
   * @param {Object} options - Merge options
   * @returns {Object} Result with merge status and details
   */
  mergeWith(otherFamily, options = { maintainRoles: true }) {
    // Check if merge is possible
    const mergeCheck = this.canMergeWith(otherFamily);
    if (!mergeCheck.possible) {
      return { success: false, reason: mergeCheck.reason };
    }
    
    const { maintainRoles } = options;
    
    // Handle head/spouse relationships
    if (maintainRoles) {
      // If we maintain roles, we need to choose which family's head/spouse structure to keep
      if (this.headId && !this.spouseId && otherFamily.spouseId) {
        // This family has head but no spouse, other has spouse
        this.spouseId = otherFamily.spouseId;
      } else if (otherFamily.headId && !this.headId) {
        // This family has no head, take other's head
        this.headId = otherFamily.headId;
        
        if (otherFamily.spouseId && !this.spouseId) {
          // Take spouse too if available
          this.spouseId = otherFamily.spouseId;
        }
      }
    } else {
      // If not maintaining roles, just add all as children except for head/spouse
      if (otherFamily.headId && this.headId !== otherFamily.headId && this.spouseId !== otherFamily.headId) {
        this.childrenIds.push(otherFamily.headId);
      }
      
      if (otherFamily.spouseId && this.headId !== otherFamily.spouseId && this.spouseId !== otherFamily.spouseId) {
        this.childrenIds.push(otherFamily.spouseId);
      }
    }
    
    // Add all children from other family
    otherFamily.childrenIds.forEach(childId => {
      if (!this.childrenIds.includes(childId)) {
        this.childrenIds.push(childId);
      }
    });
    
    return { 
      success: true, 
      message: 'Families merged successfully',
      resultingFamily: this.toJSON()
    };
  }
}

export default Family;