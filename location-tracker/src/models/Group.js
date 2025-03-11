/**
 * Group.js
 * Model representing a group in the Location Tracker application
 */

import { errorHandler, ErrorType, ErrorSeverity } from '../utils/errorHandler';
import { getRandomColor } from '../utils/mapUtils';

/**
 * Group class representing a collection of persons and meeting points
 */
class Group {
  /**
   * Create a new Group
   * @param {Object} data - Group data
   */
  constructor(data = {}) {
    // Core identity properties
    this.id = data.id || `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.name = data.name || 'New Group';
    
    // Appearance
    this.color = data.color || getRandomColor();
    
    // Requirements
    this.requirements = {
      minSize: data.requirements?.minSize || 2,
      maxSize: data.requirements?.maxSize || 20,
      minElders: data.requirements?.minElders || 0,
      minServants: data.requirements?.minServants || 0,
      minPioneers: data.requirements?.minPioneers || 0,
      minLeaders: data.requirements?.minLeaders || 1,
      minHelpers: data.requirements?.minHelpers || 1,
      minPublishers: data.requirements?.minPublishers || 0
    };
    
    // Metadata
    this.createdAt = data.createdAt || Date.now();
    this.updatedAt = data.updatedAt || Date.now();
    
    // Transient properties (not persisted)
    this._members = []; // Will be populated by service
    this._meetingPoints = []; // Will be populated by service
    this._selected = false;
  }
  
  /**
   * Validate the group object
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
    
    // Color must be a valid hex color
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!this.color || !hexColorRegex.test(this.color)) {
      errors.push('Color must be a valid hex color (e.g., #FF0000)');
      isValid = false;
    }
    
    // Requirements must make sense
    if (this.requirements.minSize > this.requirements.maxSize) {
      errors.push('Minimum size cannot be greater than maximum size');
      isValid = false;
    }
    
    // Log validation errors
    if (!isValid) {
      const errorMessage = `Group validation failed: ${errors.join(', ')}`;
      errorHandler.handleError(
        new Error(errorMessage),
        'Group Validation',
        ErrorSeverity.WARNING,
        ErrorType.VALIDATION
      );
    }
    
    return isValid;
  }
  
  /**
   * Convert the group to a plain object for storage
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      requirements: {
        minSize: this.requirements.minSize,
        maxSize: this.requirements.maxSize,
        minElders: this.requirements.minElders,
        minServants: this.requirements.minServants,
        minPioneers: this.requirements.minPioneers,
        minLeaders: this.requirements.minLeaders,
        minHelpers: this.requirements.minHelpers,
        minPublishers: this.requirements.minPublishers
      },
      createdAt: this.createdAt,
      updatedAt: Date.now() // Update timestamp on save
    };
  }
  
  /**
   * Create a group instance from a plain object
   * @param {Object} json - Plain object representation
   * @returns {Group} Group instance
   */
  static fromJSON(json) {
    return new Group(json);
  }
  
  /**
   * Update the group with new data
   * @param {Object} data - New group data
   */
  update(data) {
    // Update properties if provided
    if (data.name !== undefined) {
      this.name = data.name;
    }
    
    if (data.color !== undefined) {
      this.color = data.color;
    }
    
    // Update requirements if provided
    if (data.requirements) {
      this.requirements = {
        ...this.requirements,
        ...data.requirements
      };
    }
    
    // Update the timestamp
    this.updatedAt = Date.now();
  }
  
  /**
   * Set the group's members (persons)
   * Note: This is a transient operation, not persisted directly
   * @param {Array} members - Array of Person objects
   */
  set members(members) {
    this._members = Array.isArray(members) ? [...members] : [];
  }
  
  /**
   * Get the group's members
   * @returns {Array} Array of Person objects
   */
  get members() {
    return this._members;
  }
  
  /**
   * Set the group's meeting points
   * Note: This is a transient operation, not persisted directly
   * @param {Array} meetingPoints - Array of Meeting objects
   */
  set meetingPoints(meetingPoints) {
    this._meetingPoints = Array.isArray(meetingPoints) ? [...meetingPoints] : [];
  }
  
  /**
   * Get the group's meeting points
   * @returns {Array} Array of Meeting objects
   */
  get meetingPoints() {
    return this._meetingPoints;
  }
  
  /**
   * Set whether this group is selected
   * @param {boolean} selected - Whether the group is selected
   */
  set selected(selected) {
    this._selected = Boolean(selected);
  }
  
  /**
   * Get whether this group is selected
   * @returns {boolean} Whether the group is selected
   */
  get selected() {
    return this._selected;
  }
  
  /**
   * Get the number of members in the group
   * @returns {number} Number of members
   */
  get memberCount() {
    return this._members.length;
  }
  
  /**
   * Get the number of meeting points in the group
   * @returns {number} Number of meeting points
   */
  get meetingPointCount() {
    return this._meetingPoints.length;
  }
  
  /**
   * Check if the group meets its requirements
   * @returns {Object} Object with requirements status
   */
  checkRequirements() {
    // Count roles in the group
    const elderCount = this._members.filter(p => p.elder).length;
    const servantCount = this._members.filter(p => p.servant).length;
    const pioneerCount = this._members.filter(p => p.pioneer).length;
    const leaderCount = this._members.filter(p => p.leader).length;
    const helperCount = this._members.filter(p => p.helper).length;
    const publisherCount = this._members.filter(p => p.publisher).length;
    
    // Check each requirement
    const status = {
      minSize: this._members.length >= this.requirements.minSize,
      maxSize: this._members.length <= this.requirements.maxSize,
      minElders: elderCount >= this.requirements.minElders,
      minServants: servantCount >= this.requirements.minServants,
      minPioneers: pioneerCount >= this.requirements.minPioneers,
      minLeaders: leaderCount >= this.requirements.minLeaders,
      minHelpers: helperCount >= this.requirements.minHelpers,
      minPublishers: publisherCount >= this.requirements.minPublishers,
      overallStatus: false
    };
    
    // Overall status is true only if all requirements are met
    status.overallStatus = 
      status.minSize && 
      status.maxSize && 
      status.minElders && 
      status.minServants && 
      status.minPioneers && 
      status.minLeaders && 
      status.minHelpers &&
      status.minPublishers;
    
    return status;
  }
  
  /**
   * Get group statistics
   * @returns {Object} Group statistics
   */
  getStatistics() {
    // Count roles in the group
    const elderCount = this._members.filter(p => p.elder).length;
    const servantCount = this._members.filter(p => p.servant).length;
    const pioneerCount = this._members.filter(p => p.pioneer).length;
    const leaderCount = this._members.filter(p => p.leader).length;
    const helperCount = this._members.filter(p => p.helper).length;
    const publisherCount = this._members.filter(p => p.publisher).length;
    const familyHeadCount = this._members.filter(p => p.familyHead).length;
    const childCount = this._members.filter(p => p.child).length;
    const spouseCount = this._members.filter(p => p.spouse).length;
    
    return {
      totalMembers: this._members.length,
      elders: elderCount,
      servants: servantCount,
      pioneers: pioneerCount,
      leaders: leaderCount,
      helpers: helperCount,
      publishers: publisherCount,
      familyHeads: familyHeadCount,
      children: childCount,
      spouses: spouseCount,
      meetingPoints: this._meetingPoints.length,
      requirements: this.checkRequirements()
    };
  }
  
  /**
   * Calculate the geographical center of the group
   * @returns {Object|null} Center position with lat and lng properties
   */
  calculateCenter() {
    // Combine persons and meeting points
    const allLocations = [
      ...this._members,
      ...this._meetingPoints
    ];
    
    if (allLocations.length === 0) {
      return null;
    }
    
    // Sum up all coordinates
    const sum = allLocations.reduce(
      (acc, item) => {
        acc.lat += item.lat;
        acc.lng += item.lng;
        return acc;
      },
      { lat: 0, lng: 0 }
    );
    
    // Calculate the average
    return {
      lat: sum.lat / allLocations.length,
      lng: sum.lng / allLocations.length
    };
  }
}

export default Group;