/**
 * StatisticsService.js
 * Service for generating statistics about location data
 */

import { stateManager } from './StateManager';
import personService from './PersonService';
import meetingService from './MeetingService';
import groupService from './GroupService';
import familyService from './FamilyService';
import travelService from './TravelService';
import { TravelMode } from './TravelService';
import { errorHandler, ErrorType, ErrorSeverity } from '../utils/errorHandler';

/**
 * Service for generating statistics and data insights
 */
class StatisticsService {
  /**
   * Get overall application statistics
   * @returns {Object} Overall statistics
   */
  getOverallStatistics() {
    try {
      const persons = personService.getAllPersons();
      const meetings = meetingService.getAllMeetings();
      const groups = groupService.getAllGroups();
      const families = familyService.getAllFamilies();
      
      // Count role distribution
      const roleCount = {
        elders: persons.filter(p => p.elder).length,
        servants: persons.filter(p => p.servant).length,
        pioneers: persons.filter(p => p.pioneer).length,
        publishers: persons.filter(p => p.publisher).length,
        leaders: persons.filter(p => p.leader).length,
        helpers: persons.filter(p => p.helper).length,
        familyHeads: persons.filter(p => p.familyHead).length,
        spouses: persons.filter(p => p.spouse).length,
        children: persons.filter(p => p.child).length,
      };
      
      // Count grouped vs ungrouped
      const groupedPersons = persons.filter(p => p.group !== null).length;
      const ungroupedPersons = persons.length - groupedPersons;
      
      // Count family distribution
      const inFamilies = persons.filter(p => p.familyId !== null).length;
      const notInFamilies = persons.length - inFamilies;
      
      // Geographic information - find bounds
      const bounds = this.calculateBounds([...persons, ...meetings]);
      
      return {
        counts: {
          persons: persons.length,
          meetings: meetings.length,
          groups: groups.length,
          families: families.length
        },
        roles: roleCount,
        grouping: {
          grouped: groupedPersons,
          ungrouped: ungroupedPersons,
          groupedPercent: persons.length > 0 ? (groupedPersons / persons.length * 100).toFixed(1) : 0
        },
        families: {
          inFamily: inFamilies,
          notInFamily: notInFamilies,
          inFamilyPercent: persons.length > 0 ? (inFamilies / persons.length * 100).toFixed(1) : 0,
          averageFamilySize: families.length > 0 ? (inFamilies / families.length).toFixed(1) : 0
        },
        geographic: bounds
      };
    } catch (error) {
      errorHandler.handleError(
        error,
        'Getting Overall Statistics',
        ErrorSeverity.WARNING,
        ErrorType.UNKNOWN
      );
      return null;
    }
  }
  
  /**
   * Get group statistics
   * @returns {Array<Object>} Group statistics
   */
  getGroupStatistics() {
    try {
      const groups = groupService.getAllGroups();
      const result = [];
      
      groups.forEach(group => {
        // Get persons in this group
        const persons = personService.getPersonsByGroup(group.id);
        const meetings = meetingService.getMeetingsByGroup(group.id);
        
        // Count roles in the group
        const roleCount = {
          elders: persons.filter(p => p.elder).length,
          servants: persons.filter(p => p.servant).length,
          pioneers: persons.filter(p => p.pioneer).length,
          publishers: persons.filter(p => p.publisher).length,
          leaders: persons.filter(p => p.leader).length,
          helpers: persons.filter(p => p.helper).length
        };
        
        // Count family distribution
        const inFamilies = persons.filter(p => p.familyId !== null).length;
        const familyCount = new Set(persons.filter(p => p.familyId !== null).map(p => p.familyId)).size;
        
        // Check if group meets requirements
        const requirementsMet = groupService.validateGroupRequirements(group.id);
        
        // Calculate geographic center and bounds
        const center = this.calculateCenter([...persons, ...meetings]);
        const bounds = this.calculateBounds([...persons, ...meetings]);
        
        result.push({
          group: group.toJSON(),
          counts: {
            persons: persons.length,
            meetings: meetings.length,
            families: familyCount
          },
          roles: roleCount,
          families: {
            inFamily: inFamilies,
            notInFamily: persons.length - inFamilies,
            inFamilyPercent: persons.length > 0 ? (inFamilies / persons.length * 100).toFixed(1) : 0
          },
          meetRequirements: requirementsMet,
          geographic: {
            center,
            bounds
          }
        });
      });
      
      return result;
    } catch (error) {
      errorHandler.handleError(
        error,
        'Getting Group Statistics',
        ErrorSeverity.WARNING,
        ErrorType.UNKNOWN
      );
      return [];
    }
  }
  
  /**
   * Get family statistics
   * @returns {Array<Object>} Family statistics
   */
  getFamilyStatistics() {
    try {
      const families = familyService.getAllFamilies();
      const result = [];
      
      families.forEach(family => {
        // Get family members
        const members = familyService.getFamilyMembers(family.id);
        const memberCount = (members.head ? 1 : 0) + (members.spouse ? 1 : 0) + members.children.length;
        
        // Calculate how many are in the same group
        let sameGroupCount = 0;
        let groupId = null;
        
        if (members.head) {
          groupId = members.head.group;
          if (groupId) sameGroupCount++;
        }
        
        if (members.spouse) {
          if (groupId && members.spouse.group === groupId) {
            sameGroupCount++;
          } else if (!groupId && members.spouse.group) {
            groupId = members.spouse.group;
            sameGroupCount++;
          }
        }
        
        members.children.forEach(child => {
          if (groupId && child.group === groupId) {
            sameGroupCount++;
          }
        });
        
        // Calculate geographic center and bounds
        const allMembers = [
          members.head,
          members.spouse,
          ...members.children
        ].filter(Boolean);
        
        const center = this.calculateCenter(allMembers);
        const bounds = this.calculateBounds(allMembers);
        
        result.push({
          family: family.toJSON(),
          counts: {
            total: memberCount,
            hasHead: members.head !== null,
            hasSpouse: members.spouse !== null,
            childrenCount: members.children.length
          },
          groups: {
            sameGroup: sameGroupCount,
            sameGroupPercent: memberCount > 0 ? (sameGroupCount / memberCount * 100).toFixed(1) : 0,
            groupId
          },
          geographic: {
            center,
            bounds
          }
        });
      });
      
      return result;
    } catch (error) {
      errorHandler.handleError(
        error,
        'Getting Family Statistics',
        ErrorSeverity.WARNING,
        ErrorType.UNKNOWN
      );
      return [];
    }
  }
  
  /**
   * Get travel statistics
   * @returns {Promise<Object>} Travel statistics
   */
  async getTravelStatistics() {
    try {
      const persons = personService.getAllPersons();
      const meetings = meetingService.getAllMeetings();
      
      // Skip if no persons or meetings
      if (persons.length === 0 || meetings.length === 0) {
        return {
          averages: {
            driving: 0,
            transit: 0,
            walking: 0
          },
          closestMeeting: null,
          furthestMeeting: null,
          travelMatrix: []
        };
      }
      
      // Calculate average travel time from all persons to all meetings
      let totalTravelTimes = {
        [TravelMode.DRIVING]: 0,
        [TravelMode.TRANSIT]: 0,
        [TravelMode.WALKING]: 0
      };
      
      let travelCount = 0;
      let closestMeeting = null;
      let furthestMeeting = null;
      let minDistance = Infinity;
      let maxDistance = 0;
      
      // Track all travel times for matrix
      const travelMatrix = [];
      
      // Calculate travel times for each person to each meeting
      for (const person of persons) {
        const personTravels = [];
        
        for (const meeting of meetings) {
          try {
            // Calculate all travel modes
            const travelTimes = await travelService.calculateAllTravelModes(
              { lat: person.lat, lng: person.lng },
              { lat: meeting.lat, lng: meeting.lng }
            );
            
            // Add to totals
            totalTravelTimes[TravelMode.DRIVING] += travelTimes.driving.durationValue;
            totalTravelTimes[TravelMode.TRANSIT] += travelTimes.transit.durationValue;
            totalTravelTimes[TravelMode.WALKING] += travelTimes.walking.durationValue;
            travelCount++;
            
            // Check for closest/furthest
            const distance = travelTimes.driving.distanceValue;
            
            if (distance < minDistance) {
              minDistance = distance;
              closestMeeting = {
                person: person.toJSON(),
                meeting: meeting.toJSON(),
                travelTimes
              };
            }
            
            if (distance > maxDistance) {
              maxDistance = distance;
              furthestMeeting = {
                person: person.toJSON(),
                meeting: meeting.toJSON(),
                travelTimes
              };
            }
            
            // Add to person's travels
            personTravels.push({
              meetingId: meeting.id,
              meetingName: meeting.name,
              driving: travelTimes.driving.duration,
              drivingValue: travelTimes.driving.durationValue,
              transit: travelTimes.transit.duration,
              transitValue: travelTimes.transit.durationValue,
              walking: travelTimes.walking.duration,
              walkingValue: travelTimes.walking.durationValue,
              distance: travelTimes.driving.distance,
              distanceValue: travelTimes.driving.distanceValue
            });
          } catch (travelError) {
            console.error('Error calculating travel time:', travelError);
            // Continue with next meeting
          }
        }
        
        // Sort by driving time
        personTravels.sort((a, b) => a.drivingValue - b.drivingValue);
        
        // Add to matrix
        travelMatrix.push({
          personId: person.id,
          personName: person.name,
          travels: personTravels
        });
      }
      
      // Calculate averages
      const averages = {
        driving: travelCount > 0 ? Math.round(totalTravelTimes[TravelMode.DRIVING] / travelCount) : 0,
        transit: travelCount > 0 ? Math.round(totalTravelTimes[TravelMode.TRANSIT] / travelCount) : 0,
        walking: travelCount > 0 ? Math.round(totalTravelTimes[TravelMode.WALKING] / travelCount) : 0
      };
      
      return {
        averages,
        closestMeeting,
        furthestMeeting,
        travelMatrix
      };
    } catch (error) {
      errorHandler.handleError(
        error,
        'Getting Travel Statistics',
        ErrorSeverity.WARNING,
        ErrorType.UNKNOWN
      );
      return {
        averages: {
          driving: 0,
          transit: 0,
          walking: 0
        },
        closestMeeting: null,
        furthestMeeting: null,
        travelMatrix: []
      };
    }
  }
  
  /**
   * Calculate center point for a set of entities
   * @param {Array<Object>} entities - Entities with lat/lng properties
   * @returns {Object|null} Center point as {lat, lng}
   */
  calculateCenter(entities) {
    if (!entities || entities.length === 0) {
      return null;
    }
    
    let sumLat = 0;
    let sumLng = 0;
    
    entities.forEach(entity => {
      sumLat += entity.lat;
      sumLng += entity.lng;
    });
    
    return {
      lat: sumLat / entities.length,
      lng: sumLng / entities.length
    };
  }
  
  /**
   * Calculate bounds for a set of entities
   * @param {Array<Object>} entities - Entities with lat/lng properties
   * @returns {Object|null} Bounds as {north, south, east, west}
   */
  calculateBounds(entities) {
    if (!entities || entities.length === 0) {
      return null;
    }
    
    let minLat = entities[0].lat;
    let maxLat = entities[0].lat;
    let minLng = entities[0].lng;
    let maxLng = entities[0].lng;
    
    entities.forEach(entity => {
      minLat = Math.min(minLat, entity.lat);
      maxLat = Math.max(maxLat, entity.lat);
      minLng = Math.min(minLng, entity.lng);
      maxLng = Math.max(maxLng, entity.lng);
    });
    
    return {
      north: maxLat,
      south: minLat,
      east: maxLng,
      west: minLng,
      center: {
        lat: (minLat + maxLat) / 2,
        lng: (minLng + maxLng) / 2
      },
      width: maxLng - minLng, // in degrees
      height: maxLat - minLat // in degrees
    };
  }
}

// Export a singleton instance
export const statisticsService = new StatisticsService();
export default statisticsService;