/**
 * ImportExportModal.js
 * Modal component for importing and exporting data
 */

import Modal from './Modal';
import { EventBus, Events } from '../../app/EventBus';
import '../../ui/styles/import-export.css';
import importExportService from '../../services/ImportExportService';
import { errorHandler, ErrorType, ErrorSeverity } from '../../utils/errorHandler';
import { stateManager } from '../../services/StateManager';

/**
 * ImportExportModal class for data import/export operations
 */
class ImportExportModal {
  /**
   * Create a new ImportExportModal instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      onComplete: null,
      ...options
    };
    
    // Modal instance
    this.modal = null;
    
    // Create and display the modal
    this.createModal();
  }
  
  /**
   * Create the modal
   */
  createModal() {
    // Create modal to host the import/export options
    this.modal = Modal.create({
      title: 'Import / Export Data',
      closable: true,
      size: 'medium',
      showFooter: false,
      onClose: () => this.handleClose()
    });
    
    // Create modal content
    const content = document.createElement('div');
    content.className = 'import-export-container';
    content.innerHTML = this.createContent();
    
    // Set modal content
    this.modal.setContent(content);
    
    // Show the modal
    this.modal.show();
    
    // Setup event listeners
    this.setupEventListeners();
  }
  
  /**
   * Create the modal content
   * @returns {string} Modal content HTML
   */
  createContent() {
    return `
      <div class="import-export-tabs">
        <button class="tab-button active" data-tab="export">Export Data</button>
        <button class="tab-button" data-tab="import">Import Data</button>
      </div>
      
      <div class="tab-content-container">
        <!-- Export Tab -->
        <div class="tab-content active" id="export-tab">
          <p class="tab-description">
            Export your data to a file that can be imported later to restore your data or transfer to another device.
          </p>
          
          <div class="export-options">
            <div class="option-section">
              <h3>Export Format</h3>
              <div class="radio-group">
                <label class="radio-label">
                  <input type="radio" name="export-format" value="json" checked>
                  JSON (Recommended)
                </label>
                <label class="radio-label">
                  <input type="radio" name="export-format" value="csv">
                  CSV (Limited data)
                </label>
              </div>
            </div>
            
            <div class="option-section">
              <h3>Data to Export</h3>
              <div class="checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" name="export-data" value="persons" checked>
                  People
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" name="export-data" value="meetings" checked>
                  Meeting Points
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" name="export-data" value="groups" checked>
                  Groups
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" name="export-data" value="families" checked>
                  Families
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" name="export-data" value="config" checked>
                  Settings
                </label>
              </div>
            </div>
          </div>
          
          <div class="action-buttons">
            <button class="primary-button" id="export-button">Export Data</button>
          </div>
        </div>
        
        <!-- Import Tab -->
        <div class="tab-content" id="import-tab">
          <p class="tab-description">
            Import data from a previously exported file. This will add to or update your existing data.
          </p>
          
          <div class="import-options">
            <div class="option-section">
              <h3>Import File</h3>
              <div class="file-input-container">
                <input type="file" id="import-file" accept=".json,.csv">
                <p class="file-description">Select a JSON or CSV file</p>
              </div>
            </div>
            
            <div class="option-section">
              <h3>Import Options</h3>
              <div class="radio-group">
                <label class="radio-label">
                  <input type="radio" name="import-mode" value="merge" checked>
                  Merge with existing data (recommended)
                </label>
                <label class="radio-label">
                  <input type="radio" name="import-mode" value="replace">
                  Replace all existing data (caution)
                </label>
              </div>
            </div>
          </div>
          
          <div class="import-preview" id="import-preview">
            <h3>Import Preview</h3>
            <p class="preview-message">Select a file to see a preview</p>
            <div class="preview-content" style="display: none;"></div>
          </div>
          
          <div class="action-buttons">
            <button class="primary-button" id="import-button" disabled>Import Data</button>
          </div>
        </div>
      </div>
      
      <!-- Results Panel (initially hidden) -->
      <div class="results-panel" style="display: none;">
        <h3 class="results-title">Operation Results</h3>
        <div class="results-content"></div>
        <div class="action-buttons">
          <button class="primary-button" id="results-done-button">Done</button>
        </div>
      </div>
    `;
  }
  
  /**
   * Setup event listeners for the modal
   */
  setupEventListeners() {
    // Get tab buttons
    const tabButtons = document.querySelectorAll('.import-export-tabs .tab-button');
    
    // Add tab switching functionality
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tab = button.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });
    
    // Export button
    const exportButton = document.getElementById('export-button');
    if (exportButton) {
      exportButton.addEventListener('click', () => {
        this.handleExport();
      });
    }
    
    // Import file input
    const importFile = document.getElementById('import-file');
    if (importFile) {
      importFile.addEventListener('change', (e) => {
        this.handleFileSelected(e);
      });
    }
    
    // Import button
    const importButton = document.getElementById('import-button');
    if (importButton) {
      importButton.addEventListener('click', () => {
        this.handleImport();
      });
    }
    
    // Results done button
    const doneButton = document.getElementById('results-done-button');
    if (doneButton) {
      doneButton.addEventListener('click', () => {
        this.handleClose();
      });
    }
  }
  
  /**
   * Switch between tabs
   * @param {string} tab - Tab to switch to
   */
  switchTab(tab) {
    // Update tab buttons
    const tabButtons = document.querySelectorAll('.import-export-tabs .tab-button');
    tabButtons.forEach(button => {
      button.classList.toggle('active', button.getAttribute('data-tab') === tab);
    });
    
    // Update tab content
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
      content.classList.toggle('active', content.id === `${tab}-tab`);
    });
  }
  
  /**
   * Handle export button click
   */
  async handleExport() {
    try {
      // Get selected format
      const formatRadios = document.querySelectorAll('input[name="export-format"]');
      let selectedFormat = 'json';
      
      formatRadios.forEach(radio => {
        if (radio.checked) {
          selectedFormat = radio.value;
        }
      });
      
      // Get selected data types
      const dataCheckboxes = document.querySelectorAll('input[name="export-data"]');
      const selectedData = [];
      
      dataCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
          selectedData.push(checkbox.value);
        }
      });
      
      // Validate selection
      if (selectedData.length === 0) {
        this.showError('Please select at least one data type to export.');
        return;
      }
      
      // Show loading state
      this.setExportButtonLoading(true);
      
      // Perform export
      const result = await importExportService.exportData(selectedFormat, selectedData);
      
      // Show success
      this.showExportResults(result);
      
    } catch (error) {
      // Show error
      this.showError(`Export failed: ${error.message}`);
      errorHandler.handleError(
        error,
        'Exporting Data',
        ErrorSeverity.ERROR,
        ErrorType.UNKNOWN
      );
    } finally {
      // Reset loading state
      this.setExportButtonLoading(false);
    }
  }
  
  /**
   * Handle file selection for import
   * @param {Event} event - File input change event
   */
  async handleFileSelected(event) {
    try {
      const file = event.target.files[0];
      if (!file) return;
      
      // Validate file type
      const fileType = file.name.split('.').pop().toLowerCase();
      if (fileType !== 'json' && fileType !== 'csv') {
        this.showError('Only JSON and CSV files are supported.');
        event.target.value = '';
        return;
      }
      
      // Show loading in preview area
      const previewEl = document.getElementById('import-preview');
      const previewMessage = previewEl.querySelector('.preview-message');
      const previewContent = previewEl.querySelector('.preview-content');
      
      previewMessage.textContent = 'Analyzing file...';
      previewMessage.style.display = 'block';
      previewContent.style.display = 'none';
      
      // Parse file for preview
      const preview = await importExportService.previewImport(file);
      
      // Update UI with preview
      previewMessage.style.display = 'none';
      previewContent.style.display = 'block';
      
      // Create preview HTML
      previewContent.innerHTML = this.createPreviewContent(preview);
      
      // Enable import button
      const importButton = document.getElementById('import-button');
      if (importButton) {
        importButton.disabled = false;
      }
      
    } catch (error) {
      // Show error in preview area
      const previewEl = document.getElementById('import-preview');
      const previewMessage = previewEl.querySelector('.preview-message');
      
      previewMessage.textContent = `Error: ${error.message}`;
      previewMessage.style.display = 'block';
      previewMessage.style.color = '#e53935';
      
      // Disable import button
      const importButton = document.getElementById('import-button');
      if (importButton) {
        importButton.disabled = true;
      }
      
      errorHandler.handleError(
        error,
        'Previewing Import',
        ErrorSeverity.WARNING,
        ErrorType.UNKNOWN
      );
    }
  }
  
  /**
   * Create preview content for import
   * @param {Object} preview - Preview data
   * @returns {string} Preview HTML
   */
  createPreviewContent(preview) {
    const { persons, meetings, groups, families, config } = preview;
    
    let html = '<div class="preview-stats">';
    
    if (persons && persons.length > 0) {
      html += `<div class="stat-item"><span class="stat-label">People:</span> ${persons.length}</div>`;
    }
    
    if (meetings && meetings.length > 0) {
      html += `<div class="stat-item"><span class="stat-label">Meetings:</span> ${meetings.length}</div>`;
    }
    
    if (groups && groups.length > 0) {
      html += `<div class="stat-item"><span class="stat-label">Groups:</span> ${groups.length}</div>`;
    }
    
    if (families && families.length > 0) {
      html += `<div class="stat-item"><span class="stat-label">Families:</span> ${families.length}</div>`;
    }
    
    if (config) {
      html += `<div class="stat-item"><span class="stat-label">Settings:</span> Included</div>`;
    }
    
    html += '</div>';
    
    // Add warning about potential duplicates
    html += `
      <div class="preview-warning">
        <p>⚠️ Warning: Importing data may create duplicates if items with the same names exist.</p>
      </div>
    `;
    
    return html;
  }
  
  /**
   * Handle import button click
   */
  async handleImport() {
    try {
      // Get selected file
      const fileInput = document.getElementById('import-file');
      const file = fileInput.files[0];
      
      if (!file) {
        this.showError('Please select a file to import.');
        return;
      }
      
      // Get import mode
      const modeRadios = document.querySelectorAll('input[name="import-mode"]');
      let selectedMode = 'merge';
      
      modeRadios.forEach(radio => {
        if (radio.checked) {
          selectedMode = radio.value;
        }
      });
      
      // Show loading state
      this.setImportButtonLoading(true);
      
      // Confirm if replacing all data
      if (selectedMode === 'replace') {
        const confirmed = confirm('Warning: This will delete all your existing data and replace it with the imported data. This action cannot be undone. Are you sure you want to continue?');
        
        if (!confirmed) {
          this.setImportButtonLoading(false);
          return;
        }
      }
      
      // Perform import
      const result = await importExportService.importData(file, selectedMode);
      
      // Show success
      this.showImportResults(result);
      
      // Publish event to refresh UI
      EventBus.publish(Events.DATA_IMPORTED);
      
    } catch (error) {
      // Show error
      this.showError(`Import failed: ${error.message}`);
      errorHandler.handleError(
        error,
        'Importing Data',
        ErrorSeverity.ERROR,
        ErrorType.UNKNOWN
      );
    } finally {
      // Reset loading state
      this.setImportButtonLoading(false);
    }
  }
  
  /**
   * Set export button loading state
   * @param {boolean} isLoading - Whether the button is in loading state
   */
  setExportButtonLoading(isLoading) {
    const exportButton = document.getElementById('export-button');
    if (exportButton) {
      if (isLoading) {
        exportButton.textContent = 'Exporting...';
        exportButton.disabled = true;
      } else {
        exportButton.textContent = 'Export Data';
        exportButton.disabled = false;
      }
    }
  }
  
  /**
   * Set import button loading state
   * @param {boolean} isLoading - Whether the button is in loading state
   */
  setImportButtonLoading(isLoading) {
    const importButton = document.getElementById('import-button');
    if (importButton) {
      if (isLoading) {
        importButton.textContent = 'Importing...';
        importButton.disabled = true;
      } else {
        importButton.textContent = 'Import Data';
        importButton.disabled = false;
      }
    }
  }
  
  /**
   * Show export results
   * @param {Object} result - Export result
   */
  showExportResults(result) {
    // Show results panel
    const tabsContainer = document.querySelector('.tab-content-container');
    const resultsPanel = document.querySelector('.results-panel');
    
    if (tabsContainer && resultsPanel) {
      tabsContainer.style.display = 'none';
      resultsPanel.style.display = 'block';
      
      // Update results content
      const resultsContent = resultsPanel.querySelector('.results-content');
      if (resultsContent) {
        resultsContent.innerHTML = `
          <div class="success-message">
            <div class="success-icon">✓</div>
            <div class="success-text">
              <h4>Export Successful!</h4>
              <p>Your data has been exported successfully.</p>
            </div>
          </div>
          <div class="export-details">
            <div class="detail-item">
              <span class="detail-label">File name:</span>
              <span class="detail-value">${result.fileName}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Format:</span>
              <span class="detail-value">${result.format.toUpperCase()}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Size:</span>
              <span class="detail-value">${this.formatFileSize(result.size)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Data exported:</span>
              <span class="detail-value">${result.exportedData.join(', ')}</span>
            </div>
          </div>
        `;
      }
    }
  }
  
  /**
   * Show import results
   * @param {Object} result - Import result
   */
  showImportResults(result) {
    // Show results panel
    const tabsContainer = document.querySelector('.tab-content-container');
    const resultsPanel = document.querySelector('.results-panel');
    
    if (tabsContainer && resultsPanel) {
      tabsContainer.style.display = 'none';
      resultsPanel.style.display = 'block';
      
      // Update results content
      const resultsContent = resultsPanel.querySelector('.results-content');
      if (resultsContent) {
        resultsContent.innerHTML = `
          <div class="success-message">
            <div class="success-icon">✓</div>
            <div class="success-text">
              <h4>Import Successful!</h4>
              <p>${result.mode === 'merge' ? 'Your data has been merged successfully.' : 'Your data has been replaced successfully.'}</p>
            </div>
          </div>
          <div class="import-details">
            <div class="detail-item">
              <span class="detail-label">Mode:</span>
              <span class="detail-value">${result.mode === 'merge' ? 'Merge' : 'Replace'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">File:</span>
              <span class="detail-value">${result.fileName}</span>
            </div>
            <div class="detail-stats">
              ${result.stats.persons ? `<div class="stat-item">People: ${result.stats.persons}</div>` : ''}
              ${result.stats.meetings ? `<div class="stat-item">Meetings: ${result.stats.meetings}</div>` : ''}
              ${result.stats.groups ? `<div class="stat-item">Groups: ${result.stats.groups}</div>` : ''}
              ${result.stats.families ? `<div class="stat-item">Families: ${result.stats.families}</div>` : ''}
              ${result.stats.config ? `<div class="stat-item">Settings: Updated</div>` : ''}
            </div>
          </div>
        `;
      }
    }
  }
  
  /**
   * Format a file size in bytes to a human-readable string
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
    if (bytes < 1024) {
      return bytes + ' bytes';
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB';
    } else {
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
  }
  
  /**
   * Show an error message
   * @param {string} message - Error message
   */
  showError(message) {
    alert(message);
  }
  
  /**
   * Handle modal close
   */
  handleClose() {
    // Call onComplete callback if provided
    if (typeof this.options.onComplete === 'function') {
      this.options.onComplete();
    }
    
    // Destroy modal
    if (this.modal) {
      this.modal.destroy();
      this.modal = null;
    }
  }
  
  /**
   * Factory method to create an ImportExportModal instance
   * @param {Object} options - Configuration options
   * @returns {ImportExportModal} New ImportExportModal instance
   * @static
   */
  static create(options = {}) {
    return new ImportExportModal(options);
  }
}

export default ImportExportModal;