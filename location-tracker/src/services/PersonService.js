/**
 * PersonService.js
 * Service for managing Person entities in the Location Tracker application
 */

import Person from '../models/Person';
import { stateManager } from './StateManager';
import { errorHandler, ErrorType, ErrorSeverity } from '../utils/errorHandler';
import { EventBus, Events } from '../app/EventBus';

/**
 * Service for managing people
 */
class PersonService {
  constructor() {
    // Initialize state tracking
    this.initializeState();
    
    // Subscribe to relevant state changes
    stateManager.subscribe('persons', this.handleStateUpdate.bind(this));
  }
  
  /**
   * Initialize state tracking
   */
  initializeState() {
    // Cache of all persons for quick access
    this.personsCache = new Map();
    
    // Load initial persons from state
    const personsData = stateManager.getState('persons') || [];
    personsData.forEach(personData => {
      const person = Person.fromJSON(personData);
      this.personsCache.set(person.id, person);
    });
  }
  
  /**
   * Handle state updates
   * @param {Array} personsData - Updated persons data
   */
  handleStateUpdate(personsData) {
    // Clear and rebuild cache when state changes externally
    this.personsCache.clear();
    
    // Update cache with new data
    personsData.forEach(personData => {
      const person = Person.fromJSON(personData);
      this.personsCache.set(person.id, person);
    });
    
    // Notify that persons have been updated
    EventBus.publish(Events.PERSONS_UPDATED, Array.from(this.personsCache.values()));
  }
  
  /**
   * Get all persons
   * @returns {Array<Person>} All persons
   */
  getAllPersons() {
    return Array.from(this.personsCache.values());
  }
  
  /**
   * Get a person by ID
   * @param {string} id - Person ID
   * @returns {Person|null} Person or null if not found
   */
  getPersonById(id) {
    return this.personsCache.get(id) || null;
  }
  
  /**
   * Create a new person
   * @param {Object} personData - Person data
   * @returns {Person} Created person
   */
  createPerson(personData) {
    try {
      // Create new person instance
      const person = new Person(personData);
      
      // Validate the person
      if (!person.validate()) {
        throw new Error('Person validation failed');
      }
      
      // Add to cache
      this.personsCache.set(person.id, person);
      
      // Update state
      this.updateState();
      
      // Notify that a person was created
      EventBus.publish(Events.PERSON_CREATED, person);
      
      return person;
    } catch (error) {
      errorHandler.handleError(
        error,
        'Creating Person',
        ErrorSeverity.ERROR,
        ErrorType.VALIDATION
      );
      throw error;
    }
  }
  
  /**
   * Update an existing person
   * @param {string} id - Person ID
   * @param {Object} updates - Person data updates
   * @returns {Person|null} Updated person or null if not found
   */
  updatePerson(id, updates) {
    try {
      // Find existing person
      const existingPerson = this.personsCache.get(id);
      if (!existingPerson) {
        throw new Error(`Person with ID ${id} not found`);
      }
      
      // Create updated person with current data plus updates
      const updatedPersonData = {
        ...existingPerson.toJSON(),
        ...updates,
        id // Ensure ID stays the same
      };
      
      const updatedPerson = new Person(updatedPersonData);
      
      // Validate the updated person
      if (!updatedPerson.validate()) {
        throw new Error('Updated person validation failed');
      }
      
      // Update in cache
      this.personsCache.set(id, updatedPerson);
      
      // Update state
      this.updateState();
      
      // Notify that a person was updated
      EventBus.publish(Events.PERSON_UPDATED, updatedPerson);
      
      return updatedPerson;
    } catch (error) {
      errorHandler.handleError(
        error,
        'Updating Person',
        ErrorSeverity.ERROR,
        ErrorType.VALIDATION
      );
      throw error;
    }
  }
  
  /**
   * Delete a person
   * @param {string} id - Person ID
   * @returns {boolean} Whether the person was deleted
   */
  deletePerson(id) {
    try {
      // Find existing person
      const existingPerson = this.personsCache.get(id);
      if (!existingPerson) {
        throw new Error(`Person with ID ${id} not found`);
      }
      
      // Remove from cache
      this.personsCache.delete(id);
      
      // Update state
      this.updateState();
      
      // Notify that a person was deleted
      EventBus.publish(Events.PERSON_DELETED, id);
      
      return true;
    } catch (error) {
      errorHandler.handleError(
        error,
        'Deleting Person',
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
    // Convert cache to array of serialized persons
    const personsData = Array.from(this.personsCache.values()).map(person => person.toJSON());
    
    // Update state
    stateManager.setState('persons', personsData);
  }
  
  /**
   * Filter persons by criteria
   * @param {Object} filters - Filter criteria
   * @returns {Array<Person>} Filtered persons
   */
  filterPersons(filters = {}) {
    let filtered = Array.from(this.personsCache.values());
    
    // Filter by name
    if (filters.name) {
      const nameFilter = filters.name.toLowerCase();
      filtered = filtered.filter(person => 
        person.name.toLowerCase().includes(nameFilter)
      );
    }
    
    // Filter by roles
    if (filters.roles && Object.values(filters.roles).some(value => value)) {
      filtered = filtered.filter(person => {
        return Object.entries(filters.roles).some(([role, value]) => {
          return value && person.hasRole(role);
        });
      });
    }
    
    // Filter by group
    if (filters.groupId) {
      filtered = filtered.filter(person => person.group === filters.groupId);
    }
    
    // Filter by family
    if (filters.familyId) {
      filtered = filtered.filter(person => person.familyId === filters.familyId);
    }
    
    // Filter by position
    if (filters.position && filters.radius) {
      const { lat, lng } = filters.position;
      const radiusInKm = filters.radius;
      
      filtered = filtered.filter(person => {
        // Calculate distance using Haversine formula
        const distance = this.calculateDistance(
          lat, lng, 
          person.lat, person.lng
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
   * Get persons by group
   * @param {string} groupId - Group ID
   * @returns {Array<Person>} Persons in the group
   */
  getPersonsByGroup(groupId) {
    return Array.from(this.personsCache.values())
      .filter(person => person.group === groupId);
  }
  
  /**
   * Get persons by family
   * @param {string} familyId - Family ID
   * @returns {Array<Person>} Persons in the family
   */
  getPersonsByFamily(familyId) {
    return Array.from(this.personsCache.values())
      .filter(person => person.familyId === familyId);
  }
  
  /**
   * Assign person to a group
   * @param {string} personId - Person ID
   * @param {string} groupId - Group ID
   * @returns {Person|null} Updated person or null if not found
   */
  assignPersonToGroup(personId, groupId) {
    return this.updatePerson(personId, { group: groupId });
  }
  
  /**
   * Remove person from their group
   * @param {string} personId - Person ID
   * @returns {Person|null} Updated person or null if not found
   */
  removePersonFromGroup(personId) {
    return this.updatePerson(personId, { group: null });
  }
  
  /**
   * Assign person to a family
   * @param {string} personId - Person ID
   * @param {string} familyId - Family ID
   * @param {string} role - Role in the family ('head', 'spouse', 'child')
   * @returns {Person|null} Updated person or null if not found
   */
  assignPersonToFamily(personId, familyId, role) {
    return this.updatePerson(personId, { 
      familyId, 
      familyRole: role,
      
      // Set role flags based on family role
      familyHead: role === 'head',
      spouse: role === 'spouse',
      child: role === 'child'
    });
  }
  
  /**
   * Remove person from their family
   * @param {string} personId - Person ID
   * @returns {Person|null} Updated person or null if not found
   */
  removePersonFromFamily(personId) {
    return this.updatePerson(personId, { 
      familyId: null, 
      familyRole: null,
      familyHead: false,
      spouse: false,
      child: false,
      relationshipIds: []
    });
  }
  
  /**
   * Update person's position
   * @param {string} personId - Person ID
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Person|null} Updated person or null if not found
   */
  updatePersonPosition(personId, lat, lng) {
    return this.updatePerson(personId, { lat, lng });
  }
}

// Export a singleton instance
export const personService = new PersonService();
export default personService;