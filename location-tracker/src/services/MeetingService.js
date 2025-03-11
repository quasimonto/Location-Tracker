/**
 * MeetingService.js
 * Service for managing meeting points
 */

import { stateManager } from './StateManager';
import { errorHandler, ErrorType, ErrorSeverity } from '../utils/errorHandler';
import { eventBus } from '../app/EventBus';
import Meeting from '../models/Meeting';
import { getMeetingMarkerIcon } from '../utils/mapUtils';
import { getMap, addMarker, removeMarker } from './MapService';

/**
 * Service for managing meeting points
 */
class MeetingService {
  constructor() {
    // Initialize meetings if they exist in state
    this.loadMeetings();
    
    // Subscribe to relevant events
    this.setupEventSubscriptions();
  }
  
  /**
   * Load meetings from state manager
   */
  loadMeetings() {
    const meetingData = stateManager.getState('meetingPoints') || [];
    
    // Convert plain objects to Meeting instances
    const meetings = meetingData.map(data => Meeting.fromJSON(data));
    
    // Store meetings locally
    this.meetings = meetings;
    
    // Create markers for meetings
    this.createMeetingMarkers();
  }
  
  /**
   * Set up event subscriptions
   */
  setupEventSubscriptions() {
    // Listen for map ready event to create markers
    eventBus.on(eventBus.EVENT_TYPES.MAP_READY, () => {
      this.createMeetingMarkers();
    });
    
    // Listen for meeting creation events from the map
    eventBus.on(eventBus.EVENT_TYPES.MEETING_CREATED, (data) => {
      this.createMeeting({
        name: data.meeting.name,
        description: data.meeting.description,
        lat: data.location.lat,
        lng: data.location.lng
      }, data.marker);
    });
  }
  
  /**
   * Create markers for all meetings
   */
  createMeetingMarkers() {
    const map = getMap();
    if (!map || !this.meetings || this.meetings.length === 0) {
      return;
    }
    
    this.meetings.forEach(meeting => {
      // Only create marker if it doesn't exist
      if (!meeting.marker) {
        const marker = addMarker({
          position: meeting.getPosition(),
          draggable: true,
          icon: getMeetingMarkerIcon(meeting)
        });
        
        // Store marker reference in meeting
        meeting.marker = marker;
        
        // Add event listeners
        this.setupMarkerEventListeners(meeting);
      }
    });
  }
  
  /**
   * Set up event listeners for meeting markers
   * @param {Meeting} meeting - Meeting to set up listeners for
   */
  setupMarkerEventListeners(meeting) {
    if (!meeting.marker) return;
    
    // Click listener
    meeting.marker.addListener('click', () => {
      this.selectMeeting(meeting.id);
      eventBus.emit(eventBus.EVENT_TYPES.MEETING_SELECTED, { meeting });
    });
    
    // Drag end listener to update position
    meeting.marker.addListener('dragend', () => {
      const position = meeting.marker.getPosition();
      meeting.setPosition(position.lat(), position.lng());
      this.updateMeeting(meeting);
    });
  }
  
  /**
   * Create a new meeting
   * @param {Object} meetingData - Meeting data
   * @param {Object} [existingMarker] - Optional existing marker
   * @returns {Meeting} The created meeting
   */
  createMeeting(meetingData, existingMarker = null) {
    try {
      // Create a new meeting instance
      const meeting = new Meeting(meetingData);
      
      // Validate the meeting
      if (!meeting.validate()) {
        throw new Error('Invalid meeting data');
      }
      
      // Use existing marker or create a new one
      if (existingMarker) {
        meeting.marker = existingMarker;
      } else {
        const marker = addMarker({
          position: meeting.getPosition(),
          draggable: true,
          icon: getMeetingMarkerIcon(meeting)
        });
        
        meeting.marker = marker;
      }
      
      // Setup marker event listeners
      this.setupMarkerEventListeners(meeting);
      
      // Add to local collection
      this.meetings.push(meeting);
      
      // Save to state
      this.saveMeetings();
      
      // Emit event
      eventBus.emit(eventBus.EVENT_TYPES.MEETING_CREATED, { meeting });
      
      return meeting;
    } catch (error) {
      errorHandler.handleError(
        error,
        'Creating Meeting',
        ErrorSeverity.ERROR,
        ErrorType.VALIDATION
      );
      return null;
    }
  }
  
  /**
   * Get a meeting by ID
   * @param {string} id - Meeting ID
   * @returns {Meeting|null} The meeting or null if not found
   */
  getMeeting(id) {
    return this.meetings.find(meeting => meeting.id === id) || null;
  }
  
  /**
   * Get all meetings
   * @returns {Array} Array of meetings
   */
  getAllMeetings() {
    return [...this.meetings];
  }
  
  /**
   * Update a meeting
   * @param {Meeting|Object} meetingData - Meeting or meeting data with ID
   * @returns {Meeting|null} The updated meeting or null if not found
   */
  updateMeeting(meetingData) {
    try {
      // If the input is already a Meeting instance
      if (meetingData instanceof Meeting) {
        const index = this.meetings.findIndex(m => m.id === meetingData.id);
        if (index === -1) {
          throw new Error(`Meeting with ID ${meetingData.id} not found`);
        }
        
        // Update the meeting in the collection
        this.meetings[index] = meetingData;
        
        // Update the marker
        if (meetingData.marker) {
          meetingData.marker.setPosition(meetingData.getPosition());
          meetingData.marker.setIcon(getMeetingMarkerIcon(meetingData));
        }
        
        // Save to state
        this.saveMeetings();
        
        // Emit event
        eventBus.emit(eventBus.EVENT_TYPES.MEETING_UPDATED, { meeting: meetingData });
        
        return meetingData;
      }
      
      // If the input is a plain object with an ID
      if (meetingData && meetingData.id) {
        const meeting = this.getMeeting(meetingData.id);
        if (!meeting) {
          throw new Error(`Meeting with ID ${meetingData.id} not found`);
        }
        
        // Update the meeting
        meeting.update(meetingData);
        
        // Update the marker
        if (meeting.marker) {
          meeting.marker.setPosition(meeting.getPosition());
          meeting.marker.setIcon(getMeetingMarkerIcon(meeting));
        }
        
        // Save to state
        this.saveMeetings();
        
        // Emit event
        eventBus.emit(eventBus.EVENT_TYPES.MEETING_UPDATED, { meeting });
        
        return meeting;
      }
      
      throw new Error('Invalid meeting data for update');
    } catch (error) {
      errorHandler.handleError(
        error,
        'Updating Meeting',
        ErrorSeverity.ERROR,
        ErrorType.VALIDATION
      );
      return null;
    }
  }
  
  /**
   * Delete a meeting
   * @param {string} id - Meeting ID
   * @returns {boolean} Whether the deletion was successful
   */
  deleteMeeting(id) {
    try {
      const index = this.meetings.findIndex(meeting => meeting.id === id);
      if (index === -1) {
        throw new Error(`Meeting with ID ${id} not found`);
      }
      
      // Get the meeting for event emission
      const meeting = this.meetings[index];
      
      // Remove the marker
      if (meeting.marker) {
        removeMarker(meeting.marker);
      }
      
      // Remove from the collection
      this.meetings.splice(index, 1);
      
      // Save to state
      this.saveMeetings();
      
      // Emit event
      eventBus.emit(eventBus.EVENT_TYPES.MEETING_DELETED, { meetingId: id });
      
      return true;
    } catch (error) {
      errorHandler.handleError(
        error,
        'Deleting Meeting',
        ErrorSeverity.ERROR,
        ErrorType.UNKNOWN
      );
      return false;
    }
  }
  
  /**
   * Select a meeting
   * @param {string} id - Meeting ID
   * @returns {Meeting|null} The selected meeting or null if not found
   */
  selectMeeting(id) {
    // Deselect all meetings
    this.meetings.forEach(meeting => {
      meeting.selected = false;
    });
    
    // Find and select the specified meeting
    const meeting = this.getMeeting(id);
    if (meeting) {
      meeting.selected = true;
      return meeting;
    }
    
    return null;
  }
  
  /**
   * Filter meetings based on criteria
   * @param {Object} criteria - Filter criteria
   * @returns {Array} Filtered meetings
   */
  filterMeetings(criteria = {}) {
    let filteredMeetings = [...this.meetings];
    
    // Filter by name
    if (criteria.name) {
      const nameFilter = criteria.name.toLowerCase();
      filteredMeetings = filteredMeetings.filter(meeting => 
        meeting.name.toLowerCase().includes(nameFilter)
      );
    }
    
    // Filter by group
    if (criteria.group) {
      filteredMeetings = filteredMeetings.filter(meeting => 
        meeting.group === criteria.group
      );
    }
    
    // Filter by visibility
    if (criteria.visible !== undefined) {
      filteredMeetings = filteredMeetings.filter(meeting => 
        meeting.visible === criteria.visible
      );
    }
    
    return filteredMeetings;
  }
  
  /**
   * Assign a meeting to a group
   * @param {string} meetingId - Meeting ID
   * @param {string} groupId - Group ID
   * @returns {Meeting|null} The updated meeting or null if not found
   */
  assignToGroup(meetingId, groupId) {
    const meeting = this.getMeeting(meetingId);
    if (!meeting) {
      return null;
    }
    
    // Update the meeting
    meeting.group = groupId;
    
    // Update the marker
    if (meeting.marker) {
      meeting.marker.setIcon(getMeetingMarkerIcon(meeting));
    }
    
    // Save to state
    this.saveMeetings();
    
    // Emit event
    eventBus.emit(eventBus.EVENT_TYPES.MEETING_UPDATED, { meeting });
    
    return meeting;
  }
  
  /**
   * Save meetings to state manager
   */
  saveMeetings() {
    // Convert all meetings to plain objects
    const meetingData = this.meetings.map(meeting => meeting.toJSON());
    
    // Save to state manager
    stateManager.setState('meetingPoints', meetingData);
  }
  
  /**
   * Set the visibility of all meetings
   * @param {boolean} visible - Whether the meetings should be visible
   */
  setAllVisibility(visible) {
    this.meetings.forEach(meeting => {
      meeting.visible = visible;
    });
    
    // Emit an event about the visibility change
    eventBus.emit(eventBus.EVENT_TYPES.UI_FILTER_CHANGED, { 
      type: 'meetings', 
      visible 
    });
  }
  
  /**
   * Find meetings near a location
   * @param {Object} location - Location with lat and lng properties
   * @param {number} radius - Search radius in meters
   * @returns {Array} Meetings within the radius
   */
  findMeetingsNearLocation(location, radius) {
    return this.meetings.filter(meeting => {
      const distance = meeting.distanceTo(location);
      return distance <= radius;
    });
  }
  
  /**
   * Find the nearest meeting to a location
   * @param {Object} location - Location with lat and lng properties
   * @returns {Object} Nearest meeting and distance
   */
  findNearestMeeting(location) {
    if (this.meetings.length === 0) {
      return { meeting: null, distance: Infinity };
    }
    
    let nearestMeeting = null;
    let shortestDistance = Infinity;
    
    this.meetings.forEach(meeting => {
      const distance = meeting.distanceTo(location);
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestMeeting = meeting;
      }
    });
    
    return {
      meeting: nearestMeeting,
      distance: shortestDistance
    };
  }
}

// Export singleton instance
export const meetingService = new MeetingService();
export default meetingService;