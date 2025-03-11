/**
 * Form.js
 * Reusable form component for data entry
 */

import { EventBus, Events } from '../../app/EventBus';

/**
 * Field types supported by the form
 * @enum {string}
 */
export const FieldType = {
  TEXT: 'text',
  NUMBER: 'number',
  EMAIL: 'email',
  PASSWORD: 'password',
  TEXTAREA: 'textarea',
  SELECT: 'select',
  CHECKBOX: 'checkbox',
  RADIO: 'radio',
  COLOR: 'color',
  DATE: 'date',
  TIME: 'time',
  FILE: 'file',
  HIDDEN: 'hidden'
};

/**
 * Form class for building and managing forms
 */
class Form {
  /**
   * Create a new Form instance
   * @param {HTMLElement} container - Container element to render the form in
   * @param {Object} options - Configuration options
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      id: `form-${Date.now()}`,
      fields: [],
      values: {},
      labelPosition: 'top', // 'top', 'left', 'right'
      submitLabel: 'Submit',
      cancelLabel: 'Cancel',
      showButtons: true,
      validateOnChange: true,
      onSubmit: null,
      onCancel: null,
      onChange: null,
      ...options
    };
    
    // Form state
    this.values = { ...this.options.values };
    this.errors = {};
    this.formElement = null;
    
    // Render the form
    this.render();
  }
  
  /**
   * Render the form UI
   */
  render() {
    // Create form element
    this.formElement = document.createElement('form');
    this.formElement.id = this.options.id;
    this.formElement.className = `form ${this.options.labelPosition}-labels`;
    this.formElement.noValidate = true; // We'll handle validation ourselves
    
    // Prevent form submission
    this.formElement.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submit();
    });
    
    // Add fields
    this.options.fields.forEach(field => {
      const fieldElement = this.createField(field);
      this.formElement.appendChild(fieldElement);
    });
    
    // Add buttons if required
    if (this.options.showButtons) {
      const buttonsContainer = document.createElement('div');
      buttonsContainer.className = 'form-buttons';
      
      // Cancel button
      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'secondary-button';
      cancelButton.textContent = this.options.cancelLabel;
      cancelButton.addEventListener('click', () => this.cancel());
      
      // Submit button
      const submitButton = document.createElement('button');
      submitButton.type = 'submit';
      submitButton.className = 'primary-button';
      submitButton.textContent = this.options.submitLabel;
      
      // Add buttons to container
      buttonsContainer.appendChild(cancelButton);
      buttonsContainer.appendChild(submitButton);
      
      this.formElement.appendChild(buttonsContainer);
    }
    
    // Clear container and add form
    this.container.innerHTML = '';
    this.container.appendChild(this.formElement);
  }
  
  /**
   * Create a form field element
   * @param {Object} field - Field configuration
   * @returns {HTMLElement} Field element
   */
  createField(field) {
    const fieldContainer = document.createElement('div');
    fieldContainer.className = `form-field ${field.type}-field ${field.className || ''}`;
    
    if (field.hidden) {
      fieldContainer.style.display = 'none';
    }
    
    // Create field wrapper with appropriate layout
    const wrapper = document.createElement('div');
    wrapper.className = 'field-wrapper';
    
    // Create label for all field types except hidden
    if (field.type !== FieldType.HIDDEN) {
      const label = document.createElement('label');
      label.htmlFor = `${this.options.id}-${field.name}`;
      label.className = 'field-label';
      label.textContent = field.label || field.name;
      
      if (field.required) {
        label.classList.add('required');
        const requiredMark = document.createElement('span');
        requiredMark.className = 'required-mark';
        requiredMark.textContent = '*';
        label.appendChild(requiredMark);
      }
      
      wrapper.appendChild(label);
    }
    
    // Create input based on field type
    let input;
    
    switch (field.type) {
      case FieldType.TEXTAREA:
        input = document.createElement('textarea');
        input.rows = field.rows || 3;
        input.cols = field.cols || 30;
        break;
        
      case FieldType.SELECT:
        input = document.createElement('select');
        
        // Add options
        if (Array.isArray(field.options)) {
          field.options.forEach(option => {
            const optionElement = document.createElement('option');
            
            if (typeof option === 'object') {
              optionElement.value = option.value;
              optionElement.textContent = option.label;
              optionElement.disabled = option.disabled || false;
            } else {
              optionElement.value = option;
              optionElement.textContent = option;
            }
            
            input.appendChild(optionElement);
          });
        }
        break;
        
      case FieldType.CHECKBOX:
        input = document.createElement('input');
        input.type = 'checkbox';
        
        // Handle boolean values
        if (this.values[field.name] === true) {
          input.checked = true;
        }
        
        // Switch label and input for checkbox
        if (this.options.labelPosition !== 'right') {
          wrapper.innerHTML = '';
          
          const checkboxWrapper = document.createElement('div');
          checkboxWrapper.className = 'checkbox-wrapper';
          
          checkboxWrapper.appendChild(input);
          
          const label = document.createElement('label');
          label.htmlFor = `${this.options.id}-${field.name}`;
          label.textContent = field.label || field.name;
          checkboxWrapper.appendChild(label);
          
          wrapper.appendChild(checkboxWrapper);
        }
        break;
        
      case FieldType.RADIO:
        // Create radio group
        const radioGroup = document.createElement('div');
        radioGroup.className = 'radio-group';
        
        if (Array.isArray(field.options)) {
          field.options.forEach((option, index) => {
            const radioLabel = document.createElement('label');
            radioLabel.className = 'radio-label';
            
            const radioInput = document.createElement('input');
            radioInput.type = 'radio';
            radioInput.name = field.name;
            
            if (typeof option === 'object') {
              radioInput.value = option.value;
              radioLabel.textContent = option.label;
              radioInput.disabled = option.disabled || false;
              
              // Check if this option is selected
              if (this.values[field.name] === option.value) {
                radioInput.checked = true;
              }
            } else {
              radioInput.value = option;
              radioLabel.textContent = option;
              
              // Check if this option is selected
              if (this.values[field.name] === option) {
                radioInput.checked = true;
              }
            }
            
            // Give first radio the ID for the main label
            if (index === 0) {
              radioInput.id = `${this.options.id}-${field.name}`;
            } else {
              radioInput.id = `${this.options.id}-${field.name}-${index}`;
            }
            
            // Add change listener
            radioInput.addEventListener('change', (e) => {
              this.handleInputChange(field, e.target.value);
            });
            
            radioLabel.prepend(radioInput);
            radioGroup.appendChild(radioLabel);
          });
        }
        
        wrapper.appendChild(radioGroup);
        
        // Use the radio group as the input element for validation
        input = radioGroup;
        break;
        
      default:
        // Default to text input
        input = document.createElement('input');
        input.type = field.type || 'text';
    }
    
    // Set common attributes
    if (field.type !== FieldType.RADIO) {
      input.id = `${this.options.id}-${field.name}`;
      input.name = field.name;
      
      // Set value if available
      if (this.values[field.name] !== undefined && field.type !== FieldType.CHECKBOX) {
        input.value = this.values[field.name];
      }
      
      // Set additional attributes from field config
      if (field.placeholder) input.placeholder = field.placeholder;
      if (field.disabled) input.disabled = field.disabled;
      if (field.readonly) input.readOnly = field.readonly;
      if (field.autocomplete) input.autocomplete = field.autocomplete;
      if (field.min !== undefined) input.min = field.min;
      if (field.max !== undefined) input.max = field.max;
      if (field.step !== undefined) input.step = field.step;
      if (field.pattern) input.pattern = field.pattern;
      if (field.maxLength) input.maxLength = field.maxLength;
      if (field.minLength) input.minLength = field.minLength;
      
      // Add change listener
      input.addEventListener('change', (e) => {
        let value = e.target.value;
        
        // Handle special input types
        if (field.type === FieldType.CHECKBOX) {
          value = e.target.checked;
        } else if (field.type === FieldType.NUMBER) {
          value = value === '' ? null : Number(value);
        }
        
        this.handleInputChange(field, value);
      });
      
      // Add input listener for real-time validation if enabled
      if (this.options.validateOnChange) {
        input.addEventListener('input', (e) => {
          this.validateField(field, e.target.value);
        });
      }
      
      // Add to wrapper
      if (field.type !== FieldType.CHECKBOX || this.options.labelPosition === 'right') {
        wrapper.appendChild(input);
      }
    }
    
    // Add description if provided
    if (field.description) {
      const description = document.createElement('div');
      description.className = 'field-description';
      description.textContent = field.description;
      wrapper.appendChild(description);
    }
    
    // Add error message container
    const errorContainer = document.createElement('div');
    errorContainer.className = 'field-error';
    errorContainer.id = `${this.options.id}-${field.name}-error`;
    wrapper.appendChild(errorContainer);
    
    fieldContainer.appendChild(wrapper);
    return fieldContainer;
  }
  
  /**
   * Handle input change
   * @param {Object} field - Field configuration
   * @param {*} value - New value
   */
  handleInputChange(field, value) {
    // Update value
    this.values[field.name] = value;
    
    // Validate if enabled
    if (this.options.validateOnChange) {
      this.validateField(field, value);
    }
    
    // Call onChange callback if provided
    if (typeof this.options.onChange === 'function') {
      this.options.onChange(field.name, value, this.values);
    }
    
    // Publish event
    EventBus.publish(Events.FORM_VALUE_CHANGED, {
      form: this.options.id,
      field: field.name,
      value: value,
      values: this.values
    });
  }
  
  /**
   * Validate a field
   * @param {Object} field - Field configuration
   * @param {*} value - Value to validate
   * @returns {boolean} Whether the field is valid
   */
  validateField(field, value) {
    // Skip validation if the field is disabled
    if (field.disabled) {
      delete this.errors[field.name];
      return true;
    }
    
    // Get the value
    value = value !== undefined ? value : this.values[field.name];
    
    // Reset error
    delete this.errors[field.name];
    
    // Required validation
    if (field.required && 
        (value === undefined || value === null || value === '')) {
      this.errors[field.name] = field.requiredMessage || 'This field is required';
    }
    
    // Min/max validation for numbers
    if (field.type === FieldType.NUMBER && value !== null && value !== '') {
      if (field.min !== undefined && value < field.min) {
        this.errors[field.name] = `Value must be at least ${field.min}`;
      }
      
      if (field.max !== undefined && value > field.max) {
        this.errors[field.name] = `Value must be at most ${field.max}`;
      }
    }
    
    // Min/max length validation for text
    if ((field.type === FieldType.TEXT || field.type === FieldType.TEXTAREA) && 
        value !== null && value !== undefined) {
      if (field.minLength && value.length < field.minLength) {
        this.errors[field.name] = `Must be at least ${field.minLength} characters`;
      }
      
      if (field.maxLength && value.length > field.maxLength) {
        this.errors[field.name] = `Must be at most ${field.maxLength} characters`;
      }
    }
    
    // Pattern validation
    if (field.pattern && typeof value === 'string' && value !== '') {
      const regex = new RegExp(field.pattern);
      if (!regex.test(value)) {
        this.errors[field.name] = field.patternMessage || 'Invalid format';
      }
    }
    
    // Email validation
    if (field.type === FieldType.EMAIL && value !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        this.errors[field.name] = 'Please enter a valid email address';
      }
    }
    
    // Custom validation
    if (field.validate && typeof field.validate === 'function') {
      const customError = field.validate(value, this.values);
      if (customError) {
        this.errors[field.name] = customError;
      }
    }
    
    // Update UI
    this.updateFieldError(field.name);
    
    return !this.errors[field.name];
  }
  
  /**
   * Update field error display
   * @param {string} fieldName - Field name
   */
  updateFieldError(fieldName) {
    const errorContainer = document.getElementById(`${this.options.id}-${fieldName}-error`);
    if (!errorContainer) return;
    
    const error = this.errors[fieldName];
    
    if (error) {
      errorContainer.textContent = error;
      errorContainer.style.display = 'block';
      
      // Add error class to the field
      const input = document.getElementById(`${this.options.id}-${fieldName}`);
      if (input) {
        input.classList.add('has-error');
      }
    } else {
      errorContainer.textContent = '';
      errorContainer.style.display = 'none';
      
      // Remove error class from the field
      const input = document.getElementById(`${this.options.id}-${fieldName}`);
      if (input) {
        input.classList.remove('has-error');
      }
    }
  }
  
  /**
   * Validate all fields
   * @returns {boolean} Whether the form is valid
   */
  validate() {
    // Reset errors
    this.errors = {};
    
    // Validate each field
    let isValid = true;
    
    this.options.fields.forEach(field => {
      const fieldValid = this.validateField(field);
      if (!fieldValid) {
        isValid = false;
      }
    });
    
    // Scroll to first error if any
    if (!isValid) {
      const firstErrorField = this.options.fields.find(field => this.errors[field.name]);
      if (firstErrorField) {
        const input = document.getElementById(`${this.options.id}-${firstErrorField.name}`);
        if (input) {
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          input.focus();
        }
      }
    }
    
    return isValid;
  }
  
  /**
   * Submit the form
   */
  submit() {
    // Validate all fields
    const isValid = this.validate();
    
    if (isValid) {
      // Call onSubmit callback if provided
      if (typeof this.options.onSubmit === 'function') {
        this.options.onSubmit(this.values);
      }
      
      // Publish event
      EventBus.publish(Events.FORM_SUBMITTED, {
        form: this.options.id,
        values: this.values
      });
    } else {
      // Publish validation error event
      EventBus.publish(Events.FORM_VALIDATION_ERROR, {
        form: this.options.id,
        errors: this.errors
      });
    }
  }
  
  /**
   * Cancel the form
   */
  cancel() {
    // Call onCancel callback if provided
    if (typeof this.options.onCancel === 'function') {
      this.options.onCancel();
    }
    
    // Publish event
    EventBus.publish(Events.FORM_CANCELLED, {
      form: this.options.id
    });
  }
  
  /**
   * Set field value
   * @param {string} fieldName - Field name
   * @param {*} value - Field value
   * @returns {Form} This form instance for chaining
   */
  setValue(fieldName, value) {
    // Update internal value
    this.values[fieldName] = value;
    
    // Update field in the DOM
    const input = document.getElementById(`${this.options.id}-${fieldName}`);
    if (input) {
      if (input.type === 'checkbox') {
        input.checked = Boolean(value);
      } else {
        input.value = value === null || value === undefined ? '' : value;
      }
    }
    
    // Handle radio buttons
    if (input && input.classList.contains('radio-group')) {
      const radioInput = input.querySelector(`input[value="${value}"]`);
      if (radioInput) {
        radioInput.checked = true;
      }
    }
    
    return this;
  }
  
  /**
   * Set multiple field values
   * @param {Object} values - Object with field values
   * @returns {Form} This form instance for chaining
   */
  setValues(values) {
    Object.entries(values).forEach(([fieldName, value]) => {
      this.setValue(fieldName, value);
    });
    
    return this;
  }
  
  /**
   * Get field value
   * @param {string} fieldName - Field name
   * @returns {*} Field value
   */
  getValue(fieldName) {
    return this.values[fieldName];
  }
  
  /**
   * Get all form values
   * @returns {Object} Form values
   */
  getValues() {
    return { ...this.values };
  }
  
  /**
   * Reset the form to initial values
   * @returns {Form} This form instance for chaining
   */
  reset() {
    // Reset values to initial values
    this.values = { ...this.options.values };
    
    // Reset errors
    this.errors = {};
    
    // Update all fields
    this.options.fields.forEach(field => {
      this.setValue(field.name, this.values[field.name]);
      this.updateFieldError(field.name);
    });
    
    // Publish event
    EventBus.publish(Events.FORM_RESET, {
      form: this.options.id
    });
    
    return this;
  }
  
  /**
   * Clear all form values
   * @returns {Form} This form instance for chaining
   */
  clear() {
    // Clear all values
    this.values = {};
    
    // Reset errors
    this.errors = {};
    
    // Update all fields
    this.options.fields.forEach(field => {
      this.setValue(field.name, null);
      this.updateFieldError(field.name);
    });
    
    // Publish event
    EventBus.publish(Events.FORM_CLEARED, {
      form: this.options.id
    });
    
    return this;
  }
  
  /**
   * Show or hide a field
   * @param {string} fieldName - Field name
   * @param {boolean} visible - Whether the field should be visible
   * @returns {Form} This form instance for chaining
   */
  setFieldVisibility(fieldName, visible) {
    // Find the field container
    const fieldContainer = this.formElement.querySelector(`.form-field input[name="${fieldName}"]`)?.closest('.form-field');
    if (fieldContainer) {
      fieldContainer.style.display = visible ? 'block' : 'none';
    }
    
    return this;
  }
  
  /**
   * Enable or disable a field
   * @param {string} fieldName - Field name
   * @param {boolean} enabled - Whether the field should be enabled
   * @returns {Form} This form instance for chaining
   */
  setFieldEnabled(fieldName, enabled) {
    // Find the field input
    const input = document.getElementById(`${this.options.id}-${fieldName}`);
    if (input) {
      input.disabled = !enabled;
    }
    
    return this;
  }
  
  /**
   * Factory method to create a form instance
   * @param {HTMLElement} container - Container element
   * @param {Object} options - Configuration options
   * @returns {Form} New form instance
   * @static
   */
  static create(container, options = {}) {
    return new Form(container, options);
  }
}

export default Form;