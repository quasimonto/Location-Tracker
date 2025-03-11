/**
 * DashboardView.js
 * Dashboard view for displaying statistics and insights
 */

import { EventBus, Events } from '../../app/EventBus';
import statisticsService from '../../services/StatisticsService';
import { stateManager } from '../../services/StateManager';
import { formatTravelTime } from '../../utils/mapUtils';
import { errorHandler, ErrorType, ErrorSeverity } from '../../utils/errorHandler';

/**
 * DashboardView class for statistics display
 */
class DashboardView {
  /**
   * Create a new DashboardView instance
   * @param {HTMLElement} container - Container element to render the dashboard in
   */
  constructor(container) {
    this.container = container;
    this.stats = null;
    this.groupStats = null;
    this.familyStats = null;
    this.travelStats = null;
    
    // Initialize the dashboard
    this.init();
  }
  
  /**
   * Initialize the dashboard
   */
  async init() {
    try {
      // Show loading state
      this.showLoading();
      
      // Load statistics data
      await this.loadStatistics();
      
      // Render the dashboard
      this.render();
      
      // Subscribe to events for dashboard updates
      this.setupEventSubscriptions();
    } catch (error) {
      errorHandler.handleError(
        error,
        'Dashboard Initialization',
        ErrorSeverity.ERROR,
        ErrorType.UNKNOWN
      );
      
      // Show error UI
      this.showError('Failed to initialize dashboard');
    }
  }
  
  /**
   * Load statistics data
   */
  async loadStatistics() {
    // Get overall statistics
    this.stats = statisticsService.getOverallStatistics();
    
    // Get group statistics
    this.groupStats = statisticsService.getGroupStatistics();
    
    // Get family statistics
    this.familyStats = statisticsService.getFamilyStatistics();
    
    // Get travel statistics (async)
    this.travelStats = await statisticsService.getTravelStatistics();
  }
  
  /**
   * Set up event subscriptions for dashboard updates
   */
  setupEventSubscriptions() {
    // Listen for data changes
    EventBus.on(Events.PERSONS_UPDATED, this.handleDataUpdate.bind(this));
    EventBus.on(Events.MEETINGS_UPDATED, this.handleDataUpdate.bind(this));
    EventBus.on(Events.GROUPS_UPDATED, this.handleDataUpdate.bind(this));
    EventBus.on(Events.FAMILIES_UPDATED, this.handleDataUpdate.bind(this));
    
    // Listen for import events
    EventBus.on(Events.DATA_IMPORTED, this.handleDataUpdate.bind(this));
    EventBus.on(Events.DATA_UPDATED, this.handleDataUpdate.bind(this));
  }
  
  /**
   * Handle data update event
   */
  async handleDataUpdate() {
    // Show loading state
    this.showLoading();
    
    // Reload statistics
    await this.loadStatistics();
    
    // Re-render dashboard
    this.render();
  }
  
  /**
   * Show loading state
   */
  showLoading() {
    this.container.innerHTML = `
      <div class="dashboard-loading">
        <div class="loading-spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    `;
  }
  
  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    this.container.innerHTML = `
      <div class="dashboard-error">
        <div class="error-icon">❌</div>
        <h3>Dashboard Error</h3>
        <p>${message}</p>
        <button class="retry-button" id="dashboard-retry">Retry</button>
      </div>
    `;
    
    // Add retry button handler
    const retryButton = document.getElementById('dashboard-retry');
    if (retryButton) {
      retryButton.addEventListener('click', () => {
        this.init();
      });
    }
  }
  
  /**
   * Render the dashboard
   */
  render() {
    if (!this.stats) {
      this.showError('No statistics data available');
      return;
    }
    
    // Create dashboard HTML
    const dashboardHtml = `
      <div class="dashboard-container">
        <h2 class="dashboard-title">Location Tracker Dashboard</h2>
        
        <!-- Overview Section -->
        <div class="dashboard-section">
          <h3 class="section-title">Overview</h3>
          
          <div class="stat-cards">
            <div class="stat-card">
              <div class="stat-value">${this.stats.counts.persons}</div>
              <div class="stat-label">People</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${this.stats.counts.meetings}</div>
              <div class="stat-label">Meeting Points</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${this.stats.counts.groups}</div>
              <div class="stat-label">Groups</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${this.stats.counts.families}</div>
              <div class="stat-label">Families</div>
            </div>
          </div>
          
          <div class="stat-summary">
            <div class="summary-row">
              <div class="summary-label">Grouped:</div>
              <div class="summary-value">${this.stats.grouping.grouped} people (${this.stats.grouping.groupedPercent}%)</div>
            </div>
            <div class="summary-row">
              <div class="summary-label">In Families:</div>
              <div class="summary-value">${this.stats.families.inFamily} people (${this.stats.families.inFamilyPercent}%)</div>
            </div>
            <div class="summary-row">
              <div class="summary-label">Avg Family Size:</div>
              <div class="summary-value">${this.stats.families.averageFamilySize} people</div>
            </div>
          </div>
        </div>
        
        <!-- Role Distribution -->
        <div class="dashboard-section">
          <h3 class="section-title">Role Distribution</h3>
          
          <div class="role-distribution">
            ${this.renderRoleDistribution()}
          </div>
        </div>
        
        <!-- Groups Section -->
        <div class="dashboard-section">
          <h3 class="section-title">Groups</h3>
          
          ${this.renderGroupsTable()}
        </div>
        
        <!-- Families Section -->
        <div class="dashboard-section">
          <h3 class="section-title">Families</h3>
          
          ${this.renderFamiliesTable()}
        </div>
        
        <!-- Travel Times Section -->
        <div class="dashboard-section">
          <h3 class="section-title">Travel Times</h3>
          
          ${this.renderTravelStats()}
        </div>
      </div>
    `;
    
    // Update container
    this.container.innerHTML = dashboardHtml;
    
    // After rendering, create charts
    this.createCharts();
  }
  
  /**
   * Render role distribution chart
   * @returns {string} HTML content
   */
  renderRoleDistribution() {
    if (!this.stats || !this.stats.roles) {
      return '<p>No role data available</p>';
    }
    
    const roles = this.stats.roles;
    const totalPersons = this.stats.counts.persons || 1; // Avoid divide by zero
    
    // Create horizontal bar chart
    return `
      <div class="role-chart">
        <div class="role-chart-container">
          <div class="role-bar-item">
            <div class="role-label">Elders</div>
            <div class="role-bar-container">
              <div class="role-bar" style="width: ${(roles.elders / totalPersons * 100).toFixed(1)}%">
                <span class="role-value">${roles.elders}</span>
              </div>
            </div>
          </div>
          
          <div class="role-bar-item">
            <div class="role-label">Servants</div>
            <div class="role-bar-container">
              <div class="role-bar" style="width: ${(roles.servants / totalPersons * 100).toFixed(1)}%">
                <span class="role-value">${roles.servants}</span>
              </div>
            </div>
          </div>
          
          <div class="role-bar-item">
            <div class="role-label">Pioneers</div>
            <div class="role-bar-container">
              <div class="role-bar" style="width: ${(roles.pioneers / totalPersons * 100).toFixed(1)}%">
                <span class="role-value">${roles.pioneers}</span>
              </div>
            </div>
          </div>
          
          <div class="role-bar-item">
            <div class="role-label">Publishers</div>
            <div class="role-bar-container">
              <div class="role-bar" style="width: ${(roles.publishers / totalPersons * 100).toFixed(1)}%">
                <span class="role-value">${roles.publishers}</span>
              </div>
            </div>
          </div>
          
          <div class="role-bar-item">
            <div class="role-label">Leaders</div>
            <div class="role-bar-container">
              <div class="role-bar" style="width: ${(roles.leaders / totalPersons * 100).toFixed(1)}%">
                <span class="role-value">${roles.leaders}</span>
              </div>
            </div>
          </div>
          
          <div class="role-bar-item">
            <div class="role-label">Helpers</div>
            <div class="role-bar-container">
              <div class="role-bar" style="width: ${(roles.helpers / totalPersons * 100).toFixed(1)}%">
                <span class="role-value">${roles.helpers}</span>
              </div>
            </div>
          </div>
          
          <div class="role-bar-item">
            <div class="role-label">Family Heads</div>
            <div class="role-bar-container">
              <div class="role-bar" style="width: ${(roles.familyHeads / totalPersons * 100).toFixed(1)}%">
                <span class="role-value">${roles.familyHeads}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Render groups table
   * @returns {string} HTML content
   */
  renderGroupsTable() {
    if (!this.groupStats || this.groupStats.length === 0) {
      return '<p>No group data available</p>';
    }
    
    // Create groups table
    let tableHtml = `
      <div class="table-responsive">
        <table class="dashboard-table groups-table">
          <thead>
            <tr>
              <th>Group</th>
              <th>People</th>
              <th>Meetings</th>
              <th>Families</th>
              <th>Requirements</th>
              <th>Roles</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    // Add rows for each group
    this.groupStats.forEach(groupStat => {
      const group = groupStat.group;
      const counts = groupStat.counts;
      const roles = groupStat.roles;
      
      tableHtml += `
        <tr>
          <td>
            <div class="group-name" style="border-left: 4px solid ${group.color}; padding-left: 8px;">
              ${group.name}
            </div>
          </td>
          <td>${counts.persons}</td>
          <td>${counts.meetings}</td>
          <td>${counts.families}</td>
          <td>
            <span class="requirements-badge ${groupStat.meetRequirements ? 'met' : 'not-met'}">
              ${groupStat.meetRequirements ? '✓ Met' : '✗ Not Met'}
            </span>
          </td>
          <td>
            <div class="roles-summary">
              ${roles.elders > 0 ? `<span class="role-tag">E: ${roles.elders}</span>` : ''}
              ${roles.servants > 0 ? `<span class="role-tag">S: ${roles.servants}</span>` : ''}
              ${roles.pioneers > 0 ? `<span class="role-tag">P: ${roles.pioneers}</span>` : ''}
              ${roles.leaders > 0 ? `<span class="role-tag">L: ${roles.leaders}</span>` : ''}
              ${roles.helpers > 0 ? `<span class="role-tag">H: ${roles.helpers}</span>` : ''}
            </div>
          </td>
        </tr>
      `;
    });
    
    tableHtml += `
          </tbody>
        </table>
      </div>
    `;
    
    return tableHtml;
  }
  
  /**
   * Render families table
   * @returns {string} HTML content
   */
  renderFamiliesTable() {
    if (!this.familyStats || this.familyStats.length === 0) {
      return '<p>No family data available</p>';
    }
    
    // Create families table
    let tableHtml = `
      <div class="table-responsive">
        <table class="dashboard-table families-table">
          <thead>
            <tr>
              <th>Family</th>
              <th>Members</th>
              <th>Structure</th>
              <th>Same Group</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    // Add rows for each family
    this.familyStats.forEach(familyStat => {
      const family = familyStat.family;
      const counts = familyStat.counts;
      
      // Structure representation
      const structureHtml = `
        ${counts.hasHead ? '<span class="structure-icon head-icon">👤</span>' : ''}
        ${counts.hasSpouse ? '<span class="structure-icon spouse-icon">👤</span>' : ''}
        ${counts.childrenCount > 0 ? 
          `<span class="structure-icon children-icon">👤 × ${counts.childrenCount}</span>` : 
          ''}
      `;
      
      // Group representation
      const groupPercent = familyStat.groups.sameGroupPercent;
      const groupHtml = `
        <div class="group-percentage">
          <div class="percentage-bar">
            <div class="percentage-fill" style="width: ${groupPercent}%"></div>
          </div>
          <div class="percentage-label">${groupPercent}%</div>
        </div>
      `;
      
      tableHtml += `
        <tr>
          <td>
            <div class="family-name" style="border-left: 4px solid ${family.color}; padding-left: 8px;">
              ${family.name}
            </div>
          </td>
          <td>${counts.total}</td>
          <td>
            <div class="family-structure">
              ${structureHtml}
            </div>
          </td>
          <td>
            ${groupHtml}
          </td>
        </tr>
      `;
    });
    
    tableHtml += `
          </tbody>
        </table>
      </div>
    `;
    
    return tableHtml;
  }
  
  /**
   * Render travel statistics
   * @returns {string} HTML content
   */
  renderTravelStats() {
    if (!this.travelStats) {
      return '<p>No travel data available</p>';
    }
    
    // Format average travel times
    const avgDriving = formatTravelTime(this.travelStats.averages.driving);
    const avgTransit = formatTravelTime(this.travelStats.averages.transit);
    const avgWalking = formatTravelTime(this.travelStats.averages.walking);
    
    let html = `
      <div class="travel-stats">
        <div class="avg-travel-times">
          <div class="stat-cards">
            <div class="stat-card">
              <div class="stat-icon">🚗</div>
              <div class="stat-value">${avgDriving}</div>
              <div class="stat-label">Avg Driving</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">🚌</div>
              <div class="stat-value">${avgTransit}</div>
              <div class="stat-label">Avg Transit</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">🚶</div>
              <div class="stat-value">${avgWalking}</div>
              <div class="stat-label">Avg Walking</div>
            </div>
          </div>
        </div>
    `;
    
    // Add closest/furthest meeting if available
    if (this.travelStats.closestMeeting && this.travelStats.furthestMeeting) {
      const closest = this.travelStats.closestMeeting;
      const furthest = this.travelStats.furthestMeeting;
      
      html += `
        <div class="travel-extremes">
          <div class="travel-extreme closest">
            <h4>Closest Person to Meeting</h4>
            <div class="extreme-details">
              <div class="extreme-pair">
                <div class="extreme-person">${closest.person.name}</div>
                <div class="extreme-distance">→ ${closest.travelTimes.driving.distance}</div>
                <div class="extreme-meeting">${closest.meeting.name}</div>
              </div>
              <div class="extreme-travel-times">
                <span class="travel-time"><span class="travel-icon">🚗</span> ${closest.travelTimes.driving.duration}</span>
                <span class="travel-time"><span class="travel-icon">🚌</span> ${closest.travelTimes.transit.duration}</span>
                <span class="travel-time"><span class="travel-icon">🚶</span> ${closest.travelTimes.walking.duration}</span>
              </div>
            </div>
          </div>
          
          <div class="travel-extreme furthest">
            <h4>Furthest Person from Meeting</h4>
            <div class="extreme-details">
              <div class="extreme-pair">
                <div class="extreme-person">${furthest.person.name}</div>
                <div class="extreme-distance">→ ${furthest.travelTimes.driving.distance}</div>
                <div class="extreme-meeting">${furthest.meeting.name}</div>
              </div>
              <div class="extreme-travel-times">
                <span class="travel-time"><span class="travel-icon">🚗</span> ${furthest.travelTimes.driving.duration}</span>
                <span class="travel-time"><span class="travel-icon">🚌</span> ${furthest.travelTimes.transit.duration}</span>
                <span class="travel-time"><span class="travel-icon">🚶</span> ${furthest.travelTimes.walking.duration}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    
    // Add travel matrix if available
    if (this.travelStats.travelMatrix && this.travelStats.travelMatrix.length > 0) {
      html += `
        <div class="travel-matrix">
          <h4>Travel Times to Closest Meeting</h4>
          <div class="table-responsive">
            <table class="dashboard-table travel-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Closest Meeting</th>
                  <th>Distance</th>
                  <th>Driving</th>
                  <th>Transit</th>
                  <th>Walking</th>
                </tr>
              </thead>
              <tbody>
      `;
      
      // Add rows for each person's closest meeting
      this.travelStats.travelMatrix.forEach(person => {
        if (person.travels && person.travels.length > 0) {
          const closestMeeting = person.travels[0]; // Travels are sorted by driving time
          
          html += `
            <tr>
              <td>${person.personName}</td>
              <td>${closestMeeting.meetingName}</td>
              <td>${closestMeeting.distance}</td>
              <td>${closestMeeting.driving}</td>
              <td>${closestMeeting.transit}</td>
              <td>${closestMeeting.walking}</td>
            </tr>
          `;
        }
      });
      
      html += `
              </tbody>
            </table>
          </div>
        </div>
      `;
    }
    
    html += `</div>`;
    
    return html;
  }
  
  /**
   * Create interactive charts
   * This would use a charting library like Chart.js in a real implementation
   */
  createCharts() {
    // In a real implementation, this would initialize interactive charts
    // using a library like Chart.js or D3.js
    
    // For now, we're using simple CSS-based charts
  }
  
  /**
   * Factory method to create a DashboardView instance
   * @param {HTMLElement} container - Container element
   * @returns {DashboardView} New DashboardView instance
   * @static
   */
  static create(container) {
    return new DashboardView(container);
  }
}

export default DashboardView;