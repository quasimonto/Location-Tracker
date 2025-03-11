/**
 * MeetingForm.js
 * Form component for creating and editing Meeting entities
 */

import Form, { FieldType } from './Form';
import Modal from './Modal';
import { EventBus, Events } from '../../app/EventBus';
import meetingService from '../../services/MeetingService';
import groupService from '../../services/GroupService';
import { setMapClickMode } from '../../services/MapService';
import { errorHandler, ErrorType, ErrorSeverity } from '../../utils/errorHandler';

/**
 * Form mode enum
 * @enum {string}
 */
export const FormMode = {
  CREATE: 'create',
  EDIT: 'edit'
};

/**
 * MeetingForm class for creating and editing Meeting entities
 */
class MeetingForm {
  /**
   * Create a new MeetingForm instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      mode: FormMode.CREATE,
      meeting: null, // Meeting data for edit mode
      onSave: null,
      onCancel: null,
      ...options
    };
    
    // Modal instance for containing the form
    this.modal = null;
    
    // Form instance
    this.form = null;
    
    // Position selection helper
    this.awaitingPositionSelection = false;
    
    // Create and display the form
    this.createForm();
  }
  
  /**
   * Create the form
   */
  createForm() {
    // Create modal to host the form
    this.modal = Modal.create({
      title: this.options.mode === FormMode.CREATE ? 'Add Meeting Point' : 'Edit Meeting Point',
      closable: true,
      size: 'medium',
      onConfirm: () => this.handleSave(),
      onCancel: () => this.handleCancel(),
      onClose: () => this.handleCancel()
    });
    
    // Create form container
    const formContainer = document.createElement('div');
    formContainer.className = 'meeting-form-container';
    
    // Set form content to the modal
    this.modal.setContent(formContainer);
    
    // Show the modal
    this.modal.show();
    
    // Prepare form data for edit mode
    const initialValues = this.options.mode === FormMode.EDIT && this.options.meeting
      ? this.prepareInitialValues(this.options.meeting)
      : {};
    
    // Prepare group options
    const groupOptions = this.getGroupOptions();
    
    // Create form fields
    const fields = [
      {
        name: 'id',
        type: FieldType.HIDDEN,
        value: initialValues.id || ''
      },
      {
        name: 'name',
        label: 'Name',
        type: FieldType.TEXT,
        required: true,
        placeholder: 'Enter meeting point name',
        value: initialValues.name || '',
        validate: value => {
          if (!value || value.trim() === '') {
            return 'Name is required';
          }
          return null;
        }
      },
      {
        name: 'description',
        label: 'Description',
        type: FieldType.TEXTAREA,
        required: false,
        placeholder: 'Enter description',
        value: initialValues.description || '',
        rows: 3
      },
      {
        name: 'location',
        label: 'Location',
        type: 'custom', // Custom field type for location
        required: true,
        value: initialValues.location || null,
        render: (field, form) => {
          const fieldContainer = document.createElement('div');
          fieldContainer.className = 'location-field';
          
          // Location display
          const locationDisplay = document.createElement('div');
          locationDisplay.className = 'location-display';
          locationDisplay.id = 'meeting-location-display';
          
          if (field.value) {
            locationDisplay.textContent = `Lat: ${field.value.lat.toFixed(6)}, Lng: ${field.value.lng.toFixed(6)}`;
          } else {
            locationDisplay.textContent = 'No location selected';
            locationDisplay.classList.add('empty');
          }
          
          // Location picker button
          const pickerButton = document.createElement('button');
          pickerButton.className = 'location-picker-button';
          pickerButton.textContent = field.value ? 'Change Location' : 'Pick Location';
          pickerButton.addEventListener('click', () => {
            this.handleLocationPicker();
          });
          
          // Add elements to container
          fieldContainer.appendChild(locationDisplay);
          fieldContainer.appendChild(pickerButton);
          
          return fieldContainer;
        },
        validate: value => {
          if (!value || value.lat === undefined || value.lng === undefined) {
            return 'Location is required';
          }
          return null;
        }
      },
      {
        name: 'group',
        label: 'Group',
        type: FieldType.SELECT,
        required: false,
        placeholder: 'Select a group',
        options: groupOptions,
        value: initialValues.group || ''
      }
    ];
    
    // Create form
    this.form = new Form(formContainer, {
      id: 'meeting-form',
      fields,
      values: initialValues,
      validateOnChange: true,
      labelPosition: 'left',
      showButtons: false,
      onChange: (fieldName, value) => this.handleFieldChange(fieldName, value)
    });
    
    // Set up map click event subscription for location picking
    this.mapClickSubscription = EventBus.on(Events.MAP_CLICKED, event => {
      if (this.awaitingPositionSelection) {
        this.handleLocationSelected(event.detail.location);
      }
    });
  }
  
  /**
   * Prepare initial values for the form in edit mode
   * @param {Object} meeting - Meeting data
   * @returns {Object} Form values
   */
  prepareInitialValues(meeting) {
    // Construct location object
    const location = {
      lat: meeting.lat,
      lng: meeting.lng
    };
    
    return {
      id: meeting.id,
      name: meeting.name,
      description: meeting.description || '',
      location,
      group: meeting.group || ''
    };
  }
  
  /**
   * Get options for group select
   * @returns {Array} Group options
   */
  getGroupOptions() {
    const options = [
      { value: '', label: 'No Group' }
    ];
    
    // Add available groups
    try {
      const groups = groupService.getAllGroups();
      groups.forEach(group => {
        options.push({
          value: group.id,
          label: group.name
        });
      });
    } catch (error) {
      errorHandler.handleError(
        error,
        'Getting Group Options',
        ErrorSeverity.WARNING,
        ErrorType.UNKNOWN
      );
    }
    
    return options;
  }
  
  /**
   * Handle field change event
   * @param {string} fieldName - Field name
   * @param {*} value - New value
   */
  handleFieldChange(fieldName, value) {
    // Handle specific field changes if needed
    // For now, no special handling required
  }
  
  /**
   * Handle location picker button click
   */
  handleLocationPicker() {
    // Enable map click mode to select a location
    this.awaitingPositionSelection = true;
    
    // Close the modal temporarily
    this.modal.hide();
    
    // Set map to meeting selection mode
    setMapClickMode('meeting');
    
    // Show instruction toast
    this.showToast('Click on the map to select a location', 'info');
  }
  
  /**
   * Handle location selected from map
   * @param {Object} location - Selected location {lat, lng}
   */
  handleLocationSelected(location) {
    // Reset map mode
    setMapClickMode(null);
    this.awaitingPositionSelection = false;
    
    // Show the modal again
    this.modal.show();
    
    // Update the form with selected location
    this.form.setValue('location', location);
    
    // Update location display
    const locationDisplay = document.getElementById('meeting-location-display');
    if (locationDisplay) {
      locationDisplay.textContent = `Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}`;
      locationDisplay.classList.remove('empty');
    }
    
    // Show success toast
    this.showToast('Location selected', 'success');
  }
  
  /**
   * Show a toast notification
   * @param {string} message - Message to display
   * @param {string} type - Toast type ('info', 'success', 'warning', 'error')
   */
  showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-message">${message}</span>
      </div>
    `;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Auto remove after a delay
    setTimeout(() => {
      toast.classList.add('toast-hide');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
  
  /**
   * Handle form save
   */
  handleSave() {
    // Validate the form
    if (!this.validateForm()) {
      return;
    }
    
    // Get form values
    const values = this.form.getValues();
    
    // Prepare meeting data
    const meetingData = this.buildMeetingData(values);
    
    try {
      // Save the meeting
      if (this.options.mode === FormMode.CREATE) {
        // Create new meeting
        const meeting = meetingService.createMeeting(meetingData);
        
        // Call onSave callback if provided
        if (typeof this.options.onSave === 'function') {
          this.options.onSave(meeting);
        }
        
        // Show success message
        this.showToast('Meeting point created successfully', 'success');
      } else {
        // Update existing meeting
        const meeting = meetingService.updateMeeting(meetingData.id, meetingData);
        
        // Call onSave callback if provided
        if (typeof this.options.onSave === 'function') {
          this.options.onSave(meeting);
        }
        
        // Show success message
        this.showToast('Meeting point updated successfully', 'success');
      }
      
      // Close the modal
      this.closeForm();
    } catch (error) {
      // Show error message
      this.showToast(`Error: ${error.message}`, 'error');
    }
  }
  
  /**
   * Build meeting data from form values
   * @param {Object} values - Form values
   * @returns {Object} Meeting data
   */
  buildMeetingData(values) {
    // Build meeting data
    return {
      id: values.id || undefined, // For update mode
      name: values.name,
      description: values.description || '',
      lat: values.location.lat,
      lng: values.location.lng,
      group: values.group || null
    };
  }
  
  /**
   * Validate the form
   * @returns {boolean} Whether the form is valid
   */
  validateForm() {
    // Check if form exists
    if (!this.form) {
      return false;
    }
    
    // Get form values
    const values = this.form.getValues();
    
    // Validate required fields
    if (!values.name || values.name.trim() === '') {
      this.showToast('Name is required', 'error');
      return false;
    }
    
    if (!values.location || values.location.lat === undefined || values.location.lng === undefined) {
      this.showToast('Location is required', 'error');
      return false;
    }
    
    return true;
  }
  
  /**
   * Handle form cancel
   */
  handleCancel() {
    // Call onCancel callback if provided
    if (typeof this.options.onCancel === 'function') {
      this.options.onCancel();
    }
    
    // Close the form
    this.closeForm();
  }
  
  /**
   * Close the form and clean up
   */
  closeForm() {
    // Clean up map click subscription
    if (this.mapClickSubscription) {
      EventBus.off(Events.MAP_CLICKED);
    }
    
    // Reset map click mode if still active
    if (this.awaitingPositionSelection) {
      setMapClickMode(null);
    }
    
    // Close the modal
    if (this.modal) {
      this.modal.destroy();
      this.modal = null;
    }
  }
  
  /**
   * Factory method to create a meeting form
   * @param {Object} options - Configuration options
   * @returns {MeetingForm} New MeetingForm instance
   * @static
   */
  static create(options = {}) {
    return new MeetingForm(options);
  }
}

export default MeetingForm;