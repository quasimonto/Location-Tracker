/**
 * EventBus.js
 * Event handling system for decoupled component communication
 * 
 * This provides a publish/subscribe pattern for components to communicate
 * without direct dependencies
 */

/**
 * EventBus class for managing application-wide events
 */
class EventBus {
    constructor() {
      this.events = {};
      
      // Standard events used throughout the application
      this.EVENT_TYPES = {
        // Person events
        PERSON_CREATED: 'person:created',
        PERSON_UPDATED: 'person:updated',
        PERSON_DELETED: 'person:deleted',
        PERSON_SELECTED: 'person:selected',
        
        // Meeting events
        MEETING_CREATED: 'meeting:created',
        MEETING_UPDATED: 'meeting:updated',
        MEETING_DELETED: 'meeting:deleted',
        MEETING_SELECTED: 'meeting:selected',
        
        // Group events
        GROUP_CREATED: 'group:created',
        GROUP_UPDATED: 'group:updated',
        GROUP_DELETED: 'group:deleted',
        GROUP_SELECTED: 'group:selected',
        
        // Map events
        MAP_CLICK: 'map:click',
        MAP_MARKER_CLICK: 'map:marker:click',
        MAP_READY: 'map:ready',
        
        // UI events
        UI_TAB_CHANGED: 'ui:tab:changed',
        UI_FILTER_CHANGED: 'ui:filter:changed',
        UI_MODE_CHANGED: 'ui:mode:changed',
        
        // Data events
        DATA_IMPORTED: 'data:imported',
        DATA_EXPORTED: 'data:exported',
        DATA_LOADED: 'data:loaded',
        DATA_SAVED: 'data:saved'
      };
    }
    
    /**
     * Subscribe to an event
     * @param {string} eventName - Name of the event to subscribe to
     * @param {Function} callback - Function to call when the event occurs
     * @returns {Function} Unsubscribe function
     */
    on(eventName, callback) {
      if (!this.events[eventName]) {
        this.events[eventName] = [];
      }
      this.events[eventName].push(callback);
      
      // Return unsubscribe function
      return () => {
        this.events[eventName] = this.events[eventName].filter(
          eventCallback => eventCallback !== callback
        );
      };
    }
    
    /**
     * Subscribe to an event and automatically unsubscribe after it occurs once
     * @param {string} eventName - Name of the event to subscribe to
     * @param {Function} callback - Function to call when the event occurs
     * @returns {Function} Unsubscribe function
     */
    once(eventName, callback) {
      const unsubscribe = this.on(eventName, (...args) => {
        unsubscribe();
        callback(...args);
      });
      
      return unsubscribe;
    }
    
    /**
     * Emit an event
     * @param {string} eventName - Name of the event to emit
     * @param {*} data - Data to pass to callbacks
     */
    emit(eventName, data) {
      if (this.events[eventName]) {
        this.events[eventName].forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error(`Error in event handler for ${eventName}:`, error);
          }
        });
      }
    }
    
    /**
     * Remove all subscriptions for an event
     * @param {string} eventName - Name of the event to clear
     */
    off(eventName) {
      if (eventName) {
        delete this.events[eventName];
      } else {
        this.events = {};
      }
    }
    
    /**
     * Get a list of all event names with subscribers
     * @returns {Array} Array of event names
     */
    getActiveEvents() {
      return Object.keys(this.events);
    }
    
    /**
     * Get the number of subscribers for an event
     * @param {string} eventName - Name of the event
     * @returns {number} Number of subscribers
     */
    getSubscriberCount(eventName) {
      return this.events[eventName] ? this.events[eventName].length : 0;
    }
    
    /**
     * Debug all event subscriptions
     * @returns {Object} Event subscription information
     */
    debug() {
      const eventSummary = {};
      
      Object.keys(this.events).forEach(eventName => {
        eventSummary[eventName] = this.events[eventName].length;
      });
      
      return eventSummary;
    }
  }
  
  // Export a singleton instance
  export const eventBus = new EventBus();
  export default eventBus;