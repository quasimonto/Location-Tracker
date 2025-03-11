/**
 * TravelService.js
 * Service for calculating travel times and distances between locations
 */

import { stateManager } from './StateManager';
import { errorHandler, ErrorType, ErrorSeverity } from '../utils/errorHandler';
import { EventBus, Events } from '../app/EventBus';

/**
 * Travel modes supported by the service
 * @enum {string}
 */
export const TravelMode = {
  DRIVING: 'driving',
  WALKING: 'walking',
  TRANSIT: 'transit'
};

/**
 * Service for travel time and distance calculations
 */
class TravelService {
  constructor() {
    // Cache of travel time calculations to reduce repeated calculations
    this.travelTimeCache = new Map();
    
    // Cache expiration time in milliseconds (30 minutes)
    this.cacheExpirationTime = 30 * 60 * 1000;
    
    // Subscribe to events that might invalidate cache
    EventBus.subscribe(Events.PERSON_UPDATED, this.handlePersonUpdate.bind(this));
    EventBus.subscribe(Events.MEETING_UPDATED, this.handleMeetingUpdate.bind(this));
  }
  
  /**
   * Handle person updates that might invalidate cache
   * @param {Person} person - Updated person
   */
  handlePersonUpdate(person) {
    // Clear cache entries involving this person
    this.clearCacheForEntity(person.id);
  }
  
  /**
   * Handle meeting updates that might invalidate cache
   * @param {Meeting} meeting - Updated meeting
   */
  handleMeetingUpdate(meeting) {
    // Clear cache entries involving this meeting
    this.clearCacheForEntity(meeting.id);
  }
  
  /**
   * Clear cache entries involving a specific entity
   * @param {string} entityId - ID of entity (person or meeting)
   */
  clearCacheForEntity(entityId) {
    // Find and remove cache entries where origin or destination includes this entity
    const keysToRemove = [];
    
    this.travelTimeCache.forEach((value, key) => {
      const [originId, destinationId] = key.split('-');
      if (originId === entityId || destinationId === entityId) {
        keysToRemove.push(key);
      }
    });
    
    keysToRemove.forEach(key => {
      this.travelTimeCache.delete(key);
    });
  }
  
  /**
   * Calculate travel time between two locations
   * @param {Object} origin - Origin location {lat, lng}
   * @param {Object} destination - Destination location {lat, lng}
   * @param {TravelMode} [mode=TravelMode.DRIVING] - Travel mode
   * @returns {Promise<Object>} Travel info with duration, distance, and route
   */
  async calculateTravelTime(origin, destination, mode = TravelMode.DRIVING) {
    try {
      // Validate inputs
      if (!origin || !destination) {
        throw new Error('Origin and destination are required');
      }
      
      if (!origin.lat || !origin.lng || !destination.lat || !destination.lng) {
        throw new Error('Origin and destination must have valid lat/lng coordinates');
      }
      
      // Check if we have Google Maps Distance Matrix API available
      if (window.google && window.google.maps && window.google.maps.DistanceMatrixService) {
        return this.calculateWithGoogleMaps(origin, destination, mode);
      } else {
        // Fall back to estimation
        return this.estimateTravelTime(origin, destination, mode);
      }
    } catch (error) {
      errorHandler.handleError(
        error,
        'Calculating Travel Time',
        ErrorSeverity.WARNING,
        ErrorType.API
      );
      
      // Fall back to estimation on error
      return this.estimateTravelTime(origin, destination, mode);
    }
  }
  
  /**
   * Calculate travel time using Google Maps Distance Matrix API
   * @param {Object} origin - Origin location {lat, lng}
   * @param {Object} destination - Destination location {lat, lng}
   * @param {TravelMode} mode - Travel mode
   * @returns {Promise<Object>} Travel info with duration, distance, and route
   */
  calculateWithGoogleMaps(origin, destination, mode) {
    return new Promise((resolve, reject) => {
      // Create cache key
      const cacheKey = `${JSON.stringify(origin)}-${JSON.stringify(destination)}-${mode}`;
      
      // Check cache first
      if (this.travelTimeCache.has(cacheKey)) {
        const cachedResult = this.travelTimeCache.get(cacheKey);
        
        // Check if cache entry is still valid
        if (Date.now() - cachedResult.timestamp < this.cacheExpirationTime) {
          resolve(cachedResult.data);
          return;
        }
        
        // Cache expired, remove it
        this.travelTimeCache.delete(cacheKey);
      }
      
      // Convert TravelMode to Google Maps TravelMode
      const googleMode = this.getGoogleTravelMode(mode);
      
      // Create service instance
      const service = new google.maps.DistanceMatrixService();
      
      // Prepare request
      const request = {
        origins: [new google.maps.LatLng(origin.lat, origin.lng)],
        destinations: [new google.maps.LatLng(destination.lat, destination.lng)],
        travelMode: googleMode,
        unitSystem: google.maps.UnitSystem.METRIC
      };
      
      // Make the request
      service.getDistanceMatrix(request, (response, status) => {
        if (status !== 'OK') {
          reject(new Error(`Distance Matrix request failed: ${status}`));
          return;
        }
        
        // Extract relevant information from response
        try {
          const element = response.rows[0].elements[0];
          
          if (element.status !== 'OK') {
            reject(new Error(`Route calculation failed: ${element.status}`));
            return;
          }
          
          const result = {
            duration: element.duration.text,
            durationValue: element.duration.value, // seconds
            distance: element.distance.text,
            distanceValue: element.distance.value, // meters
            mode: mode,
            isEstimate: false
          };
          
          // Cache the result
          this.travelTimeCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          });
          
          resolve(result);
        } catch (error) {
          reject(new Error(`Error processing Distance Matrix response: ${error.message}`));
        }
      });
    });
  }
  
  /**
   * Estimate travel time based on straight-line distance
   * @param {Object} origin - Origin location {lat, lng}
   * @param {Object} destination - Destination location {lat, lng}
   * @param {TravelMode} mode - Travel mode
   * @returns {Promise<Object>} Estimated travel info
   */
  async estimateTravelTime(origin, destination, mode) {
    // Create cache key
    const cacheKey = `${JSON.stringify(origin)}-${JSON.stringify(destination)}-${mode}-estimate`;
    
    // Check cache first
    if (this.travelTimeCache.has(cacheKey)) {
      const cachedResult = this.travelTimeCache.get(cacheKey);
      
      // Check if cache entry is still valid
      if (Date.now() - cachedResult.timestamp < this.cacheExpirationTime) {
        return cachedResult.data;
      }
      
      // Cache expired, remove it
      this.travelTimeCache.delete(cacheKey);
    }
    
    // Calculate straight-line distance
    const distance = this.calculateDistance(
      origin.lat, origin.lng,
      destination.lat, destination.lng
    );
    
    // Convert distance to meters
    const distanceInMeters = distance * 1000;
    
    let durationMinutes;
    
    // Estimate travel time based on mode and distance
    switch (mode) {
      case TravelMode.WALKING:
        // Walking speed ~5 km/h = ~83 meters/minute
        durationMinutes = Math.round(distanceInMeters / 83.33);
        break;
        
      case TravelMode.TRANSIT:
        // Transit speed ~15 km/h = ~250 meters/minute
        // Add 5 minutes for waiting/transfers
        durationMinutes = Math.round(distanceInMeters / 250) + 5;
        break;
        
      case TravelMode.DRIVING:
      default:
        // Short distances have minimum time (parking, etc.)
        if (distanceInMeters < 100) {
          durationMinutes = 0;
        } else if (distanceInMeters < 500) {
          // Very short drives still take at least 2 minutes
          durationMinutes = Math.max(2, Math.round(distanceInMeters / 416.67));
        } else {
          // Urban driving ~25 km/h = ~416.67 meters/minute
          // Add 2 minutes for getting in/out of car
          durationMinutes = Math.round(distanceInMeters / 416.67) + 2;
        }
        break;
    }
    
    // Format duration string
    let durationString;
    if (durationMinutes < 60) {
      durationString = `${durationMinutes} min${durationMinutes !== 1 ? 's' : ''}`;
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const mins = durationMinutes % 60;
      durationString = `${hours} hour${hours !== 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
    }
    
    // Format distance string
    const distanceString = distance < 1 ? 
      `${Math.round(distance * 1000)} m` : 
      `${distance.toFixed(1)} km`;
    
    // Create result
    const result = {
      duration: durationString,
      durationValue: durationMinutes * 60, // convert to seconds
      distance: distanceString,
      distanceValue: distanceInMeters,
      mode: mode,
      isEstimate: true
    };
    
    // Cache the result
    this.travelTimeCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    return result;
  }
  
  /**
   * Calculate travel times for all travel modes
   * @param {Object} origin - Origin location {lat, lng}
   * @param {Object} destination - Destination location {lat, lng}
   * @returns {Promise<Object>} Travel info for all modes
   */
  async calculateAllTravelModes(origin, destination) {
    try {
      const [driving, transit, walking] = await Promise.all([
        this.calculateTravelTime(origin, destination, TravelMode.DRIVING),
        this.calculateTravelTime(origin, destination, TravelMode.TRANSIT),
        this.calculateTravelTime(origin, destination, TravelMode.WALKING)
      ]);
      
      return { driving, transit, walking };
    } catch (error) {
      errorHandler.handleError(
        error,
        'Calculating All Travel Modes',
        ErrorSeverity.WARNING,
        ErrorType.API
      );
      
      // Fall back to estimates
      const driving = await this.estimateTravelTime(origin, destination, TravelMode.DRIVING);
      const transit = await this.estimateTravelTime(origin, destination, TravelMode.TRANSIT);
      const walking = await this.estimateTravelTime(origin, destination, TravelMode.WALKING);
      
      return { driving, transit, walking };
    }
  }
  
  /**
   * Calculate batch travel times from one origin to multiple destinations
   * @param {Object} origin - Origin location {lat, lng, id}
   * @param {Array<Object>} destinations - Array of destination locations {lat, lng, id}
   * @param {TravelMode} [mode=TravelMode.DRIVING] - Travel mode
   * @returns {Promise<Array<Object>>} Array of travel info
   */
  async calculateBatchTravelTimes(origin, destinations, mode = TravelMode.DRIVING) {
    try {
      // Check if we have Google Maps Distance Matrix API available
      if (window.google && window.google.maps && window.google.maps.DistanceMatrixService) {
        return this.calculateBatchWithGoogleMaps(origin, destinations, mode);
      } else {
        // Fall back to estimation
        return this.estimateBatchTravelTimes(origin, destinations, mode);
      }
    } catch (error) {
      errorHandler.handleError(
        error,
        'Calculating Batch Travel Times',
        ErrorSeverity.WARNING,
        ErrorType.API
      );
      
      // Fall back to estimation on error
      return this.estimateBatchTravelTimes(origin, destinations, mode);
    }
  }
  
  /**
   * Calculate batch travel times using Google Maps Distance Matrix API
   * @param {Object} origin - Origin location {lat, lng, id}
   * @param {Array<Object>} destinations - Array of destination locations {lat, lng, id}
   * @param {TravelMode} mode - Travel mode
   * @returns {Promise<Array<Object>>} Array of travel info
   */
  calculateBatchWithGoogleMaps(origin, destinations, mode) {
    return new Promise((resolve, reject) => {
      // Convert TravelMode to Google Maps TravelMode
      const googleMode = this.getGoogleTravelMode(mode);
      
      // Create service instance
      const service = new google.maps.DistanceMatrixService();
      
      // Prepare request
      const request = {
        origins: [new google.maps.LatLng(origin.lat, origin.lng)],
        destinations: destinations.map(dest => 
          new google.maps.LatLng(dest.lat, dest.lng)
        ),
        travelMode: googleMode,
        unitSystem: google.maps.UnitSystem.METRIC
      };
      
      // Make the request
      service.getDistanceMatrix(request, (response, status) => {
        if (status !== 'OK') {
          reject(new Error(`Distance Matrix request failed: ${status}`));
          return;
        }
        
        // Extract relevant information from response
        try {
          const results = [];
          
          const elements = response.rows[0].elements;
          
          elements.forEach((element, index) => {
            const destination = destinations[index];
            
            // Create cache key
            const cacheKey = `${origin.id || JSON.stringify(origin)}-${destination.id || JSON.stringify(destination)}-${mode}`;
            
            if (element.status === 'OK') {
              const result = {
                origin: origin,
                destination: destination,
                duration: element.duration.text,
                durationValue: element.duration.value, // seconds
                distance: element.distance.text,
                distanceValue: element.distance.value, // meters
                mode: mode,
                isEstimate: false
              };
              
              // Cache the result
              this.travelTimeCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
              });
              
              results.push(result);
            } else {
              // Fall back to estimate for this destination
              this.estimateTravelTime(origin, destination, mode)
                .then(estimatedResult => {
                  results.push({
                    ...estimatedResult,
                    origin: origin,
                    destination: destination
                  });
                });
            }
          });
          
          resolve(results);
        } catch (error) {
          reject(new Error(`Error processing Distance Matrix response: ${error.message}`));
        }
      });
    });
  }
  
  /**
   * Estimate batch travel times
   * @param {Object} origin - Origin location {lat, lng, id}
   * @param {Array<Object>} destinations - Array of destination locations {lat, lng, id}
   * @param {TravelMode} mode - Travel mode
   * @returns {Promise<Array<Object>>} Array of estimated travel info
   */
  async estimateBatchTravelTimes(origin, destinations, mode) {
    const results = [];
    
    for (const destination of destinations) {
      const travelTime = await this.estimateTravelTime(origin, destination, mode);
      
      results.push({
        ...travelTime,
        origin: origin,
        destination: destination
      });
    }
    
    return results;
  }
  
  /**
   * Convert TravelMode to Google Maps TravelMode
   * @param {TravelMode} mode - Travel mode
   * @returns {google.maps.TravelMode} Google Maps travel mode
   */
  getGoogleTravelMode(mode) {
    if (!window.google || !window.google.maps) {
      throw new Error('Google Maps API not available');
    }
    
    switch (mode) {
      case TravelMode.WALKING:
        return google.maps.TravelMode.WALKING;
      case TravelMode.TRANSIT:
        return google.maps.TravelMode.TRANSIT;
      case TravelMode.DRIVING:
      default:
        return google.maps.TravelMode.DRIVING;
    }
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
   * Clear the travel time cache
   */
  clearCache() {
    this.travelTimeCache.clear();
  }
}

// Export a singleton instance
export const travelService = new TravelService();
export default travelService;