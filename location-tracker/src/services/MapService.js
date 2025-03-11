/**
 * MapService.js
 * Service for handling Google Maps integration
 */

import { stateManager } from './StateManager';
import { errorHandler, ErrorType, ErrorSeverity } from '../utils/errorHandler';
import { getPersonMarkerIcon, getMeetingMarkerIcon } from '../utils/mapUtils';

// Map instance
let map = null;

// Map click mode ('person', 'meeting', or null)
let mapClickMode = null;

// Autocomplete instance for location search
let autocomplete = null;

// Event bus for custom map events
const mapEvents = new EventTarget();

/**
 * Initialize the map service
 * @param {HTMLElement} container - DOM element to contain the map
 * @param {Object} options - Map initialization options
 * @returns {Promise} Promise that resolves when the map is initialized
 */
export async function initMapService(container, options = {}) {
  try {
    // Check if Google Maps API is loaded
    if (!window.google || !window.google.maps) {
      throw new Error('Google Maps API not loaded');
    }
    
    // Create the map instance
    map = new window.google.maps.Map(container, {
      center: options.center || { lat: 0, lng: 0 },
      zoom: options.zoom || 13,
      ...options
    });
    
    // Set up search box
    setupSearchBox();
    
    // Set up map click handling
    setupMapClickHandler();
    
    // Subscribe to state changes
    subscribeToStateChanges();
    
    // Return the map instance
    return map;
  } catch (error) {
    errorHandler.handleError(
      error,
      'Map Service Initialization',
      ErrorSeverity.CRITICAL,
      ErrorType.MAP
    );
    throw error;
  }
}

/**
 * Set up search box for location search
 */
function setupSearchBox() {
  try {
    const input = document.getElementById('search-input');
    if (!input) {
      console.warn('Search input element not found');
      return;
    }
    
    // Create the autocomplete instance
    autocomplete = new window.google.maps.places.Autocomplete(input);
    
    // Bias results to the current map viewport
    autocomplete.bindTo('bounds', map);
    
    // Handle place selection
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      
      if (!place.geometry || !place.geometry.location) {
        errorHandler.handleError(
          new Error('No location data for this place'),
          'Place Search',
          ErrorSeverity.WARNING,
          ErrorType.MAP
        );
        return;
      }
      
      // Center map on the selected place
      map.setCenter(place.geometry.location);
      map.setZoom(15);
      
      // Dispatch event for place selection
      mapEvents.dispatchEvent(new CustomEvent('place_selected', {
        detail: {
          place,
          location: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          },
          name: place.name
        }
      }));
      
      // If in add mode, create a marker at this location
      if (mapClickMode === 'person') {
        addPersonAtLocation(place.geometry.location, place.name);
      } else if (mapClickMode === 'meeting') {
        addMeetingAtLocation(place.geometry.location, place.name);
      }
    });
  } catch (error) {
    errorHandler.handleError(
      error,
      'Search Box Setup',
      ErrorSeverity.ERROR,
      ErrorType.MAP
    );
  }
}

/**
 * Set up handler for map clicks
 */
function setupMapClickHandler() {
  map.addListener('click', (event) => {
    // Only handle clicks if in add mode
    if (mapClickMode === 'person') {
      addPersonAtLocation(event.latLng);
    } else if (mapClickMode === 'meeting') {
      addMeetingAtLocation(event.latLng);
    }
    
    // Dispatch custom event
    mapEvents.dispatchEvent(new CustomEvent('map_clicked', {
      detail: {
        location: {
          lat: event.latLng.lat(),
          lng: event.latLng.lng()
        },
        mode: mapClickMode
      }
    }));
  });
}

/**
 * Add a person at a specific location
 * @param {google.maps.LatLng} location - The location to add the person
 * @param {string} name - Optional name for the person
 */
function addPersonAtLocation(location, name = 'New Person') {
  try {
    // Create a marker for the new person
    const marker = new window.google.maps.Marker({
      position: location,
      map: map,
      draggable: true,
      animation: window.google.maps.Animation.DROP,
      icon: getPersonMarkerIcon({})
    });
    
    // Create person data
    const personData = {
      name: name,
      lat: location.lat(),
      lng: location.lng(),
      elder: false,
      servant: false,
      pioneer: false,
      publisher: false,
      spouse: false,
      child: false,
      familyHead: false,
      leader: false,
      helper: false
    };
    
    // Dispatch event for person creation
    mapEvents.dispatchEvent(new CustomEvent('person_created', {
      detail: {
        person: personData,
        marker: marker,
        location: {
          lat: location.lat(),
          lng: location.lng()
        }
      }
    }));
    
    // Reset the map click mode
    setMapClickMode(null);
  } catch (error) {
    errorHandler.handleError(
      error,
      'Adding Person',
      ErrorSeverity.ERROR,
      ErrorType.MAP
    );
  }
}

/**
 * Add a meeting point at a specific location
 * @param {google.maps.LatLng} location - The location to add the meeting
 * @param {string} name - Optional name for the meeting
 */
function addMeetingAtLocation(location, name = 'New Meeting Point') {
  try {
    // Create a marker for the new meeting point
    const marker = new window.google.maps.Marker({
      position: location,
      map: map,
      draggable: true,
      animation: window.google.maps.Animation.DROP,
      icon: getMeetingMarkerIcon({})
    });
    
    // Create meeting data
    const meetingData = {
      name: name,
      description: '',
      lat: location.lat(),
      lng: location.lng()
    };
    
    // Dispatch event for meeting creation
    mapEvents.dispatchEvent(new CustomEvent('meeting_created', {
      detail: {
        meeting: meetingData,
        marker: marker,
        location: {
          lat: location.lat(),
          lng: location.lng()
        }
      }
    }));
    
    // Reset the map click mode
    setMapClickMode(null);
  } catch (error) {
    errorHandler.handleError(
      error,
      'Adding Meeting',
      ErrorSeverity.ERROR,
      ErrorType.MAP
    );
  }
}

/**
 * Set the map click mode
 * @param {string} mode - The mode ('person', 'meeting', or null)
 */
export function setMapClickMode(mode) {
  // Validate the mode
  if (mode !== 'person' && mode !== 'meeting' && mode !== null) {
    errorHandler.handleError(
      new Error(`Invalid map click mode: ${mode}`),
      'Map Click Mode',
      ErrorSeverity.WARNING,
      ErrorType.MAP
    );
    return;
  }
  
  // Set the mode
  mapClickMode = mode;
  
  // Update the UI to reflect the current mode
  updateAddButtonStyles();
  
  // Update the cursor style
  if (map) {
    map.setOptions({
      draggableCursor: mode ? 'crosshair' : null
    });
  }
  
  // Dispatch event for mode change
  mapEvents.dispatchEvent(new CustomEvent('click_mode_changed', {
    detail: {
      mode: mode
    }
  }));
}

/**
 * Update add button styles based on active mode
 */
function updateAddButtonStyles() {
  const personButton = document.getElementById('add-person');
  const meetingButton = document.getElementById('add-meeting');
  
  if (personButton) {
    personButton.classList.toggle('active', mapClickMode === 'person');
  }
  
  if (meetingButton) {
    meetingButton.classList.toggle('active', mapClickMode === 'meeting');
  }
}

/**
 * Subscribe to relevant state changes
 */
function subscribeToStateChanges() {
  // When UI state changes, update the map click mode
  stateManager.subscribe('ui.mapClickMode', (value) => {
    setMapClickMode(value);
  });
  
  // Other subscriptions will be added as needed
}

/**
 * Add a marker to the map
 * @param {Object} options - Marker options
 * @returns {google.maps.Marker} The created marker
 */
export function addMarker(options) {
  try {
    if (!map) {
      throw new Error('Map not initialized');
    }
    
    return new window.google.maps.Marker({
      map: map,
      ...options
    });
  } catch (error) {
    errorHandler.handleError(
      error,
      'Adding Marker',
      ErrorSeverity.ERROR,
      ErrorType.MAP
    );
    return null;
  }
}

/**
 * Remove a marker from the map
 * @param {google.maps.Marker} marker - The marker to remove
 */
export function removeMarker(marker) {
  try {
    if (marker) {
      marker.setMap(null);
    }
  } catch (error) {
    errorHandler.handleError(
      error,
      'Removing Marker',
      ErrorSeverity.ERROR,
      ErrorType.MAP
    );
  }
}

/**
 * Center the map on a specific location
 * @param {Object} location - Location with lat and lng properties
 * @param {number} zoom - Optional zoom level
 */
export function centerMap(location, zoom) {
  try {
    if (!map) {
      throw new Error('Map not initialized');
    }
    
    map.setCenter(location);
    
    if (zoom !== undefined) {
      map.setZoom(zoom);
    }
  } catch (error) {
    errorHandler.handleError(
      error,
      'Centering Map',
      ErrorSeverity.ERROR,
      ErrorType.MAP
    );
  }
}

/**
 * Fit the map to show all the provided markers
 * @param {Array} markers - Array of markers
 * @param {number} padding - Optional padding in pixels
 */
export function fitBounds(markers, padding = 50) {
  try {
    if (!map || !markers || markers.length === 0) {
      return;
    }
    
    const bounds = new window.google.maps.LatLngBounds();
    
    markers.forEach(marker => {
      bounds.extend(marker.getPosition());
    });
    
    map.fitBounds(bounds, padding);
  } catch (error) {
    errorHandler.handleError(
      error,
      'Fitting Bounds',
      ErrorSeverity.ERROR,
      ErrorType.MAP
    );
  }
}

/**
 * Calculate the distance between two points
 * @param {Object} point1 - First point with lat and lng properties
 * @param {Object} point2 - Second point with lat and lng properties
 * @returns {number} Distance in meters
 */
export function calculateDistance(point1, point2) {
  try {
    if (!window.google || !window.google.maps) {
      throw new Error('Google Maps API not loaded');
    }
    
    const p1 = new window.google.maps.LatLng(point1.lat, point1.lng);
    const p2 = new window.google.maps.LatLng(point2.lat, point2.lng);
    
    // Calculate distance in meters
    return window.google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
  } catch (error) {
    errorHandler.handleError(
      error,
      'Distance Calculation',
      ErrorSeverity.ERROR,
      ErrorType.MAP
    );
    
    // Fallback to simple approximation
    const dx = 111.32 * Math.cos(point1.lat * Math.PI / 180) * (point1.lng - point2.lng);
    const dy = 110.574 * (point1.lat - point2.lat);
    return Math.sqrt(dx * dx + dy * dy) * 1000; // Convert to meters
  }
}

/**
 * Add an event listener for map events
 * @param {string} event - Event name
 * @param {Function} callback - Event callback
 * @returns {Function} Function to remove the listener
 */
export function addMapEventListener(event, callback) {
  mapEvents.addEventListener(event, callback);
  
  // Return function to remove listener
  return () => {
    mapEvents.removeEventListener(event, callback);
  };
}

/**
 * Get the current map instance
 * @returns {google.maps.Map} The map instance
 */
export function getMap() {
  return map;
}

/**
 * Get the current map click mode
 * @returns {string} The current mode ('person', 'meeting', or null)
 */
export function getMapClickMode() {
  return mapClickMode;
}