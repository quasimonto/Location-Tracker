/**
 * PersonForm.js
 * Form component for creating and editing Person entities
 */

import Form, { FieldType } from './Form';
import Modal from './Modal';
import { EventBus, Events } from '../../app/EventBus';
import personService from '../../services/PersonService';
import groupService from '../../services/GroupService';
import familyService from '../../services/FamilyService';
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
 * PersonForm class for creating and editing Person entities
 */
class PersonForm {
  /**
   * Create a new PersonForm instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      mode: FormMode.CREATE,
      person: null, // Person data for edit mode
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
      title: this.options.mode === FormMode.CREATE ? 'Add Person' : 'Edit Person',
      closable: true,
      size: 'medium',
      onConfirm: () => this.handleSave(),
      onCancel: () => this.handleCancel(),
      onClose: () => this.handleCancel()
    });
    
    // Create form container
    const formContainer = document.createElement('div');
    formContainer.className = 'person-form-container';
    
    // Set form content to the modal
    this.modal.setContent(formContainer);
    
    // Show the modal
    this.modal.show();
    
    // Prepare form data for edit mode
    const initialValues = this.options.mode === FormMode.EDIT && this.options.person
      ? this.prepareInitialValues(this.options.person)
      : {};
    
    // Prepare group options
    const groupOptions = this.getGroupOptions();
    
    // Prepare family options for family selection
    const familyOptions = this.getFamilyOptions();
    
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
        placeholder: 'Enter person name',
        value: initialValues.name || '',
        validate: value => {
          if (!value || value.trim() === '') {
            return 'Name is required';
          }
          return null;
        }
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
          locationDisplay.id = 'location-display';
          
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
      },
      {
        name: 'roles',
        label: 'Roles',
        type: 'custom',
        value: initialValues.roles || {},
        render: (field, form) => {
          const fieldContainer = document.createElement('div');
          fieldContainer.className = 'roles-field';
          
          // Create role checkboxes
          const roles = [
            { id: 'elder', label: 'Elder' },
            { id: 'servant', label: 'Servant' },
            { id: 'pioneer', label: 'Pioneer' },
            { id: 'publisher', label: 'Publisher' },
            { id: 'leader', label: 'Leader' },
            { id: 'helper', label: 'Helper' }
          ];
          
          const checkboxContainer = document.createElement('div');
          checkboxContainer.className = 'checkbox-grid';
          
          roles.forEach(role => {
            const checkboxItem = document.createElement('div');
            checkboxItem.className = 'checkbox-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `role-${role.id}`;
            checkbox.name = `role-${role.id}`;
            checkbox.checked = field.value[role.id] || false;
            
            checkbox.addEventListener('change', () => {
              // Update the field value
              const updatedRoles = { ...field.value };
              updatedRoles[role.id] = checkbox.checked;
              form.setValue('roles', updatedRoles);
            });
            
            const label = document.createElement('label');
            label.htmlFor = `role-${role.id}`;
            label.textContent = role.label;
            
            checkboxItem.appendChild(checkbox);
            checkboxItem.appendChild(label);
            checkboxContainer.appendChild(checkboxItem);
          });
          
          fieldContainer.appendChild(checkboxContainer);
          return fieldContainer;
        }
      },
      {
        name: 'family',
        label: 'Family',
        type: 'custom',
        value: initialValues.family || { familyId: '', familyRole: '' },
        render: (field, form) => {
          const fieldContainer = document.createElement('div');
          fieldContainer.className = 'family-field';
          
          // Family selection
          const familyRow = document.createElement('div');
          familyRow.className = 'field-row';
          
          const familyLabel = document.createElement('label');
          familyLabel.htmlFor = 'family-id';
          familyLabel.textContent = 'Family';
          
          const familySelect = document.createElement('select');
          familySelect.id = 'family-id';
          familySelect.name = 'family-id';
          
          // Add options
          const emptyOption = document.createElement('option');
          emptyOption.value = '';
          emptyOption.textContent = 'No Family';
          familySelect.appendChild(emptyOption);
          
          familyOptions.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            
            // Set selected if matches
            if (field.value.familyId === option.value) {
              optionElement.selected = true;
            }
            
            familySelect.appendChild(optionElement);
          });
          
          // Family role selection (only show if family is selected)
          const roleRow = document.createElement('div');
          roleRow.className = 'field-row';
          roleRow.style.display = field.value.familyId ? 'flex' : 'none';
          
          const roleLabel = document.createElement('label');
          roleLabel.htmlFor = 'family-role';
          roleLabel.textContent = 'Role in Family';
          
          const roleSelect = document.createElement('select');
          roleSelect.id = 'family-role';
          roleSelect.name = 'family-role';
          
          // Add role options
          const roles = [
            { value: 'head', label: 'Head' },
            { value: 'spouse', label: 'Spouse' },
            { value: 'child', label: 'Child' }
          ];
          
          roles.forEach(role => {
            const optionElement = document.createElement('option');
            optionElement.value = role.value;
            optionElement.textContent = role.label;
            
            // Set selected if matches
            if (field.value.familyRole === role.value) {
              optionElement.selected = true;
            }
            
            roleSelect.appendChild(optionElement);
          });
          
          // Handle family selection change
          familySelect.addEventListener('change', () => {
            const familyId = familySelect.value;
            const familyRole = familyId ? roleSelect.value : '';
            
            // Show/hide role select based on family selection
            roleRow.style.display = familyId ? 'flex' : 'none';
            
            // Update the field value
            form.setValue('family', {
              familyId,
              familyRole
            });
          });
          
          // Handle role selection change
          roleSelect.addEventListener('change', () => {
            const familyId = familySelect.value;
            const familyRole = roleSelect.value;
            
            // Update the field value
            form.setValue('family', {
              familyId,
              familyRole
            });
          });
          
          // Add elements to container
          familyRow.appendChild(familyLabel);
          familyRow.appendChild(familySelect);
          roleRow.appendChild(roleLabel);
          roleRow.appendChild(roleSelect);
          
          fieldContainer.appendChild(familyRow);
          fieldContainer.appendChild(roleRow);
          
          return fieldContainer;
        }
      }
    ];
    
    // Create form
    this.form = new Form(formContainer, {
      id: 'person-form',
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
   * @param {Object} person - Person data
   * @returns {Object} Form values
   */
  prepareInitialValues(person) {
    // Extract roles
    const roles = {
      elder: person.elder || false,
      servant: person.servant || false,
      pioneer: person.pioneer || false,
      publisher: person.publisher || false,
      leader: person.leader || false,
      helper: person.helper || false
    };
    
    // Extract family info
    const family = {
      familyId: person.familyId || '',
      familyRole: person.familyRole || ''
    };
    
    // Construct location object
    const location = {
      lat: person.lat,
      lng: person.lng
    };
    
    return {
      id: person.id,
      name: person.name,
      location,
      group: person.group || '',
      roles,
      family
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
   * Get options for family select
   * @returns {Array} Family options
   */
  getFamilyOptions() {
    const options = [];
    
    // Add available families
    try {
      const families = familyService.getAllFamilies();
      families.forEach(family => {
        options.push({
          value: family.id,
          label: family.name
        });
      });
    } catch (error) {
      errorHandler.handleError(
        error,
        'Getting Family Options',
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
    
    // Set map to person selection mode
    setMapClickMode('person');
    
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
    const locationDisplay = document.getElementById('location-display');
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
    
    // Prepare person data
    const personData = this.buildPersonData(values);
    
    try {
      // Save the person
      if (this.options.mode === FormMode.CREATE) {
        // Create new person
        const person = personService.createPerson(personData);
        
        // Call onSave callback if provided
        if (typeof this.options.onSave === 'function') {
          this.options.onSave(person);
        }
        
        // Show success message
        this.showToast('Person created successfully', 'success');
      } else {
        // Update existing person
        const person = personService.updatePerson(personData.id, personData);
        
        // Call onSave callback if provided
        if (typeof this.options.onSave === 'function') {
          this.options.onSave(person);
        }
        
        // Show success message
        this.showToast('Person updated successfully', 'success');
      }
      
      // Close the modal
      this.closeForm();
    } catch (error) {
      // Show error message
      this.showToast(`Error: ${error.message}`, 'error');
    }
  }
  
  /**
   * Build person data from form values
   * @param {Object} values - Form values
   * @returns {Object} Person data
   */
  buildPersonData(values) {
    // Prepare roles
    const roles = values.roles || {};
    
    // Prepare family data
    const family = values.family || { familyId: null, familyRole: null };
    
    // Build person data
    return {
      id: values.id || undefined, // For update mode
      name: values.name,
      lat: values.location.lat,
      lng: values.location.lng,
      group: values.group || null,
      familyId: family.familyId || null,
      familyRole: family.familyRole || null,
      
      // Roles
      elder: roles.elder || false,
      servant: roles.servant || false,
      pioneer: roles.pioneer || false,
      publisher: roles.publisher || false,
      leader: roles.leader || false,
      helper: roles.helper || false,
      
      // Family role flags (for consistency)
      familyHead: family.familyRole === 'head',
      spouse: family.familyRole === 'spouse',
      child: family.familyRole === 'child'
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
   * Factory method to create a person form
   * @param {Object} options - Configuration options
   * @returns {PersonForm} New PersonForm instance
   * @static
   */
  static create(options = {}) {
    return new PersonForm(options);
  }
}

export default PersonForm;