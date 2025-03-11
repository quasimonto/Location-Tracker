/**
 * ImportExportService.js
 * Service for importing and exporting data
 */

import { stateManager } from './StateManager';
import { errorHandler, ErrorType, ErrorSeverity } from '../utils/errorHandler';
import personService from './PersonService';
import meetingService from './MeetingService';
import groupService from './GroupService';
import familyService from './FamilyService';

/**
 * Service for importing and exporting application data
 */
class ImportExportService {
  constructor() {
    // File types supported for export
    this.exportFormats = ['json', 'csv'];
    
    // Data types that can be exported
    this.dataTypes = ['persons', 'meetings', 'groups', 'families', 'config'];
  }
  
  /**
   * Export data to a file
   * @param {string} format - Export format ('json' or 'csv')
   * @param {Array<string>} dataTypes - Array of data types to export
   * @returns {Promise<Object>} Export result
   */
  async exportData(format = 'json', dataTypes = this.dataTypes) {
    try {
      // Validate format
      if (!this.exportFormats.includes(format)) {
        throw new Error(`Unsupported export format: ${format}`);
      }
      
      // Filter valid data types
      const validDataTypes = dataTypes.filter(type => this.dataTypes.includes(type));
      
      if (validDataTypes.length === 0) {
        throw new Error('No valid data types specified for export');
      }
      
      // Collect data to export
      const exportData = {};
      
      if (validDataTypes.includes('persons')) {
        exportData.persons = personService.getAllPersons().map(person => person.toJSON());
      }
      
      if (validDataTypes.includes('meetings')) {
        exportData.meetings = meetingService.getAllMeetings().map(meeting => meeting.toJSON());
      }
      
      if (validDataTypes.includes('groups')) {
        exportData.groups = groupService.getAllGroups().map(group => group.toJSON());
      }
      
      if (validDataTypes.includes('families')) {
        exportData.families = familyService.getAllFamilies().map(family => family.toJSON());
      }
      
      if (validDataTypes.includes('config')) {
        exportData.config = stateManager.getState('config');
      }
      
      // Convert to selected format
      let exportedData;
      let fileName;
      let mimeType;
      
      if (format === 'json') {
        exportedData = JSON.stringify(exportData, null, 2);
        fileName = `location-tracker-export-${this.getTimestamp()}.json`;
        mimeType = 'application/json';
      } else if (format === 'csv') {
        exportedData = this.convertToCSV(exportData);
        fileName = `location-tracker-export-${this.getTimestamp()}.csv`;
        mimeType = 'text/csv';
      }
      
      // Create download
      await this.downloadFile(exportedData, fileName, mimeType);
      
      return {
        success: true,
        format,
        fileName,
        size: exportedData.length,
        exportedData: validDataTypes
      };
    } catch (error) {
      errorHandler.handleError(
        error,
        'Exporting Data',
        ErrorSeverity.ERROR,
        ErrorType.UNKNOWN
      );
      throw error;
    }
  }
  
  /**
   * Convert data to CSV format
   * @param {Object} data - Data to convert
   * @returns {string} CSV string
   */
  convertToCSV(data) {
    // For simplicity, we'll focus on exporting persons and meetings
    // as these have straightforward data structures
    let csvContent = '';
    
    // Export persons if available
    if (data.persons && data.persons.length > 0) {
      csvContent += 'PERSONS\n';
      
      // Create header row
      const personFields = [
        'id', 'name', 'lat', 'lng', 'group', 'familyId', 'familyRole',
        'elder', 'servant', 'pioneer', 'publisher', 'leader', 'helper', 'familyHead', 'spouse', 'child'
      ];
      
      csvContent += personFields.join(',') + '\n';
      
      // Add data rows
      data.persons.forEach(person => {
        const row = personFields.map(field => {
          const value = person[field];
          
          // Handle special values
          if (value === null || value === undefined) {
            return '';
          } else if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          } else {
            return value.toString();
          }
        });
        
        csvContent += row.join(',') + '\n';
      });
      
      // Add separator
      csvContent += '\n';
    }
    
    // Export meetings if available
    if (data.meetings && data.meetings.length > 0) {
      csvContent += 'MEETINGS\n';
      
      // Create header row
      const meetingFields = [
        'id', 'name', 'description', 'lat', 'lng', 'group'
      ];
      
      csvContent += meetingFields.join(',') + '\n';
      
      // Add data rows
      data.meetings.forEach(meeting => {
        const row = meetingFields.map(field => {
          const value = meeting[field];
          
          // Handle special values
          if (value === null || value === undefined) {
            return '';
          } else if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          } else {
            return value.toString();
          }
        });
        
        csvContent += row.join(',') + '\n';
      });
    }
    
    // Note: Groups and families are more complex and would require more sophisticated
    // CSV handling due to nested data structures. For a complete solution,
    // we recommend using JSON format instead.
    
    return csvContent;
  }
  
  /**
   * Create a download for a file
   * @param {string} content - File content
   * @param {string} fileName - File name
   * @param {string} mimeType - MIME type
   * @returns {Promise} Promise that resolves when download starts
   */
  downloadFile(content, fileName, mimeType) {
    return new Promise((resolve, reject) => {
      try {
        // Create blob
        const blob = new Blob([content], { type: mimeType });
        
        // Create download URL
        const url = URL.createObjectURL(blob);
        
        // Create and configure download link
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = fileName;
        downloadLink.style.display = 'none';
        
        // Add to document and click
        document.body.appendChild(downloadLink);
        downloadLink.click();
        
        // Clean up
        setTimeout(() => {
          // Remove link
          document.body.removeChild(downloadLink);
          
          // Revoke URL
          URL.revokeObjectURL(url);
          
          // Resolve promise
          resolve();
        }, 100);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Preview import data from a file
   * @param {File} file - File to import
   * @returns {Promise<Object>} Preview data
   */
  async previewImport(file) {
    try {
      // Determine file type from extension
      const fileType = file.name.split('.').pop().toLowerCase();
      
      if (fileType === 'json') {
        return await this.previewJsonImport(file);
      } else if (fileType === 'csv') {
        return await this.previewCsvImport(file);
      } else {
        throw new Error('Unsupported file type. Only JSON and CSV are supported.');
      }
    } catch (error) {
      errorHandler.handleError(
        error,
        'Previewing Import',
        ErrorSeverity.WARNING,
        ErrorType.UNKNOWN
      );
      throw error;
    }
  }
  
  /**
   * Preview JSON import
   * @param {File} file - JSON file
   * @returns {Promise<Object>} Preview data
   */
  async previewJsonImport(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          // Parse JSON
          const jsonData = JSON.parse(e.target.result);
          
          // Validate structure
          const preview = {};
          
          if (jsonData.persons && Array.isArray(jsonData.persons)) {
            preview.persons = jsonData.persons;
          }
          
          if (jsonData.meetings && Array.isArray(jsonData.meetings)) {
            preview.meetings = jsonData.meetings;
          }
          
          if (jsonData.groups && Array.isArray(jsonData.groups)) {
            preview.groups = jsonData.groups;
          }
          
          if (jsonData.families && Array.isArray(jsonData.families)) {
            preview.families = jsonData.families;
          }
          
          if (jsonData.config && typeof jsonData.config === 'object') {
            preview.config = jsonData.config;
          }
          
          resolve(preview);
        } catch (error) {
          reject(new Error('Invalid JSON file format. Please check the file and try again.'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file. Please try again.'));
      };
      
      reader.readAsText(file);
    });
  }
  
  /**
   * Preview CSV import
   * @param {File} file - CSV file
   * @returns {Promise<Object>} Preview data
   */
  async previewCsvImport(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          // Parse CSV
          const csvData = e.target.result;
          const importData = this.parseCSV(csvData);
          
          resolve(importData);
        } catch (error) {
          reject(new Error('Invalid CSV file format. Please check the file and try again.'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file. Please try again.'));
      };
      
      reader.readAsText(file);
    });
  }
  
  /**
   * Parse CSV data
   * @param {string} csv - CSV string
   * @returns {Object} Parsed data
   */
  parseCSV(csv) {
    // Split into lines
    const lines = csv.split('\n').map(line => line.trim()).filter(line => line);
    
    // Initialize result
    const result = {};
    
    // Current section
    let currentSection = null;
    let headers = null;
    let currentData = [];
    
    // Process lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for section header
      if (line === 'PERSONS' || line === 'MEETINGS') {
        // Save previous section if needed
        if (currentSection && headers && currentData.length > 0) {
          result[currentSection.toLowerCase()] = currentData;
        }
        
        // Start new section
        currentSection = line;
        headers = null;
        currentData = [];
        continue;
      }
      
      // Skip if no section
      if (!currentSection) {
        continue;
      }
      
      // Handle headers
      if (!headers) {
        headers = this.parseCSVLine(line);
        continue;
      }
      
      // Parse data line
      const values = this.parseCSVLine(line);
      
      // Create object from headers and values
      if (values.length === headers.length) {
        const obj = {};
        
        headers.forEach((header, index) => {
          // Convert to appropriate types
          let value = values[index];
          
          if (value === '') {
            value = null;
          } else if (value === 'true') {
            value = true;
          } else if (value === 'false') {
            value = false;
          } else if (!isNaN(value) && value.trim() !== '') {
            value = Number(value);
          }
          
          obj[header] = value;
        });
        
        currentData.push(obj);
      }
    }
    
    // Save last section
    if (currentSection && headers && currentData.length > 0) {
      result[currentSection.toLowerCase()] = currentData;
    }
    
    return result;
  }
  
  /**
   * Parse a CSV line considering quoted values
   * @param {string} line - CSV line
   * @returns {Array<string>} Array of values
   */
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add last value
    result.push(current);
    
    return result;
  }
  
  /**
   * Import data from a file
   * @param {File} file - File to import
   * @param {string} mode - Import mode ('merge' or 'replace')
   * @returns {Promise<Object>} Import result
   */
  async importData(file, mode = 'merge') {
    try {
      // Validate mode
      if (mode !== 'merge' && mode !== 'replace') {
        throw new Error('Invalid import mode. Must be "merge" or "replace".');
      }
      
      // Determine file type from extension
      const fileType = file.name.split('.').pop().toLowerCase();
      
      // Parse file data
      let importData;
      
      if (fileType === 'json') {
        importData = await this.previewJsonImport(file);
      } else if (fileType === 'csv') {
        importData = await this.previewCsvImport(file);
      } else {
        throw new Error('Unsupported file type. Only JSON and CSV are supported.');
      }
      
      // Import statistics
      const stats = {
        persons: 0,
        meetings: 0,
        groups: 0,
        families: 0,
        config: false
      };
      
      // Replace mode: clear existing data
      if (mode === 'replace') {
        // Clear all data
        if (importData.persons) stateManager.setState('persons', []);
        if (importData.meetings) stateManager.setState('meetingPoints', []);
        if (importData.groups) stateManager.setState('groups', []);
        if (importData.families) stateManager.setState('families', []);
      }
      
      // Import persons
      if (importData.persons && importData.persons.length > 0) {
        for (const personData of importData.persons) {
          try {
            // Check if person already exists
            const existingPerson = personService.getPersonById(personData.id);
            
            if (existingPerson) {
              // Update existing person
              personService.updatePerson(personData.id, personData);
            } else {
              // Create new person
              personService.createPerson(personData);
            }
            
            stats.persons++;
          } catch (personError) {
            console.error('Error importing person:', personError);
            // Continue with next person
          }
        }
      }
      
      // Import meetings
      if (importData.meetings && importData.meetings.length > 0) {
        for (const meetingData of importData.meetings) {
          try {
            // Check if meeting already exists
            const existingMeeting = meetingService.getMeetingById(meetingData.id);
            
            if (existingMeeting) {
              // Update existing meeting
              meetingService.updateMeeting(meetingData.id, meetingData);
            } else {
              // Create new meeting
              meetingService.createMeeting(meetingData);
            }
            
            stats.meetings++;
          } catch (meetingError) {
            console.error('Error importing meeting:', meetingError);
            // Continue with next meeting
          }
        }
      }
      
      // Import groups
      if (importData.groups && importData.groups.length > 0) {
        for (const groupData of importData.groups) {
          try {
            // Check if group already exists
            const existingGroup = groupService.getGroupById(groupData.id);
            
            if (existingGroup) {
              // Update existing group
              groupService.updateGroup(groupData.id, groupData);
            } else {
              // Create new group
              groupService.createGroup(groupData);
            }
            
            stats.groups++;
          } catch (groupError) {
            console.error('Error importing group:', groupError);
            // Continue with next group
          }
        }
      }
      
      // Import families
      if (importData.families && importData.families.length > 0) {
        for (const familyData of importData.families) {
          try {
            // Check if family already exists
            const existingFamily = familyService.getFamilyById(familyData.id);
            
            if (existingFamily) {
              // Update existing family
              familyService.updateFamily(familyData.id, familyData);
            } else {
              // Create new family
              familyService.createFamily(familyData);
            }
            
            stats.families++;
          } catch (familyError) {
            console.error('Error importing family:', familyError);
            // Continue with next family
          }
        }
      }
      
      // Import config
      if (importData.config) {
        try {
          // Update config
          stateManager.setState('config', importData.config);
          stats.config = true;
        } catch (configError) {
          console.error('Error importing config:', configError);
        }
      }
      
      // Return result
      return {
        success: true,
        mode,
        fileName: file.name,
        stats
      };
    } catch (error) {
      errorHandler.handleError(
        error,
        'Importing Data',
        ErrorSeverity.ERROR,
        ErrorType.UNKNOWN
      );
      throw error;
    }
  }
  
  /**
   * Get a timestamp string for file naming
   * @returns {string} Timestamp string (YYYYMMDD-HHMMSS)
   */
  getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}-${hours}${minutes}${seconds}`;
  }
}

// Export a singleton instance
export const importExportService = new ImportExportService();
export default importExportService;