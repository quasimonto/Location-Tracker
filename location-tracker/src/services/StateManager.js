/**
 * StateManager.js
 * Centralized state management for the Location Tracker application
 * 
 * This class provides a central store for application state with:
 * - Controlled state updates
 * - Subscription system for reactive UI updates
 * - Persistence to localStorage
 */

class StateManager {
    constructor() {
      this.state = {
        persons: [],
        meetingPoints: [],
        groups: [],
        families: [],
        config: {
          appearance: {
            person: {
              icon: 'default',
              color: '#FF0000'
            },
            meeting: {
              icon: 'blue-dot',
              color: '#0000FF'
            },
            group: {
              style: 'circle'
            }
          },
          autoGrouping: {
            distanceThreshold: 1.0,
            minGroupSize: 2,
            maxGroupSize: 20,
            maxGroupSizeDifference: 5,
            keepFamiliesTogether: true,
            requirements: {
              minElders: 0,
              minServants: 0,
              minPioneers: 0,
              minLeaders: 1,
              minHelpers: 1,
              minPublishers: 0
            }
          }
        },
        ui: {
          selectedPerson: null,
          selectedMeeting: null,
          selectedGroup: null,
          selectedFamily: null,
          mapClickMode: null,
          filters: {
            nameFilter: '',
            roleFilters: {
              elder: false,
              servant: false,
              pioneer: false,
              familyHead: false,
              leader: false,
              helper: false,
              publisher: false
            },
            visibility: {
              persons: true,
              meetings: true,
              groups: true
            }
          }
        }
      };
  
      this.subscribers = {};
      this.loadFromStorage();
    }
  
    /**
     * Get a deep copy of the entire state or a specific path
     * @param {string} [path] - Optional dot notation path to get a specific part of state
     * @returns {*} The requested state
     */
    getState(path) {
      if (!path) {
        return structuredClone(this.state);
      }
  
      const parts = path.split('.');
      let value = this.state;
  
      for (const part of parts) {
        if (value === undefined || value === null) {
          return undefined;
        }
        value = value[part];
      }
  
      // Return a deep copy to prevent uncontrolled mutations
      return value !== undefined ? structuredClone(value) : undefined;
    }
  
    /**
     * Update a specific part of the state
     * @param {string} path - Dot notation path to update
     * @param {*} value - New value
     */
    setState(path, value) {
      if (!path) {
        console.error('Path is required for setState');
        return;
      }
  
      const parts = path.split('.');
      let current = this.state;
      
      // Navigate to the parent of the property we want to update
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        
        // If the path doesn't exist, create it
        if (current[part] === undefined) {
          current[part] = {};
        }
        
        current = current[part];
      }
      
      // Update the property
      const lastPart = parts[parts.length - 1];
      current[lastPart] = structuredClone(value);
      
      // Notify subscribers
      this.notifySubscribers(path);
      
      // Persist state to storage
      this.saveToStorage();
    }
  
    /**
     * Subscribe to changes at a specific path
     * @param {string} path - Dot notation path to subscribe to
     * @param {Function} callback - Function to call when state changes
     * @returns {Function} Unsubscribe function
     */
    subscribe(path, callback) {
      if (!this.subscribers[path]) {
        this.subscribers[path] = new Set();
      }
      
      this.subscribers[path].add(callback);
      
      // Return unsubscribe function
      return () => {
        if (this.subscribers[path]) {
          this.subscribers[path].delete(callback);
        }
      };
    }
  
    /**
     * Notify subscribers of state changes
     * @param {string} changedPath - Path that changed
     */
    notifySubscribers(changedPath) {
      // Get all paths that are affected by this change
      const paths = this.getAffectedPaths(changedPath);
      
      // Notify subscribers for each affected path
      paths.forEach(path => {
        if (this.subscribers[path]) {
          const value = this.getState(path);
          this.subscribers[path].forEach(callback => {
            try {
              callback(value);
            } catch (error) {
              console.error(`Error in subscriber callback for path ${path}:`, error);
            }
          });
        }
      });
    }
  
    /**
     * Get all paths that are affected by a change
     * @param {string} changedPath - Path that changed
     * @returns {Array} Array of affected paths
     */
    getAffectedPaths(changedPath) {
      const paths = [changedPath];
      
      // Add parent paths
      let path = changedPath;
      while (path.includes('.')) {
        path = path.substring(0, path.lastIndexOf('.'));
        paths.push(path);
      }
      
      // Add the root path
      if (!paths.includes('')) {
        paths.push('');
      }
      
      return paths;
    }
  
    /**
     * Save state to localStorage
     */
    saveToStorage() {
      try {
        const serializedState = JSON.stringify(this.state);
        localStorage.setItem('locationTrackerState', serializedState);
      } catch (error) {
        console.error('Error saving state to localStorage:', error);
      }
    }
  
    /**
     * Load state from localStorage
     */
    loadFromStorage() {
      try {
        const serializedState = localStorage.getItem('locationTrackerState');
        if (serializedState) {
          this.state = JSON.parse(serializedState);
        }
      } catch (error) {
        console.error('Error loading state from localStorage:', error);
      }
    }
  
    /**
     * Reset state to default values
     */
    resetState() {
      // Create a new instance to get default state
      const defaultState = new StateManager().state;
      this.state = structuredClone(defaultState);
      this.notifySubscribers('');
      this.saveToStorage();
    }
  }
  
  // Export a singleton instance
  export const stateManager = new StateManager();
  export default stateManager;