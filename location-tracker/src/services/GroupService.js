/**
 * GroupService.js
 * Service for managing Group entities in the Location Tracker application
 */

import Group from '../models/Group';
import { stateManager } from './StateManager';
import { errorHandler, ErrorType, ErrorSeverity } from '../utils/errorHandler';
import { EventBus, Events } from '../app/EventBus';
import personService from './PersonService';
import meetingService from './MeetingService';

/**
 * Service for managing groups
 */
class GroupService {
  constructor() {
    // Initialize state tracking
    this.initializeState();
    
    // Subscribe to relevant state changes
    stateManager.subscribe('groups', this.handleStateUpdate.bind(this));
    
    // Listen for changes to persons and meetings that might affect groups
    EventBus.subscribe(Events.PERSON_UPDATED, this.handlePersonUpdate.bind(this));
    EventBus.subscribe(Events.MEETING_UPDATED, this.handleMeetingUpdate.bind(this));
  }
  
  /**
   * Initialize state tracking
   */
  initializeState() {
    // Cache of all groups for quick access
    this.groupsCache = new Map();
    
    // Load initial groups from state
    const groupsData = stateManager.getState('groups') || [];
    groupsData.forEach(groupData => {
      const group = Group.fromJSON(groupData);
      this.groupsCache.set(group.id, group);
    });
  }
  
  /**
   * Handle state updates
   * @param {Array} groupsData - Updated groups data
   */
  handleStateUpdate(groupsData) {
    // Clear and rebuild cache when state changes externally
    this.groupsCache.clear();
    
    // Update cache with new data
    groupsData.forEach(groupData => {
      const group = Group.fromJSON(groupData);
      this.groupsCache.set(group.id, group);
    });
    
    // Notify that groups have been updated
    EventBus.publish(Events.GROUPS_UPDATED, Array.from(this.groupsCache.values()));
  }
  
  /**
   * Handle person updates that might affect groups
   * @param {Person} person - Updated person
   */
  handlePersonUpdate(person) {
    // Check for role changes that might affect group requirements
    if (person.group) {
      this.validateGroupRequirements(person.group);
    }
  }
  
  /**
   * Handle meeting updates that might affect groups
   * @param {Meeting} meeting - Updated meeting
   */
  handleMeetingUpdate(meeting) {
    // Nothing to do for now
  }
  
  /**
   * Get all groups
   * @returns {Array<Group>} All groups
   */
  getAllGroups() {
    return Array.from(this.groupsCache.values());
  }
  
  /**
   * Get a group by ID
   * @param {string} id - Group ID
   * @returns {Group|null} Group or null if not found
   */
  getGroupById(id) {
    return this.groupsCache.get(id) || null;
  }
  
  /**
   * Create a new group
   * @param {Object} groupData - Group data
   * @returns {Group} Created group
   */
  createGroup(groupData) {
    try {
      // Create new group instance
      const group = new Group(groupData);
      
      // Validate the group
      if (!group.validate()) {
        throw new Error('Group validation failed');
      }
      
      // Add to cache
      this.groupsCache.set(group.id, group);
      
      // Update state
      this.updateState();
      
      // Notify that a group was created
      EventBus.publish(Events.GROUP_CREATED, group);
      
      return group;
    } catch (error) {
      errorHandler.handleError(
        error,
        'Creating Group',
        ErrorSeverity.ERROR,
        ErrorType.VALIDATION
      );
      throw error;
    }
  }
  
  /**
   * Update an existing group
   * @param {string} id - Group ID
   * @param {Object} updates - Group data updates
   * @returns {Group|null} Updated group or null if not found
   */
  updateGroup(id, updates) {
    try {
      // Find existing group
      const existingGroup = this.groupsCache.get(id);
      if (!existingGroup) {
        throw new Error(`Group with ID ${id} not found`);
      }
      
      // Create updated group with current data plus updates
      const updatedGroupData = {
        ...existingGroup.toJSON(),
        ...updates,
        id // Ensure ID stays the same
      };
      
      const updatedGroup = new Group(updatedGroupData);
      
      // Validate the updated group
      if (!updatedGroup.validate()) {
        throw new Error('Updated group validation failed');
      }
      
      // Update in cache
      this.groupsCache.set(id, updatedGroup);
      
      // Update state
      this.updateState();
      
      // Notify that a group was updated
      EventBus.publish(Events.GROUP_UPDATED, updatedGroup);
      
      return updatedGroup;
    } catch (error) {
      errorHandler.handleError(
        error,
        'Updating Group',
        ErrorSeverity.ERROR,
        ErrorType.VALIDATION
      );
      throw error;
    }
  }
  
  /**
   * Delete a group
   * @param {string} id - Group ID
   * @param {boolean} [removeAssignments=true] - Whether to remove group assignments from members
   * @returns {boolean} Whether the group was deleted
   */
  deleteGroup(id, removeAssignments = true) {
    try {
      // Find existing group
      const existingGroup = this.groupsCache.get(id);
      if (!existingGroup) {
        throw new Error(`Group with ID ${id} not found`);
      }
      
      // If requested, remove all assignments to this group
      if (removeAssignments) {
        // Remove group assignment from persons
        const personsInGroup = personService.getPersonsByGroup(id);
        personsInGroup.forEach(person => {
          personService.removePersonFromGroup(person.id);
        });
        
        // Remove group assignment from meetings
        const meetingsInGroup = meetingService.getMeetingsByGroup(id);
        meetingsInGroup.forEach(meeting => {
          meetingService.removeMeetingFromGroup(meeting.id);
        });
      }
      
      // Remove from cache
      this.groupsCache.delete(id);
      
      // Update state
      this.updateState();
      
      // Notify that a group was deleted
      EventBus.publish(Events.GROUP_DELETED, id);
      
      return true;
    } catch (error) {
      errorHandler.handleError(
        error,
        'Deleting Group',
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
    // Convert cache to array of serialized groups
    const groupsData = Array.from(this.groupsCache.values()).map(group => group.toJSON());
    
    // Update state
    stateManager.setState('groups', groupsData);
  }
  
  /**
   * Filter groups by criteria
   * @param {Object} filters - Filter criteria
   * @returns {Array<Group>} Filtered groups
   */
  filterGroups(filters = {}) {
    let filtered = Array.from(this.groupsCache.values());
    
    // Filter by name
    if (filters.name) {
      const nameFilter = filters.name.toLowerCase();
      filtered = filtered.filter(group => 
        group.name.toLowerCase().includes(nameFilter)
      );
    }
    
    // Filter by color
    if (filters.color) {
      filtered = filtered.filter(group => group.color === filters.color);
    }
    
    // Filter by member count
    if (filters.minMembers !== undefined) {
      filtered = filtered.filter(group => {
        const memberCount = personService.getPersonsByGroup(group.id).length;
        return memberCount >= filters.minMembers;
      });
    }
    
    if (filters.maxMembers !== undefined) {
      filtered = filtered.filter(group => {
        const memberCount = personService.getPersonsByGroup(group.id).length;
        return memberCount <= filters.maxMembers;
      });
    }
    
    // Filter by having meeting points
    if (filters.hasMeetings !== undefined) {
      filtered = filtered.filter(group => {
        const meetingCount = meetingService.getMeetingsByGroup(group.id).length;
        return filters.hasMeetings ? meetingCount > 0 : meetingCount === 0;
      });
    }
    
    return filtered;
  }
  
  /**
   * Get group statistics
   * @param {string} groupId - Group ID
   * @returns {Object} Group statistics
   */
  getGroupStatistics(groupId) {
    const group = this.getGroupById(groupId);
    if (!group) {
      return null;
    }
    
    const persons = personService.getPersonsByGroup(groupId);
    const meetings = meetingService.getMeetingsByGroup(groupId);
    
    // Count roles
    const elderCount = persons.filter(p => p.elder).length;
    const servantCount = persons.filter(p => p.servant).length;
    const pioneerCount = persons.filter(p => p.pioneer).length;
    const leaderCount = persons.filter(p => p.leader).length;
    const helperCount = persons.filter(p => p.helper).length;
    const childCount = persons.filter(p => p.child).length;
    const publisherCount = persons.filter(p => p.publisher).length;
    
    // Return statistics
    return {
      group: group.toJSON(),
      counts: {
        persons: persons.length,
        meetings: meetings.length,
        elders: elderCount,
        servants: servantCount,
        pioneers: pioneerCount,
        leaders: leaderCount,
        helpers: helperCount,
        children: childCount,
        publishers: publisherCount
      },
      meetsMemberRequirements: this.checkGroupMeetsRequirements(group, persons)
    };
  }
  
  /**
   * Validate that a group meets requirements
   * @param {string} groupId - Group ID
   * @returns {boolean} Whether the group meets requirements
   */
  validateGroupRequirements(groupId) {
    const group = this.getGroupById(groupId);
    if (!group) {
      return false;
    }
    
    const persons = personService.getPersonsByGroup(groupId);
    return this.checkGroupMeetsRequirements(group, persons);
  }
  
  /**
   * Check if a group meets requirements based on its members
   * @param {Group} group - Group to check
   * @param {Array<Person>} persons - Persons in the group
   * @returns {boolean} Whether the group meets requirements
   */
  checkGroupMeetsRequirements(group, persons) {
    // Get group requirements from state
    const config = stateManager.getState('config.autoGrouping.requirements') || {
      minElders: 0,
      minServants: 0,
      minPioneers: 0,
      minLeaders: 1,
      minHelpers: 1,
      minPublishers: 0
    };
    
    // Count roles in the group
    const elderCount = persons.filter(p => p.elder).length;
    const servantCount = persons.filter(p => p.servant).length;
    const pioneerCount = persons.filter(p => p.pioneer).length;
    const leaderCount = persons.filter(p => p.leader).length;
    const helperCount = persons.filter(p => p.helper).length;
    const publisherCount = persons.filter(p => p.publisher).length;
    
    // Check against requirements
    return elderCount >= config.minElders &&
           servantCount >= config.minServants &&
           pioneerCount >= config.minPioneers &&
           leaderCount >= config.minLeaders &&
           helperCount >= config.minHelpers &&
           publisherCount >= config.minPublishers;
  }
  
  /**
   * Auto-create groups based on proximity
   * @param {Object} options - Options for group creation
   * @returns {Array<Object>} Created groups with statistics
   */
  autoCreateGroups(options = {}) {
    // Get all ungrouped persons
    let availablePersons = personService.getAllPersons()
      .filter(person => !person.group);
    
    // Use default options if not provided
    const defaultOptions = {
      distanceThreshold: 1.0, // km
      minGroupSize: 2,
      maxGroupSize: 20,
      keepFamiliesTogether: true,
      assignMeetingPoints: true
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    // Get config requirements
    const requirements = stateManager.getState('config.autoGrouping.requirements') || {
      minElders: 0,
      minServants: 0,
      minPioneers: 0,
      minLeaders: 1,
      minHelpers: 1,
      minPublishers: 0
    };
    
    // Track created groups
    const createdGroups = [];
    
    // If keeping families together, identify family units first
    let familyUnits = [];
    if (mergedOptions.keepFamiliesTogether) {
      const families = stateManager.getState('families') || [];
      
      families.forEach(family => {
        // Get family members
        const familyMembers = availablePersons.filter(person => person.familyId === family.id);
        
        if (familyMembers.length > 0) {
          // Add as a unit
          familyUnits.push({
            familyId: family.id,
            members: familyMembers,
            center: this.calculateCentroid(familyMembers.map(p => ({ lat: p.lat, lng: p.lng })))
          });
          
          // Remove these persons from available pool
          availablePersons = availablePersons.filter(p => !familyMembers.includes(p));
        }
      });
    }
    
    // Identify meeting points without groups
    const availableMeetings = meetingService.getAllMeetings()
      .filter(meeting => !meeting.group);
    
    // For each meeting point, create a group if possible
    availableMeetings.forEach(meeting => {
      // Skip if we've already used all available persons
      if (availablePersons.length === 0 && familyUnits.length === 0) {
        return;
      }
      
      // Find persons near this meeting point
      const nearbyPersons = [];
      
      // First, check nearby family units (they stay together)
      const nearbyFamilyUnits = [];
      const remainingFamilyUnits = [];
      
      familyUnits.forEach(family => {
        const distance = this.calculateDistance(
          meeting.lat, meeting.lng,
          family.center.lat, family.center.lng
        );
        
        if (distance <= mergedOptions.distanceThreshold) {
          nearbyFamilyUnits.push(family);
          // Add all family members
          nearbyPersons.push(...family.members);
        } else {
          remainingFamilyUnits.push(family);
        }
      });
      
      // Update family units list to only include those not used
      familyUnits = remainingFamilyUnits;
      
      // Then check individual persons
      const remainingPersons = [];
      
      availablePersons.forEach(person => {
        const distance = this.calculateDistance(
          meeting.lat, meeting.lng,
          person.lat, person.lng
        );
        
        if (distance <= mergedOptions.distanceThreshold && 
            nearbyPersons.length < mergedOptions.maxGroupSize) {
          nearbyPersons.push(person);
        } else {
          remainingPersons.push(person);
        }
      });
      
      // Update available persons to only include those not used
      availablePersons = remainingPersons;
      
      // Check if we have enough persons and they meet requirements
      if (nearbyPersons.length >= mergedOptions.minGroupSize) {
        // Check if the group meets requirements
        const meetsRequirements = this.checkMembersAgainstRequirements(nearbyPersons, requirements);
        
        // Create the group if it meets requirements
        if (meetsRequirements) {
          // Create a new group
          const group = this.createGroup({
            name: `Group - ${meeting.name}`,
            color: this.generateRandomColor()
          });
          
          // Assign persons to the group
          nearbyPersons.forEach(person => {
            personService.assignPersonToGroup(person.id, group.id);
          });
          
          // Assign meeting to the group
          if (mergedOptions.assignMeetingPoints) {
            meetingService.assignMeetingToGroup(meeting.id, group.id);
          }
          
          // Add to created groups
          createdGroups.push({
            group: group.toJSON(),
            persons: nearbyPersons.map(p => p.toJSON()),
            meetings: [meeting.toJSON()],
            familyUnits: nearbyFamilyUnits.map(f => f.familyId)
          });
        }
      }
    });
    
    // Try to create additional groups from remaining persons
    while (availablePersons.length >= mergedOptions.minGroupSize || familyUnits.length > 0) {
      // Start with the first available person or family as a seed
      let seedLocation;
      let initialMembers = [];
      
      if (familyUnits.length > 0) {
        // Start with a family unit
        const familyUnit = familyUnits.shift();
        seedLocation = familyUnit.center;
        initialMembers = [...familyUnit.members];
      } else if (availablePersons.length > 0) {
        // Start with a single person
        const seedPerson = availablePersons.shift();
        seedLocation = { lat: seedPerson.lat, lng: seedPerson.lng };
        initialMembers = [seedPerson];
      } else {
        // No more seeds available
        break;
      }
      
      // Find nearby family units and persons
      const groupMembers = [...initialMembers];
      
      // Add nearby family units first
      const remainingFamilyUnits = [];
      
      familyUnits.forEach(family => {
        // Skip if we've already reached max group size
        if (groupMembers.length >= mergedOptions.maxGroupSize) {
          remainingFamilyUnits.push(family);
          return;
        }
        
        const distance = this.calculateDistance(
          seedLocation.lat, seedLocation.lng,
          family.center.lat, family.center.lng
        );
        
        if (distance <= mergedOptions.distanceThreshold && 
            groupMembers.length + family.members.length <= mergedOptions.maxGroupSize) {
          // Add all family members
          groupMembers.push(...family.members);
        } else {
          remainingFamilyUnits.push(family);
        }
      });
      
      // Update family units list
      familyUnits = remainingFamilyUnits;
      
      // Add individual persons
      const remainingPersons = [];
      
      availablePersons.forEach(person => {
        // Skip if we've already reached max group size
        if (groupMembers.length >= mergedOptions.maxGroupSize) {
          remainingPersons.push(person);
          return;
        }
        
        const distance = this.calculateDistance(
          seedLocation.lat, seedLocation.lng,
          person.lat, person.lng
        );
        
        if (distance <= mergedOptions.distanceThreshold) {
          groupMembers.push(person);
        } else {
          remainingPersons.push(person);
        }
      });
      
      // Update available persons
      availablePersons = remainingPersons;
      
      // Check if we have enough persons and they meet requirements
      if (groupMembers.length >= mergedOptions.minGroupSize) {
        // Check if the group meets requirements
        const meetsRequirements = this.checkMembersAgainstRequirements(groupMembers, requirements);
        
        // Create the group if it meets requirements
        if (meetsRequirements) {
          // Find a center point for the group
          const center = this.calculateCentroid(groupMembers.map(p => ({ lat: p.lat, lng: p.lng })));
          
          // Find the nearest meeting point to use for the group name
          const nearestResult = meetingService.findNearestMeeting(center.lat, center.lng);
          const nearestMeeting = nearestResult.meeting;
          
          // Create a new group
          const group = this.createGroup({
            name: nearestMeeting ? 
              `Group - ${nearestMeeting.name}` : 
              `Group ${createdGroups.length + 1}`,
            color: this.generateRandomColor()
          });
          
          // Assign persons to the group
          groupMembers.forEach(person => {
            personService.assignPersonToGroup(person.id, group.id);
          });
          
          // Add to created groups
          createdGroups.push({
            group: group.toJSON(),
            persons: groupMembers.map(p => p.toJSON()),
            meetings: [],
            familyUnits: [] // We'd need to track which family units were used
          });
        }
      }
    }
    
    // Return the created groups
    return createdGroups;
  }
  
  /**
   * Check if a set of members meets the specified role requirements
   * @param {Array<Person>} members - Potential group members
   * @param {Object} requirements - Role requirements
   * @returns {boolean} Whether the members meet requirements
   */
  checkMembersAgainstRequirements(members, requirements) {
    // Count roles in the potential group
    const elderCount = members.filter(p => p.elder).length;
    const servantCount = members.filter(p => p.servant).length;
    const pioneerCount = members.filter(p => p.pioneer).length;
    const leaderCount = members.filter(p => p.leader).length;
    const helperCount = members.filter(p => p.helper).length;
    const publisherCount = members.filter(p => p.publisher).length;
    
    // Check against requirements
    return elderCount >= requirements.minElders &&
           servantCount >= requirements.minServants &&
           pioneerCount >= requirements.minPioneers &&
           leaderCount >= requirements.minLeaders &&
           helperCount >= requirements.minHelpers &&
           publisherCount >= requirements.minPublishers;
  }
  
  /**
   * Calculate the center point of a set of locations
   * @param {Array<Object>} locations - Array of {lat, lng} objects
   * @returns {Object} Centroid as {lat, lng}
   */
  calculateCentroid(locations) {
    if (locations.length === 0) {
      return { lat: 0, lng: 0 };
    }
    
    let sumLat = 0;
    let sumLng = 0;
    
    locations.forEach(location => {
      sumLat += location.lat;
      sumLng += location.lng;
    });
    
    return {
      lat: sumLat / locations.length,
      lng: sumLng / locations.length
    };
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
   * Generate a random color
   * @returns {string} Hex color code
   */
  generateRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }
  
  /**
   * Preview auto-grouping results without actually creating the groups
   * @param {Object} options - Auto-grouping options
   * @returns {Object} Preview results
   */
  previewAutoGroups(options = {}) {
    // Save current state
    const personsBackup = personService.getAllPersons().map(p => p.toJSON());
    const meetingsBackup = meetingService.getAllMeetings().map(m => m.toJSON());
    const groupsBackup = this.getAllGroups().map(g => g.toJSON());
    
    try {
      // Create groups
      const createdGroups = this.autoCreateGroups(options);
      
      // Get full statistics for preview
      const groupStats = createdGroups.map(group => this.getGroupStatistics(group.group.id));
      
      // Restore original state
      stateManager.setState('persons', personsBackup);
      stateManager.setState('meetingPoints', meetingsBackup);
      stateManager.setState('groups', groupsBackup);
      
      return {
        success: true,
        groups: createdGroups,
        statistics: groupStats
      };
    } catch (error) {
      // Ensure state is restored even on error
      stateManager.setState('persons', personsBackup);
      stateManager.setState('meetingPoints', meetingsBackup);
      stateManager.setState('groups', groupsBackup);
      
      errorHandler.handleError(
        error,
        'Previewing Auto Groups',
        ErrorSeverity.ERROR,
        ErrorType.UNKNOWN
      );
      
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export a singleton instance
export const groupService = new GroupService();
export default groupService;