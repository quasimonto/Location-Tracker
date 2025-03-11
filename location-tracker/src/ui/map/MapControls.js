/**
 * MapControls.js
 * Custom controls for the map
 */

import { EventBus, Events } from '../../app/EventBus';
import { setMapClickMode, getMapClickMode } from '../../services/MapService';
import { errorHandler, ErrorType, ErrorSeverity } from '../../utils/errorHandler';

/**
 * MapControls class for custom map controls
 */
class MapControls {
  /**
   * Create a new MapControls instance
   * @param {google.maps.Map} map - Google Maps instance
   */
  constructor(map) {
    this.map = map;
    this.controls = {};
    
    // Initialize controls
    this.initAddControls();
    this.initViewControls();
  }
  
  /**
   * Initialize add controls
   */
  initAddControls() {
    try {
      // Create control container
      const controlDiv = document.createElement('div');
      controlDiv.className = 'map-control add-controls';
      
      // Add label
      const controlLabel = document.createElement('div');
      controlLabel.className = 'control-label';
      controlLabel.textContent = 'Add:';
      controlDiv.appendChild(controlLabel);
      
      // Add person button
      const addPersonButton = document.createElement('button');
      addPersonButton.className = 'control-button add-person-button';
      addPersonButton.innerHTML = '<span class="button-icon">👤</span> Person';
      addPersonButton.title = 'Add a person to the map';
      controlDiv.appendChild(addPersonButton);
      
      // Add meeting button
      const addMeetingButton = document.createElement('button');
      addMeetingButton.className = 'control-button add-meeting-button';
      addMeetingButton.innerHTML = '<span class="button-icon">📍</span> Meeting';
      addMeetingButton.title = 'Add a meeting point to the map';
      controlDiv.appendChild(addMeetingButton);
      
      // Add event listeners
      addPersonButton.addEventListener('click', () => {
        this.toggleAddMode('person', addPersonButton);
      });
      
      addMeetingButton.addEventListener('click', () => {
        this.toggleAddMode('meeting', addMeetingButton);
      });
      
      // Position the control
      this.map.controls[google.maps.ControlPosition.TOP_RIGHT].push(controlDiv);
      
      // Store reference
      this.controls.addControls = {
        div: controlDiv,
        addPersonButton,
        addMeetingButton
      };
      
      // Subscribe to map click mode changes
      EventBus.on(Events.MAP_CLICK_MODE_CHANGED, (mode) => {
        this.updateAddButtonState(mode);
      });
    } catch (error) {
      errorHandler.handleError(
        error,
        'Add Controls',
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Initialize view controls
   */
  initViewControls() {
    try {
      // Create control container
      const controlDiv = document.createElement('div');
      controlDiv.className = 'map-control view-controls';
      
      // Fit all button
      const fitAllButton = document.createElement('button');
      fitAllButton.className = 'control-button fit-all-button';
      fitAllButton.innerHTML = '<span class="button-icon">🔍</span> Fit All';
      fitAllButton.title = 'Fit all markers on screen';
      controlDiv.appendChild(fitAllButton);
      
      // Reset view button
      const resetViewButton = document.createElement('button');
      resetViewButton.className = 'control-button reset-view-button';
      resetViewButton.innerHTML = '<span class="button-icon">⟲</span> Reset';
      resetViewButton.title = 'Reset to default view';
      controlDiv.appendChild(resetViewButton);
      
      // Add event listeners
      fitAllButton.addEventListener('click', () => {
        EventBus.publish(Events.FIT_ALL_ENTITIES);
      });
      
      resetViewButton.addEventListener('click', () => {
        EventBus.publish(Events.RESET_MAP_VIEW);
      });
      
      // Position the control
      this.map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(controlDiv);
      
      // Store reference
      this.controls.viewControls = {
        div: controlDiv,
        fitAllButton,
        resetViewButton
      };
    } catch (error) {
      errorHandler.handleError(
        error,
        'View Controls',
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Toggle add mode
   * @param {string} mode - Mode to toggle ('person' or 'meeting')
   * @param {HTMLElement} button - Button element
   */
  toggleAddMode(mode, button) {
    try {
      // Get current mode
      const currentMode = getMapClickMode();
      
      if (currentMode === mode) {
        // Turn off mode if it's already active
        setMapClickMode(null);
        button.classList.remove('active');
        EventBus.publish(Events.MAP_CLICK_MODE_CHANGED, null);
      } else {
        // Turn on new mode
        setMapClickMode(mode);
        
        // Update button state
        this.updateAddButtonState(mode);
        
        // Publish event
        EventBus.publish(Events.MAP_CLICK_MODE_CHANGED, mode);
      }
    } catch (error) {
      errorHandler.handleError(
        error,
        'Toggling Add Mode',
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Update add button state based on current mode
   * @param {string|null} mode - Current mode
   */
  updateAddButtonState(mode) {
    try {
      // Get buttons
      const { addPersonButton, addMeetingButton } = this.controls.addControls;
      
      // Update button states
      addPersonButton.classList.toggle('active', mode === 'person');
      addMeetingButton.classList.toggle('active', mode === 'meeting');
    } catch (error) {
      errorHandler.handleError(
        error,
        'Updating Button State',
        ErrorSeverity.WARNING,
        ErrorType.MAP
      );
    }
  }
  
  /**
   * Factory method to create a MapControls instance
   * @param {google.maps.Map} map - Google Maps instance
   * @returns {MapControls} New MapControls instance
   * @static
   */
  static create(map) {
    return new MapControls(map);
  }
}

export default MapControls;