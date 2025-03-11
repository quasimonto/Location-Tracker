/**
 * TravelTimePanel.js
 * Component for displaying travel times between locations
 */

import { EventBus, Events } from '../../app/EventTypes';
import travelService, { TravelMode } from '../../services/TravelService';
import personService from '../../services/PersonService';
import meetingService from '../../services/MeetingService';
import { formatDistance, formatTravelTime } from '../../utils/mapUtils';
import { errorHandler, ErrorType, ErrorSeverity } from '../../utils/errorHandler';

class TravelTimePanel {
  /**
   * Create a new TravelTimePanel
   * @param {HTMLElement} container - Container to render the panel in
   */
  constructor(container) {
    this.container = container;
    this.currentOrigin = null;
    this.currentType = null;
    this.currentMode = TravelMode.DRIVING;
    
    // Create panel elements
    this.createPanelElements();
    
    // Setup event subscriptions
    this.setupEventSubscriptions();
  }
  
  /**
   * Create the panel UI elements
   */
  createPanelElements() {
    // Create panel container
    this.panelElement = document.createElement('div');
    this.panelElement.className = 'travel-time-panel';
    this.panelElement.style.display = 'none'; // Initially hidden
    
    // Create header
    const header = document.createElement('div');
    header.className = 'panel-header';
    
    this.titleElement = document.createElement('h3');
    this.titleElement.className = 'panel-title';
    this.titleElement.textContent = 'Travel Times';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.innerHTML = '×';
    closeButton.setAttribute('aria-label', 'Close');
    closeButton.addEventListener('click', () => this.hide());
    
    header.appendChild(this.titleElement);
    header.appendChild(closeButton);
    
    // Create travel mode selector
    const modeSelector = document.createElement('div');
    modeSelector.className = 'mode-selector';
    
    const modeLabel = document.createElement('span');
    modeLabel.textContent = 'Travel Mode:';
    modeLabel.className = 'mode-label';
    
    this.modeSelect = document.createElement('select');
    this.modeSelect.className = 'mode-select';
    
    const modes = [
      { value: TravelMode.DRIVING, label: 'Driving' },
      { value: TravelMode.WALKING, label: 'Walking' },
      { value: TravelMode.TRANSIT, label: 'Transit' }
    ];
    
    modes.forEach(mode => {
      const option = document.createElement('option');
      option.value = mode.value;
      option.textContent = mode.label;
      this.modeSelect.appendChild(option);
    });
    
    this.modeSelect.addEventListener('change', () => {
      this.currentMode = this.modeSelect.value;
      this.updateTravelTimes();
    });
    
    modeSelector.appendChild(modeLabel);
    modeSelector.appendChild(this.modeSelect);
    
    // Content area
    this.contentElement = document.createElement('div');
    this.contentElement.className = 'panel-content';
    
    // Add elements to panel
    this.panelElement.appendChild(header);
    this.panelElement.appendChild(modeSelector);
    this.panelElement.appendChild(this.contentElement);
    
    // Add to container
    this.container.appendChild(this.panelElement);
  }
  
  /**
   * Setup event subscriptions
   */
  setupEventSubscriptions() {
    EventBus.on(Events.DISPLAY_TRAVEL_TIMES, (data) => {
      this.show(data.origin, data.type);
    });
  }
  
  /**
   * Show the panel
   * @param {Object} origin - Origin entity
   * @param {string} type - Entity type
   */
  show(origin, type) {
    if (!origin) return;
    
    this.currentOrigin = origin;
    this.currentType = type;
    
    // Update the title
    this.titleElement.textContent = `Travel Times from ${origin.name}`;
    
    // Set default travel mode
    this.currentMode = TravelMode.DRIVING;
    this.modeSelect.value = this.currentMode;
    
    // Show the panel
    this.panelElement.style.display = 'flex';
    
    // Update content
    this.updateTravelTimes();
  }
  
  /**
   * Hide the panel
   */
  hide() {
    this.panelElement.style.display = 'none';
    this.currentOrigin = null;
    this.currentType = null;
  }
  
  /**
   * Update travel times display
   */
  async updateTravelTimes() {
    try {
      if (!this.currentOrigin) return;
      
      // Show loading indicator
      this.contentElement.innerHTML = '<div class="loading">Calculating travel times...</div>';
      
      // Get destinations based on origin type
      let destinations = [];
      
      if (this.currentType === 'person') {
        // Get all meeting points
        const meetings = meetingService.getAllMeetings();
        destinations = meetings.map(meeting => ({
          id: meeting.id,
          name: meeting.name,
          lat: meeting.lat,
          lng: meeting.lng,
          type: 'meeting'
        }));
      } else if (this.currentType === 'meeting') {
        // Get all persons
        const persons = personService.getAllPersons();
        destinations = persons.map(person => ({
          id: person.id,
          name: person.name,
          lat: person.lat,
          lng: person.lng,
          type: 'person'
        }));
      }
      
      // Don't proceed if no destinations
      if (destinations.length === 0) {
        this.contentElement.innerHTML = '<div class="no-results">No destinations found</div>';
        return;
      }
      
      // Calculate travel times
      const origin = {
        id: this.currentOrigin.id,
        lat: this.currentOrigin.lat,
        lng: this.currentOrigin.lng
      };
      
      const travelTimes = await travelService.calculateBatchTravelTimes(
        origin,
        destinations,
        this.currentMode
      );
      
      // Sort by duration
      travelTimes.sort((a, b) => a.durationValue - b.durationValue);
      
      // Render results
      this.renderTravelTimes(travelTimes);
    } catch (error) {
      errorHandler.handleError(
        error,
        'Calculating Travel Times',
        ErrorSeverity.ERROR,
        ErrorType.UNKNOWN
      );
      
      // Show error message
      this.contentElement.innerHTML = '<div class="error">Error calculating travel times</div>';
    }
  }
  
  /**
   * Render travel times results
   * @param {Array} travelTimes - Travel time results
   */
  renderTravelTimes(travelTimes) {
    // Create results table
    const table = document.createElement('table');
    table.className = 'travel-times-table';
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    ['Destination', 'Distance', 'Travel Time', 'Actions'].forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    
    travelTimes.forEach(item => {
      const row = document.createElement('tr');
      
      // Destination name
      const nameCell = document.createElement('td');
      nameCell.textContent = item.destination.name;
      row.appendChild(nameCell);
      
      // Distance
      const distanceCell = document.createElement('td');
      distanceCell.textContent = item.distance;
      row.appendChild(distanceCell);
      
      // Travel time
      const timeCell = document.createElement('td');
      timeCell.textContent = item.duration;
      if (item.isEstimate) {
        timeCell.classList.add('estimate');
        timeCell.title = 'Estimated time';
      }
      row.appendChild(timeCell);
      
      // Actions
      const actionsCell = document.createElement('td');
      const viewButton = document.createElement('button');
      viewButton.className = 'view-button';
      viewButton.textContent = 'View';
      viewButton.addEventListener('click', () => {
        // Select the destination entity
        const selectEvent = item.destination.type === 'person' ? 
          Events.PERSON_SELECTED : 
          Events.MEETING_SELECTED;
        
        const entity = item.destination.type === 'person' ?
          personService.getPersonById(item.destination.id) :
          meetingService.getMeetingById(item.destination.id);
        
        if (entity) {
          EventBus.publish(selectEvent, entity);
        }
      });
      
      actionsCell.appendChild(viewButton);
      row.appendChild(actionsCell);
      
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    
    // Clear and add new content
    this.contentElement.innerHTML = '';
    this.contentElement.appendChild(table);
  }
  
  /**
   * Factory method to create a TravelTimePanel
   * @param {HTMLElement} container - Container element
   * @returns {TravelTimePanel} New TravelTimePanel
   */
  static create(container) {
    return new TravelTimePanel(container);
  }
}

export default TravelTimePanel;