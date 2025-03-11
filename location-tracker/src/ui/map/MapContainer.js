/**
 * MapContainer.js
 * Main map component for the Location Tracker application
 */

import { EventBus, Events } from '../../app/EventTypes';
import { stateManager } from '../../services/StateManager';
import { 
  initMapService, 
  getMap, 
  getMapClickMode, 
  setMapClickMode,
  addMarker,
  removeMarker,
  centerMap,
  fitBounds
} from '../../services/MapService';
import { errorHandler, ErrorType, ErrorSeverity } from '../../utils/errorHandler';
import { getPersonMarkerIcon, getMeetingMarkerIcon } from '../../utils/mapUtils';
import personService from '../../services/PersonService';
import meetingService from '../../services/MeetingService';
import groupService from '../../services/GroupService';
import InfoWindow from './InfoWindow';
import MapControls from './MapControls';
import TravelTimePanel from '../components/TravelTimePanel';
import GroupVisualization from './GroupVisualization';
import workflowController from '../../controllers/WorkflowController';

/**
 * MapContainer class for the main map display
 */
class MapContainer {
  /**
   * Create a new MapContainer instance
   * @param {HTMLElement} container - Container element to render the map in
   * @param {Object} options - Configuration options
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      defaultCenter: { lat: 48.2082, lng: 16.3738 }, // Vienna, Austria
      defaultZoom: 13,
      ...options
    };
    
    // Map instance
    this.map = null;
    
    // Marker collections
    this.personMarkers = new Map();
    this.meetingMarkers = new Map();
    
    // Info window instance
    this.infoWindow = null;
    
    // Map controls
    this.mapControls = null;
    
    // Travel time panel
    this.travelTimePanel = null;
    
    // Group visualization
    this.groupVisualization = null;
    
    // Selected entity
    this.selectedEntityId = null;
    this.selectedEntityType = null;
    
    // Initialize map when API is available
    this.initMap();
  }
  
  /**
   * Initialize the map
   */
  async initMap() {
    try {
      // Initialize the map service
      this.map = await initMapService(this.container, {
        center: this.options.defaultCenter,
        zoom: this.options.defaultZoom,
        mapTypeControl: true,
        streetViewControl: true,
        zoomControl: true,
        fullscreenControl: true
      });
      
      // Create info window instance
      this.infoWindow = new InfoWindow(this.map);
      
      // Create map controls
      this.mapControls = new MapControls(this.map);
      
      // Create travel time panel
      this.travelTimePanel = TravelTimePanel.create(document.body);
      
      // Create group visualization
      this.groupVisualization = GroupVisualization.create(this.map);
      
      // Subscribe to state changes
      this.subscribeToStateChanges();
      
      // Subscribe to events
      this.subscribeToEvents();
      
      // Initialize markers
      this.initializeMarkers();
      
      // Initialize group visualizations
      this.initializeGroupVisualizations();
      
      // Publish map ready event
      EventBus.publish(Events.MAP_READY, this.map);
    } catch (error) {
      errorHandler.handleError(
        error,
        'Map Container Initialization',
        ErrorSeverity.ERROR,
        ErrorType.MAP
      );
      
      // Show error message in container
      this.showMapError('Failed to initialize map');
    }
  }
  
  /**
   * Subscribe to state changes
   */
  subscribeToStateChanges() {
    // Subscribe to persons changes
    stateManager.subscribe('persons', (persons) => {
      this.updatePersonMarkers(persons);
    });
    
    // Subscribe to meeting points changes
    stateManager.subscribe('meetingPoints', (meetings) => {
      this.updateMeetingMarkers(meetings);
    });
    
    // Subscribe to visibility settings
    stateManager.subscribe('ui.filters.visibility', (visibility) => {
      this.updateVisibility(visibility);
    });
    
    // Subscribe to map click mode
    stateManager.subscribe('ui.mapClickMode', (mode) => {
      this.updateMapClickMode(mode);
    });
    
    // Subscribe to selection changes
    stateManager.subscribe('ui.selectedPerson', (personId) => {
      if (personId) {
        this.selectEntity(personId, 'person');
      }
    });
    
    stateManager.subscribe('ui.selectedMeeting', (meetingId) => {
      if (meetingId) {
        this.selectEntity(meetingId, 'meeting');
      }
    });
  }
  
  /**
   * Subscribe to events
   */
  subscribeToEvents() {
    // Person events
    EventBus.on(Events.PERSON_CREATED, (person) => {
      this.addPersonMarker(person);
    });
    
    EventBus.on(Events.PERSON_UPDATED, (person) => {
      this.updatePersonMarker(person);
    });
    
    EventBus.on(Events.PERSON_DELETED, (personId) => {
      this.removePersonMarker(personId);
    });
    
    EventBus.on(Events.PERSON_SELECTED, (person) => {
      this.selectEntity(person.id, 'person');
    });
    
    // Meeting events
    EventBus.on(Events.MEETING_CREATED, (meeting) => {
      this.addMeetingMarker(meeting);
    });
    
    EventBus.on(Events.MEETING_UPDATED, (meeting) => {
      this.updateMeetingMarker(meeting);
    });
    
    EventBus.on(Events.MEETING_DELETED, (meetingId) => {
      this.removeMeetingMarker(meetingId);
    });
    
    EventBus.on(Events.MEETING_SELECTED, (meeting) => {
      this.selectEntity(meeting.id, 'meeting');
    });
    
    // Group events
    EventBus.on(Events.GROUP_CREATED, (group) => {
      if (this.groupVisualization) {
        this.groupVisualization.visualizeGroup(group.id);
      }
    });
    
    EventBus.on(Events.GROUP_UPDATED, (group) => {
      if (this.groupVisualization) {
        this.groupVisualization.updateGroupVisualization(group.id);
      }
    });
    
    EventBus.on(Events.GROUP_DELETED, (groupId) => {
      if (this.groupVisualization) {
        this.groupVisualization.removeGroupVisualization(groupId);
      }
    });
    
    // Travel time events
    EventBus.on(Events.SHOW_TRAVEL_TIMES, (origin) => {
      if (this.travelTimePanel) {
        this.travelTimePanel.show(origin, this.getEntityType(origin));
      }
    });
    
    // Map action events
    EventBus.on(Events.CENTER_MAP, (location) => {
      this.centerMap(location);
    });
    
    EventBus.on(Events.FIT_BOUNDS, (entities) => {
      this.fitBounds(entities);
    });
    
    EventBus.on(Events.FIT_ALL_ENTITIES, () => {
      this.fitAllEntities();
    });
    
    EventBus.on(Events.RESET_MAP_VIEW, () => {
      this.resetMapView();
    });
  }
  
  /**
   * Initialize markers for all entities
   */
  initializeMarkers() {
    try {
      // Add person markers
      const persons = personService.getAllPersons();
      persons.forEach(person => {
        this.addPersonMarker(person);
      });
      
      // Add meeting markers
      const meetings = meetingService.getAllMeetings();
      meetings.forEach(meeting => {
        this.addMeetingMarker(meeting);
      });
    } catch (error) {
      errorHandler.handleError(
        error,
        'Initializing Markers',
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Initialize group visualizations
   */
  initializeGroupVisualizations() {
    try {
      // Visualize all groups
      if (this.groupVisualization) {
        this.groupVisualization.visualizeAllGroups();
      }
    } catch (error) {
      errorHandler.handleError(
        error,
        'Initializing Group Visualizations',
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Add a marker for a person
   * @param {Object} person - Person data
   */
  addPersonMarker(person) {
    try {
      // Skip if already exists
      if (this.personMarkers.has(person.id)) {
        return;
      }
      
      // Find group for color
      let groupColor = null;
      if (person.group) {
        const group = groupService.getGroupById(person.group);
        if (group) {
          groupColor = group.color;
        }
      }
      
      // Create marker
      const marker = addMarker({
        position: { lat: person.lat, lng: person.lng },
        title: person.name,
        draggable: true,
        icon: getPersonMarkerIcon(person, groupColor)
      });
      
      // Add click listener
      marker.addListener('click', () => {
        this.handleMarkerClick(person.id, 'person');
      });
      
      // Add drag listeners
      marker.addListener('dragstart', () => {
        // Close info window if open
        this.infoWindow.close();
        
        // Publish drag start event
        EventBus.publish(Events.MARKER_DRAG_START, {
          id: person.id,
          type: 'person'
        });
      });
      
      marker.addListener('dragend', () => {
        // Get new position
        const position = marker.getPosition();
        const lat = position.lat();
        const lng = position.lng();
        
        // Update person position
        personService.updatePersonPosition(person.id, lat, lng);
        
        // Publish drag end event
        EventBus.publish(Events.MARKER_DRAG_END, {
          id: person.id,
          type: 'person',
          position: { lat, lng }
        });
      });
      
      // Store marker reference
      this.personMarkers.set(person.id, marker);
      
      // Update visibility based on current settings
      const visibility = stateManager.getState('ui.filters.visibility') || { persons: true };
      marker.setVisible(visibility.persons);
      
      // Update person's marker reference
      person.marker = marker;
    } catch (error) {
      errorHandler.handleError(
        error,
        'Adding Person Marker',
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Update a person marker
   * @param {Object} person - Updated person data
   */
  updatePersonMarker(person) {
    try {
      // Remove existing marker
      this.removePersonMarker(person.id);
      
      // Add new marker
      this.addPersonMarker(person);
      
      // Re-select if this was the selected entity
      if (this.selectedEntityId === person.id && this.selectedEntityType === 'person') {
        this.selectEntity(person.id, 'person');
      }
    } catch (error) {
      errorHandler.handleError(
        error,
        'Updating Person Marker',
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Remove a person marker
   * @param {string} personId - Person ID
   */
  removePersonMarker(personId) {
    try {
      const marker = this.personMarkers.get(personId);
      if (marker) {
        // Close info window if this marker was selected
        if (this.selectedEntityId === personId && this.selectedEntityType === 'person') {
          this.infoWindow.close();
          this.selectedEntityId = null;
          this.selectedEntityType = null;
        }
        
        // Remove from map
        removeMarker(marker);
        
        // Remove from collection
        this.personMarkers.delete(personId);
      }
    } catch (error) {
      errorHandler.handleError(
        error,
        'Removing Person Marker',
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Add a marker for a meeting
   * @param {Object} meeting - Meeting data
   */
  addMeetingMarker(meeting) {
    try {
      // Skip if already exists
      if (this.meetingMarkers.has(meeting.id)) {
        return;
      }
      
      // Find group for color
      let groupColor = null;
      if (meeting.group) {
        const group = groupService.getGroupById(meeting.group);
        if (group) {
          groupColor = group.color;
        }
      }
      
      // Create marker
      const marker = addMarker({
        position: { lat: meeting.lat, lng: meeting.lng },
        title: meeting.name,
        draggable: true,
        icon: getMeetingMarkerIcon(meeting, groupColor)
      });
      
      // Add click listener
      marker.addListener('click', () => {
        this.handleMarkerClick(meeting.id, 'meeting');
      });
      
      // Add drag listeners
      marker.addListener('dragstart', () => {
        // Close info window if open
        this.infoWindow.close();
        
        // Publish drag start event
        EventBus.publish(Events.MARKER_DRAG_START, {
          id: meeting.id,
          type: 'meeting'
        });
      });
      
      marker.addListener('dragend', () => {
        // Get new position
        const position = marker.getPosition();
        const lat = position.lat();
        const lng = position.lng();
        
        // Update meeting position
        meetingService.updateMeetingPosition(meeting.id, lat, lng);
        
        // Publish drag end event
        EventBus.publish(Events.MARKER_DRAG_END, {
          id: meeting.id,
          type: 'meeting',
          position: { lat, lng }
        });
      });
      
      // Store marker reference
      this.meetingMarkers.set(meeting.id, marker);
      
      // Update visibility based on current settings
      const visibility = stateManager.getState('ui.filters.visibility') || { meetings: true };
      marker.setVisible(visibility.meetings);
      
      // Update meeting's marker reference
      meeting.marker = marker;
    } catch (error) {
      errorHandler.handleError(
        error,
        'Adding Meeting Marker',
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Update a meeting marker
   * @param {Object} meeting - Updated meeting data
   */
  updateMeetingMarker(meeting) {
    try {
      // Remove existing marker
      this.removeMeetingMarker(meeting.id);
      
      // Add new marker
      this.addMeetingMarker(meeting);
      
      // Re-select if this was the selected entity
      if (this.selectedEntityId === meeting.id && this.selectedEntityType === 'meeting') {
        this.selectEntity(meeting.id, 'meeting');
      }
    } catch (error) {
      errorHandler.handleError(
        error,
        'Updating Meeting Marker',
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Remove a meeting marker
   * @param {string} meetingId - Meeting ID
   */
  removeMeetingMarker(meetingId) {
    try {
      const marker = this.meetingMarkers.get(meetingId);
      if (marker) {
        // Close info window if this marker was selected
        if (this.selectedEntityId === meetingId && this.selectedEntityType === 'meeting') {
          this.infoWindow.close();
          this.selectedEntityId = null;
          this.selectedEntityType = null;
        }
        
        // Remove from map
        removeMarker(marker);
        
        // Remove from collection
        this.meetingMarkers.delete(meetingId);
      }
    } catch (error) {
      errorHandler.handleError(
        error,
        'Removing Meeting Marker',
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Update all person markers
   * @param {Array} persons - All persons
   */
  updatePersonMarkers(persons) {
    try {
      // Get current marker IDs
      const currentMarkerIds = new Set(this.personMarkers.keys());
      
      // Add/update markers
      persons.forEach(person => {
        if (this.personMarkers.has(person.id)) {
          // Marker exists, update if position changed
          const marker = this.personMarkers.get(person.id);
          const position = marker.getPosition();
          
          if (position.lat() !== person.lat || position.lng() !== person.lng) {
            // Position changed, update marker
            marker.setPosition({ lat: person.lat, lng: person.lng });
          }
          
          // Remove from current IDs (we'll remove the remaining ones)
          currentMarkerIds.delete(person.id);
        } else {
          // Marker doesn't exist, add it
          this.addPersonMarker(person);
        }
      });
      
      // Remove markers that no longer exist
      currentMarkerIds.forEach(id => {
        this.removePersonMarker(id);
      });
    } catch (error) {
      errorHandler.handleError(
        error,
        'Updating Person Markers',
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Update all meeting markers
   * @param {Array} meetings - All meetings
   */
  updateMeetingMarkers(meetings) {
    try {
      // Get current marker IDs
      const currentMarkerIds = new Set(this.meetingMarkers.keys());
      
      // Add/update markers
      meetings.forEach(meeting => {
        if (this.meetingMarkers.has(meeting.id)) {
          // Marker exists, update if position changed
          const marker = this.meetingMarkers.get(meeting.id);
          const position = marker.getPosition();
          
          if (position.lat() !== meeting.lat || position.lng() !== meeting.lng) {
            // Position changed, update marker
            marker.setPosition({ lat: meeting.lat, lng: meeting.lng });
          }
          
          // Remove from current IDs (we'll remove the remaining ones)
          currentMarkerIds.delete(meeting.id);
        } else {
          // Marker doesn't exist, add it
          this.addMeetingMarker(meeting);
        }
      });
      
      // Remove markers that no longer exist
      currentMarkerIds.forEach(id => {
        this.removeMeetingMarker(id);
      });
    } catch (error) {
      errorHandler.handleError(
        error,
        'Updating Meeting Markers',
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Update marker visibility based on filter settings
   * @param {Object} visibility - Visibility settings
   */
  updateVisibility(visibility) {
    try {
      // Update person markers
      if (visibility.persons !== undefined) {
        this.personMarkers.forEach(marker => {
          marker.setVisible(visibility.persons);
        });
      }
      
      // Update meeting markers
      if (visibility.meetings !== undefined) {
        this.meetingMarkers.forEach(marker => {
          marker.setVisible(visibility.meetings);
        });
      }
      
      // Update group visualizations
      if (visibility.groups !== undefined && this.groupVisualization) {
        this.groupVisualization.setVisibility(visibility.groups);
      }
    } catch (error) {
      errorHandler.handleError(
        error,
        'Updating Marker Visibility',
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Update map click mode
   * @param {string} mode - New click mode
   */
  updateMapClickMode(mode) {
    try {
      // Close info window when changing modes
      this.infoWindow.close();
      
      // Update cursor style based on mode
      if (this.map) {
        this.map.setOptions({
          draggableCursor: mode ? 'crosshair' : null
        });
      }
    } catch (error) {
      errorHandler.handleError(
        error,
        'Updating Map Click Mode',
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Handle marker click
   * @param {string} id - Entity ID
   * @param {string} type - Entity type ('person' or 'meeting')
   */
  handleMarkerClick(id, type) {
    try {
      // If in add mode, ignore marker clicks
      if (getMapClickMode()) {
        return;
      }
      
      // Select the entity
      this.selectEntity(id, type);
      
      // Publish event
      EventBus.publish(Events.MARKER_CLICKED, {
        id,
        type
      });
      
      // Publish type-specific event
      if (type === 'person') {
        const person = personService.getPersonById(id);
        if (person) {
          EventBus.publish(Events.PERSON_SELECTED, person);
        }
      } else if (type === 'meeting') {
        const meeting = meetingService.getMeetingById(id);
        if (meeting) {
          EventBus.publish(Events.MEETING_SELECTED, meeting);
        }
      }
    } catch (error) {
      errorHandler.handleError(
        error,
        'Handling Marker Click',
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Select an entity and show its info window
   * @param {string} id - Entity ID
   * @param {string} type - Entity type ('person' or 'meeting')
   */
  selectEntity(id, type) {
    try {
      // Store selection
      this.selectedEntityId = id;
      this.selectedEntityType = type;
      
      // Get the entity and marker
      let entity = null;
      let marker = null;
      
      if (type === 'person') {
        entity = personService.getPersonById(id);
        marker = this.personMarkers.get(id);
      } else if (type === 'meeting') {
        entity = meetingService.getMeetingById(id);
        marker = this.meetingMarkers.get(id);
      }
      
      if (entity && marker) {
        // Show info window for the entity
        this.infoWindow.show(entity, type, marker);
        
        // Center map on entity
        centerMap(entity);
      }
    } catch (error) {
      errorHandler.handleError(
        error,
        'Selecting Entity',
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Center the map on a location
   * @param {Object} location - Location to center on
   * @param {number} zoom - Optional zoom level
   */
  centerMap(location, zoom) {
    try {
      if (location && this.map) {
        centerMap(location, zoom);
      }
    } catch (error) {
      errorHandler.handleError(
        error,
        'Centering Map',
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Fit bounds to show all specified entities
   * @param {Array} entities - Array of entities to include
   */
  fitBounds(entities) {
    try {
      if (!entities || !entities.length) {
        return;
      }
      
      // Collect markers
      const markers = [];
      
      entities.forEach(entity => {
        if (entity.type === 'person') {
          const marker = this.personMarkers.get(entity.id);
          if (marker) {
            markers.push(marker);
          }
        } else if (entity.type === 'meeting') {
          const marker = this.meetingMarkers.get(entity.id);
          if (marker) {
            markers.push(marker);
          }
        }
      });
      
      // Fit bounds
      if (markers.length > 0) {
        fitBounds(markers);
      }
    } catch (error) {
      errorHandler.handleError(
        error,
        'Fitting Bounds',
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Fit map to show all entities
   */
  fitAllEntities() {
    try {
      // Collect all markers
      const allMarkers = [
        ...Array.from(this.personMarkers.values()),
        ...Array.from(this.meetingMarkers.values())
      ];
      
      // Fit bounds
      if (allMarkers.length > 0) {
        fitBounds(allMarkers);
      }
    } catch (error) {
      errorHandler.handleError(
        error,
        'Fitting All Entities',
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Reset map to default view
   */
  resetMapView() {
    try {
      // Center map on default location
      centerMap(this.options.defaultCenter, this.options.defaultZoom);
    } catch (error) {
      errorHandler.handleError(
        error,
        'Resetting Map View',
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Get entity type from an entity object
   * @param {Object} entity - Entity object
   * @returns {string} Entity type ('person', 'meeting', 'group', or 'family')
   */
  getEntityType(entity) {
    if (!entity) return null;
    
    // Check based on properties
    if (entity.elder !== undefined || entity.servant !== undefined) {
      return 'person';
    } else if (entity.description !== undefined) {
      return 'meeting';
    } else if (entity.requirements !== undefined) {
      return 'group';
    } else if (entity.headId !== undefined || entity.spouseId !== undefined) {
      return 'family';
    }
    
    return null;
  }
  
  /**
   * Show an error message in the map container
   * @param {string} message - Error message
   */
  showMapError(message) {
    try {
      // Clear container
      this.container.innerHTML = '';
      
      // Create error message
      const errorElement = document.createElement('div');
      errorElement.className = 'map-error';
      errorElement.innerHTML = `
        <div class="map-error-icon">❌</div>
        <div class="map-error-message">${message}</div>
        <button class="map-error-retry">Retry</button>
      `;
      
      // Add retry button handler
      const retryButton = errorElement.querySelector('.map-error-retry');
      retryButton.addEventListener('click', () => {
        // Clear container
        this.container.innerHTML = '';
        
        // Try to initialize map again
        this.initMap();
      });
      
      // Add to container
      this.container.appendChild(errorElement);
    } catch (error) {
      console.error('Failed to show map error:', error);
    }
  }
  
  /**
   * Factory method to create a MapContainer instance
   * @param {HTMLElement} container - Container element
   * @param {Object} options - Configuration options
   * @returns {MapContainer} New MapContainer instance
   * @static
   */
  static create(container, options = {}) {
    return new MapContainer(container, options);
  }
}

export default MapContainer;