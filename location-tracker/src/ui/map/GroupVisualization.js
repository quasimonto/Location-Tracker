/**
 * GroupVisualization.js
 * Manages the visual representation of groups on the map
 */

import { EventBus, Events } from '../../app/EventTypes';
import groupService from '../../services/GroupService';
import personService from '../../services/PersonService';
import meetingService from '../../services/MeetingService';
import { errorHandler, ErrorType, ErrorSeverity } from '../../utils/errorHandler';

class GroupVisualization {
  /**
   * Create a new GroupVisualization
   * @param {google.maps.Map} map - Google Maps instance
   */
  constructor(map) {
    this.map = map;
    this.polygons = new Map(); // Store group polygons by ID
    this.circles = new Map();  // Store group circles by ID
    this.visualizationMode = 'polygon'; // 'polygon' or 'circle'
    
    // Set up event subscriptions
    this.setupEventSubscriptions();
  }
  
  /**
   * Set up event subscriptions
   */
  setupEventSubscriptions() {
    // Listen for group updates
    EventBus.on(Events.GROUP_CREATED, (group) => {
      this.visualizeGroup(group.id);
    });
    
    EventBus.on(Events.GROUP_UPDATED, (group) => {
      this.updateGroupVisualization(group.id);
    });
    
    EventBus.on(Events.GROUP_DELETED, (groupId) => {
      this.removeGroupVisualization(groupId);
    });
    
    // Listen for person updates that might affect groups
    EventBus.on(Events.PERSON_UPDATED, (person) => {
      if (person.group) {
        this.updateGroupVisualization(person.group);
      }
    });
    
    EventBus.on(Events.PERSON_CREATED, (person) => {
      if (person.group) {
        this.updateGroupVisualization(person.group);
      }
    });
    
    // Listen for visibility changes
    EventBus.on(Events.VISIBILITY_TOGGLED, (visibility) => {
      if (visibility.groups !== undefined) {
        this.setVisibility(visibility.groups);
      }
    });
  }
  
  /**
   * Visualize all groups
   */
  visualizeAllGroups() {
    try {
      // Clear existing visualizations
      this.clearAllVisualizations();
      
      // Get all groups
      const groups = groupService.getAllGroups();
      
      // Visualize each group
      groups.forEach(group => {
        this.visualizeGroup(group.id);
      });
    } catch (error) {
      errorHandler.handleError(
        error,
        'Visualizing All Groups',
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Visualize a specific group
   * @param {string} groupId - Group ID
   */
  visualizeGroup(groupId) {
    try {
      // Get group data
      const group = groupService.getGroupById(groupId);
      if (!group) return;
      
      // Get group members
      const persons = personService.getPersonsByGroup(groupId);
      const meetings = meetingService.getMeetingsByGroup(groupId);
      
      // Combine all locations
      const locations = [
        ...persons.map(p => ({ lat: p.lat, lng: p.lng })),
        ...meetings.map(m => ({ lat: m.lat, lng: m.lng }))
      ];
      
      // Need at least 3 points for a polygon
      if (locations.length < 3) {
        // Use circle for 1-2 points
        this.createGroupCircle(group, locations);
      } else {
        // Use polygon for 3+ points
        this.createGroupPolygon(group, locations);
      }
    } catch (error) {
      errorHandler.handleError(
        error,
        `Visualizing Group ${groupId}`,
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Create a polygon for a group
   * @param {Object} group - Group data
   * @param {Array} locations - Array of locations
   */
  createGroupPolygon(group, locations) {
    try {
      // Remove existing polygon if any
      this.removeGroupVisualization(group.id);
      
      // Calculate convex hull for better polygon shape
      const hullPoints = this.calculateConvexHull(locations);
      
      // Add padding to the polygon
      const paddedPoints = this.addPolygonPadding(hullPoints, 0.0005); // ~50m padding
      
      // Create polygon
      const polygon = new google.maps.Polygon({
        paths: paddedPoints,
        strokeColor: group.color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: group.color,
        fillOpacity: 0.2,
        map: this.map,
        clickable: true
      });
      
      // Add click handler
      polygon.addListener('click', () => {
        EventBus.publish(Events.GROUP_SELECTED, group);
      });
      
      // Store reference
      this.polygons.set(group.id, polygon);
    } catch (error) {
      errorHandler.handleError(
        error,
        `Creating Group Polygon for ${group.id}`,
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Create a circle for a group with few points
   * @param {Object} group - Group data
   * @param {Array} locations - Array of locations
   */
  createGroupCircle(group, locations) {
    try {
      // Remove existing visualizations for this group
      this.removeGroupVisualization(group.id);
      
      // If no locations, can't create circle
      if (locations.length === 0) return;
      
      // Calculate center point
      const center = this.calculateCentroid(locations);
      
      // Calculate radius - distance to furthest point plus padding
      let radius = 100; // Default 100m radius
      if (locations.length > 1) {
        radius = this.calculateMaxDistance(center, locations) + 50; // Add 50m padding
      }
      
      // Create circle
      const circle = new google.maps.Circle({
        center: center,
        radius: radius,
        strokeColor: group.color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: group.color,
        fillOpacity: 0.2,
        map: this.map,
        clickable: true
      });
      
      // Add click handler
      circle.addListener('click', () => {
        EventBus.publish(Events.GROUP_SELECTED, group);
      });
      
      // Store reference
      this.circles.set(group.id, circle);
    } catch (error) {
      errorHandler.handleError(
        error,
        `Creating Group Circle for ${group.id}`,
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Update visualization for a group
   * @param {string} groupId - Group ID
   */
  updateGroupVisualization(groupId) {
    // Remove existing visualization
    this.removeGroupVisualization(groupId);
    
    // Create new visualization
    this.visualizeGroup(groupId);
  }
  
  /**
   * Remove visualization for a group
   * @param {string} groupId - Group ID
   */
  removeGroupVisualization(groupId) {
    try {
      // Remove polygon if exists
      const polygon = this.polygons.get(groupId);
      if (polygon) {
        polygon.setMap(null);
        this.polygons.delete(groupId);
      }
      
      // Remove circle if exists
      const circle = this.circles.get(groupId);
      if (circle) {
        circle.setMap(null);
        this.circles.delete(groupId);
      }
    } catch (error) {
      errorHandler.handleError(
        error,
        `Removing Group Visualization for ${groupId}`,
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Clear all group visualizations
   */
  clearAllVisualizations() {
    try {
      // Clear all polygons
      this.polygons.forEach(polygon => {
        polygon.setMap(null);
      });
      this.polygons.clear();
      
      // Clear all circles
      this.circles.forEach(circle => {
        circle.setMap(null);
      });
      this.circles.clear();
    } catch (error) {
      errorHandler.handleError(
        error,
        'Clearing Group Visualizations',
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Set visibility of group visualizations
   * @param {boolean} visible - Whether groups should be visible
   */
  setVisibility(visible) {
    try {
      // Update polygons
      this.polygons.forEach(polygon => {
        polygon.setVisible(visible);
      });
      
      // Update circles
      this.circles.forEach(circle => {
        circle.setVisible(visible);
      });
    } catch (error) {
      errorHandler.handleError(
        error,
        'Setting Group Visibility',
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Calculate the centroid of points
   * @param {Array} points - Array of points
   * @returns {Object} Centroid point
   */
  calculateCentroid(points) {
    if (points.length === 0) return { lat: 0, lng: 0 };
    
    let sumLat = 0;
    let sumLng = 0;
    
    points.forEach(point => {
      sumLat += point.lat;
      sumLng += point.lng;
    });
    
    return {
      lat: sumLat / points.length,
      lng: sumLng / points.length
    };
  }
  
  /**
   * Calculate the maximum distance from center to any point
   * @param {Object} center - Center point
   * @param {Array} points - Array of points
   * @returns {number} Maximum distance in meters
   */
  calculateMaxDistance(center, points) {
    if (points.length === 0) return 0;
    
    let maxDistance = 0;
    
    points.forEach(point => {
      const distance = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(center.lat, center.lng),
        new google.maps.LatLng(point.lat, point.lng)
      );
      
      if (distance > maxDistance) {
        maxDistance = distance;
      }
    });
    
    return maxDistance;
  }
  
  /**
   * Calculate convex hull for a set of points (Graham scan algorithm)
   * @param {Array} points - Array of points
   * @returns {Array} Convex hull points
   */
  calculateConvexHull(points) {
    if (points.length <= 3) return points;
    
    // Find point with lowest y-coordinate
    let lowestPoint = points[0];
    for (let i = 1; i < points.length; i++) {
      if (points[i].lat < lowestPoint.lat || 
         (points[i].lat === lowestPoint.lat && points[i].lng < lowestPoint.lng)) {
        lowestPoint = points[i];
      }
    }
    
    // Sort points by polar angle with respect to the lowest point
    const sortedPoints = [...points].sort((a, b) => {
      if (a === lowestPoint) return -1;
      if (b === lowestPoint) return 1;
      
      const angleA = Math.atan2(a.lat - lowestPoint.lat, a.lng - lowestPoint.lng);
      const angleB = Math.atan2(b.lat - lowestPoint.lat, b.lng - lowestPoint.lng);
      
      if (angleA < angleB) return -1;
      if (angleA > angleB) return 1;
      
      // If angles are the same, sort by distance
      const distA = (a.lat - lowestPoint.lat) ** 2 + (a.lng - lowestPoint.lng) ** 2;
      const distB = (b.lat - lowestPoint.lat) ** 2 + (b.lng - lowestPoint.lng) ** 2;
      
      return distA - distB;
    });
    
    // Graham scan
    const hull = [sortedPoints[0], sortedPoints[1]];
    
    for (let i = 2; i < sortedPoints.length; i++) {
      while (hull.length >= 2 && !this.isLeftTurn(
        hull[hull.length - 2], 
        hull[hull.length - 1], 
        sortedPoints[i]
      )) {
        hull.pop();
      }
      hull.push(sortedPoints[i]);
    }
    
    return hull;
  }
  
  /**
   * Check if three points make a left turn
   * @param {Object} p1 - First point
   * @param {Object} p2 - Second point
   * @param {Object} p3 - Third point
   * @returns {boolean} Whether the points make a left turn
   */
  isLeftTurn(p1, p2, p3) {
    return (p2.lng - p1.lng) * (p3.lat - p1.lat) - (p2.lat - p1.lat) * (p3.lng - p1.lng) > 0;
  }
  
  /**
   * Add padding to a polygon
   * @param {Array} points - Polygon points
   * @param {number} padding - Padding in degrees
   * @returns {Array} Padded polygon points
   */
  addPolygonPadding(points, padding) {
    if (points.length <= 2) return points;
    
    const center = this.calculateCentroid(points);
    
    return points.map(point => {
      // Calculate vector from center to point
      const vecLat = point.lat - center.lat;
      const vecLng = point.lng - center.lng;
      
      // Calculate distance
      const distance = Math.sqrt(vecLat * vecLat + vecLng * vecLng);
      
      // Normalize and extend
      const factor = distance > 0 ? (distance + padding) / distance : 1;
      
      return {
        lat: center.lat + vecLat * factor,
        lng: center.lng + vecLng * factor
      };
    });
  }
  
  /**
   * Factory method to create a GroupVisualization
   * @param {google.maps.Map} map - Google Maps instance
   * @returns {GroupVisualization} New GroupVisualization
   * @static
   */
  static create(map) {
    return new GroupVisualization(map);
  }
}

export default GroupVisualization;