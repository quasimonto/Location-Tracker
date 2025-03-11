/**
 * InfoWindow.js
 * Component for displaying entity details in a map info window
 */

import { EventBus, Events } from '../../app/EventBus';
import personService from '../../services/PersonService';
import meetingService from '../../services/MeetingService';
import groupService from '../../services/GroupService';
import familyService from '../../services/FamilyService';
import { formatDistance, formatTravelTime } from '../../utils/mapUtils';
import { errorHandler, ErrorType, ErrorSeverity } from '../../utils/errorHandler';

/**
 * InfoWindow class for displaying entity details
 */
class InfoWindow {
  /**
   * Create a new InfoWindow instance
   * @param {google.maps.Map} map - Google Maps instance
   */
  constructor(map) {
    // Store map instance
    this.map = map;
    
    // Create Google Maps InfoWindow
    this.infoWindow = new google.maps.InfoWindow({
      maxWidth: 320,
      disableAutoPan: false
    });
    
    // Setup close event
    this.infoWindow.addListener('closeclick', () => {
      // Publish event
      EventBus.publish(Events.INFO_WINDOW_CLOSED);
    });
    
    // Current entity data
    this.currentEntity = null;
    this.currentEntityType = null;
  }
  
  /**
   * Show the info window for an entity
   * @param {Object} entity - Entity data
   * @param {string} type - Entity type ('person', 'meeting', 'group', 'family')
   * @param {google.maps.Marker} marker - Marker to attach to
   */
  show(entity, type, marker) {
    try {
      if (!entity || !type || !marker) {
        return;
      }
      
      // Store current entity
      this.currentEntity = entity;
      this.currentEntityType = type;
      
      // Generate content based on type
      let content = '';
      switch (type) {
        case 'person':
          content = this.getPersonContent(entity);
          break;
        case 'meeting':
          content = this.getMeetingContent(entity);
          break;
        case 'group':
          content = this.getGroupContent(entity);
          break;
        case 'family':
          content = this.getFamilyContent(entity);
          break;
        default:
          content = `<div class="info-window-error">Unknown entity type: ${type}</div>`;
      }
      
      // Set content and open
      this.infoWindow.setContent(content);
      this.infoWindow.open(this.map, marker);
      
      // Setup event handlers for the buttons after the window is open
      setTimeout(() => {
        this.setupButtonHandlers();
      }, 10);
      
      // Publish event
      EventBus.publish(Events.INFO_WINDOW_OPENED, {
        entity,
        type
      });
    } catch (error) {
      errorHandler.handleError(
        error,
        'Showing Info Window',
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Close the info window
   */
  close() {
    this.infoWindow.close();
    this.currentEntity = null;
    this.currentEntityType = null;
  }
  
  /**
   * Get content for a person info window
   * @param {Object} person - Person data
   * @returns {string} HTML content
   */
  getPersonContent(person) {
    // Get group info if available
    let groupInfo = '';
    if (person.group) {
      const group = groupService.getGroupById(person.group);
      if (group) {
        groupInfo = `
          <div class="info-group">
            <span class="info-label">Group:</span>
            <span class="info-value group-value" style="background-color: ${group.color};">
              ${group.name}
            </span>
          </div>
        `;
      }
    }
    
    // Get family info if available
    let familyInfo = '';
    if (person.familyId) {
      const family = familyService.getFamilyById(person.familyId);
      if (family) {
        familyInfo = `
          <div class="info-group">
            <span class="info-label">Family:</span>
            <span class="info-value family-value">
              ${family.name} (${person.familyRole})
            </span>
          </div>
        `;
      }
    }
    
    // Get roles
    const roles = person.getRoles().map(role => {
      const displayRole = role.charAt(0).toUpperCase() + role.slice(1);
      return `<span class="role-tag">${displayRole}</span>`;
    }).join('');
    
    const rolesInfo = roles ? `
      <div class="info-group">
        <span class="info-label">Roles:</span>
        <div class="info-value roles-value">
          ${roles}
        </div>
      </div>
    ` : '';
    
    // Create content
    return `
      <div class="info-window person-info">
        <div class="info-header">
          <h3 class="info-title">${person.name}</h3>
        </div>
        <div class="info-content">
          <div class="info-group">
            <span class="info-label">Location:</span>
            <span class="info-value">
              ${person.lat.toFixed(6)}, ${person.lng.toFixed(6)}
            </span>
          </div>
          ${groupInfo}
          ${familyInfo}
          ${rolesInfo}
        </div>
        <div class="info-actions">
          <button class="info-button edit-button" data-action="edit" data-id="${person.id}" data-type="person">
            Edit
          </button>
          <button class="info-button travel-button" data-action="travel" data-id="${person.id}" data-type="person">
            Travel Times
          </button>
          <button class="info-button delete-button" data-action="delete" data-id="${person.id}" data-type="person">
            Delete
          </button>
        </div>
      </div>
    `;
  }
  
  /**
   * Get content for a meeting info window
   * @param {Object} meeting - Meeting data
   * @returns {string} HTML content
   */
  getMeetingContent(meeting) {
    // Get group info if available
    let groupInfo = '';
    if (meeting.group) {
      const group = groupService.getGroupById(meeting.group);
      if (group) {
        groupInfo = `
          <div class="info-group">
            <span class="info-label">Group:</span>
            <span class="info-value group-value" style="background-color: ${group.color};">
              ${group.name}
            </span>
          </div>
        `;
      }
    }
    
    // Show description if available
    const descriptionInfo = meeting.description ? `
      <div class="info-group">
        <span class="info-label">Description:</span>
        <div class="info-value description-value">
          ${meeting.description}
        </div>
      </div>
    ` : '';
    
    // Create content
    return `
      <div class="info-window meeting-info">
        <div class="info-header">
          <h3 class="info-title">${meeting.name}</h3>
        </div>
        <div class="info-content">
          <div class="info-group">
            <span class="info-label">Location:</span>
            <span class="info-value">
              ${meeting.lat.toFixed(6)}, ${meeting.lng.toFixed(6)}
            </span>
          </div>
          ${groupInfo}
          ${descriptionInfo}
        </div>
        <div class="info-actions">
          <button class="info-button edit-button" data-action="edit" data-id="${meeting.id}" data-type="meeting">
            Edit
          </button>
          <button class="info-button assign-button" data-action="assign" data-id="${meeting.id}" data-type="meeting">
            Assign Group
          </button>
          <button class="info-button delete-button" data-action="delete" data-id="${meeting.id}" data-type="meeting">
            Delete
          </button>
        </div>
      </div>
    `;
  }
  
  /**
   * Get content for a group info window
   * @param {Object} group - Group data
   * @returns {string} HTML content
   */
  getGroupContent(group) {
    // Get member count
    const persons = personService.getPersonsByGroup(group.id);
    const meetings = meetingService.getMeetingsByGroup(group.id);
    
    // Create content
    return `
      <div class="info-window group-info">
        <div class="info-header">
          <h3 class="info-title" style="color: ${group.color};">${group.name}</h3>
        </div>
        <div class="info-content">
          <div class="info-group">
            <span class="info-label">Members:</span>
            <span class="info-value">${persons.length} people</span>
          </div>
          <div class="info-group">
            <span class="info-label">Meeting Points:</span>
            <span class="info-value">${meetings.length} locations</span>
          </div>
        </div>
        <div class="info-actions">
          <button class="info-button edit-button" data-action="edit" data-id="${group.id}" data-type="group">
            Edit
          </button>
          <button class="info-button view-button" data-action="view" data-id="${group.id}" data-type="group">
            View Members
          </button>
          <button class="info-button delete-button" data-action="delete" data-id="${group.id}" data-type="group">
            Delete
          </button>
        </div>
      </div>
    `;
  }
  
  /**
   * Get content for a family info window
   * @param {Object} family - Family data
   * @returns {string} HTML content
   */
  getFamilyContent(family) {
    // Get family members
    const members = familyService.getFamilyMembers(family.id);
    
    // Create member list
    let membersList = '';
    
    // Add head if exists
    if (members.head) {
      membersList += `
        <div class="family-member">
          <span class="member-role">Head:</span>
          <span class="member-name">${members.head.name}</span>
        </div>
      `;
    }
    
    // Add spouse if exists
    if (members.spouse) {
      membersList += `
        <div class="family-member">
          <span class="member-role">Spouse:</span>
          <span class="member-name">${members.spouse.name}</span>
        </div>
      `;
    }
    
    // Add children if any
    if (members.children && members.children.length > 0) {
      membersList += `
        <div class="family-member">
          <span class="member-role">Children (${members.children.length}):</span>
          <div class="member-list">
            ${members.children.map(child => `
              <div class="child-name">${child.name}</div>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    // Create content
    return `
      <div class="info-window family-info">
        <div class="info-header">
          <h3 class="info-title" style="color: ${family.color};">${family.name}</h3>
        </div>
        <div class="info-content">
          <div class="info-group">
            <span class="info-label">Members:</span>
            <div class="info-value family-members">
              ${membersList || 'No members'}
            </div>
          </div>
        </div>
        <div class="info-actions">
          <button class="info-button edit-button" data-action="edit" data-id="${family.id}" data-type="family">
            Edit
          </button>
          <button class="info-button view-button" data-action="view" data-id="${family.id}" data-type="family">
            View Family
          </button>
          <button class="info-button delete-button" data-action="delete" data-id="${family.id}" data-type="family">
            Delete
          </button>
        </div>
      </div>
    `;
  }
  
  /**
   * Setup event handlers for info window buttons
   */
  setupButtonHandlers() {
    // Get all buttons in the info window
    const buttons = document.querySelectorAll('.info-window .info-button');
    
    // Add click handlers
    buttons.forEach(button => {
      button.addEventListener('click', (e) => {
        // Get action and entity data
        const action = button.getAttribute('data-action');
        const id = button.getAttribute('data-id');
        const type = button.getAttribute('data-type');
        
        // Handle the action
        this.handleAction(action, id, type);
      });
    });
  }
  
  /**
   * Handle an action button click
   * @param {string} action - Action to perform
   * @param {string} id - Entity ID
   * @param {string} type - Entity type
   */
  handleAction(action, id, type) {
    // Close the info window
    this.close();
    
    // Handle based on action and type
    switch (action) {
      case 'edit':
        this.handleEditAction(id, type);
        break;
      case 'delete':
        this.handleDeleteAction(id, type);
        break;
      case 'travel':
        this.handleTravelAction(id);
        break;
      case 'assign':
        this.handleAssignAction(id, type);
        break;
      case 'view':
        this.handleViewAction(id, type);
        break;
      default:
        console.warn(`Unknown action: ${action}`);
    }
  }
  
  /**
   * Handle edit action
   * @param {string} id - Entity ID
   * @param {string} type - Entity type
   */
  handleEditAction(id, type) {
    switch (type) {
      case 'person':
        EventBus.publish(Events.EDIT_PERSON_CLICKED, personService.getPersonById(id));
        break;
      case 'meeting':
        EventBus.publish(Events.EDIT_MEETING_CLICKED, meetingService.getMeetingById(id));
        break;
      case 'group':
        EventBus.publish(Events.EDIT_GROUP_CLICKED, groupService.getGroupById(id));
        break;
      case 'family':
        EventBus.publish(Events.EDIT_FAMILY_CLICKED, familyService.getFamilyById(id));
        break;
    }
  }
  
  /**
   * Handle delete action
   * @param {string} id - Entity ID
   * @param {string} type - Entity type
   */
  handleDeleteAction(id, type) {
    let entityName = '';
    let confirmMessage = '';
    let eventName = '';
    
    // Get entity details for confirmation
    switch (type) {
      case 'person':
        const person = personService.getPersonById(id);
        entityName = person ? person.name : 'person';
        confirmMessage = `Are you sure you want to delete ${entityName}?`;
        eventName = Events.DELETE_PERSON_CLICKED;
        break;
      case 'meeting':
        const meeting = meetingService.getMeetingById(id);
        entityName = meeting ? meeting.name : 'meeting point';
        confirmMessage = `Are you sure you want to delete the meeting point ${entityName}?`;
        eventName = Events.DELETE_MEETING_CLICKED;
        break;
      case 'group':
        const group = groupService.getGroupById(id);
        entityName = group ? group.name : 'group';
        confirmMessage = `Are you sure you want to delete the group ${entityName}? This will not delete the members.`;
        eventName = Events.DELETE_GROUP_CLICKED;
        break;
      case 'family':
        const family = familyService.getFamilyById(id);
        entityName = family ? family.name : 'family';
        confirmMessage = `Are you sure you want to delete the family ${entityName}? This will remove family relationships but not delete the people.`;
        eventName = Events.DELETE_FAMILY_CLICKED;
        break;
    }
    
    // Show confirmation
    if (confirm(confirmMessage)) {
      // Get entity object
      let entity = null;
      switch (type) {
        case 'person':
          entity = personService.getPersonById(id);
          break;
        case 'meeting':
          entity = meetingService.getMeetingById(id);
          break;
        case 'group':
          entity = groupService.getGroupById(id);
          break;
        case 'family':
          entity = familyService.getFamilyById(id);
          break;
      }
      
      // Publish event
      if (entity) {
        EventBus.publish(eventName, entity);
      }
    }
  }
  
  /**
   * Handle travel action for a person
   * @param {string} id - Person ID
   */
  handleTravelAction(id) {
    // Get person
    const person = personService.getPersonById(id);
    if (person) {
      // Publish event to show travel times
      EventBus.publish(Events.SHOW_TRAVEL_TIMES, person);
    }
  }
  
  /**
   * Handle assign action for a meeting
   * @param {string} id - Meeting ID
   */
  handleAssignAction(id) {
    // Get meeting
    const meeting = meetingService.getMeetingById(id);
    if (meeting) {
      // Publish event to assign meeting to a group
      EventBus.publish(Events.ASSIGN_MEETING_TO_GROUP, meeting);
    }
  }
  
  /**
   * Handle view action
   * @param {string} id - Entity ID
   * @param {string} type - Entity type
   */
  handleViewAction(id, type) {
    switch (type) {
      case 'group':
        EventBus.publish(Events.VIEW_GROUP_CLICKED, groupService.getGroupById(id));
        break;
      case 'family':
        EventBus.publish(Events.VIEW_FAMILY_CLICKED, familyService.getFamilyById(id));
        break;
    }
  }
  
  /**
   * Factory method to create an InfoWindow instance
   * @param {google.maps.Map} map - Google Maps instance
   * @returns {InfoWindow} New InfoWindow instance
   * @static
   */
  static create(map) {
    return new InfoWindow(map);
  }
}

export default InfoWindow;