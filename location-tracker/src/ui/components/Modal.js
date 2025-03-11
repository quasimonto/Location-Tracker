/**
 * Modal.js
 * Reusable modal dialog component
 */

import { EventBus, Events } from '../../app/EventBus';

/**
 * Modal class for creating dialog overlays
 */
class Modal {
  /**
   * Create a new Modal instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      id: `modal-${Date.now()}`,
      title: 'Modal Dialog',
      closable: true,
      closeOnEscape: true,
      closeOnOverlayClick: true,
      size: 'medium', // 'small', 'medium', 'large', or 'full'
      width: null, // Custom width (e.g., '500px', '80%')
      height: null, // Custom height (e.g., '400px', '90vh')
      position: 'center', // 'center', 'top', 'right', 'bottom', 'left'
      showFooter: true,
      confirmText: 'Save',
      cancelText: 'Cancel',
      confirmButtonClass: 'primary-button',
      cancelButtonClass: 'secondary-button',
      onConfirm: null,
      onCancel: null,
      onClose: null,
      ...options
    };
    
    // Element references
    this.modalElement = null;
    this.contentElement = null;
    
    // Track modal state
    this.isVisible = false;
    
    // Create modal element
    this.create();
  }
  
  /**
   * Create the modal DOM elements
   */
  create() {
    // Check if the modal already exists
    if (document.getElementById(this.options.id)) {
      // Remove existing modal with the same ID
      document.getElementById(this.options.id).remove();
    }
    
    // Create modal container
    this.modalElement = document.createElement('div');
    this.modalElement.id = this.options.id;
    this.modalElement.className = `modal ${this.options.size}-modal`;
    this.modalElement.setAttribute('role', 'dialog');
    this.modalElement.setAttribute('aria-modal', 'true');
    this.modalElement.setAttribute('aria-labelledby', `${this.options.id}-title`);
    
    // Set initial state to hidden
    this.modalElement.style.display = 'none';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    // Add custom size if provided
    if (this.options.width) {
      modalContent.style.width = this.options.width;
    }
    if (this.options.height) {
      modalContent.style.height = this.options.height;
      modalContent.style.maxHeight = this.options.height;
    }
    
    // Create header
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    
    const title = document.createElement('h3');
    title.className = 'modal-title';
    title.id = `${this.options.id}-title`;
    title.textContent = this.options.title;
    modalHeader.appendChild(title);
    
    // Add close button if modal is closable
    if (this.options.closable) {
      const closeButton = document.createElement('button');
      closeButton.className = 'close-button';
      closeButton.setAttribute('aria-label', 'Close');
      closeButton.innerHTML = '×';
      closeButton.addEventListener('click', () => this.close());
      modalHeader.appendChild(closeButton);
    }
    
    modalContent.appendChild(modalHeader);
    
    // Create body container
    this.contentElement = document.createElement('div');
    this.contentElement.className = 'modal-body';
    modalContent.appendChild(this.contentElement);
    
    // Create footer with action buttons
    if (this.options.showFooter) {
      const modalFooter = document.createElement('div');
      modalFooter.className = 'modal-footer';
      
      // Confirm button
      const confirmButton = document.createElement('button');
      confirmButton.id = `${this.options.id}-confirm`;
      confirmButton.className = this.options.confirmButtonClass;
      confirmButton.textContent = this.options.confirmText;
      confirmButton.addEventListener('click', () => this.confirm());
      
      // Cancel button
      const cancelButton = document.createElement('button');
      cancelButton.id = `${this.options.id}-cancel`;
      cancelButton.className = this.options.cancelButtonClass;
      cancelButton.textContent = this.options.cancelText;
      cancelButton.addEventListener('click', () => this.cancel());
      
      modalFooter.appendChild(cancelButton);
      modalFooter.appendChild(confirmButton);
      
      modalContent.appendChild(modalFooter);
    }
    
    this.modalElement.appendChild(modalContent);
    
    // Add modal to the DOM
    document.body.appendChild(this.modalElement);
    
    // Setup event listeners
    this.setupEventListeners();
  }
  
  /**
   * Setup event listeners for the modal
   */
  setupEventListeners() {
    // Close on overlay click
    if (this.options.closeOnOverlayClick) {
      this.modalElement.addEventListener('click', (e) => {
        // Only close if the click was directly on the modal overlay (not its children)
        if (e.target === this.modalElement) {
          this.close();
        }
      });
    }
    
    // Close on escape key
    if (this.options.closeOnEscape) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isVisible) {
          this.close();
        }
      });
    }
  }
  
  /**
   * Show the modal
   * @returns {Modal} This modal instance for chaining
   */
  show() {
    // Display the modal
    this.modalElement.style.display = 'flex';
    this.isVisible = true;
    
    // Add a class to animate the appearance
    setTimeout(() => {
      this.modalElement.classList.add('modal-visible');
    }, 10); // Small delay helps with the transition
    
    // Focus the first input or the confirm button
    setTimeout(() => {
      const firstInput = this.contentElement.querySelector('input, textarea, select');
      if (firstInput) {
        firstInput.focus();
      } else {
        const confirmButton = document.getElementById(`${this.options.id}-confirm`);
        if (confirmButton) {
          confirmButton.focus();
        }
      }
    }, 100);
    
    // Publish event
    EventBus.publish(Events.MODAL_OPENED, { id: this.options.id });
    
    return this;
  }
  
  /**
   * Hide the modal
   * @param {boolean} fireCloseEvent - Whether to fire the close event
   * @returns {Modal} This modal instance for chaining
   */
  hide(fireCloseEvent = true) {
    // Remove the visible class first
    this.modalElement.classList.remove('modal-visible');
    
    // After transition, hide completely
    setTimeout(() => {
      this.modalElement.style.display = 'none';
      this.isVisible = false;
      
      // Fire the close event if requested
      if (fireCloseEvent) {
        // Call onClose callback if provided
        if (typeof this.options.onClose === 'function') {
          this.options.onClose();
        }
        
        // Publish event
        EventBus.publish(Events.MODAL_CLOSED, { id: this.options.id });
      }
    }, 300); // Match the CSS transition duration
    
    return this;
  }
  
  /**
   * Close the modal (alias for hide)
   * @returns {Modal} This modal instance for chaining
   */
  close() {
    return this.hide(true);
  }
  
  /**
   * Confirm the modal dialog
   * @returns {Modal} This modal instance for chaining
   */
  confirm() {
    // Call onConfirm callback if provided
    if (typeof this.options.onConfirm === 'function') {
      const shouldClose = this.options.onConfirm() !== false;
      if (shouldClose) {
        this.hide(false);
      }
    } else {
      this.hide(false);
    }
    
    // Publish event
    EventBus.publish(Events.MODAL_CONFIRMED, { id: this.options.id });
    
    return this;
  }
  
  /**
   * Cancel the modal dialog
   * @returns {Modal} This modal instance for chaining
   */
  cancel() {
    // Call onCancel callback if provided
    if (typeof this.options.onCancel === 'function') {
      const shouldClose = this.options.onCancel() !== false;
      if (shouldClose) {
        this.hide(false);
      }
    } else {
      this.hide(false);
    }
    
    // Publish event
    EventBus.publish(Events.MODAL_CANCELLED, { id: this.options.id });
    
    return this;
  }
  
  /**
   * Set the modal title
   * @param {string} title - New title
   * @returns {Modal} This modal instance for chaining
   */
  setTitle(title) {
    const titleElement = document.getElementById(`${this.options.id}-title`);
    if (titleElement) {
      titleElement.textContent = title;
      this.options.title = title;
    }
    return this;
  }
  
  /**
   * Set the modal content
   * @param {string|HTMLElement} content - HTML content or element
   * @returns {Modal} This modal instance for chaining
   */
  setContent(content) {
    if (!this.contentElement) return this;
    
    // Clear existing content
    this.contentElement.innerHTML = '';
    
    // Add new content
    if (typeof content === 'string') {
      this.contentElement.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      this.contentElement.appendChild(content);
    }
    
    return this;
  }
  
  /**
   * Set a callback function
   * @param {string} type - Callback type ('onConfirm', 'onCancel', 'onClose')
   * @param {Function} callback - Callback function
   * @returns {Modal} This modal instance for chaining
   */
  setCallback(type, callback) {
    if (typeof callback === 'function' && 
        ['onConfirm', 'onCancel', 'onClose'].includes(type)) {
      this.options[type] = callback;
    }
    return this;
  }
  
  /**
   * Set button text
   * @param {string} type - Button type ('confirm', 'cancel')
   * @param {string} text - Button text
   * @returns {Modal} This modal instance for chaining
   */
  setButtonText(type, text) {
    const buttonId = `${this.options.id}-${type}`;
    const button = document.getElementById(buttonId);
    
    if (button) {
      button.textContent = text;
      if (type === 'confirm') {
        this.options.confirmText = text;
      } else if (type === 'cancel') {
        this.options.cancelText = text;
      }
    }
    
    return this;
  }
  
  /**
   * Show or hide the footer
   * @param {boolean} show - Whether to show the footer
   * @returns {Modal} This modal instance for chaining
   */
  showFooter(show) {
    const footer = this.modalElement.querySelector('.modal-footer');
    if (footer) {
      footer.style.display = show ? 'flex' : 'none';
      this.options.showFooter = show;
    }
    return this;
  }
  
  /**
   * Get the content element
   * @returns {HTMLElement} Content element
   */
  getContentElement() {
    return this.contentElement;
  }
  
  /**
   * Check if the modal is visible
   * @returns {boolean} Whether the modal is visible
   */
  getIsVisible() {
    return this.isVisible;
  }
  
  /**
   * Destroy the modal (remove from DOM)
   */
  destroy() {
    if (this.modalElement && this.modalElement.parentNode) {
      this.modalElement.parentNode.removeChild(this.modalElement);
    }
    
    // Publish event
    EventBus.publish(Events.MODAL_DESTROYED, { id: this.options.id });
  }
  
  /**
   * Create a confirm dialog
   * @param {Object} options - Configuration options
   * @returns {Modal} New modal instance
   * @static
   */
  static confirm(options) {
    const defaultOptions = {
      title: 'Confirm',
      confirmText: 'OK',
      cancelText: 'Cancel',
      message: 'Are you sure?'
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    const modal = new Modal(mergedOptions);
    modal.setContent(`<p class="confirm-message">${mergedOptions.message}</p>`);
    
    return modal.show();
  }
  
  /**
   * Create an alert dialog
   * @param {Object} options - Configuration options
   * @returns {Modal} New modal instance
   * @static
   */
  static alert(options) {
    const defaultOptions = {
      title: 'Alert',
      confirmText: 'OK',
      cancelText: 'Cancel',
      message: 'This is an alert',
      showFooter: true
    };
    
    const mergedOptions = { 
      ...defaultOptions, 
      ...options,
      // Force some options for alert
      closeOnOverlayClick: false
    };
    
    const modal = new Modal(mergedOptions);
    modal.setContent(`<p class="alert-message">${mergedOptions.message}</p>`);
    
    // For alert, we only need the confirm button
    const cancelButton = document.getElementById(`${modal.options.id}-cancel`);
    if (cancelButton) {
      cancelButton.style.display = 'none';
    }
    
    return modal.show();
  }
  
  /**
   * Factory method to create a modal instance
   * @param {Object} options - Configuration options
   * @returns {Modal} New modal instance
   * @static
   */
  static create(options = {}) {
    return new Modal(options);
  }
}

export default Modal;