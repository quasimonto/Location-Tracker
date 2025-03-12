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
    this.subscribers = {};
  }
  
  subscribe(event, callback) {
    if (!this.subscribers[event]) {
      this.subscribers[event] = [];
    }
    
    this.subscribers[event].push(callback);
    return () => this.unsubscribe(event, callback);
  }
  
  unsubscribe(event, callback) {
    if (!this.subscribers[event]) return;
    this.subscribers[event] = this.subscribers[event].filter(cb => cb !== callback);
  }
  
  publish(event, data) {
    if (!this.subscribers[event]) return;
    this.subscribers[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event subscriber for ${event}:`, error);
      }
    });
  }
  

  
  // Add aliases for compatibility
  on(event, callback) { return this.subscribe(event, callback); }
  off(event, callback) { this.unsubscribe(event, callback); }
  emit(event, data) { this.publish(event, data); }
}

// Inside EventBus.js, before the exports:
 const Events = {
  // Add the basic events you need
  PERSON_UPDATED: 'personUpdated',
  PERSON_DELETED: 'personDeleted',
  FAMILY_CREATED: 'familyCreated',
  FAMILY_UPDATED: 'familyUpdated',
  FAMILY_DELETED: 'familyDeleted',
  FAMILIES_UPDATED: 'familiesUpdated'
  // Add any other events referenced in your code
};

// At the bottom of the file, replace any existing exports with:
const eventBus = new EventBus();

// Export as both named exports AND default export
export { eventBus as EventBus, Events };
export default eventBus;