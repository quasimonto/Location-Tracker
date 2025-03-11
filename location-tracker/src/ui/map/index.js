/**
 * index.js
 * Export all map-related components
 */

export { default as MapContainer } from './MapContainer';
export { default as InfoWindow } from './InfoWindow';
export { default as MapControls } from './MapControls';

// Create and export the createMapContainer factory function
export function createMapContainer(container, options) {
  const MapContainer = require('./MapContainer').default;
  return MapContainer.create(container, options);
}