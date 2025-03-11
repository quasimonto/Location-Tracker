/**
 * Group.js
 * Model representing a group in the Location Tracker application
 */

import { errorHandler, ErrorType, ErrorSeverity } from '../utils/errorHandler';
import { getRandomColor } from '../utils/mapUtils';

/**
 * Group class representing a collection of people and meeting points
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
    this.color = data.color || getRandomColor();
    
    // Requirements
    this.requirements = {
      minElders: data.requirements?.minElders ?? 0,
      minServants: data.requirements?.minServants ?? 0,
      minPioneers: data.requirements?.minPioneers ?? 0,
      minLeaders: data.requirements?.minLeaders ?? 1,
      minHelpers: data.requirements?.minHelpers ?? 1,
      minPublishers: data.requirements?.minPublishers ?? 0
    };
    
    // Group membership (maintained externally via Group Service)
    // These are just for reference, not the source of truth
    this._personIds = Array.isArray(data.personIds) ? [...data.personIds] : [];
    this._meetingIds = Array.isArray(data.meetingIds) ? [...data.meetingIds] : [];
    
    // Metadata
    this.createdAt = data.createdAt || Date.now();
    this.updatedAt = data.updatedAt || Date.now();
    
    // Display properties (transient, not persisted)
    this._selected = false;
    this._visible = true;
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
    
    // Color must be a valid color string
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!this.color || !colorRegex.test(this.color)) {
      errors.push('Color must be a valid hex color');
      isValid = false;
    }
    
    // Requirements must make sense
    const reqs = this.requirements;
    if (
      reqs.minElders < 0 || reqs.minServants < 0 || reqs.minPioneers < 0 ||
      reqs.minLeaders < 0 || reqs.minHelpers < 0 || reqs.minPublishers < 0
    ) {
      errors.push('Requirements cannot be negative');
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
      requirements: { ...this.requirements },
      personIds: [...this._personIds],
      meetingIds: [...this._meetingIds],
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
   * Set whether this group is visible
   * @param {boolean} visible - Whether the group is visible
   */
  set visible(visible) {
    this._visible = Boolean(visible);
  }
  
  /**
   * Get whether this group is visible
   * @returns {boolean} Whether the group is visible
   */
  get visible() {
    return this._visible;
  }
  
  /**
   * Get the person IDs in this group
   * @returns {Array} Array of person IDs
   */
  get personIds() {
    return [...this._personIds];
  }
  
  /**
   * Get the meeting point IDs in this group
   * @returns {Array} Array of meeting point IDs
   */
  get meetingIds() {
    return [...this._meetingIds];
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
    
    if (data.requirements !== undefined) {
      this.requirements = {
        minElders: data.requirements.minElders ?? this.requirements.minElders,
        minServants: data.requirements.minServants ?? this.requirements.minServants,
        minPioneers: data.requirements.minPioneers ?? this.requirements.minPioneers,
        minLeaders: data.requirements.minLeaders ?? this.requirements.minLeaders,
        minHelpers: data.requirements.minHelpers ?? this.requirements.minHelpers,
        minPublishers: data.requirements.minPublishers ?? this.requirements.minPublishers
      };
    }
    
    // Update the timestamp
    this.updatedAt = Date.now();
  }
  
  /**
   * Check if the group meets its requirements
   * @param {Array} persons - Array of person objects to check against
   * @returns {Object} Result with status and explanation
   */
  meetsRequirements(persons) {
    if (!Array.isArray(persons) || persons.length === 0) {
      return {
        meets: false,
        explanation: 'No people to check requirements against'
      };
    }
    
    // Count roles in the provided persons
    const elderCount = persons.filter(p => p.elder).length;
    const servantCount = persons.filter(p => p.servant).length;
    const pioneerCount = persons.filter(p => p.pioneer).length;
    const leaderCount = persons.filter(p => p.leader).length;
    const helperCount = persons.filter(p => p.helper).length;
    const publisherCount = persons.filter(p => p.publisher).length;
    
    // Check each requirement
    const failedRequirements = [];
    
    if (elderCount < this.requirements.minElders) {
      failedRequirements.push(`Elders: ${elderCount}/${this.requirements.minElders}`);
    }
    
    if (servantCount < this.requirements.minServants) {
      failedRequirements.push(`Servants: ${servantCount}/${this.requirements.minServants}`);
    }
    
    if (pioneerCount < this.requirements.minPioneers) {
      failedRequirements.push(`Pioneers: ${pioneerCount}/${this.requirements.minPioneers}`);
    }
    
    if (leaderCount < this.requirements.minLeaders) {
      failedRequirements.push(`Leaders: ${leaderCount}/${this.requirements.minLeaders}`);
    }
    
    if (helperCount < this.requirements.minHelpers) {
      failedRequirements.push(`Helpers: ${helperCount}/${this.requirements.minHelpers}`);
    }
    
    if (publisherCount < this.requirements.minPublishers) {
      failedRequirements.push(`Publishers: ${publisherCount}/${this.requirements.minPublishers}`);
    }
    
    // Return result
    return {
      meets: failedRequirements.length === 0,
      explanation: failedRequirements.length === 0
        ? 'Group meets all requirements'
        : `Group does not meet requirements: ${failedRequirements.join(', ')}`,
      counts: {
        elders: elderCount,
        servants: servantCount,
        pioneers: pioneerCount,
        leaders: leaderCount,
        helpers: helperCount,
        publishers: publisherCount,
        total: persons.length
      }
    };
  }
  
  /**
   * Add a person to the group
   * @param {string} personId - ID of the person to add
   */
  addPerson(personId) {
    if (!this._personIds.includes(personId)) {
      this._personIds.push(personId);
    }
  }
  
  /**
   * Remove a person from the group
   * @param {string} personId - ID of the person to remove
   */
  removePerson(personId) {
    this._personIds = this._personIds.filter(id => id !== personId);
  }
  
  /**
   * Add a meeting to the group
   * @param {string} meetingId - ID of the meeting to add
   */
  addMeeting(meetingId) {
    if (!this._meetingIds.includes(meetingId)) {
      this._meetingIds.push(meetingId);
    }
  }
  
  /**
   * Remove a meeting from the group
   * @param {string} meetingId - ID of the meeting to remove
   */
  removeMeeting(meetingId) {
    this._meetingIds = this._meetingIds.filter(id => id !== meetingId);
  }
  
  /**
   * Get group statistics
   * @param {Array} persons - Array of person objects in this group
   * @param {Array} meetings - Array of meeting objects in this group
   * @returns {Object} Group statistics
   */
  getStatistics(persons, meetings) {
    const personCount = persons?.length || 0;
    const meetingCount = meetings?.length || 0;
    
    // Role counts
    const elderCount = persons?.filter(p => p.elder).length || 0;
    const servantCount = persons?.filter(p => p.servant).length || 0;
    const pioneerCount = persons?.filter(p => p.pioneer).length || 0;
    const leaderCount = persons?.filter(p => p.leader).length || 0;
    const helperCount = persons?.filter(p => p.helper).length || 0;
    const publisherCount = persons?.filter(p => p.publisher).length || 0;
    const childCount = persons?.filter(p => p.child).length || 0;
    
    // Requirements fulfillment
    const requirementsMet = this.meetsRequirements(persons || []);
    
    return {
      personCount,
      meetingCount,
      roles: {
        elders: elderCount,
        servants: servantCount,
        pioneers: pioneerCount,
        leaders: leaderCount,
        helpers: helperCount,
        publishers: publisherCount,
        children: childCount
      },
      requirementsMet: requirementsMet.meets,
      requirementsExplanation: requirementsMet.explanation
    };
  }
}

export default Group;