// src/ui/components/SidebarWrapper.js
import Sidebar from './Sidebar';

export function createSidebar(container, options = {}) {
  return new Sidebar(container, options);
}

export default Sidebar;