/**
 * ListView.js
 * Reusable list view component for displaying entities
 */

import { EventBus, Events } from '../../app/EventBus';

/**
 * Item types supported by the list view
 * @enum {string}
 */
export const ItemType = {
  PERSON: 'person',
  MEETING: 'meeting',
  GROUP: 'group',
  FAMILY: 'family'
};

/**
 * ListView class for displaying lists of entities
 */
class ListView {
  /**
   * Create a new ListView instance
   * @param {HTMLElement} container - Container element to render the list in
   * @param {Object} options - Configuration options
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      itemType: ItemType.PERSON,
      selectable: true,
      draggable: false,
      showActions: true,
      emptyMessage: 'No items found',
      maxHeight: '40vh',
      ...options
    };
    
    this.items = [];
    this.selectedItemId = null;
    
    // Render the list
    this.render();
  }
  
  /**
   * Render the list UI
   */
  render() {
    // Clear the container
    this.container.innerHTML = '';
    
    // Set container class and styles
    this.container.className = `entity-list ${this.options.itemType}-list`;
    this.container.style.maxHeight = this.options.maxHeight;
    
    // Add ARIA roles for accessibility
    this.container.setAttribute('role', 'list');
    
    // Handle empty state
    if (this.items.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-list-message';
      emptyState.textContent = this.options.emptyMessage;
      this.container.appendChild(emptyState);
      return;
    }
    
    // Render items
    this.items.forEach(item => {
      const listItem = this.createListItem(item);
      this.container.appendChild(listItem);
    });
  }
  
  /**
   * Create a list item element
   * @param {Object} item - Item data
   * @returns {HTMLElement} List item element
   */
  createListItem(item) {
    const listItem = document.createElement('div');
    listItem.className = `entity-item ${this.options.itemType}-item`;
    if (this.options.selectable) {
      listItem.classList.add('selectable');
    }
    if (this.options.draggable) {
      listItem.classList.add('draggable');
      listItem.setAttribute('draggable', 'true');
    }
    if (item.id === this.selectedItemId) {
      listItem.classList.add('selected');
    }
    
    listItem.setAttribute('data-id', item.id);
    listItem.setAttribute('role', 'listitem');
    
    // Create item content based on type
    switch (this.options.itemType) {
      case ItemType.PERSON:
        this.createPersonItem(listItem, item);
        break;
      case ItemType.MEETING:
        this.createMeetingItem(listItem, item);
        break;
      case ItemType.GROUP:
        this.createGroupItem(listItem, item);
        break;
      case ItemType.FAMILY:
        this.createFamilyItem(listItem, item);
        break;
      default:
        // Generic item
        listItem.textContent = item.name || 'Unnamed Item';
    }
    
    // Add click events for selection
    if (this.options.selectable) {
      listItem.addEventListener('click', (e) => {
        if (!e.target.closest('.action-button')) {
          this.handleItemClick(item);
        }
      });
    }
    
    // Add drag events
    if (this.options.draggable) {
      this.setupDragEvents(listItem, item);
    }
    
    return listItem;
  }
  
  /**
   * Create a person list item
   * @param {HTMLElement} listItem - List item element
   * @param {Object} person - Person data
   */
  createPersonItem(listItem, person) {
    // Role indicators
    let roleIndicators = '';
    
    if (person.elder) roleIndicators += '<span class="role-tag elder-tag">E</span>';
    if (person.servant) roleIndicators += '<span class="role-tag servant-tag">S</span>';
    if (person.pioneer) roleIndicators += '<span class="role-tag pioneer-tag">P</span>';
    if (person.publisher) roleIndicators += '<span class="role-tag publisher-tag">Pub</span>';
    if (person.leader) roleIndicators += '<span class="role-tag leader-tag">L</span>';
    if (person.helper) roleIndicators += '<span class="role-tag helper-tag">H</span>';
    
    // Group indicator
    let groupIndicator = '';
    if (person.group) {
      const group = this._findGroup(person.group);
      if (group) {
        groupIndicator = `<span class="group-tag" style="background-color: ${group.color};">${group.name}</span>`;
      }
    }
    
    // Family indicator
    let familyIndicator = '';
    if (person.familyId) {
      const family = this._findFamily(person.familyId);
      let roleLabel = '';
      
      switch (person.familyRole) {
        case 'head':
          roleLabel = 'Head';
          break;
        case 'spouse':
          roleLabel = 'Spouse';
          break;
        case 'child':
          roleLabel = 'Child';
          break;
      }
      
      if (family) {
        familyIndicator = `<span class="family-tag">${family.name} (${roleLabel})</span>`;
      }
    }
    
    // Action buttons
    let actionButtons = '';
    if (this.options.showActions) {
      actionButtons = `
        <div class="item-actions">
          <button class="action-button edit-button" data-id="${person.id}" title="Edit">✎</button>
          <button class="action-button delete-button" data-id="${person.id}" title="Delete">✕</button>
        </div>
      `;
    }
    
    // Assemble the item content
    listItem.innerHTML = `
      <div class="item-info">
        <div class="item-name">${person.name}</div>
        <div class="item-details">
          ${roleIndicators}
          ${groupIndicator}
          ${familyIndicator}
        </div>
      </div>
      ${actionButtons}
    `;
    
    // Add event listeners for action buttons
    if (this.options.showActions) {
      const editButton = listItem.querySelector('.edit-button');
      const deleteButton = listItem.querySelector('.delete-button');
      
      if (editButton) {
        editButton.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleEditClick(person);
        });
      }
      
      if (deleteButton) {
        deleteButton.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleDeleteClick(person);
        });
      }
    }
  }
  
  /**
   * Create a meeting list item
   * @param {HTMLElement} listItem - List item element
   * @param {Object} meeting - Meeting data
   */
  createMeetingItem(listItem, meeting) {
    // Group indicator
    let groupIndicator = '';
    if (meeting.group) {
      const group = this._findGroup(meeting.group);
      if (group) {
        groupIndicator = `<span class="group-tag" style="background-color: ${group.color};">${group.name}</span>`;
      }
    }
    
    // Description preview
    let descriptionPreview = '';
    if (meeting.description) {
      const maxLength = 50;
      const shortDesc = meeting.description.length > maxLength ? 
        `${meeting.description.substring(0, maxLength)}...` : 
        meeting.description;
      
      descriptionPreview = `<div class="item-description">${shortDesc}</div>`;
    }
    
    // Action buttons
    let actionButtons = '';
    if (this.options.showActions) {
      actionButtons = `
        <div class="item-actions">
          <button class="action-button edit-button" data-id="${meeting.id}" title="Edit">✎</button>
          <button class="action-button delete-button" data-id="${meeting.id}" title="Delete">✕</button>
        </div>
      `;
    }
    
    // Assemble the item content
    listItem.innerHTML = `
      <div class="item-info">
        <div class="item-name">${meeting.name}</div>
        ${descriptionPreview}
        <div class="item-details">
          ${groupIndicator}
        </div>
      </div>
      ${actionButtons}
    `;
    
    // Add event listeners for action buttons
    if (this.options.showActions) {
      const editButton = listItem.querySelector('.edit-button');
      const deleteButton = listItem.querySelector('.delete-button');
      
      if (editButton) {
        editButton.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleEditClick(meeting);
        });
      }
      
      if (deleteButton) {
        deleteButton.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleDeleteClick(meeting);
        });
      }
    }
  }
  
  /**
   * Create a group list item
   * @param {HTMLElement} listItem - List item element
   * @param {Object} group - Group data
   */
  createGroupItem(listItem, group) {
    // Count members
    const memberCount = this._countGroupMembers(group.id);
    const meetingCount = this._countGroupMeetings(group.id);
    
    // Action buttons
    let actionButtons = '';
    if (this.options.showActions) {
      actionButtons = `
        <div class="item-actions">
          <button class="action-button view-button" data-id="${group.id}" title="View Group">👁️</button>
          <button class="action-button edit-button" data-id="${group.id}" title="Edit">✎</button>
          <button class="action-button delete-button" data-id="${group.id}" title="Delete">✕</button>
        </div>
      `;
    }
    
    // Assemble the item content
    listItem.innerHTML = `
      <div class="item-info" style="border-left: 4px solid ${group.color};">
        <div class="item-name">${group.name}</div>
        <div class="item-details">
          <span class="count-tag">${memberCount} member${memberCount !== 1 ? 's' : ''}</span>
          <span class="count-tag">${meetingCount} meeting${meetingCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
      ${actionButtons}
    `;
    
    // Add event listeners for action buttons
    if (this.options.showActions) {
      const viewButton = listItem.querySelector('.view-button');
      const editButton = listItem.querySelector('.edit-button');
      const deleteButton = listItem.querySelector('.delete-button');
      
      if (viewButton) {
        viewButton.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleViewClick(group);
        });
      }
      
      if (editButton) {
        editButton.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleEditClick(group);
        });
      }
      
      if (deleteButton) {
        deleteButton.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleDeleteClick(group);
        });
      }
    }
  }
  
  /**
   * Create a family list item
   * @param {HTMLElement} listItem - List item element
   * @param {Object} family - Family data
   */
  createFamilyItem(listItem, family) {
    // Get family members
    const head = this._findPerson(family.headId);
    const spouse = this._findPerson(family.spouseId);
    const childrenCount = family.childrenIds.length;
    
    // Member preview
    let memberPreview = '';
    
    if (head) {
      memberPreview += `<span class="member-name">${head.name}</span>`;
    }
    
    if (spouse) {
      memberPreview += ` & <span class="member-name">${spouse.name}</span>`;
    }
    
    if (childrenCount > 0) {
      memberPreview += ` • ${childrenCount} child${childrenCount !== 1 ? 'ren' : ''}`;
    }
    
    // Action buttons
    let actionButtons = '';
    if (this.options.showActions) {
      actionButtons = `
        <div class="item-actions">
          <button class="action-button view-button" data-id="${family.id}" title="View Family">👁️</button>
          <button class="action-button edit-button" data-id="${family.id}" title="Edit">✎</button>
          <button class="action-button delete-button" data-id="${family.id}" title="Delete">✕</button>
        </div>
      `;
    }
    
    // Assemble the item content
    listItem.innerHTML = `
      <div class="item-info" style="border-left: 4px solid ${family.color};">
        <div class="item-name">${family.name}</div>
        <div class="item-details">
          ${memberPreview}
        </div>
      </div>
      ${actionButtons}
    `;
    
    // Add event listeners for action buttons
    if (this.options.showActions) {
      const viewButton = listItem.querySelector('.view-button');
      const editButton = listItem.querySelector('.edit-button');
      const deleteButton = listItem.querySelector('.delete-button');
      
      if (viewButton) {
        viewButton.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleViewClick(family);
        });
      }
      
      if (editButton) {
        editButton.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleEditClick(family);
        });
      }
      
      if (deleteButton) {
        deleteButton.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleDeleteClick(family);
        });
      }
    }
  }
  
  /**
   * Set up drag events for a list item
   * @param {HTMLElement} listItem - List item element
   * @param {Object} item - Item data
   */
  setupDragEvents(listItem, item) {
    listItem.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', JSON.stringify({
        id: item.id,
        type: this.options.itemType,
        data: item
      }));
      
      e.dataTransfer.effectAllowed = 'move';
      
      // Add dragging class
      listItem.classList.add('dragging');
      
      // Publish drag start event
      EventBus.publish(Events.ITEM_DRAG_START, {
        id: item.id,
        type: this.options.itemType,
        data: item
      });
    });
    
    listItem.addEventListener('dragend', () => {
      // Remove dragging class
      listItem.classList.remove('dragging');
      
      // Publish drag end event
      EventBus.publish(Events.ITEM_DRAG_END, {
        id: item.id,
        type: this.options.itemType
      });
    });
  }
  
  /**
   * Handle item click
   * @param {Object} item - Clicked item
   */
  handleItemClick(item) {
    // Update selected item
    this.selectedItemId = item.id;
    
    // Update UI
    const listItems = this.container.querySelectorAll('.entity-item');
    listItems.forEach(element => {
      element.classList.toggle('selected', element.getAttribute('data-id') === item.id);
    });
    
    // Publish selection event
    EventBus.publish(
      Events[`${this.options.itemType.toUpperCase()}_SELECTED`], 
      item
    );
    
    // Also publish a generic selection event
    EventBus.publish(Events.ITEM_SELECTED, {
      id: item.id,
      type: this.options.itemType,
      data: item
    });
  }
  
  /**
   * Handle edit button click
   * @param {Object} item - Item to edit
   */
  handleEditClick(item) {
    // Publish edit event
    EventBus.publish(
      Events[`EDIT_${this.options.itemType.toUpperCase()}_CLICKED`], 
      item
    );
  }
  
  /**
   * Handle delete button click
   * @param {Object} item - Item to delete
   */
  handleDeleteClick(item) {
    // Publish delete event
    EventBus.publish(
      Events[`DELETE_${this.options.itemType.toUpperCase()}_CLICKED`], 
      item
    );
  }
  
  /**
   * Handle view button click
   * @param {Object} item - Item to view
   */
  handleViewClick(item) {
    // Publish view event
    EventBus.publish(
      Events[`VIEW_${this.options.itemType.toUpperCase()}_CLICKED`], 
      item
    );
  }
  
  /**
   * Find a group by ID
   * @param {string} groupId - Group ID
   * @returns {Object|null} Group data or null if not found
   * @private
   */
  _findGroup(groupId) {
    // This should be replaced with a proper lookup from a groups cache
    // For now, we'll return a placeholder if necessary
    return { name: 'Group', color: '#cccccc' };
  }
  
  /**
   * Find a family by ID
   * @param {string} familyId - Family ID
   * @returns {Object|null} Family data or null if not found
   * @private
   */
  _findFamily(familyId) {
    // This should be replaced with a proper lookup from a families cache
    // For now, we'll return a placeholder if necessary
    return { name: 'Family' };
  }
  
  /**
   * Find a person by ID
   * @param {string} personId - Person ID
   * @returns {Object|null} Person data or null if not found
   * @private
   */
  _findPerson(personId) {
    // This should be replaced with a proper lookup from a persons cache
    // For now, we'll return a placeholder if the ID is provided
    return personId ? { name: 'Person' } : null;
  }
  
  /**
   * Count members in a group
   * @param {string} groupId - Group ID
   * @returns {number} Number of members
   * @private
   */
  _countGroupMembers(groupId) {
    // This should be replaced with a proper count from a cache
    return 0;
  }
  
  /**
   * Count meetings in a group
   * @param {string} groupId - Group ID
   * @returns {number} Number of meetings
   * @private
   */
  _countGroupMeetings(groupId) {
    // This should be replaced with a proper count from a cache
    return 0;
  }
  
  /**
   * Set the items to display
   * @param {Array} items - Items to display
   */
  setItems(items) {
    this.items = Array.isArray(items) ? items : [];
    this.render();
  }
  
  /**
   * Get the currently selected item
   * @returns {Object|null} Selected item or null if none selected
   */
  getSelectedItem() {
    if (!this.selectedItemId) {
      return null;
    }
    
    return this.items.find(item => item.id === this.selectedItemId) || null;
  }
  
  /**
   * Set the selected item by ID
   * @param {string} itemId - ID of the item to select
   */
  setSelectedItem(itemId) {
    // Check if the item exists
    const item = this.items.find(item => item.id === itemId);
    if (!item) {
      return;
    }
    
    // Update selection
    this.selectedItemId = itemId;
    
    // Update UI
    const listItems = this.container.querySelectorAll('.entity-item');
    listItems.forEach(element => {
      element.classList.toggle('selected', element.getAttribute('data-id') === itemId);
    });
    
    // Scroll to show the selected item
    const selectedElement = this.container.querySelector(`.entity-item[data-id="${itemId}"]`);
    if (selectedElement) {
      selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
  
  /**
   * Clear the selection
   */
  clearSelection() {
    this.selectedItemId = null;
    
    // Update UI
    const listItems = this.container.querySelectorAll('.entity-item');
    listItems.forEach(element => {
      element.classList.remove('selected');
    });
  }
  
  /**
   * Factory method to create a ListView instance
   * @param {HTMLElement} container - Container element
   * @param {Object} options - Configuration options
   * @returns {ListView} New ListView instance
   */
  static create(container, options = {}) {
    return new ListView(container, options);
  }
}

export default ListView;