/**
 * EditForm.js
 * Reusable form component for creating and editing entities
 */

import { EventBus, Events } from '../../app/EventBus';
import { ItemType } from './ListView';

/**
 * Form modes
 * @enum {string}
 */
export const FormMode = {
  CREATE: 'create',
  EDIT: 'edit'
};

/**
 * EditForm class for creating and editing entities
 */
class EditForm {
  /**
   * Create a new EditForm instance
   * @param {HTMLElement} container - Container element to render the form in
   * @param {Object} options - Configuration options
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      itemType: ItemType.PERSON,
      mode: FormMode.CREATE,
      showCancelButton: true,
      preventSubmit: false,
      validateOnChange: false,
      ...options
    };
    
    this.item = options.item || null;
    this.fields = [];
    this.isValid = false;
    this.errors = new Map();
    
    // Set up fields based on item type
    this.setupFields();
    
    // Render the form
    this.render();
  }
  
  /**
   * Set up fields based on item type
   */
  setupFields() {
    switch (this.options.itemType) {
      case ItemType.PERSON:
        this.setupPersonFields();
        break;
      case ItemType.MEETING:
        this.setupMeetingFields();
        break;
      case ItemType.GROUP:
        this.setupGroupFields();
        break;
      case ItemType.FAMILY:
        this.setupFamilyFields();
        break;
    }
  }
  
  /**
   * Set up fields for person form
   */
  setupPersonFields() {
    this.fields = [
      {
        id: 'name',
        label: 'Name',
        type: 'text',
        required: true,
        value: this.item ? this.item.name : 'New Person',
        placeholder: 'Enter person name',
        validator: value => value.trim().length > 0 ? null : 'Name is required'
      },
      {
        id: 'group',
        label: 'Group',
        type: 'select',
        required: false,
        value: this.item ? this.item.group : '',
        options: this.getGroupOptions(),
        placeholder: 'Select a group',
        clearable: true
      },
      {
        id: 'roles',
        label: 'Roles',
        type: 'checkboxGroup',
        value: this.getPersonRoles(),
        options: [
          { id: 'elder', label: 'Elder' },
          { id: 'servant', label: 'Servant' },
          { id: 'pioneer', label: 'Pioneer' },
          { id: 'publisher', label: 'Publisher' },
          { id: 'leader', label: 'Leader' },
          { id: 'helper', label: 'Helper' }
        ]
      },
      {
        id: 'family',
        label: 'Family Status',
        type: 'checkboxGroup',
        value: this.getPersonFamilyStatus(),
        options: [
          { id: 'familyHead', label: 'Family Head' },
          { id: 'spouse', label: 'Spouse' },
          { id: 'child', label: 'Child' }
        ]
      },
      {
        id: 'location',
        label: 'Location',
        type: 'location',
        value: this.item ? { lat: this.item.lat, lng: this.item.lng } : null,
        required: true,
        validator: value => value && value.lat && value.lng ? null : 'Location is required'
      }
    ];
  }
  
  /**
   * Get person roles for form initialization
   * @returns {Object} Role values
   */
  getPersonRoles() {
    if (!this.item) {
      return {};
    }
    
    return {
      elder: this.item.elder || false,
      servant: this.item.servant || false,
      pioneer: this.item.pioneer || false,
      publisher: this.item.publisher || false,
      leader: this.item.leader || false,
      helper: this.item.helper || false
    };
  }
  
  /**
   * Get person family status for form initialization
   * @returns {Object} Family status values
   */
  getPersonFamilyStatus() {
    if (!this.item) {
      return {};
    }
    
    return {
      familyHead: this.item.familyHead || false,
      spouse: this.item.spouse || false,
      child: this.item.child || false
    };
  }
  
  /**
   * Set up fields for meeting form
   */
  setupMeetingFields() {
    this.fields = [
      {
        id: 'name',
        label: 'Meeting Name',
        type: 'text',
        required: true,
        value: this.item ? this.item.name : 'New Meeting Point',
        placeholder: 'Enter meeting point name',
        validator: value => value.trim().length > 0 ? null : 'Name is required'
      },
      {
        id: 'description',
        label: 'Description',
        type: 'textarea',
        required: false,
        value: this.item ? this.item.description : '',
        placeholder: 'Enter description',
        rows: 3
      },
      {
        id: 'group',
        label: 'Group',
        type: 'select',
        required: false,
        value: this.item ? this.item.group : '',
        options: this.getGroupOptions(),
        placeholder: 'Select a group',
        clearable: true
      },
      {
        id: 'location',
        label: 'Location',
        type: 'location',
        value: this.item ? { lat: this.item.lat, lng: this.item.lng } : null,
        required: true,
        validator: value => value && value.lat && value.lng ? null : 'Location is required'
      }
    ];
  }
  
  /**
   * Set up fields for group form
   */
  setupGroupFields() {
    this.fields = [
      {
        id: 'name',
        label: 'Group Name',
        type: 'text',
        required: true,
        value: this.item ? this.item.name : 'New Group',
        placeholder: 'Enter group name',
        validator: value => value.trim().length > 0 ? null : 'Name is required'
      },
      {
        id: 'color',
        label: 'Group Color',
        type: 'color',
        required: true,
        value: this.item ? this.item.color : this.generateRandomColor()
      },
      {
        id: 'requirements',
        label: 'Group Requirements',
        type: 'formSection',
        fields: [
          {
            id: 'minElders',
            label: 'Min Elders',
            type: 'number',
            min: 0,
            max: 10,
            value: this.item && this.item.requirements ? this.item.requirements.minElders : 0
          },
          {
            id: 'minServants',
            label: 'Min Servants',
            type: 'number',
            min: 0,
            max: 10,
            value: this.item && this.item.requirements ? this.item.requirements.minServants : 0
          },
          {
            id: 'minPioneers',
            label: 'Min Pioneers',
            type: 'number',
            min: 0,
            max: 10,
            value: this.item && this.item.requirements ? this.item.requirements.minPioneers : 0
          },
          {
            id: 'minLeaders',
            label: 'Min Leaders',
            type: 'number',
            min: 0,
            max: 5,
            value: this.item && this.item.requirements ? this.item.requirements.minLeaders : 1
          },
          {
            id: 'minHelpers',
            label: 'Min Helpers',
            type: 'number',
            min: 0,
            max: 5,
            value: this.item && this.item.requirements ? this.item.requirements.minHelpers : 1
          },
          {
            id: 'minPublishers',
            label: 'Min Publishers',
            type: 'number',
            min: 0,
            max: 10,
            value: this.item && this.item.requirements ? this.item.requirements.minPublishers : 0
          }
        ]
      }
    ];
  }
  
  /**
   * Set up fields for family form
   */
  setupFamilyFields() {
    this.fields = [
      {
        id: 'name',
        label: 'Family Name',
        type: 'text',
        required: true,
        value: this.item ? this.item.name : 'New Family',
        placeholder: 'Enter family name',
        validator: value => value.trim().length > 0 ? null : 'Name is required'
      },
      {
        id: 'color',
        label: 'Family Color',
        type: 'color',
        required: true,
        value: this.item ? this.item.color : this.generateRandomColor()
      },
      {
        id: 'headId',
        label: 'Family Head',
        type: 'select',
        required: true,
        value: this.item ? this.item.headId : '',
        options: this.getPersonOptions('head'),
        placeholder: 'Select family head',
        validator: value => value ? null : 'Family head is required'
      },
      {
        id: 'spouseId',
        label: 'Spouse',
        type: 'select',
        required: false,
        value: this.item ? this.item.spouseId : '',
        options: this.getPersonOptions('spouse'),
        placeholder: 'Select spouse (optional)',
        clearable: true
      },
      {
        id: 'childrenIds',
        label: 'Children',
        type: 'multiSelect',
        value: this.item ? this.item.childrenIds : [],
        options: this.getPersonOptions('child'),
        placeholder: 'Select children (optional)'
      }
    ];
  }
  
  /**
   * Get group options for select fields
   * @returns {Array} Group options
   */
  getGroupOptions() {
    // This should be replaced with actual group data from a cache
    return [
      { value: '', label: 'No Group' }
      // Additional groups would be loaded here
    ];
  }
  
  /**
   * Get person options for select fields
   * @param {string} role - Role filter ('head', 'spouse', 'child', or null for all)
   * @returns {Array} Person options
   */
  getPersonOptions(role = null) {
    // This should be replaced with actual person data from a cache
    return [
      { value: '', label: role === 'head' ? 'Select Family Head' : 'Select Person' }
      // Additional people would be loaded here
    ];
  }
  
  /**
   * Generate a random color
   * @returns {string} Random hex color
   */
  generateRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }
  
  /**
   * Render the form UI
   */
  render() {
    // Clear the container
    this.container.innerHTML = '';
    
    // Create form element
    const form = document.createElement('form');
    form.className = 'edit-form';
    form.setAttribute('novalidate', 'true');
    
    // Add title
    const title = document.createElement('h3');
    title.className = 'form-title';
    title.textContent = this.getFormTitle();
    form.appendChild(title);
    
    // Render fields
    this.renderFields(form);
    
    // Add buttons
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'form-button-group';
    
    // Save button
    const saveButton = document.createElement('button');
    saveButton.type = this.options.preventSubmit ? 'button' : 'submit';
    saveButton.className = 'save-button primary-button';
    saveButton.textContent = 'Save';
    saveButton.setAttribute('data-action', 'save');
    buttonGroup.appendChild(saveButton);
    
    // Cancel button
    if (this.options.showCancelButton) {
      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'cancel-button secondary-button';
      cancelButton.textContent = 'Cancel';
      cancelButton.setAttribute('data-action', 'cancel');
      buttonGroup.appendChild(cancelButton);
    }
    
    // Add any additional buttons based on entity type
    this.addAdditionalButtons(buttonGroup);
    
    form.appendChild(buttonGroup);
    
    // Add form to container
    this.container.appendChild(form);
    
    // Set up event listeners
    this.setupEventListeners(form);
    
    // Initial validation
    this.validate();
  }
  
  /**
   * Get form title based on mode and item type
   * @returns {string} Form title
   */
  getFormTitle() {
    const action = this.options.mode === FormMode.CREATE ? 'Add' : 'Edit';
    const itemType = this.options.itemType.charAt(0).toUpperCase() + this.options.itemType.slice(1);
    return `${action} ${itemType}`;
  }
  
  /**
   * Render form fields
   * @param {HTMLElement} form - Form element
   */
  renderFields(form) {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'form-fieldset';
    
    this.fields.forEach(field => {
      this.renderField(fieldset, field);
    });
    
    form.appendChild(fieldset);
  }
  
  /**
   * Render a form field
   * @param {HTMLElement} container - Container element
   * @param {Object} field - Field configuration
   */
  renderField(container, field) {
    // Skip rendering for hidden fields
    if (field.type === 'hidden') {
      const hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.id = field.id;
      hiddenInput.name = field.id;
      hiddenInput.value = field.value || '';
      container.appendChild(hiddenInput);
      return;
    }
    
    // For form sections, render as a group
    if (field.type === 'formSection') {
      const sectionContainer = document.createElement('div');
      sectionContainer.className = 'form-section';
      
      const sectionLabel = document.createElement('h4');
      sectionLabel.className = 'section-label';
      sectionLabel.textContent = field.label;
      sectionContainer.appendChild(sectionLabel);
      
      // Render section fields
      if (field.fields && field.fields.length > 0) {
        field.fields.forEach(subField => {
          this.renderField(sectionContainer, subField);
        });
      }
      
      container.appendChild(sectionContainer);
      return;
    }
    
    // Create field container
    const fieldContainer = document.createElement('div');
    fieldContainer.className = `form-field field-${field.type}`;
    
    // Add required indicator
    if (field.required) {
      fieldContainer.classList.add('required');
    }
    
    // Create label (except for checkbox groups which have individual labels)
    if (field.type !== 'checkboxGroup') {
      const label = document.createElement('label');
      label.setAttribute('for', field.id);
      label.className = 'field-label';
      label.textContent = field.label;
      
      if (field.required) {
        const requiredMark = document.createElement('span');
        requiredMark.className = 'required-mark';
        requiredMark.textContent = '*';
        label.appendChild(requiredMark);
      }
      
      fieldContainer.appendChild(label);
    }
    
    // Create input element based on type
    let inputElement;
    
    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
      case 'tel':
      case 'url':
      case 'number':
        inputElement = document.createElement('input');
        inputElement.type = field.type;
        inputElement.id = field.id;
        inputElement.name = field.id;
        inputElement.className = 'form-input';
        inputElement.value = field.value || '';
        
        if (field.placeholder) {
          inputElement.placeholder = field.placeholder;
        }
        
        if (field.min !== undefined) {
          inputElement.min = field.min;
        }
        
        if (field.max !== undefined) {
          inputElement.max = field.max;
        }
        
        if (field.step !== undefined) {
          inputElement.step = field.step;
        }
        
        if (field.pattern) {
          inputElement.pattern = field.pattern;
        }
        
        inputElement.required = field.required;
        break;
        
      case 'textarea':
        inputElement = document.createElement('textarea');
        inputElement.id = field.id;
        inputElement.name = field.id;
        inputElement.className = 'form-textarea';
        inputElement.value = field.value || '';
        
        if (field.placeholder) {
          inputElement.placeholder = field.placeholder;
        }
        
        if (field.rows) {
          inputElement.rows = field.rows;
        }
        
        inputElement.required = field.required;
        break;
        
      case 'select':
        inputElement = document.createElement('select');
        inputElement.id = field.id;
        inputElement.name = field.id;
        inputElement.className = 'form-select';
        
        // Add options
        if (field.options && field.options.length > 0) {
          field.options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            
            // Set selected option
            if (field.value !== undefined && field.value === option.value) {
              optionElement.selected = true;
            }
            
            inputElement.appendChild(optionElement);
          });
        }
        
        inputElement.required = field.required;
        break;
        
      case 'multiSelect':
        // Using a regular select with multiple attribute for simplicity
        // In a real app, you might want a more sophisticated component
        inputElement = document.createElement('select');
        inputElement.id = field.id;
        inputElement.name = field.id;
        inputElement.className = 'form-multi-select';
        inputElement.multiple = true;
        
        // Add options
        if (field.options && field.options.length > 0) {
          field.options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            
            // Set selected options
            if (field.value && Array.isArray(field.value) && field.value.includes(option.value)) {
              optionElement.selected = true;
            }
            
            inputElement.appendChild(optionElement);
          });
        }
        
        inputElement.required = field.required;
        break;
        
      case 'checkbox':
        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'checkbox-container';
        
        inputElement = document.createElement('input');
        inputElement.type = 'checkbox';
        inputElement.id = field.id;
        inputElement.name = field.id;
        inputElement.className = 'form-checkbox';
        inputElement.checked = field.value || false;
        
        const checkboxLabel = document.createElement('label');
        checkboxLabel.setAttribute('for', field.id);
        checkboxLabel.className = 'checkbox-label';
        checkboxLabel.textContent = field.label;
        
        checkboxContainer.appendChild(inputElement);
        checkboxContainer.appendChild(checkboxLabel);
        fieldContainer.innerHTML = ''; // Clear the container
        fieldContainer.appendChild(checkboxContainer);
        break;
        
      case 'checkboxGroup':
        const groupContainer = document.createElement('div');
        groupContainer.className = 'checkbox-group-container';
        
        // Add group label
        const groupLabel = document.createElement('label');
        groupLabel.className = 'field-label';
        groupLabel.textContent = field.label;
        groupContainer.appendChild(groupLabel);
        
        // Add checkboxes
        const checkboxesContainer = document.createElement('div');
        checkboxesContainer.className = 'checkboxes-container';
        
        if (field.options && field.options.length > 0) {
          field.options.forEach(option => {
            const checkboxItem = document.createElement('div');
            checkboxItem.className = 'checkbox-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `${field.id}-${option.id}`;
            checkbox.name = `${field.id}-${option.id}`;
            checkbox.className = 'form-checkbox';
            checkbox.setAttribute('data-group', field.id);
            checkbox.setAttribute('data-option', option.id);
            
            // Set checked state
            if (field.value && field.value[option.id]) {
              checkbox.checked = true;
            }
            
            const checkboxLabel = document.createElement('label');
            checkboxLabel.setAttribute('for', `${field.id}-${option.id}`);
            checkboxLabel.className = 'checkbox-label';
            checkboxLabel.textContent = option.label;
            
            checkboxItem.appendChild(checkbox);
            checkboxItem.appendChild(checkboxLabel);
            checkboxesContainer.appendChild(checkboxItem);
          });
        }
        
        groupContainer.appendChild(checkboxesContainer);
        fieldContainer.innerHTML = ''; // Clear the container
        fieldContainer.appendChild(groupContainer);
        break;
        
      case 'radio':
        const radioContainer = document.createElement('div');
        radioContainer.className = 'radio-container';
        
        // Add radio options
        if (field.options && field.options.length > 0) {
          field.options.forEach(option => {
            const radioItem = document.createElement('div');
            radioItem.className = 'radio-item';
            
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.id = `${field.id}-${option.value}`;
            radio.name = field.id;
            radio.value = option.value;
            radio.className = 'form-radio';
            
            // Set checked state
            if (field.value !== undefined && field.value === option.value) {
              radio.checked = true;
            }
            
            const radioLabel = document.createElement('label');
            radioLabel.setAttribute('for', `${field.id}-${option.value}`);
            radioLabel.className = 'radio-label';
            radioLabel.textContent = option.label;
            
            radioItem.appendChild(radio);
            radioItem.appendChild(radioLabel);
            radioContainer.appendChild(radioItem);
          });
        }
        
        fieldContainer.appendChild(radioContainer);
        break;
        
      case 'color':
        inputElement = document.createElement('input');
        inputElement.type = 'color';
        inputElement.id = field.id;
        inputElement.name = field.id;
        inputElement.className = 'form-color';
        inputElement.value = field.value || '#000000';
        break;
        
      case 'location':
        // This would be a custom location picker in a real app
        // For now, just use a disabled input with a "Pick Location" button
        const locationContainer = document.createElement('div');
        locationContainer.className = 'location-container';
        
        const locationDisplay = document.createElement('input');
        locationDisplay.type = 'text';
        locationDisplay.className = 'location-display';
        locationDisplay.value = field.value ? 
          `Lat: ${field.value.lat.toFixed(6)}, Lng: ${field.value.lng.toFixed(6)}` : 
          'No location selected';
        locationDisplay.readOnly = true;
        
        const locationButton = document.createElement('button');
        locationButton.type = 'button';
        locationButton.className = 'location-button';
        locationButton.textContent = field.value ? 'Change Location' : 'Pick Location';
        locationButton.setAttribute('data-field-id', field.id);
        
        // Hidden inputs for the actual values
        const latInput = document.createElement('input');
        latInput.type = 'hidden';
        latInput.id = `${field.id}-lat`;
        latInput.name = `${field.id}-lat`;
        latInput.value = field.value ? field.value.lat : '';
        
        const lngInput = document.createElement('input');
        lngInput.type = 'hidden';
        lngInput.id = `${field.id}-lng`;
        lngInput.name = `${field.id}-lng`;
        lngInput.value = field.value ? field.value.lng : '';
        
        locationContainer.appendChild(locationDisplay);
        locationContainer.appendChild(locationButton);
        locationContainer.appendChild(latInput);
        locationContainer.appendChild(lngInput);
        
        fieldContainer.appendChild(locationContainer);
        break;
        
      default:
        // For unsupported field types, create a simple text input
        inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.id = field.id;
        inputElement.name = field.id;
        inputElement.className = 'form-input';
        inputElement.value = field.value || '';
        break;
    }
    
    // Add input element to container (if not already added)
    if (
      inputElement && 
      field.type !== 'checkbox' && 
      field.type !== 'checkboxGroup' && 
      field.type !== 'radio' &&
      field.type !== 'location'
    ) {
      fieldContainer.appendChild(inputElement);
    }
    
    // Add error message container
    const errorContainer = document.createElement('div');
    errorContainer.className = 'field-error';
    errorContainer.id = `${field.id}-error`;
    fieldContainer.appendChild(errorContainer);
    
    // Add field to form
    container.appendChild(fieldContainer);
  }
  
  /**
   * Add additional buttons based on entity type
   * @param {HTMLElement} buttonGroup - Button group element
   */
  addAdditionalButtons(buttonGroup) {
    // Add entity-specific buttons
    switch (this.options.itemType) {
      case ItemType.PERSON:
        // Only add additional buttons in edit mode
        if (this.options.mode === FormMode.EDIT && this.item) {
          const travelButton = document.createElement('button');
          travelButton.type = 'button';
          travelButton.className = 'travel-button secondary-button';
          travelButton.textContent = 'Show Travel Times';
          travelButton.setAttribute('data-action', 'travel');
          buttonGroup.appendChild(travelButton);
        }
        break;
        
      case ItemType.GROUP:
        // Only add additional buttons in edit mode
        if (this.options.mode === FormMode.EDIT && this.item) {
          const viewMembersButton = document.createElement('button');
          viewMembersButton.type = 'button';
          viewMembersButton.className = 'view-members-button secondary-button';
          viewMembersButton.textContent = 'View Members';
          viewMembersButton.setAttribute('data-action', 'view-members');
          buttonGroup.appendChild(viewMembersButton);
        }
        break;
        
      case ItemType.FAMILY:
        // Only add additional buttons in edit mode
        if (this.options.mode === FormMode.EDIT && this.item) {
          const viewFamilyButton = document.createElement('button');
          viewFamilyButton.type = 'button';
          viewFamilyButton.className = 'view-family-button secondary-button';
          viewFamilyButton.textContent = 'View Family';
          viewFamilyButton.setAttribute('data-action', 'view-family');
          buttonGroup.appendChild(viewFamilyButton);
        }
        break;
    }
  }
  
  /**
   * Set up event listeners for the form
   * @param {HTMLElement} form - Form element
   */
  setupEventListeners(form) {
    // Form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Validate form
      if (this.validate()) {
        // Get form data
        const formData = this.getFormData();
        
        // Publish save event
        const eventName = this.options.mode === FormMode.CREATE ?
          Events[`CREATE_${this.options.itemType.toUpperCase()}`] :
          Events[`UPDATE_${this.options.itemType.toUpperCase()}`];
        
        EventBus.publish(eventName, formData);
      }
    });
    
    // Button clicks
    form.addEventListener('click', (e) => {
      const target = e.target;
      
      if (target.tagName === 'BUTTON') {
        const action = target.getAttribute('data-action');
        
        switch (action) {
          case 'save':
            if (this.options.preventSubmit) {
              // Validate form
              if (this.validate()) {
                // Get form data
                const formData = this.getFormData();
                
                // Publish save event
                const eventName = this.options.mode === FormMode.CREATE ?
                  Events[`CREATE_${this.options.itemType.toUpperCase()}`] :
                  Events[`UPDATE_${this.options.itemType.toUpperCase()}`];
                
                EventBus.publish(eventName, formData);
              }
            }
            break;
            
          case 'cancel':
            // Publish cancel event
            EventBus.publish(Events.FORM_CANCELLED, {
              itemType: this.options.itemType,
              mode: this.options.mode
            });
            break;
            
          case 'travel':
            // Publish travel event
            EventBus.publish(Events.SHOW_TRAVEL_TIMES, this.item);
            break;
            
          case 'view-members':
            // Publish view members event
            EventBus.publish(Events.VIEW_GROUP_MEMBERS, this.item);
            break;
            
          case 'view-family':
            // Publish view family event
            EventBus.publish(Events.VIEW_FAMILY, this.item);
            break;
        }
      }
    });
    
    // Location button clicks
    const locationButtons = form.querySelectorAll('.location-button');
    locationButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const fieldId = e.target.getAttribute('data-field-id');
        
        // Get current location value
        const latInput = form.querySelector(`#${fieldId}-lat`);
        const lngInput = form.querySelector(`#${fieldId}-lng`);
        
        const currentLocation = latInput.value && lngInput.value ?
          { lat: parseFloat(latInput.value), lng: parseFloat(lngInput.value) } :
          null;
        
        // Publish event to open location picker
        EventBus.publish(Events.OPEN_LOCATION_PICKER, {
          fieldId,
          currentLocation,
          callback: (location) => {
            if (location) {
              // Update hidden inputs
              latInput.value = location.lat;
              lngInput.value = location.lng;
              
              // Update display
              const locationDisplay = form.querySelector(`#${fieldId}`).parentNode.querySelector('.location-display');
              locationDisplay.value = `Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}`;
              
              // Update button text
              button.textContent = 'Change Location';
              
              // Validate the field
              this.validateField({
                id: fieldId,
                value: location,
                required: true,
                validator: value => value && value.lat && value.lng ? null : 'Location is required'
              });
            }
          }
        });
      });
    });
    
    // Change event for inputs
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('change', (e) => {
        // For checkbox group, get all values
        if (input.type === 'checkbox' && input.getAttribute('data-group')) {
          const groupId = input.getAttribute('data-group');
          const field = this.fields.find(f => f.id === groupId);
          
          if (field) {
            this.validateField(field);
          }
        } else {
          // Find the field
          const field = this.fields.find(f => f.id === input.name);
          
          if (field && this.options.validateOnChange) {
            this.validateField(field);
          }
        }
      });
      
      // Input event for text inputs
      if (
        input.type === 'text' || 
        input.type === 'email' || 
        input.type === 'password' || 
        input.type === 'tel' || 
        input.type === 'url' || 
        input.type === 'number' ||
        input.tagName === 'TEXTAREA'
      ) {
        input.addEventListener('input', (e) => {
          const field = this.fields.find(f => f.id === input.name);
          
          if (field && this.options.validateOnChange) {
            this.validateField(field);
          }
        });
      }
    });
  }
  
  /**
   * Validate the entire form
   * @returns {boolean} Whether the form is valid
   */
  validate() {
    this.isValid = true;
    this.errors.clear();
    
    // Validate each field
    this.fields.forEach(field => {
      this.validateField(field);
    });
    
    return this.isValid;
  }
  
  /**
   * Validate a single field
   * @param {Object} field - Field configuration
   * @returns {boolean} Whether the field is valid
   */
  validateField(field) {
    // Skip validation for non-input fields
    if (field.type === 'formSection') {
      let sectionValid = true;
      
      // Validate section fields
      if (field.fields && field.fields.length > 0) {
        field.fields.forEach(subField => {
          const fieldValid = this.validateField(subField);
          sectionValid = sectionValid && fieldValid;
        });
      }
      
      return sectionValid;
    }
    
    // Skip hidden fields
    if (field.type === 'hidden') {
      return true;
    }
    
    // Get field value
    const value = this.getFieldValue(field);
    
    // Check required fields
    if (field.required && this.isEmpty(value)) {
      this.setFieldError(field.id, `${field.label} is required`);
      return false;
    }
    
    // Apply custom validator if provided
    if (field.validator && !this.isEmpty(value)) {
      const error = field.validator(value);
      
      if (error) {
        this.setFieldError(field.id, error);
        return false;
      }
    }
    
    // Field is valid
    this.clearFieldError(field.id);
    return true;
  }
  
  /**
   * Get a field's current value
   * @param {Object} field - Field configuration
   * @returns {*} Field value
   */
  getFieldValue(field) {
    // For checkbox groups, collect all checked values
    if (field.type === 'checkboxGroup') {
      const values = {};
      
      const checkboxes = this.container.querySelectorAll(`input[data-group="${field.id}"]`);
      checkboxes.forEach(checkbox => {
        const optionId = checkbox.getAttribute('data-option');
        values[optionId] = checkbox.checked;
      });
      
      return values;
    }
    
    // For location fields, get lat/lng from hidden inputs
    if (field.type === 'location') {
      const latInput = this.container.querySelector(`#${field.id}-lat`);
      const lngInput = this.container.querySelector(`#${field.id}-lng`);
      
      if (latInput && lngInput && latInput.value && lngInput.value) {
        return {
          lat: parseFloat(latInput.value),
          lng: parseFloat(lngInput.value)
        };
      }
      
      return null;
    }
    
    // For standard inputs
    const input = this.container.querySelector(`#${field.id}`);
    
    if (!input) {
      return field.value;
    }
    
    // Get value based on input type
    switch (input.type) {
      case 'checkbox':
        return input.checked;
        
      case 'number':
        return input.value !== '' ? parseFloat(input.value) : null;
        
      default:
        return input.value;
    }
  }
  
  /**
   * Set an error message for a field
   * @param {string} fieldId - Field ID
   * @param {string} message - Error message
   */
  setFieldError(fieldId, message) {
    // Update error state
    this.errors.set(fieldId, message);
    this.isValid = false;
    
    // Update UI
    const errorContainer = this.container.querySelector(`#${fieldId}-error`);
    if (errorContainer) {
      errorContainer.textContent = message;
      errorContainer.classList.add('visible');
    }
    
    // Add error class to field
    const fieldContainer = this.container.querySelector(`#${fieldId}`).closest('.form-field');
    if (fieldContainer) {
      fieldContainer.classList.add('has-error');
    }
  }
  
  /**
   * Clear error message for a field
   * @param {string} fieldId - Field ID
   */
  clearFieldError(fieldId) {
    // Update error state
    this.errors.delete(fieldId);
    
    // Update UI
    const errorContainer = this.container.querySelector(`#${fieldId}-error`);
    if (errorContainer) {
      errorContainer.textContent = '';
      errorContainer.classList.remove('visible');
    }
    
    // Remove error class from field
    const fieldContainer = this.container.querySelector(`#${fieldId}`).closest('.form-field');
    if (fieldContainer) {
      fieldContainer.classList.remove('has-error');
    }
  }
  
  /**
   * Check if a value is empty
   * @param {*} value - Value to check
   * @returns {boolean} Whether the value is empty
   */
  isEmpty(value) {
    if (value === null || value === undefined) {
      return true;
    }
    
    if (typeof value === 'string') {
      return value.trim() === '';
    }
    
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    
    if (typeof value === 'object') {
      if (value.lat !== undefined && value.lng !== undefined) {
        return value.lat === null || value.lng === null;
      }
      
      return Object.keys(value).length === 0;
    }
    
    return false;
  }
  
  /**
   * Get form data from all fields
   * @returns {Object} Form data
   */
  getFormData() {
    const formData = {
      id: this.item ? this.item.id : null
    };
    
    // Collect data from all fields
    this.fields.forEach(field => {
      if (field.type === 'formSection') {
        // For form sections, create a nested object
        formData[field.id] = {};
        
        field.fields.forEach(subField => {
          formData[field.id][subField.id] = this.getFieldValue(subField);
        });
      } else {
        formData[field.id] = this.getFieldValue(field);
      }
    });
    
    return formData;
  }
  
  /**
   * Factory method to create an EditForm instance
   * @param {HTMLElement} container - Container element
   * @param {Object} options - Configuration options
   * @returns {EditForm} New EditForm instance
   */
  static create(container, options = {}) {
    return new EditForm(container, options);
  }
}

export default EditForm;