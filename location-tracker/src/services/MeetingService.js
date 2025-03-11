/**
 * MeetingService.js
 * Service for managing Meeting entities in the Location Tracker application
 */

import Meeting from '../models/Meeting';
import { stateManager } from './StateManager';
import { errorHandler, ErrorType, ErrorSeverity } from '../utils/errorHandler';
import { EventBus, Events } from '../app/EventBus';

/**
 * Service for managing meeting points
 */
class MeetingService {
  constructor() {
    // Initialize state tracking
    this.initializeState();
    
    // Subscribe to relevant state changes
    stateManager.subscribe('meetingPoints', this.handleStateUpdate.bind(this));
  }
  
  /**
   * Initialize state tracking
   */
  initializeState() {
    // Cache of all meeting points for quick access
    this.meetingsCache = new Map();
    
    // Load initial meeting points from state
    const meetingsData = stateManager.getState('meetingPoints') || [];
    meetingsData.forEach(meetingData => {
      const meeting = Meeting.fromJSON(meetingData);
      this.meetingsCache.set(meeting.id, meeting);
    });
  }
  
  /**
   * Handle state updates
   * @param {Array} meetingsData - Updated meetings data
   */
  handleStateUpdate(meetingsData) {
    // Clear and rebuild cache when state changes externally
    this.meetingsCache.clear();
    
    // Update cache with new data
    meetingsData.forEach(meetingData => {
      const meeting = Meeting.fromJSON(meetingData);
      this.meetingsCache.set(meeting.id, meeting);
    });
    
    // Notify that meetings have been updated
    EventBus.publish(Events.MEETINGS_UPDATED, Array.from(this.meetingsCache.values()));
  }
  
  /**
   * Get all meeting points
   * @returns {Array<Meeting>} All meeting points
   */
  getAllMeetings() {
    return Array.from(this.meetingsCache.values());
  }
  
  /**
   * Get a meeting point by ID
   * @param {string} id - Meeting ID
   * @returns {Meeting|null} Meeting or null if not found
   */
  getMeetingById(id) {
    return this.meetingsCache.get(id) || null;
  }
  
  /**
   * Create a new meeting point
   * @param {Object} meetingData - Meeting data
   * @returns {Meeting} Created meeting
   */
  createMeeting(meetingData) {
    try {
      // Create new meeting instance
      const meeting = new Meeting(meetingData);
      
      // Validate the meeting
      if (!meeting.validate()) {
        throw new Error('Meeting validation failed');
      }
      
      // Add to cache
      this.meetingsCache.set(meeting.id, meeting);
      
      // Update state
      this.updateState();
      
      // Notify that a meeting was created
      EventBus.publish(Events.MEETING_CREATED, meeting);
      
      return meeting;
    } catch (error) {
      errorHandler.handleError(
        error,
        'Creating Meeting',
        ErrorSeverity.ERROR,
        ErrorType.VALIDATION
      );
      throw error;
    }
  }
  
  /**
   * Update an existing meeting
   * @param {string} id - Meeting ID
   * @param {Object} updates - Meeting data updates
   * @returns {Meeting|null} Updated meeting or null if not found
   */
  updateMeeting(id, updates) {
    try {
      // Find existing meeting
      const existingMeeting = this.meetingsCache.get(id);
      if (!existingMeeting) {
        throw new Error(`Meeting with ID ${id} not found`);
      }
      
      // Create updated meeting with current data plus updates
      const updatedMeetingData = {
        ...existingMeeting.toJSON(),
        ...updates,
        id // Ensure ID stays the same
      };
      
      const updatedMeeting = new Meeting(updatedMeetingData);
      
      // Validate the updated meeting
      if (!updatedMeeting.validate()) {
        throw new Error('Updated meeting validation failed');
      }
      
      // Update in cache
      this.meetingsCache.set(id, updatedMeeting);
      
      // Update state
      this.updateState();
      
      // Notify that a meeting was updated
      EventBus.publish(Events.MEETING_UPDATED, updatedMeeting);
      
      return updatedMeeting;
    } catch (error) {
      errorHandler.handleError(
        error,
        'Updating Meeting',
        ErrorSeverity.ERROR,
        ErrorType.VALIDATION
      );
      throw error;
    }
  }
  
  /**
   * Delete a meeting
   * @param {string} id - Meeting ID
   * @returns {boolean} Whether the meeting was deleted
   */
  deleteMeeting(id) {
    try {
      // Find existing meeting
      const existingMeeting = this.meetingsCache.get(id);
      if (!existingMeeting) {
        throw new Error(`Meeting with ID ${id} not found`);
      }
      
      // Remove from cache
      this.meetingsCache.delete(id);
      
      // Update state
      this.updateState();
      
      // Notify that a meeting was deleted
      EventBus.publish(Events.MEETING_DELETED, id);
      
      return true;
    } catch (error) {
      errorHandler.handleError(
        error,
        'Deleting Meeting',
        ErrorSeverity.ERROR,
        ErrorType.UNKNOWN
      );
      throw error;
    }
  }
  
  /**
   * Update the application state with current cache
   */
  updateState() {
    // Convert cache to array of serialized meetings
    const meetingsData = Array.from(this.meetingsCache.values()).map(meeting => meeting.toJSON());
    
    // Update state
    stateManager.setState('meetingPoints', meetingsData);
  }
  
  /**
   * Filter meetings by criteria
   * @param {Object} filters - Filter criteria
   * @returns {Array<Meeting>} Filtered meetings
   */
  filterMeetings(filters = {}) {
    let filtered = Array.from(this.meetingsCache.values());
    
    // Filter by name
    if (filters.name) {
      const nameFilter = filters.name.toLowerCase();
      filtered = filtered.filter(meeting => 
        meeting.name.toLowerCase().includes(nameFilter)
      );
    }
    
    // Filter by description
    if (filters.description) {
      const descriptionFilter = filters.description.toLowerCase();
      filtered = filtered.filter(meeting => 
        meeting.description.toLowerCase().includes(descriptionFilter)
      );
    }
    
    // Filter by group
    if (filters.groupId) {
      filtered = filtered.filter(meeting => meeting.group === filters.groupId);
    }
    
    // Filter by position
    if (filters.position && filters.radius) {
      const { lat, lng } = filters.position;
      const radiusInKm = filters.radius;
      
      filtered = filtered.filter(meeting => {
        // Calculate distance using Haversine formula
        const distance = this.calculateDistance(
          lat, lng, 
          meeting.lat, meeting.lng
        );
        
        return distance <= radiusInKm;
      });
    }
    
    return filtered;
  }
  
  /**
   * Calculate distance between two points using Haversine formula
   * @param {number} lat1 - Latitude of first point
   * @param {number} lng1 - Longitude of first point
   * @param {number} lat2 - Latitude of second point
   * @param {number} lng2 - Longitude of second point
   * @returns {number} Distance in kilometers
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    
    return distance;
  }
  
  /**
   * Convert degrees to radians
   * @param {number} deg - Degrees
   * @returns {number} Radians
   */
  deg2rad(deg) {
    return deg * (Math.PI / 180);
  }
  
  /**
   * Get meetings by group
   * @param {string} groupId - Group ID
   * @returns {Array<Meeting>} Meetings in the group
   */
  getMeetingsByGroup(groupId) {
    return Array.from(this.meetingsCache.values())
      .filter(meeting => meeting.group === groupId);
  }
  
  /**
   * Assign meeting to a group
   * @param {string} meetingId - Meeting ID
   * @param {string} groupId - Group ID
   * @returns {Meeting|null} Updated meeting or null if not found
   */
  assignMeetingToGroup(meetingId, groupId) {
    return this.updateMeeting(meetingId, { group: groupId });
  }
  
  /**
   * Remove meeting from its group
   * @param {string} meetingId - Meeting ID
   * @returns {Meeting|null} Updated meeting or null if not found
   */
  removeMeetingFromGroup(meetingId) {
    return this.updateMeeting(meetingId, { group: null });
  }
  
  /**
   * Update meeting's position
   * @param {string} meetingId - Meeting ID
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Meeting|null} Updated meeting or null if not found
   */
  updateMeetingPosition(meetingId, lat, lng) {
    return this.updateMeeting(meetingId, { lat, lng });
  }
  
  /**
   * Find nearest meeting to a position
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Object} Nearest meeting and distance in km
   */
  findNearestMeeting(lat, lng) {
    const meetings = Array.from(this.meetingsCache.values());
    if (meetings.length === 0) {
      return { meeting: null, distance: Infinity };
    }
    
    let nearestMeeting = null;
    let minDistance = Infinity;
    
    meetings.forEach(meeting => {
      const distance = this.calculateDistance(lat, lng, meeting.lat, meeting.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearestMeeting = meeting;
      }
    });
    
    return { 
      meeting: nearestMeeting, 
      distance: minDistance 
    };
  }
  
  /**
   * Get meetings sorted by distance from a position
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Array<Object>} Meetings with distances, sorted by proximity
   */
  getMeetingsSortedByDistance(lat, lng) {
    const meetings = Array.from(this.meetingsCache.values());
    
    // Calculate distances
    const meetingsWithDistances = meetings.map(meeting => {
      const distance = this.calculateDistance(lat, lng, meeting.lat, meeting.lng);
      return { meeting, distance };
    });
    
    // Sort by distance (ascending)
    meetingsWithDistances.sort((a, b) => a.distance - b.distance);
    
    return meetingsWithDistances;
  }
}

// Export a singleton instance
export const meetingService = new MeetingService();
export default meetingService;