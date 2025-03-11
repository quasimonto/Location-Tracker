/**
 * Sidebar.js
 * Modern sidebar component with tabbed navigation
 */

import { EventBus, Events } from '../../app/EventBus';
import { stateManager } from '../../services/StateManager';

/**
 * Sidebar class representing the main navigation sidebar
 */
class Sidebar {
  /**
   * Create a new Sidebar instance
   * @param {HTMLElement} container - Container element to render the sidebar in
   */
  constructor(container) {
    this.container = container;
    this.activeTab = 'people';
    this.tabs = [
      { id: 'people', label: 'People', icon: '👤' },
      { id: 'meetings', label: 'Meetings', icon: '📍' },
      { id: 'groups', label: 'Groups', icon: '👥' },
      { id: 'families', label: 'Families', icon: '👪' }
    ];
    
    // Initialize state tracking
    this.searchQuery = '';
    this.toggleStates = {
      showPeople: true,
      showMeetings: true,
      showGroups: true
    };
    
    // Subscribe to relevant state changes
    stateManager.subscribe('ui.selectedTab', (tab) => {
      if (tab && tab !== this.activeTab) {
        this.setActiveTab(tab);
      }
    });
    
    // Render the sidebar
    this.render();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  /**
   * Render the sidebar UI
   */
  render() {
    // Clear the container
    this.container.innerHTML = '';
    
    // Add header
    const header = document.createElement('div');
    header.className = 'sidebar-header';
    header.innerHTML = `
      <h2>Location Tracker</h2>
      <button id="open-config" class="config-button" title="Settings">⚙️</button>
    `;
    this.container.appendChild(header);
    
    // Add search box
    const searchBox = document.createElement('div');
    searchBox.className = 'search-box';
    searchBox.innerHTML = `
      <input id="search-input" type="text" placeholder="Search for a location..." 
          value="${this.searchQuery}" aria-label="Search for a location">
    `;
    this.container.appendChild(searchBox);
    
    // Add action buttons
    const actionButtons = document.createElement('div');
    actionButtons.className = 'action-buttons';
    actionButtons.innerHTML = `
      <button id="add-person" class="action-button">
        <span class="action-icon">👤</span>
        <span class="action-label">Add Person</span>
      </button>
      <button id="add-meeting" class="action-button">
        <span class="action-icon">📍</span>
        <span class="action-label">Add Meeting</span>
      </button>
    `;
    this.container.appendChild(actionButtons);
    
    // Add tab navigation
    const tabContainer = document.createElement('div');
    tabContainer.className = 'tab-container';
    
    // Tab buttons
    const tabButtons = document.createElement('div');
    tabButtons.className = 'tab-buttons';
    
    this.tabs.forEach(tab => {
      const button = document.createElement('button');
      button.className = `tab-button ${tab.id === this.activeTab ? 'active' : ''}`;
      button.setAttribute('data-tab', tab.id);
      button.setAttribute('aria-selected', tab.id === this.activeTab ? 'true' : 'false');
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', `${tab.id}-tab`);
      button.setAttribute('id', `${tab.id}-tab-button`);
      button.innerHTML = `
        <span class="tab-icon">${tab.icon}</span>
        <span class="tab-label">${tab.label}</span>
      `;
      tabButtons.appendChild(button);
    });
    
    tabContainer.appendChild(tabButtons);
    
    // Tab content containers
    this.tabs.forEach(tab => {
      const tabContent = document.createElement('div');
      tabContent.id = `${tab.id}-tab`;
      tabContent.className = `tab-content ${tab.id === this.activeTab ? 'active' : ''}`;
      tabContent.setAttribute('role', 'tabpanel');
      tabContent.setAttribute('aria-labelledby', `${tab.id}-tab-button`);
      
      // Add filter controls for people tab
      if (tab.id === 'people') {
        tabContent.appendChild(this.createPeopleFilters());
      }
      
      // Add list container for each tab
      const listContainer = document.createElement('div');
      listContainer.id = `${tab.id}-list`;
      listContainer.className = 'entity-list';
      tabContent.appendChild(listContainer);
      
      tabContainer.appendChild(tabContent);
    });
    
    this.container.appendChild(tabContainer);
    
    // Add group controls
    const groupControls = document.createElement('div');
    groupControls.className = 'group-controls';
    groupControls.innerHTML = `
      <h3>Groups</h3>
      <div id="group-list" class="group-list"></div>
      <div class="group-buttons">
        <button id="create-group">Create Group</button>
        <button id="auto-group-meeting">Auto Create Groups</button>
      </div>
    `;
    this.container.appendChild(groupControls);
    
    // Add data management section
    const dataManagement = document.createElement('div');
    dataManagement.className = 'import-export-controls';
    dataManagement.innerHTML = `
      <h3>Data Management</h3>
      <div class="import-export-buttons">
        <button id="export-data">Export Data</button>
        <button id="import-data">Import Data</button>
        <input type="file" id="import-file-input" accept=".json" style="display: none;">
      </div>
    `;
    this.container.appendChild(dataManagement);
    
    // Add visibility toggles
    const visibilityControls = document.createElement('div');
    visibilityControls.className = 'visibility-controls';
    visibilityControls.innerHTML = `
      <h3>Show/Hide Elements</h3>
      <div class="toggle-section">
        <div class="toggle-item">
          <input type="checkbox" id="toggle-people" ${this.toggleStates.showPeople ? 'checked' : ''}>
          <label for="toggle-people">Show People</label>
        </div>
        <div class="toggle-item">
          <input type="checkbox" id="toggle-meetings" ${this.toggleStates.showMeetings ? 'checked' : ''}>
          <label for="toggle-meetings">Show Meeting Points</label>
        </div>
        <div class="toggle-item">
          <input type="checkbox" id="toggle-groups" ${this.toggleStates.showGroups ? 'checked' : ''}>
          <label for="toggle-groups">Show Group Colors</label>
        </div>
      </div>
    `;
    this.container.appendChild(visibilityControls);
    
    // Add help button at the bottom
    const helpSection = document.createElement('div');
    helpSection.className = 'help-section';
    helpSection.innerHTML = `
      <button id="show-help" class="help-button">
        <span class="help-icon">❓</span>
        <span class="help-label">Help</span>
      </button>
    `;
    this.container.appendChild(helpSection);
  }
  
  /**
   * Create filter controls for the people tab
   * @returns {HTMLElement} Filter controls element
   */
  createPeopleFilters() {
    const filtersContainer = document.createElement('div');
    filtersContainer.className = 'filter-controls';
    
    // Name filter
    const nameFilter = document.createElement('div');
    nameFilter.className = 'filter-section';
    nameFilter.innerHTML = `
      <label>Filter by Name:</label>
      <input type="text" id="name-filter" placeholder="Search by name..." class="name-filter-input">
    `;
    filtersContainer.appendChild(nameFilter);
    
    // Role filters
    const roleFilter = document.createElement('div');
    roleFilter.className = 'filter-section';
    roleFilter.innerHTML = `
      <label>Filter by Role:</label>
      <div class="checkbox-grid">
        <div class="checkbox-item">
          <input type="checkbox" id="filter-elder">
          <label for="filter-elder">Elder</label>
        </div>
        <div class="checkbox-item">
          <input type="checkbox" id="filter-servant">
          <label for="filter-servant">Servant</label>
        </div>
        <div class="checkbox-item">
          <input type="checkbox" id="filter-pioneer">
          <label for="filter-pioneer">Pioneer</label>
        </div>
        <div class="checkbox-item">
          <input type="checkbox" id="filter-publisher">
          <label for="filter-publisher">Publisher</label>
        </div>
        <div class="checkbox-item">
          <input type="checkbox" id="filter-familyhead">
          <label for="filter-familyhead">Family Head</label>
        </div>
        <div class="checkbox-item">
          <input type="checkbox" id="filter-leader">
          <label for="filter-leader">Leader</label>
        </div>
        <div class="checkbox-item">
          <input type="checkbox" id="filter-helper">
          <label for="filter-helper">Helper</label>
        </div>
      </div>
    `;
    filtersContainer.appendChild(roleFilter);
    
    // Filter buttons
    const filterButtons = document.createElement('div');
    filterButtons.className = 'filter-buttons';
    filterButtons.innerHTML = `
      <button id="apply-filter" class="primary-button">Apply Filter</button>
      <button id="clear-filter" class="secondary-button">Clear Filter</button>
    `;
    filtersContainer.appendChild(filterButtons);
    
    return filtersContainer;
  }
  
  /**
   * Set up event listeners for sidebar interactions
   */
  setupEventListeners() {
    // Tab navigation
    const tabButtons = this.container.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const tabId = button.getAttribute('data-tab');
        this.setActiveTab(tabId);
      });
    });
    
    // Search input
    const searchInput = this.container.querySelector('#search-input');
    if (searchInput) {
      searchInput.addEventListener('input', this.debounce((e) => {
        this.searchQuery = e.target.value;
        EventBus.publish(Events.SEARCH_UPDATED, this.searchQuery);
      }, 300));
    }
    
    // Add person button
    const addPersonButton = this.container.querySelector('#add-person');
    if (addPersonButton) {
      addPersonButton.addEventListener('click', () => {
        EventBus.publish(Events.ADD_PERSON_CLICKED);
      });
    }
    
    // Add meeting button
    const addMeetingButton = this.container.querySelector('#add-meeting');
    if (addMeetingButton) {
      addMeetingButton.addEventListener('click', () => {
        EventBus.publish(Events.ADD_MEETING_CLICKED);
      });
    }
    
    // Apply filter button
    const applyFilterButton = this.container.querySelector('#apply-filter');
    if (applyFilterButton) {
      applyFilterButton.addEventListener('click', () => {
        const filters = this.collectFilters();
        EventBus.publish(Events.FILTERS_UPDATED, filters);
      });
    }
    
    // Clear filter button
    const clearFilterButton = this.container.querySelector('#clear-filter');
    if (clearFilterButton) {
      clearFilterButton.addEventListener('click', () => {
        this.clearFilters();
        const filters = this.collectFilters();
        EventBus.publish(Events.FILTERS_UPDATED, filters);
      });
    }
    
    // Create group button
    const createGroupButton = this.container.querySelector('#create-group');
    if (createGroupButton) {
      createGroupButton.addEventListener('click', () => {
        EventBus.publish(Events.CREATE_GROUP_CLICKED);
      });
    }
    
    // Auto create groups button
    const autoGroupButton = this.container.querySelector('#auto-group-meeting');
    if (autoGroupButton) {
      autoGroupButton.addEventListener('click', () => {
        EventBus.publish(Events.AUTO_GROUP_CLICKED);
      });
    }
    
    // Export data button
    const exportDataButton = this.container.querySelector('#export-data');
    if (exportDataButton) {
      exportDataButton.addEventListener('click', () => {
        EventBus.publish(Events.EXPORT_DATA_CLICKED);
      });
    }
    
    // Import data button
    const importDataButton = this.container.querySelector('#import-data');
    if (importDataButton) {
      importDataButton.addEventListener('click', () => {
        const fileInput = this.container.querySelector('#import-file-input');
        if (fileInput) {
          fileInput.click();
        }
      });
    }
    
    // Import file input change
    const importFileInput = this.container.querySelector('#import-file-input');
    if (importFileInput) {
      importFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          EventBus.publish(Events.IMPORT_FILE_SELECTED, e.target.files[0]);
        }
      });
    }
    
    // Visibility toggles
    const togglePeople = this.container.querySelector('#toggle-people');
    if (togglePeople) {
      togglePeople.addEventListener('change', (e) => {
        this.toggleStates.showPeople = e.target.checked;
        EventBus.publish(Events.VISIBILITY_TOGGLED, this.toggleStates);
      });
    }
    
    const toggleMeetings = this.container.querySelector('#toggle-meetings');
    if (toggleMeetings) {
      toggleMeetings.addEventListener('change', (e) => {
        this.toggleStates.showMeetings = e.target.checked;
        EventBus.publish(Events.VISIBILITY_TOGGLED, this.toggleStates);
      });
    }
    
    const toggleGroups = this.container.querySelector('#toggle-groups');
    if (toggleGroups) {
      toggleGroups.addEventListener('change', (e) => {
        this.toggleStates.showGroups = e.target.checked;
        EventBus.publish(Events.VISIBILITY_TOGGLED, this.toggleStates);
      });
    }
    
    // Help button
    const helpButton = this.container.querySelector('#show-help');
    if (helpButton) {
      helpButton.addEventListener('click', () => {
        EventBus.publish(Events.SHOW_HELP_CLICKED);
      });
    }
    
    // Configuration button
    const configButton = this.container.querySelector('#open-config');
    if (configButton) {
      configButton.addEventListener('click', () => {
        EventBus.publish(Events.OPEN_CONFIG_CLICKED);
      });
    }
  }
  
  /**
   * Set the active tab
   * @param {string} tabId - ID of the tab to activate
   */
  setActiveTab(tabId) {
    // Update active tab
    this.activeTab = tabId;
    
    // Update state
    stateManager.setState('ui.selectedTab', tabId);
    
    // Update tab buttons
    const tabButtons = this.container.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      const isActive = button.getAttribute('data-tab') === tabId;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    
    // Update tab content
    const tabContents = this.container.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
      const isActive = content.id === `${tabId}-tab`;
      content.classList.toggle('active', isActive);
    });
    
    // Notify that tab changed
    EventBus.publish(Events.TAB_CHANGED, tabId);
  }
  
  /**
   * Collect filter values from the UI
   * @returns {Object} Filter values
   */
  collectFilters() {
    const nameFilter = this.container.querySelector('#name-filter');
    const nameFilterValue = nameFilter ? nameFilter.value : '';
    
    const elderFilter = this.container.querySelector('#filter-elder');
    const servantFilter = this.container.querySelector('#filter-servant');
    const pioneerFilter = this.container.querySelector('#filter-pioneer');
    const publisherFilter = this.container.querySelector('#filter-publisher');
    const familyHeadFilter = this.container.querySelector('#filter-familyhead');
    const leaderFilter = this.container.querySelector('#filter-leader');
    const helperFilter = this.container.querySelector('#filter-helper');
    
    return {
      name: nameFilterValue,
      roles: {
        elder: elderFilter ? elderFilter.checked : false,
        servant: servantFilter ? servantFilter.checked : false,
        pioneer: pioneerFilter ? pioneerFilter.checked : false,
        publisher: publisherFilter ? publisherFilter.checked : false,
        familyHead: familyHeadFilter ? familyHeadFilter.checked : false,
        leader: leaderFilter ? leaderFilter.checked : false,
        helper: helperFilter ? helperFilter.checked : false
      }
    };
  }
  
  /**
   * Clear all filters
   */
  clearFilters() {
    const nameFilter = this.container.querySelector('#name-filter');
    if (nameFilter) {
      nameFilter.value = '';
    }
    
    const checkboxes = this.container.querySelectorAll('.filter-section input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
  }
  
  /**
   * Update the list content for a specific tab
   * @param {string} tabId - ID of the tab to update
   * @param {string} content - HTML content to set
   */
  updateTabContent(tabId, content) {
    const listContainer = this.container.querySelector(`#${tabId}-list`);
    if (listContainer) {
      listContainer.innerHTML = content;
    }
  }
  
  /**
   * Update the group list
   * @param {string} content - HTML content to set
   */
  updateGroupList(content) {
    const groupList = this.container.querySelector('#group-list');
    if (groupList) {
      groupList.innerHTML = content;
    }
  }
  
  /**
   * Debounce function to limit how often a function is called
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  debounce(func, wait) {
    let timeout;
    return function() {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(context, args);
      }, wait);
    };
  }
  
  /**
   * Factory method to create a sidebar instance
   * @param {HTMLElement} container - Container element
   * @returns {Sidebar} New sidebar instance
   */
  static create(container) {
    return new Sidebar(container);
  }
}

export default Sidebar;