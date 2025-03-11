/**
 * FamilyForm.js
 * Form component for creating and editing Family entities
 */

import Form, { FieldType } from './Form';
import Modal from './Modal';
import { EventBus, Events } from '../../app/EventBus';
import familyService from '../../services/FamilyService';
import personService from '../../services/PersonService';
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
 * FamilyForm class for creating and editing Family entities
 */
class FamilyForm {
  /**
   * Create a new FamilyForm instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      mode: FormMode.CREATE,
      family: null, // Family data for edit mode
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
      title: this.options.mode === FormMode.CREATE ? 'Create Family' : 'Edit Family',
      closable: true,
      size: 'medium',
      onConfirm: () => this.handleSave(),
      onCancel: () => this.handleCancel(),
      onClose: () => this.handleCancel()
    });
    
    // Create form container
    const formContainer = document.createElement('div');
    formContainer.className = 'family-form-container';
    
    // Set form content to the modal
    this.modal.setContent(formContainer);
    
    // Show the modal
    this.modal.show();
    
    // Prepare form data for edit mode
    const initialValues = this.options.mode === FormMode.EDIT && this.options.family
      ? this.prepareInitialValues(this.options.family)
      : {};
    
    // Get available persons for selection
    const personOptions = this.getPersonOptions();
    
    // Create form fields
    const fields = [
      {
        name: 'id',
        type: FieldType.HIDDEN,
        value: initialValues.id || ''
      },
      {
        name: 'name',
        label: 'Family Name',
        type: FieldType.TEXT,
        required: true,
        placeholder: 'Enter family name',
        value: initialValues.name || '',
        validate: value => {
          if (!value || value.trim() === '') {
            return 'Family name is required';
          }
          return null;
        }
      },
      {
        name: 'color',
        label: 'Family Color',
        type: FieldType.COLOR,
        required: true,
        value: initialValues.color || this.getRandomColor()
      },
      {
        name: 'headId',
        label: 'Family Head',
        type: FieldType.SELECT,
        required: true,
        options: this.filterPersonOptions(personOptions, initialValues.headId, initialValues.spouseId, initialValues.childrenIds),
        value: initialValues.headId || '',
        validate: value => {
          if (!value) {
            return 'Family head is required';
          }
          return null;
        }
      },
      {
        name: 'spouseId',
        label: 'Spouse',
        type: FieldType.SELECT,
        required: false,
        options: [
          { value: '', label: 'No Spouse' },
          ...this.filterPersonOptions(personOptions, initialValues.spouseId, initialValues.headId, initialValues.childrenIds)
        ],
        value: initialValues.spouseId || ''
      },
      {
        name: 'childrenIds',
        label: 'Children',
        type: 'custom',
        value: initialValues.childrenIds || [],
        render: (field, form) => {
          const fieldContainer = document.createElement('div');
          fieldContainer.className = 'children-field';
          
          // Label
          const label = document.createElement('label');
          label.textContent = 'Children';
          label.className = 'field-label';
          fieldContainer.appendChild(label);
          
          // Create a multiselect with available children
          const childrenContainer = document.createElement('div');
          childrenContainer.className = 'children-container';
          
          // Get persons that can be children (not head or spouse)
          const headId = form.getValue('headId');
          const spouseId = form.getValue('spouseId');
          const currentChildrenIds = field.value || [];
          
          // Available persons for children
          const availablePersons = personOptions.filter(person => {
            // Include if already a child or not assigned to a role
            return currentChildrenIds.includes(person.value) || 
                  (person.value !== headId && person.value !== spouseId);
          });
          
          // Create children list
          const childrenList = document.createElement('div');
          childrenList.className = 'children-list';
          
          // Display current children
          if (currentChildrenIds.length > 0) {
            currentChildrenIds.forEach(childId => {
              const childOption = availablePersons.find(p => p.value === childId);
              if (childOption) {
                const childItem = document.createElement('div');
                childItem.className = 'child-item';
                
                const childName = document.createElement('span');
                childName.textContent = childOption.label;
                childName.className = 'child-name';
                
                const removeButton = document.createElement('button');
                removeButton.textContent = '×';
                removeButton.className = 'remove-child';
                removeButton.type = 'button';
                removeButton.addEventListener('click', () => {
                  // Remove child from selection
                  const updatedChildrenIds = currentChildrenIds.filter(id => id !== childId);
                  form.setValue('childrenIds', updatedChildrenIds);
                  
                  // Re-render the children field
                  const childrenField = form.fields.find(f => f.name === 'childrenIds');
                  if (childrenField) {
                    const newContainer = childrenField.render(childrenField, form);
                    childrenContainer.replaceWith(newContainer);
                  }
                });
                
                childItem.appendChild(childName);
                childItem.appendChild(removeButton);
                childrenList.appendChild(childItem);
              }
            });
          } else {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'no-children';
            emptyMessage.textContent = 'No children added';
            childrenList.appendChild(emptyMessage);
          }
          
          // Add children list to container
          childrenContainer.appendChild(childrenList);
          
          // Add person selector
          const addChildContainer = document.createElement('div');
          addChildContainer.className = 'add-child-container';
          
          const select = document.createElement('select');
          select.className = 'add-child-select';
          
          // Add default option
          const defaultOption = document.createElement('option');
          defaultOption.value = '';
          defaultOption.textContent = 'Select a person';
          defaultOption.disabled = true;
          defaultOption.selected = true;
          select.appendChild(defaultOption);
          
          // Add available persons
          availablePersons
            .filter(person => !currentChildrenIds.includes(person.value))
            .forEach(person => {
              const option = document.createElement('option');
              option.value = person.value;
              option.textContent = person.label;
              select.appendChild(option);
            });
          
          const addButton = document.createElement('button');
          addButton.textContent = 'Add';
          addButton.className = 'add-child-button';
          addButton.type = 'button';
          addButton.disabled = true;
          
          // Enable/disable button based on selection
          select.addEventListener('change', () => {
            addButton.disabled = !select.value;
          });
          
          // Handle add button click
          addButton.addEventListener('click', () => {
            if (select.value) {
              // Add child to selection
              const updatedChildrenIds = [...currentChildrenIds, select.value];
              form.setValue('childrenIds', updatedChildrenIds);
              
              // Re-render the children field
              const childrenField = form.fields.find(f => f.name === 'childrenIds');
              if (childrenField) {
                const newContainer = childrenField.render(childrenField, form);
                childrenContainer.replaceWith(newContainer);
              }
            }
          });
          
          addChildContainer.appendChild(select);
          addChildContainer.appendChild(addButton);
          childrenContainer.appendChild(addChildContainer);
          
          fieldContainer.appendChild(childrenContainer);
          return fieldContainer;
        }
      }
    ];
    
    // Create form
    this.form = new Form(formContainer, {
      id: 'family-form',
      fields,
      values: initialValues,
      validateOnChange: true,
      labelPosition: 'left',
      showButtons: false,
      onChange: (fieldName, value) => this.handleFieldChange(fieldName, value)
    });
  }
  
  // Add all other methods here
  
  /**
   * Prepare initial values for the form in edit mode
   * @param {Object} family - Family data
   * @returns {Object} Form values
   */
  prepareInitialValues(family) {
    return {
      id: family.id,
      name: family.name,
      color: family.color,
      headId: family.headId || '',
      spouseId: family.spouseId || '',
      childrenIds: family.childrenIds || []
    };
  }
  
  /**
   * Get options for person select
   * @returns {Array} Person options
   */
  getPersonOptions() {
    const options = [];
    
    // Add available persons
    try {
      const persons = personService.getAllPersons();
      persons.forEach(person => {
        options.push({
          value: person.id,
          label: person.name,
          familyId: person.familyId,
          familyRole: person.familyRole
        });
      });
    } catch (error) {
      errorHandler.handleError(
        error,
        'Getting Person Options',
        ErrorSeverity.WARNING,
        ErrorType.UNKNOWN
      );
    }
    
    return options;
  }
  
  /**
   * Filter person options to exclude those with conflicting family roles
   * @param {Array} allOptions - All person options
   * @param {string} currentId - Current person ID (to include even if in another family)
   * @param {string} excludeId - ID to exclude
   * @param {Array} excludeIds - Array of IDs to exclude
   * @returns {Array} Filtered person options
   */
  filterPersonOptions(allOptions, currentId, excludeId, excludeIds) {
    return allOptions.filter(person => {
      // Include current selection
      if (person.value === currentId) {
        return true;
      }
      
      // Exclude specific IDs
      if (person.value === excludeId) {
        return false;
      }
      
      // Exclude array of IDs
      if (excludeIds && excludeIds.includes(person.value)) {
        return false;
      }
      
      // Exclude persons already in another family
      if (person.familyId && person.familyId !== 
          (this.options.family ? this.options.family.id : null)) {
        return false;
      }
      
      return true;
    });
  }
  
  /**
   * Get a random color for the family
   * @returns {string} Random color in hex format
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
   * Handle field change event
   * @param {string} fieldName - Field name
   * @param {*} value - New value
   */
  handleFieldChange(fieldName, value) {
    // Handle head or spouse change to update available options
    if (fieldName === 'headId' || fieldName === 'spouseId') {
      // Re-render children field to update available options
      const childrenField = this.form.fields.find(f => f.name === 'childrenIds');
      if (childrenField) {
        const childrenContainer = document.querySelector('.children-field');
        if (childrenContainer) {
          const newContainer = childrenField.render(childrenField, this.form);
          childrenContainer.replaceWith(newContainer);
        }
      }
    }
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
    
    // Prepare family data
    const familyData = this.buildFamilyData(values);
    
    try {
      // Save the family
      if (this.options.mode === FormMode.CREATE) {
        // Create new family
        const family = familyService.createFamily(familyData);
        
        // Call onSave callback if provided
        if (typeof this.options.onSave === 'function') {
          this.options.onSave(family);
        }
        
        // Show success message
        this.showToast('Family created successfully', 'success');
      } else {
        // Update existing family
        const family = familyService.updateFamily(familyData.id, familyData);
        
        // Call onSave callback if provided
        if (typeof this.options.onSave === 'function') {
          this.options.onSave(family);
        }
        
        // Show success message
        this.showToast('Family updated successfully', 'success');
      }
      
      // Close the modal
      this.closeForm();
    } catch (error) {
      // Show error message
      this.showToast(`Error: ${error.message}`, 'error');
    }
  }
  
  /**
   * Build family data from form values
   * @param {Object} values - Form values
   * @returns {Object} Family data
   */
  buildFamilyData(values) {
    // Build family data
    return {
      id: values.id || undefined, // For update mode
      name: values.name,
      color: values.color,
      headId: values.headId || null,
      spouseId: values.spouseId || null,
      childrenIds: values.childrenIds || []
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
      this.showToast('Family name is required', 'error');
      return false;
    }
    
    if (!values.color) {
      this.showToast('Family color is required', 'error');
      return false;
    }
    
    // Validate color format
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!colorRegex.test(values.color)) {
      this.showToast('Invalid color format', 'error');
      return false;
    }
    
    // A family must have a head
    if (!values.headId) {
      this.showToast('Family head is required', 'error');
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
   * Factory method to create a family form
   * @param {Object} options - Configuration options
   * @returns {FamilyForm} New FamilyForm instance
   * @static
   */
  static create(options = {}) {
    return new FamilyForm(options);
  }
}

export default FamilyForm;