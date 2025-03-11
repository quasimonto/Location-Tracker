/**
 * FamilyService.js
 * Service for managing Family entities in the Location Tracker application
 */

import Family from '../models/Family';
import { stateManager } from './StateManager';
import { errorHandler, ErrorType, ErrorSeverity } from '../utils/errorHandler';
import { EventBus, Events } from '../app/EventBus';
import personService from './PersonService';

/**
 * Service for managing families
 */
class FamilyService {
  constructor() {
    // Initialize state tracking
    this.initializeState();
    
    // Subscribe to relevant state changes
    stateManager.subscribe('families', this.handleStateUpdate.bind(this));
    
    // Listen for changes to persons that might affect families
    EventBus.subscribe(Events.PERSON_UPDATED, this.handlePersonUpdate.bind(this));
    EventBus.subscribe(Events.PERSON_DELETED, this.handlePersonDeleted.bind(this));
  }
  
  /**
   * Initialize state tracking
   */
  initializeState() {
    // Cache of all families for quick access
    this.familiesCache = new Map();
    
    // Load initial families from state
    const familiesData = stateManager.getState('families') || [];
    familiesData.forEach(familyData => {
      const family = Family.fromJSON(familyData);
      this.familiesCache.set(family.id, family);
    });
  }
  
  /**
   * Handle state updates
   * @param {Array} familiesData - Updated families data
   */
  handleStateUpdate(familiesData) {
    // Clear and rebuild cache when state changes externally
    this.familiesCache.clear();
    
    // Update cache with new data
    familiesData.forEach(familyData => {
      const family = Family.fromJSON(familyData);
      this.familiesCache.set(family.id, family);
    });
    
    // Notify that families have been updated
    EventBus.publish(Events.FAMILIES_UPDATED, Array.from(this.familiesCache.values()));
  }
  
  /**
   * Handle person updates that might affect families
   * @param {Person} person - Updated person
   */
  handlePersonUpdate(person) {
    // Check if the person's family-related attributes changed
    // For example, if familyId or familyRole changed
    
    // For now, we're just ensuring family integrity
    if (person.familyId) {
      this.validateFamilyIntegrity(person.familyId);
    }
  }
  
  /**
   * Handle person deletion events
   * @param {string} personId - ID of the deleted person
   */
  handlePersonDeleted(personId) {
    // Find families that might reference this person
    const affectedFamilies = Array.from(this.familiesCache.values())
      .filter(family => 
        family.headId === personId || 
        family.spouseId === personId || 
        family.childrenIds.includes(personId)
      );
    
    // Handle each affected family
    affectedFamilies.forEach(family => {
      this.removePersonFromFamily(personId, family.id);
    });
  }
  
  /**
   * Get all families
   * @returns {Array<Family>} All families
   */
  getAllFamilies() {
    return Array.from(this.familiesCache.values());
  }
  
  /**
   * Get a family by ID
   * @param {string} id - Family ID
   * @returns {Family|null} Family or null if not found
   */
  getFamilyById(id) {
    return this.familiesCache.get(id) || null;
  }
  
  /**
   * Get a person's family
   * @param {string} personId - Person ID
   * @returns {Family|null} Family or null if person has no family
   */
  getPersonFamily(personId) {
    const person = personService.getPersonById(personId);
    if (!person || !person.familyId) {
      return null;
    }
    
    return this.getFamilyById(person.familyId);
  }
  
  /**
   * Create a new family
   * @param {Object} familyData - Family data
   * @returns {Family} Created family
   */
  createFamily(familyData) {
    try {
      // Create new family instance
      const family = new Family(familyData);
      
      // Validate the family
      if (!family.validate()) {
        throw new Error('Family validation failed');
      }
      
      // Add to cache
      this.familiesCache.set(family.id, family);
      
      // Update state
      this.updateState();
      
      // If head is specified, update the person
      if (family.headId) {
        personService.assignPersonToFamily(family.headId, family.id, 'head');
      }
      
      // If spouse is specified, update the person
      if (family.spouseId) {
        personService.assignPersonToFamily(family.spouseId, family.id, 'spouse');
      }
      
      // If children are specified, update the persons
      family.childrenIds.forEach(childId => {
        personService.assignPersonToFamily(childId, family.id, 'child');
      });
      
      // Notify that a family was created
      EventBus.publish(Events.FAMILY_CREATED, family);
      
      return family;
    } catch (error) {
      errorHandler.handleError(
        error,
        'Creating Family',
        ErrorSeverity.ERROR,
        ErrorType.VALIDATION
      );
      throw error;
    }
  }
  
  /**
   * Update an existing family
   * @param {string} id - Family ID
   * @param {Object} updates - Family data updates
   * @returns {Family|null} Updated family or null if not found
   */
  updateFamily(id, updates) {
    try {
      // Find existing family
      const existingFamily = this.familiesCache.get(id);
      if (!existingFamily) {
        throw new Error(`Family with ID ${id} not found`);
      }
      
      // Create updated family with current data plus updates
      const updatedFamilyData = {
        ...existingFamily.toJSON(),
        ...updates,
        id // Ensure ID stays the same
      };
      
      const updatedFamily = new Family(updatedFamilyData);
      
      // Validate the updated family
      if (!updatedFamily.validate()) {
        throw new Error('Updated family validation failed');
      }
      
      // Track changes to handle person updates
      const oldHeadId = existingFamily.headId;
      const oldSpouseId = existingFamily.spouseId;
      const oldChildrenIds = [...existingFamily.childrenIds];
      
      // Update in cache
      this.familiesCache.set(id, updatedFamily);
      
      // Update state
      this.updateState();
      
      // Handle updates to head
      if (updatedFamily.headId !== oldHeadId) {
        // Remove old head from family if exists
        if (oldHeadId) {
          personService.removePersonFromFamily(oldHeadId);
        }
        
        // Assign new head if exists
        if (updatedFamily.headId) {
          personService.assignPersonToFamily(updatedFamily.headId, id, 'head');
        }
      }
      
      // Handle updates to spouse
      if (updatedFamily.spouseId !== oldSpouseId) {
        // Remove old spouse from family if exists
        if (oldSpouseId) {
          personService.removePersonFromFamily(oldSpouseId);
        }
        
        // Assign new spouse if exists
        if (updatedFamily.spouseId) {
          personService.assignPersonToFamily(updatedFamily.spouseId, id, 'spouse');
        }
      }
      
      // Handle updates to children
      
      // Find removed children
      const removedChildrenIds = oldChildrenIds.filter(
        childId => !updatedFamily.childrenIds.includes(childId)
      );
      
      // Find added children
      const addedChildrenIds = updatedFamily.childrenIds.filter(
        childId => !oldChildrenIds.includes(childId)
      );
      
      // Remove old children
      removedChildrenIds.forEach(childId => {
        personService.removePersonFromFamily(childId);
      });
      
      // Add new children
      addedChildrenIds.forEach(childId => {
        personService.assignPersonToFamily(childId, id, 'child');
      });
      
      // Notify that a family was updated
      EventBus.publish(Events.FAMILY_UPDATED, updatedFamily);
      
      return updatedFamily;
    } catch (error) {
      errorHandler.handleError(
        error,
        'Updating Family',
        ErrorSeverity.ERROR,
        ErrorType.VALIDATION
      );
      throw error;
    }
  }
  
  /**
   * Delete a family
   * @param {string} id - Family ID
   * @param {boolean} [removeAssignments=true] - Whether to remove family assignments from members
   * @returns {boolean} Whether the family was deleted
   */
  deleteFamily(id, removeAssignments = true) {
    try {
      // Find existing family
      const existingFamily = this.familiesCache.get(id);
      if (!existingFamily) {
        throw new Error(`Family with ID ${id} not found`);
      }
      
      // If requested, remove all family assignments
      if (removeAssignments) {
        // Remove family assignment from head
        if (existingFamily.headId) {
          personService.removePersonFromFamily(existingFamily.headId);
        }
        
        // Remove family assignment from spouse
        if (existingFamily.spouseId) {
          personService.removePersonFromFamily(existingFamily.spouseId);
        }
        
        // Remove family assignment from children
        existingFamily.childrenIds.forEach(childId => {
          personService.removePersonFromFamily(childId);
        });
      }
      
      // Remove from cache
      this.familiesCache.delete(id);
      
      // Update state
      this.updateState();
      
      // Notify that a family was deleted
      EventBus.publish(Events.FAMILY_DELETED, id);
      
      return true;
    } catch (error) {
      errorHandler.handleError(
        error,
        'Deleting Family',
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
    // Convert cache to array of serialized families
    const familiesData = Array.from(this.familiesCache.values()).map(family => family.toJSON());
    
    // Update state
    stateManager.setState('families', familiesData);
  }
  
  /**
   * Filter families by criteria
   * @param {Object} filters - Filter criteria
   * @returns {Array<Family>} Filtered families
   */
  filterFamilies(filters = {}) {
    let filtered = Array.from(this.familiesCache.values());
    
    // Filter by name
    if (filters.name) {
      const nameFilter = filters.name.toLowerCase();
      filtered = filtered.filter(family => 
        family.name.toLowerCase().includes(nameFilter)
      );
    }
    
    // Filter by member name
    if (filters.memberName) {
      const memberNameFilter = filters.memberName.toLowerCase();
      
      filtered = filtered.filter(family => {
        // Get all members
        const headId = family.headId;
        const spouseId = family.spouseId;
        const childrenIds = family.childrenIds;
        
        // Check if any member matches the name filter
        const head = headId ? personService.getPersonById(headId) : null;
        const spouse = spouseId ? personService.getPersonById(spouseId) : null;
        const children = childrenIds.map(id => personService.getPersonById(id)).filter(Boolean);
        
        return (head && head.name.toLowerCase().includes(memberNameFilter)) ||
               (spouse && spouse.name.toLowerCase().includes(memberNameFilter)) ||
               children.some(child => child.name.toLowerCase().includes(memberNameFilter));
      });
    }
    
    // Filter by member count
    if (filters.minMembers !== undefined) {
      filtered = filtered.filter(family => {
        const memberCount = this.getFamilyMemberCount(family);
        return memberCount >= filters.minMembers;
      });
    }
    
    if (filters.maxMembers !== undefined) {
      filtered = filtered.filter(family => {
        const memberCount = this.getFamilyMemberCount(family);
        return memberCount <= filters.maxMembers;
      });
    }
    
    // Filter by structure (has head, spouse, children)
    if (filters.hasHead !== undefined) {
      filtered = filtered.filter(family => 
        filters.hasHead ? Boolean(family.headId) : !family.headId
      );
    }
    
    if (filters.hasSpouse !== undefined) {
      filtered = filtered.filter(family => 
        filters.hasSpouse ? Boolean(family.spouseId) : !family.spouseId
      );
    }
    
    if (filters.hasChildren !== undefined) {
      filtered = filtered.filter(family => 
        filters.hasChildren ? family.childrenIds.length > 0 : family.childrenIds.length === 0
      );
    }
    
    return filtered;
  }
  
  /**
   * Get family member count
   * @param {Family} family - Family to count members for
   * @returns {number} Number of members
   */
  getFamilyMemberCount(family) {
    let count = 0;
    if (family.headId) count++;
    if (family.spouseId) count++;
    count += family.childrenIds.length;
    return count;
  }
  
  /**
   * Get all family members
   * @param {string} familyId - Family ID
   * @returns {Object} Object with head, spouse, and children
   */
  getFamilyMembers(familyId) {
    const family = this.getFamilyById(familyId);
    if (!family) {
      return { head: null, spouse: null, children: [] };
    }
    
    const head = family.headId ? personService.getPersonById(family.headId) : null;
    const spouse = family.spouseId ? personService.getPersonById(family.spouseId) : null;
    const children = family.childrenIds
      .map(id => personService.getPersonById(id))
      .filter(Boolean);
    
    return { head, spouse, children };
  }
  
  /**
   * Add a person as head of a family
   * @param {string} familyId - Family ID
   * @param {string} personId - Person ID
   * @returns {boolean} Success status
   */
  setFamilyHead(familyId, personId) {
    try {
      const family = this.getFamilyById(familyId);
      if (!family) {
        throw new Error(`Family with ID ${familyId} not found`);
      }
      
      // Check if the person is already assigned to a different family
      const person = personService.getPersonById(personId);
      if (!person) {
        throw new Error(`Person with ID ${personId} not found`);
      }
      
      if (person.familyId && person.familyId !== familyId) {
        throw new Error(`Person is already assigned to a different family`);
      }
      
      // Check if this person is already in this family in a different role
      if (family.spouseId === personId || family.childrenIds.includes(personId)) {
        throw new Error(`Person is already a member of this family in a different role`);
      }
      
      // Update the family
      const oldHeadId = family.headId;
      family.setHead(personId);
      
      // Update in cache
      this.familiesCache.set(familyId, family);
      
      // Update state
      this.updateState();
      
      // Handle person assignments
      if (oldHeadId) {
        personService.removePersonFromFamily(oldHeadId);
      }
      
      personService.assignPersonToFamily(personId, familyId, 'head');
      
      // Notify that the family was updated
      EventBus.publish(Events.FAMILY_UPDATED, family);
      
      return true;
    } catch (error) {
      errorHandler.handleError(
        error,
        'Setting Family Head',
        ErrorSeverity.ERROR,
        ErrorType.VALIDATION
      );
      return false;
    }
  }
  
  /**
   * Add a person as spouse in a family
   * @param {string} familyId - Family ID
   * @param {string} personId - Person ID
   * @returns {boolean} Success status
   */
  setFamilySpouse(familyId, personId) {
    try {
      const family = this.getFamilyById(familyId);
      if (!family) {
        throw new Error(`Family with ID ${familyId} not found`);
      }
      
      // Check if the person is already assigned to a different family
      const person = personService.getPersonById(personId);
      if (!person) {
        throw new Error(`Person with ID ${personId} not found`);
      }
      
      if (person.familyId && person.familyId !== familyId) {
        throw new Error(`Person is already assigned to a different family`);
      }
      
      // Check if this person is already in this family in a different role
      if (family.headId === personId || family.childrenIds.includes(personId)) {
        throw new Error(`Person is already a member of this family in a different role`);
      }
      
      // Update the family
      const oldSpouseId = family.spouseId;
      family.setSpouse(personId);
      
      // Update in cache
      this.familiesCache.set(familyId, family);
      
      // Update state
      this.updateState();
      
      // Handle person assignments
      if (oldSpouseId) {
        personService.removePersonFromFamily(oldSpouseId);
      }
      
      personService.assignPersonToFamily(personId, familyId, 'spouse');
      
      // Notify that the family was updated
      EventBus.publish(Events.FAMILY_UPDATED, family);
      
      return true;
    } catch (error) {
      errorHandler.handleError(
        error,
        'Setting Family Spouse',
        ErrorSeverity.ERROR,
        ErrorType.VALIDATION
      );
      return false;
    }
  }
  
  /**
   * Add a child to a family
   * @param {string} familyId - Family ID
   * @param {string} personId - Person ID
   * @returns {boolean} Success status
   */
  addFamilyChild(familyId, personId) {
    try {
      const family = this.getFamilyById(familyId);
      if (!family) {
        throw new Error(`Family with ID ${familyId} not found`);
      }
      
      // Check if the person is already assigned to a different family
      const person = personService.getPersonById(personId);
      if (!person) {
        throw new Error(`Person with ID ${personId} not found`);
      }
      
      if (person.familyId && person.familyId !== familyId) {
        throw new Error(`Person is already assigned to a different family`);
      }
      
      // Check if this person is already in this family in a different role
      if (family.headId === personId || family.spouseId === personId) {
        throw new Error(`Person is already a member of this family in a different role`);
      }
      
      // Update the family
      family.addChild(personId);
      
      // Update in cache
      this.familiesCache.set(familyId, family);
      
      // Update state
      this.updateState();
      
      // Update person
      personService.assignPersonToFamily(personId, familyId, 'child');
      
      // Notify that the family was updated
      EventBus.publish(Events.FAMILY_UPDATED, family);
      
      return true;
    } catch (error) {
      errorHandler.handleError(
        error,
        'Adding Family Child',
        ErrorSeverity.ERROR,
        ErrorType.VALIDATION
      );
      return false;
    }
  }
  
  /**
   * Remove a person from a family
   * @param {string} personId - Person ID
   * @param {string} familyId - Family ID
   * @returns {Object} Result with success status and details
   */
  removePersonFromFamily(personId, familyId) {
    try {
      const family = this.getFamilyById(familyId);
      if (!family) {
        throw new Error(`Family with ID ${familyId} not found`);
      }
      
      // Remove the person from the family
      const result = family.removeMember(personId);
      
      if (!result.success) {
        // Check if dissolving is required
        if (result.dissolveRequired) {
          // Dissolve the family if required
          return this.dissolveFamily(familyId);
        }
        
        throw new Error(result.message);
      }
      
      // Update in cache
      this.familiesCache.set(familyId, family);
      
      // Update state
      this.updateState();
      
      // Update person
      personService.removePersonFromFamily(personId);
      
      // If a promotion occurred, update the promoted person
      if (result.promotedMember) {
        personService.assignPersonToFamily(result.promotedMember, familyId, 'head');
      }
      
      // Notify that the family was updated
      EventBus.publish(Events.FAMILY_UPDATED, family);
      
      return result;
    } catch (error) {
      errorHandler.handleError(
        error,
        'Removing Person from Family',
        ErrorSeverity.ERROR,
        ErrorType.VALIDATION
      );
      return { success: false, message: error.message };
    }
  }
  
  /**
   * Dissolve a family completely, removing all member associations
   * @param {string} familyId - Family ID
   * @returns {Object} Result with success status and details
   */
  dissolveFamily(familyId) {
    try {
      const family = this.getFamilyById(familyId);
      if (!family) {
        throw new Error(`Family with ID ${familyId} not found`);
      }
      
      // Get all members
      const members = this.getFamilyMembers(familyId);
      
      // Delete the family
      this.deleteFamily(familyId, true);
      
      return {
        success: true,
        message: 'Family dissolved',
        affectedMembers: {
          head: members.head ? members.head.id : null,
          spouse: members.spouse ? members.spouse.id : null,
          children: members.children.map(child => child.id)
        }
      };
    } catch (error) {
      errorHandler.handleError(
        error,
        'Dissolving Family',
        ErrorSeverity.ERROR,
        ErrorType.UNKNOWN
      );
      return { success: false, message: error.message };
    }
  }
  
  /**
   * Validate family integrity, ensuring all references are correct
   * @param {string} familyId - Family ID
   * @returns {boolean} Whether the family is valid
   */
  validateFamilyIntegrity(familyId) {
    const family = this.getFamilyById(familyId);
    if (!family) {
      return false;
    }
    
    let isValid = true;
    
    // Check head
    if (family.headId) {
      const head = personService.getPersonById(family.headId);
      if (!head || head.familyId !== familyId || head.familyRole !== 'head') {
        isValid = false;
        
        // Try to fix the reference
        if (head) {
          personService.assignPersonToFamily(head.id, familyId, 'head');
        } else {
          // Head doesn't exist, remove reference
          family.headId = null;
          this.familiesCache.set(familyId, family);
          this.updateState();
        }
      }
    }
    
    // Check spouse
    if (family.spouseId) {
      const spouse = personService.getPersonById(family.spouseId);
      if (!spouse || spouse.familyId !== familyId || spouse.familyRole !== 'spouse') {
        isValid = false;
        
        // Try to fix the reference
        if (spouse) {
          personService.assignPersonToFamily(spouse.id, familyId, 'spouse');
        } else {
          // Spouse doesn't exist, remove reference
          family.spouseId = null;
          this.familiesCache.set(familyId, family);
          this.updateState();
        }
      }
    }
    
    // Check children
    const validChildren = [];
    for (const childId of family.childrenIds) {
      const child = personService.getPersonById(childId);
      if (!child || child.familyId !== familyId || child.familyRole !== 'child') {
        isValid = false;
        
        // Try to fix the reference
        if (child) {
          personService.assignPersonToFamily(child.id, familyId, 'child');
          validChildren.push(childId);
        } else {
          // Child doesn't exist, skip it
          continue;
        }
      } else {
        validChildren.push(childId);
      }
    }
    
    // Update children IDs if needed
    if (validChildren.length !== family.childrenIds.length) {
      family.childrenIds = validChildren;
      this.familiesCache.set(familyId, family);
      this.updateState();
    }
    
    // If no members left, consider dissolving the family
    if (!family.headId && !family.spouseId && family.childrenIds.length === 0) {
      this.dissolveFamily(familyId);
      return false;
    }
    
    return isValid;
  }
  
  /**
   * Merge two families together
   * @param {string} familyId1 - First family ID
   * @param {string} familyId2 - Second family ID
   * @param {Object} options - Merge options
   * @returns {Object} Result with success status and details
   */
  mergeFamilies(familyId1, familyId2, options = { maintainRoles: true }) {
    try {
      const family1 = this.getFamilyById(familyId1);
      const family2 = this.getFamilyById(familyId2);
      
      if (!family1) {
        throw new Error(`Family with ID ${familyId1} not found`);
      }
      
      if (!family2) {
        throw new Error(`Family with ID ${familyId2} not found`);
      }
      
      // Check if families can be merged
      const mergeResult = family1.canMergeWith(family2);
      if (!mergeResult.possible) {
        throw new Error(`Cannot merge families: ${mergeResult.reason}`);
      }
      
      // Perform the merge
      const result = family1.mergeWith(family2, options);
      if (!result.success) {
        throw new Error(`Merge failed: ${result.reason}`);
      }
      
      // Update in cache
      this.familiesCache.set(familyId1, family1);
      
      // Get all members from second family before deleting it
      const members2 = this.getFamilyMembers(familyId2);
      
      // Delete the second family (without removing assignments)
      this.familiesCache.delete(familyId2);
      
      // Update state
      this.updateState();
      
      // Update all family member assignments
      if (family1.headId) {
        personService.assignPersonToFamily(family1.headId, familyId1, 'head');
      }
      
      if (family1.spouseId) {
        personService.assignPersonToFamily(family1.spouseId, familyId1, 'spouse');
      }
      
      family1.childrenIds.forEach(childId => {
        personService.assignPersonToFamily(childId, familyId1, 'child');
      });
      
      // Notify that families were updated
      EventBus.publish(Events.FAMILY_UPDATED, family1);
      EventBus.publish(Events.FAMILY_DELETED, familyId2);
      
      return {
        success: true,
        message: 'Families merged successfully',
        resultingFamily: family1.toJSON(),
        mergedFamily: {
          id: familyId2,
          head: members2.head ? members2.head.id : null,
          spouse: members2.spouse ? members2.spouse.id : null,
          children: members2.children.map(child => child.id)
        }
      };
    } catch (error) {
      errorHandler.handleError(
        error,
        'Merging Families',
        ErrorSeverity.ERROR,
        ErrorType.VALIDATION
      );
      return { success: false, message: error.message };
    }
  }
}

// Export a singleton instance
export const familyService = new FamilyService();
export default familyService;