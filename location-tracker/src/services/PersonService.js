/**
 * PersonService.js
 * Service for managing people in the Location Tracker application
 */

import { stateManager } from './StateManager';
import Person from '../models/Person';
import { errorHandler, ErrorType, ErrorSeverity } from '../utils/errorHandler';

/**
 * Service for managing people
 */
class PersonService {
  constructor() {
    // Subscribe to changes in the persons state
    this.unsubscribe = stateManager.subscribe('persons', (persons) => {
      this.handlePersonsUpdate(persons);
    });
    
    // Local cache of person markers
    this.personMarkers = new Map();
  }
  
  /**
   * Handle updates to the persons state
   * @param {Array} persons - Updated persons array
   * @private
   */
  handlePersonsUpdate(persons) {
    // This hook can be used to react to person data changes
    // For example, we might want to update UI or sync with server
  }
  
  /**
   * Get all persons
   * @returns {Array} Array of Person objects
   */
  getAllPersons() {
    const personsData = stateManager.getState('persons') || [];
    return personsData.map(data => new Person(data));
  }
  
  /**
   * Get a person by ID
   * @param {string} id - Person ID
   * @returns {Person|null} Person object or null if not found
   */
  getPersonById(id) {
    if (!id) return null;
    
    const personsData = stateManager.getState('persons') || [];
    const personData = personsData.find(p => p.id === id);
    
    return personData ? new Person(personData) : null;
  }
  
  /**
   * Create a new person
   * @param {Object} data - Person data
   * @returns {Person} Newly created Person object
   */
  createPerson(data) {
    try {
      const newPerson = new Person(data);
      
      if (!newPerson.validate()) {
        throw new Error('Invalid person data');
      }
      
      const personsData = stateManager.getState('persons') || [];
      personsData.push(newPerson.toJSON());
      stateManager.setState('persons', personsData);
      
      return newPerson;
    } catch (error) {
      errorHandler.handleError(
        error,
        'Person Creation',
        ErrorSeverity.ERROR,
        ErrorType.VALIDATION
      );
      throw error;
    }
  }
  
  /**
   * Update an existing person
   * @param {string} id - Person ID
   * @param {Object} data - Updated person data
   * @returns {Person|null} Updated Person object or null if not found
   */
  updatePerson(id, data) {
    try {
      if (!id) throw new Error('Person ID is required');
      
      const personsData = stateManager.getState('persons') || [];
      const personIndex = personsData.findIndex(p => p.id === id);
      
      if (personIndex === -1) {
        throw new Error(`Person with ID ${id} not found`);
      }
      
      // Merge existing data with new data
      const existingData = personsData[personIndex];
      const updatedData = { ...existingData, ...data, id };
      
      // Create and validate the updated person
      const updatedPerson = new Person(updatedData);
      if (!updatedPerson.validate()) {
        throw new Error('Invalid person data');
      }
      
      // Update in state
      personsData[personIndex] = updatedPerson.toJSON();
      stateManager.setState('persons', personsData);
      
      return updatedPerson;
    } catch (error) {
      errorHandler.handleError(
        error,
        'Person Update',
        ErrorSeverity.ERROR,
        ErrorType.VALIDATION
      );
      throw error;
    }
  }
  
  /**
   * Delete a person
   * @param {string} id - Person ID
   * @returns {boolean} Success status
   */
  deletePerson(id) {
    try {
      if (!id) throw new Error('Person ID is required');
      
      const personsData = stateManager.getState('persons') || [];
      const personIndex = personsData.findIndex(p => p.id === id);
      
      if (personIndex === -1) {
        throw new Error(`Person with ID ${id} not found`);
      }
      
      // Remove from state
      personsData.splice(personIndex, 1);
      stateManager.setState('persons', personsData);
      
      return true;
    } catch (error) {
      errorHandler.handleError(
        error,
        'Person Deletion',
        ErrorSeverity.ERROR,
        ErrorType.UNKNOWN
      );
      throw error;
    }
  }
  
  /**
   * Filter persons by various criteria
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered array of Person objects
   */
  filterPersons(filters = {}) {
    const persons = this.getAllPersons();
    
    return persons.filter(person => {
      // Filter by name
      if (filters.name && !person.name.toLowerCase().includes(filters.name.toLowerCase())) {
        return false;
      }
      
      // Filter by roles
      if (filters.roles && Object.keys(filters.roles).length > 0) {
        const hasMatchingRole = Object.entries(filters.roles).some(
          ([role, value]) => value && person.hasRole(role)
        );
        
        if (!hasMatchingRole) return false;
      }
      
      // Filter by group
      if (filters.groupId && person.group !== filters.groupId) {
        return false;
      }
      
      // Filter by family
      if (filters.familyId && person.familyId !== filters.familyId) {
        return false;
      }
      
      return true;
    });
  }
  
  /**
   * Get all persons in a specific group
   * @param {string} groupId - Group ID
   * @returns {Array} Array of Person objects in the group
   */
  getPersonsByGroup(groupId) {
    if (!groupId) return [];
    
    return this.getAllPersons().filter(person => person.group === groupId);
  }
  
  /**
   * Get all persons in a specific family
   * @param {string} familyId - Family ID
   * @returns {Array} Array of Person objects in the family
   */
  getPersonsByFamily(familyId) {
    if (!familyId) return [];
    
    return this.getAllPersons().filter(person => person.familyId === familyId);
  }
  
  /**
   * Get all persons with a specific role
   * @param {string} role - Role name ('elder', 'servant', etc.)
   * @returns {Array} Array of Person objects with the role
   */
  getPersonsByRole(role) {
    if (!role) return [];
    
    return this.getAllPersons().filter(person => person.hasRole(role));
  }
  
  /**
   * Assign a person to a group
   * @param {string} personId - Person ID
   * @param {string} groupId - Group ID (or null to remove from group)
   * @returns {boolean} Success status
   */
  assignPersonToGroup(personId, groupId) {
    try {
      if (!personId) throw new Error('Person ID is required');
      
      const personsData = stateManager.getState('persons') || [];
      const personIndex = personsData.findIndex(p => p.id === personId);
      
      if (personIndex === -1) {
        throw new Error(`Person with ID ${personId} not found`);
      }
      
      // Update group assignment
      personsData[personIndex].group = groupId;
      stateManager.setState('persons', personsData);
      
      return true;
    } catch (error) {
      errorHandler.handleError(
        error,
        'Person Group Assignment',
        ErrorSeverity.ERROR,
        ErrorType.UNKNOWN
      );
      throw error;
    }
  }
  
  /**
   * Add or update the marker for a person
   * @param {string} personId - Person ID
   * @param {Object} marker - Google Maps marker object
   * @returns {boolean} Success status
   */
  setPersonMarker(personId, marker) {
    if (!personId || !marker) return false;
    
    this.personMarkers.set(personId, marker);
    return true;
  }
  
  /**
   * Get the marker for a person
   * @param {string} personId - Person ID
   * @returns {Object|null} Google Maps marker object or null if not found
   */
  getPersonMarker(personId) {
    if (!personId) return null;
    
    return this.personMarkers.get(personId) || null;
  }
  
  /**
   * Clean up resources used by the service
   */
  dispose() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    
    this.personMarkers.clear();
  }
}

// Export singleton instance
export const personService = new PersonService();
export default personService;