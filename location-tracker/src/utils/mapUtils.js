/**
 * mapUtils.js
 * Utility functions for working with Google Maps
 */

import { errorHandler, ErrorType, ErrorSeverity } from './errorHandler';

/**
 * Load the Google Maps API dynamically
 * @param {string} apiKey - Google Maps API key
 * @returns {Promise} Promise that resolves when the API is loaded
 */
export function loadGoogleMapsApi(apiKey) {
  return new Promise((resolve, reject) => {
    // Check if API is already loaded
    if (window.google && window.google.maps) {
      resolve(window.google.maps);
      return;
    }
    
    // Create the script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&callback=googleMapsCallback`;
    script.async = true;
    script.defer = true;
    
    // Define the callback function
    window.googleMapsCallback = function() {
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
      } else {
        reject(new Error('Google Maps API loaded but maps object not available'));
      }
    };
    
    // Handle loading errors
    script.onerror = function() {
      reject(new Error('Failed to load Google Maps API'));
    };
    
    // Add the script to the document
    document.body.appendChild(script);
  });
}

/**
 * Generate a marker icon for a person based on configuration and group
 * @param {Object} person - Person data
 * @param {Object} [groupColor] - Optional group color
 * @returns {Object} Google Maps marker icon configuration
 */
export function getPersonMarkerIcon(person, groupColor = null) {
  try {
    if (!window.google || !window.google.maps) {
      throw new Error('Google Maps API not loaded');
    }
    
    // Get application config (assuming a global appConfig)
    // This will be replaced with stateManager later
    const appConfig = window.appConfig || {
      appearance: {
        person: {
          icon: 'default',
          color: '#FF0000'
        },
        group: {
          style: 'circle'
        }
      }
    };
    
    // If person is in a group, use group styling
    if (person.group && groupColor) {
      switch (appConfig.appearance.group.style) {
        case 'circle':
          return {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: groupColor,
            fillOpacity: 0.7,
            strokeWeight: 1,
            strokeColor: '#000'
          };
        case 'square':
          return {
            path: 'M -8,-8 8,-8 8,8 -8,8 z',
            scale: 1,
            fillColor: groupColor,
            fillOpacity: 0.7,
            strokeWeight: 1,
            strokeColor: '#000'
          };
        case 'star':
          return {
            path: 'M 0,-10 2,-3 10,-3 4,1 6,9 0,4 -6,9 -4,1 -10,-3 -2,-3 z',
            scale: 1,
            fillColor: groupColor,
            fillOpacity: 0.7,
            strokeWeight: 1,
            strokeColor: '#000'
          };
        case 'custom-color':
          return {
            url: `http://maps.google.com/mapfiles/ms/icons/red-dot.png`,
            scaledSize: new window.google.maps.Size(32, 32)
          };
        default:
          return null; // Default marker
      }
    }
    
    // Not in a group, use person default styling
    switch (appConfig.appearance.person.icon) {
      case 'circle':
        return {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: appConfig.appearance.person.color,
          fillOpacity: 0.7,
          strokeWeight: 1,
          strokeColor: '#000'
        };
      case 'square':
        return {
          path: 'M -8,-8 8,-8 8,8 -8,8 z',
          scale: 1,
          fillColor: appConfig.appearance.person.color,
          fillOpacity: 0.7,
          strokeWeight: 1,
          strokeColor: '#000'
        };
      case 'star':
        return {
          path: 'M 0,-10 2,-3 10,-3 4,1 6,9 0,4 -6,9 -4,1 -10,-3 -2,-3 z',
          scale: 1,
          fillColor: appConfig.appearance.person.color,
          fillOpacity: 0.7,
          strokeWeight: 1,
          strokeColor: '#000'
        };
      case 'person':
        return {
          path: 'M 0,0 c -2.1,0 -3.8,1.7 -3.8,3.8 0,2.1 1.7,3.8 3.8,3.8 2.1,0 3.8,-1.7 3.8,-3.8 0,-2.1 -1.7,-3.8 -3.8,-3.8 z M 0,10.5 c -2.5,0 -7.5,1.3 -7.5,3.8 v 1.8 H 7.5 v -1.8 c 0,-2.5 -5,-3.8 -7.5,-3.8 z',
          scale: 1.2,
          fillColor: appConfig.appearance.person.color,
          fillOpacity: 0.7,
          strokeWeight: 1,
          strokeColor: '#000'
        };
      case 'default':
      default:
        return null; // Default Google marker
    }
  } catch (error) {
    errorHandler.handleError(
      error,
      'Get Person Marker Icon',
      ErrorSeverity.WARNING,
      ErrorType.MAP
    );
    return null; // Return null to use default marker
  }
}

/**
 * Generate a marker icon for a meeting point based on configuration and group
 * @param {Object} meeting - Meeting data
 * @param {Object} [groupColor] - Optional group color
 * @returns {Object} Google Maps marker icon configuration
 */
export function getMeetingMarkerIcon(meeting, groupColor = null) {
  try {
    // Get application config
    const appConfig = window.appConfig || {
      appearance: {
        meeting: {
          icon: 'blue-dot',
          color: '#0000FF'
        }
      }
    };
    
    // If meeting is in a group, use group styling
    if (meeting.group && groupColor) {
      // For meeting points in groups, we keep them blue but might scale them differently
      return {
        url: `https://maps.google.com/mapfiles/ms/icons/blue-dot.png`,
        scaledSize: new window.google.maps.Size(32, 32)
      };
    }
    
    // Not in a group, use meeting default styling
    switch (appConfig.appearance.meeting.icon) {
      case 'blue-dot':
        return {
          url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
        };
      case 'green-dot':
        return {
          url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
        };
      case 'purple-dot':
        return {
          url: 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png'
        };
      case 'flag':
        return {
          url: 'https://maps.google.com/mapfiles/ms/icons/flag.png'
        };
      case 'info':
        return {
          url: 'https://maps.google.com/mapfiles/ms/icons/info.png'
        };
      default:
        return {
          url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
        };
    }
  } catch (error) {
    errorHandler.handleError(
      error,
      'Get Meeting Marker Icon',
      ErrorSeverity.WARNING,
      ErrorType.MAP
    );
    return {
      url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
    };
  }
}

/**
 * Generate a random color
 * @returns {string} Random color in hex format
 */
export function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

/**
 * Calculate the center point of a set of coordinates
 * @param {Array} positions - Array of lat/lng objects
 * @returns {Object} Center point as lat/lng object
 */
export function getCenterPoint(positions) {
  if (!positions || positions.length === 0) {
    return null;
  }
  
  const totalPositions = positions.length;
  let totalLat = 0;
  let totalLng = 0;
  
  positions.forEach(position => {
    totalLat += position.lat;
    totalLng += position.lng;
  });
  
  return {
    lat: totalLat / totalPositions,
    lng: totalLng / totalPositions
  };
}

/**
 * Convert a distance in meters to a human-readable string
 * @param {number} meters - Distance in meters
 * @returns {string} Human-readable distance
 */
export function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  } else {
    return `${(meters / 1000).toFixed(1)} km`;
  }
}

/**
 * Convert travel time in seconds to a human-readable string
 * @param {number} seconds - Travel time in seconds
 * @returns {string} Human-readable travel time
 */
export function formatTravelTime(seconds) {
  if (!seconds) return 'N/A';
  
  const minutes = Math.floor(seconds / 60);
  
  if (minutes < 60) {
    return `${minutes} min${minutes !== 1 ? 's' : ''}`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} hr${hours !== 1 ? 's' : ''}`;
    } else {
      return `${hours} hr${hours !== 1 ? 's' : ''} ${remainingMinutes} min${remainingMinutes !== 1 ? 's' : ''}`;
    }
  }
}