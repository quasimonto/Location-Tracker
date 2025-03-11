/**
 * WorkflowController.js
 * Coordinates workflows between UI components and services
 */

import { EventBus, Events } from '../app/EventTypes';
import { getMapClickMode, setMapClickMode } from '../services/MapService';
import personService from '../services/PersonService';
import meetingService from '../services/MeetingService';
import groupService from '../services/GroupService';
import { formManager } from '../ui/components/FormManager';
import { errorHandler, ErrorType, ErrorSeverity } from '../utils/errorHandler';

class WorkflowController {
  constructor() {
    // Initialize controller
    this.selectedEntity = null;
    this.selectedEntityType = null;
    
    // Set up event subscriptions
    this.setupEventSubscriptions();
  }
  
  /**
   * Set up event subscriptions
   */
  setupEventSubscriptions() {
    // Map click handling for entity creation
    EventBus.on(Events.MAP_CLICKED, (event) => {
      this.handleMapClick(event);
    });
    
    // Selection events
    EventBus.on(Events.PERSON_SELECTED, (person) => {
      this.handleEntitySelection(person, 'person');
    });
    
    EventBus.on(Events.MEETING_SELECTED, (meeting) => {
      this.handleEntitySelection(meeting, 'meeting');
    });
    
    EventBus.on(Events.GROUP_SELECTED, (group) => {
      this.handleEntitySelection(group, 'group');
    });
    
    // Action events
    EventBus.on(Events.SHOW_TRAVEL_TIMES, (origin) => {
      this.showTravelTimes(origin);
    });
    
    EventBus.on(Events.ADD_PERSON_CLICKED, () => {
      setMapClickMode('person');
    });
    
    EventBus.on(Events.ADD_MEETING_CLICKED, () => {
      setMapClickMode('meeting');
    });
  }
  
  /**
   * Handle map click based on current mode
   * @param {Object} event - Map click event
   */
  handleMapClick(event) {
    try {
      const mode = getMapClickMode();
      const location = event.detail.location;
      
      if (!mode || !location) return;
      
      switch (mode) {
        case 'person':
          this.createPersonAtLocation(location);
          break;
        case 'meeting':
          this.createMeetingAtLocation(location);
          break;
      }
      
      // Reset map click mode after creation
      setMapClickMode(null);
    } catch (error) {
      errorHandler.handleError(
        error,
        'Handling Map Click',
        ErrorSeverity.ERROR,
        ErrorType.UNKNOWN
      );
    }
  }
  
  /**
   * Create a person at a specific location
   * @param {Object} location - Location {lat, lng}
   */
  createPersonAtLocation(location) {
    try {
      // Create default person data
      const personData = {
        name: 'New Person',
        lat: location.lat,
        lng: location.lng
      };
      
      // Create person via service
      const person = personService.createPerson(personData);
      
      // Open edit form to complete details
      formManager.editPersonForm(person, {
        onSave: (updatedPerson) => {
          // Select the newly created person
          EventBus.publish(Events.PERSON_SELECTED, updatedPerson);
        }
      });
    } catch (error) {
      errorHandler.handleError(
        error,
        'Creating Person at Location',
        ErrorSeverity.ERROR,
        ErrorType.UNKNOWN
      );
    }
  }
  
  /**
   * Create a meeting at a specific location
   * @param {Object} location - Location {lat, lng}
   */
  createMeetingAtLocation(location) {
    try {
      // Create default meeting data
      const meetingData = {
        name: 'New Meeting Point',
        description: '',
        lat: location.lat,
        lng: location.lng
      };
      
      // Create meeting via service
      const meeting = meetingService.createMeeting(meetingData);
      
      // Open edit form to complete details
      formManager.editMeetingForm(meeting, {
        onSave: (updatedMeeting) => {
          // Select the newly created meeting
          EventBus.publish(Events.MEETING_SELECTED, updatedMeeting);
        }
      });
    } catch (error) {
      errorHandler.handleError(
        error,
        'Creating Meeting at Location',
        ErrorSeverity.ERROR,
        ErrorType.UNKNOWN
      );
    }
  }
  
  /**
   * Handle entity selection
   * @param {Object} entity - Selected entity
   * @param {string} type - Entity type
   */
  handleEntitySelection(entity, type) {
    // Store current selection
    this.selectedEntity = entity;
    this.selectedEntityType = type;
    
    // Sync selection with UI components
    this.syncEntitySelection(entity, type);
  }
  
  /**
   * Synchronize entity selection between sidebar and map
   * @param {Object} entity - Selected entity
   * @param {string} type - Entity type
   */
  syncEntitySelection(entity, type) {
    try {
      // Map is handled via events, no direct action needed here
      
      // Update sidebar selection if it has a list of this entity type
      const listContainer = document.getElementById(`${type}s-list`);
      if (listContainer) {
        const listItem = listContainer.querySelector(`[data-id="${entity.id}"]`);
        if (listItem) {
          // Remove selected class from all items
          const items = listContainer.querySelectorAll('.entity-item');
          items.forEach(item => item.classList.remove('selected'));
          
          // Add selected class to this item
          listItem.classList.add('selected');
          
          // Scroll to selected item
          listItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    } catch (error) {
      errorHandler.handleError(
        error,
        'Syncing Entity Selection',
        ErrorSeverity.WARNING,
        ErrorType.UNKNOWN
      );
    }
  }
  
  /**
   * Show travel times from a source entity
   * @param {Object} origin - Origin entity
   */
  showTravelTimes(origin) {
    try {
      // Publish event to display travel time panel
      EventBus.publish(Events.DISPLAY_TRAVEL_TIMES, {
        origin,
        type: this.selectedEntityType
      });
    } catch (error) {
      errorHandler.handleError(
        error,
        'Showing Travel Times',
        ErrorSeverity.WARNING,
        ErrorType.UNKNOWN
      );
    }
  }
}

// Export singleton instance
export const workflowController = new WorkflowController();
export default workflowController;