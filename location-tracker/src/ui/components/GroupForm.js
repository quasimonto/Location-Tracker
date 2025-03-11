/**
 * GroupForm.js
 * Form component for creating and editing Group entities
 */

import Form, { FieldType } from './Form';
import Modal from './Modal';
import { EventBus, Events } from '../../app/EventBus';
import groupService from '../../services/GroupService';
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
 * GroupForm class for creating and editing Group entities
 */
class GroupForm {
  /**
   * Create a new GroupForm instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      mode: FormMode.CREATE,
      group: null, // Group data for edit mode
      onSave: null,
      onCancel: null,
      ...options
    };
    
    // Modal instance for containing the form
    this.modal = null;
    
    // Form instance
    this.form = null;
    
    // Create and display the form
    this.createForm();
  }
  
  /**
   * Create the form
   */
  createForm() {
    // Create modal to host the form
    this.modal = Modal.create({
      title: this.options.mode === FormMode.CREATE ? 'Create Group' : 'Edit Group',
      closable: true,
      size: 'medium',
      onConfirm: () => this.handleSave(),
      onCancel: () => this.handleCancel(),
      onClose: () => this.handleCancel()
    });
    
    // Create form container
    const formContainer = document.createElement('div');
    formContainer.className = 'group-form-container';
    
    // Set form content to the modal
    this.modal.setContent(formContainer);
    
    // Show the modal
    this.modal.show();
    
    // Prepare form data for edit mode
    const initialValues = this.options.mode === FormMode.EDIT && this.options.group
      ? this.prepareInitialValues(this.options.group)
      : { requirements: this.getDefaultRequirements() };
    
    // Create form fields
    const fields = [
      {
        name: 'id',
        type: FieldType.HIDDEN,
        value: initialValues.id || ''
      },
      {
        name: 'name',
        label: 'Group Name',
        type: FieldType.TEXT,
        required: true,
        placeholder: 'Enter group name',
        value: initialValues.name || '',
        validate: value => {
          if (!value || value.trim() === '') {
            return 'Group name is required';
          }
          return null;
        }
      },
      {
        name: 'color',
        label: 'Group Color',
        type: FieldType.COLOR,
        required: true,
        value: initialValues.color || this.getRandomColor()
      },
      {
        name: 'requirements',
        label: 'Group Requirements',
        type: 'custom',
        value: initialValues.requirements || this.getDefaultRequirements(),
        render: (field, form) => {
          const fieldContainer = document.createElement('div');
          fieldContainer.className = 'requirements-field';
          
          // Add heading
          const heading = document.createElement('h4');
          heading.textContent = 'Minimum Requirements';
          heading.className = 'requirements-heading';
          fieldContainer.appendChild(heading);
          
          // Create requirement fields
          const requirements = [
            { id: 'minElders', label: 'Elders' },
            { id: 'minServants', label: 'Servants' },
            { id: 'minPioneers', label: 'Pioneers' },
            { id: 'minLeaders', label: 'Leaders' },
            { id: 'minHelpers', label: 'Helpers' },
            { id: 'minPublishers', label: 'Publishers' }
          ];
          
          const grid = document.createElement('div');
          grid.className = 'requirements-grid';
          
          requirements.forEach(req => {
            const reqContainer = document.createElement('div');
            reqContainer.className = 'requirement-item';
            
            const label = document.createElement('label');
            label.htmlFor = `req-${req.id}`;
            label.textContent = req.label;
            
            const input = document.createElement('input');
            input.type = 'number';
            input.id = `req-${req.id}`;
            input.name = `req-${req.id}`;
            input.min = 0;
            input.max = 10;
            input.value = field.value[req.id] !== undefined ? field.value[req.id] : 0;
            
            input.addEventListener('change', () => {
              // Update the field value
              const updatedReqs = { ...field.value };
              updatedReqs[req.id] = parseInt(input.value) || 0;
              form.setValue('requirements', updatedReqs);
            });
            
            reqContainer.appendChild(label);
            reqContainer.appendChild(input);
            grid.appendChild(reqContainer);
          });
          
          fieldContainer.appendChild(grid);
          
          // Add description
          const description = document.createElement('p');
          description.className = 'requirements-description';
          description.textContent = 'These requirements are used when auto-creating groups to ensure each group has the right mix of members.';
          fieldContainer.appendChild(description);
          
          return fieldContainer;
        }
      }
    ];
    
    // Create form
    this.form = new Form(formContainer, {
      id: 'group-form',
      fields,
      values: initialValues,
      validateOnChange: true,
      labelPosition: 'left',
      showButtons: false,
      onChange: (fieldName, value) => this.handleFieldChange(fieldName, value)
    });
  }
  
  /**
   * Prepare initial values for the form in edit mode
   * @param {Object} group - Group data
   * @returns {Object} Form values
   */
  prepareInitialValues(group) {
    return {
      id: group.id,
      name: group.name,
      color: group.color,
      requirements: {
        minElders: group.requirements?.minElders ?? 0,
        minServants: group.requirements?.minServants ?? 0,
        minPioneers: group.requirements?.minPioneers ?? 0,
        minLeaders: group.requirements?.minLeaders ?? 1,
        minHelpers: group.requirements?.minHelpers ?? 1,
        minPublishers: group.requirements?.minPublishers ?? 0
      }
    };
  }
  
  /**
   * Get default requirements for new groups
   * @returns {Object} Default requirements
   */
  getDefaultRequirements() {
    return {
      minElders: 0,
      minServants: 0,
      minPioneers: 0,
      minLeaders: 1,
      minHelpers: 1,
      minPublishers: 0
    };
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
   * Generate a random color
   * @returns {string} Random color hex
   */
  getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
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
    
    // Prepare group data
    const groupData = this.buildGroupData(values);
    
    try {
      // Save the group
      if (this.options.mode === FormMode.CREATE) {
        // Create new group
        const group = groupService.createGroup(groupData);
        
        // Call onSave callback if provided
        if (typeof this.options.onSave === 'function') {
          this.options.onSave(group);
        }
        
        // Show success message
        this.showToast('Group created successfully', 'success');
      } else {
        // Update existing group
        const group = groupService.updateGroup(groupData.id, groupData);
        
        // Call onSave callback if provided
        if (typeof this.options.onSave === 'function') {
          this.options.onSave(group);
        }
        
        // Show success message
        this.showToast('Group updated successfully', 'success');
      }
      
      // Close the modal
      this.closeForm();
    } catch (error) {
      // Show error message
      this.showToast(`Error: ${error.message}`, 'error');
    }
  }
  
  /**
   * Build group data from form values
   * @param {Object} values - Form values
   * @returns {Object} Group data
   */
  buildGroupData(values) {
    // Ensure all requirements are valid numbers
    const requirements = { ...values.requirements };
    Object.keys(requirements).forEach(key => {
      requirements[key] = parseInt(requirements[key]) || 0;
    });
    
    // Build group data
    return {
      id: values.id || undefined, // For update mode
      name: values.name,
      color: values.color,
      requirements
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
      this.showToast('Group name is required', 'error');
      return false;
    }
    
    if (!values.color) {
      this.showToast('Group color is required', 'error');
      return false;
    }
    
    // Validate color format
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!colorRegex.test(values.color)) {
      this.showToast('Invalid color format', 'error');
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
    // Close the modal
    if (this.modal) {
      this.modal.destroy();
      this.modal = null;
    }
  }
  
  /**
   * Factory method to create a group form
   * @param {Object} options - Configuration options
   * @returns {GroupForm} New GroupForm instance
   * @static
   */
  static create(options = {}) {
    return new GroupForm(options);
  }
}

export default GroupForm;