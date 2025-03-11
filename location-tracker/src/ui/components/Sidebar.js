// src/ui/components/Sidebar.js
/**
 * Sidebar.js
 * Sidebar component for the application
 */

/**
 * Create and initialize the sidebar
 * @param {HTMLElement} container - The DOM element to contain the sidebar
 */
export function createSidebar(container) {
    console.log('Sidebar initialization (placeholder)');
    
    // For now, just add some basic content to show it's working
    container.innerHTML = `
      <h2>Location Tracker</h2>
      <div class="sidebar-content">
        <p>Sidebar component placeholder</p>
      </div>
    `;
  }
  
  export default createSidebar;