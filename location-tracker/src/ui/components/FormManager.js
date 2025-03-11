/**
 * FormManager.js
 * Central manager for handling different form types in the application
 */

import PersonForm, { FormMode as PersonFormMode } from './PersonForm';
import MeetingForm, { FormMode as MeetingFormMode } from './MeetingForm';
import GroupForm, { FormMode as GroupFormMode } from './GroupForm';
import FamilyForm, { FormMode as FamilyFormMode } from './FamilyForm';
import { EventBus, Events } from '../../app/EventBus';

/**
 * FormManager class for managing forms throughout the application
 */
class FormManager {
  constructor() {
    // Subscribe to form creation events
    this.setupEventSubscriptions();
  }
  
    /**
 * Open the import/export modal
 * @param {string} initialTab - Initial tab to show ('export' or 'import')
 */
    openImportExportModal(initialTab = 'export') {
    // Import the modal dynamically to avoid circular dependencies
    import('./ImportExportModal').then(module => {
      const ImportExportModal = module.default;
      
      ImportExportModal.create({
        initialTab,
        onComplete: () => {
          // Refresh UI components after import/export
          EventBus.publish(Events.DATA_UPDATED);
        }
      });
    }).catch(error => {
      console.error('Error loading ImportExportModal:', error);
    });
  }


  /**
   * Set up event subscriptions for form creation
   */
  setupEventSubscriptions() {
    //Import-Export forms
    EventBus.on(Events.EXPORT_DATA_CLICKED, () => {
        this.openImportExportModal();
      });
      
      EventBus.on(Events.IMPORT_DATA_CLICKED, () => {
        this.openImportExportModal('import');
      });
    // Person forms
    EventBus.on(Events.ADD_PERSON_CLICKED, () => {
      this.createPersonForm();
    });
    
    EventBus.on(Events.EDIT_PERSON_CLICKED, (person) => {
      this.editPersonForm(person);
    });
    
    // Meeting forms
    EventBus.on(Events.ADD_MEETING_CLICKED, () => {
      this.createMeetingForm();
    });
    
    EventBus.on(Events.EDIT_MEETING_CLICKED, (meeting) => {
      this.editMeetingForm(meeting);
    });
    
    // Group forms
    EventBus.on(Events.CREATE_GROUP_CLICKED, () => {
      this.createGroupForm();
    });
    
    EventBus.on(Events.EDIT_GROUP_CLICKED, (group) => {
      this.editGroupForm(group);
    });
    
    // Family forms
    EventBus.on(Events.ADD_FAMILY_CLICKED, () => {
      this.createFamilyForm();
    });
    
    EventBus.on(Events.EDIT_FAMILY_CLICKED, (family) => {
      this.editFamilyForm(family);
    });
  }
  
  /**
   * Create a new person form
   * @param {Object} options - Additional options for the form
   */
  createPersonForm(options = {}) {
    return PersonForm.create({
      mode: PersonFormMode.CREATE,
      onSave: (person) => {
        // Notify that a person was created
        EventBus.publish(Events.PERSON_CREATED, person);
      },
      ...options
    });
  }
  
  /**
   * Create a form to edit an existing person
   * @param {Object} person - Person to edit
   * @param {Object} options - Additional options for the form
   */
  editPersonForm(person, options = {}) {
    if (!person) {
      console.error('Cannot edit person: No person data provided');
      return null;
    }
    
    return PersonForm.create({
      mode: PersonFormMode.EDIT,
      person,
      onSave: (updatedPerson) => {
        // Notify that a person was updated
        EventBus.publish(Events.PERSON_UPDATED, updatedPerson);
      },
      ...options
    });
  }
  
  /**
   * Create a new meeting form
   * @param {Object} options - Additional options for the form
   */
  createMeetingForm(options = {}) {
    return MeetingForm.create({
      mode: MeetingFormMode.CREATE,
      onSave: (meeting) => {
        // Notify that a meeting was created
        EventBus.publish(Events.MEETING_CREATED, meeting);
      },
      ...options
    });
  }
  
  /**
   * Create a form to edit an existing meeting
   * @param {Object} meeting - Meeting to edit
   * @param {Object} options - Additional options for the form
   */
  editMeetingForm(meeting, options = {}) {
    if (!meeting) {
      console.error('Cannot edit meeting: No meeting data provided');
      return null;
    }
    
    return MeetingForm.create({
      mode: MeetingFormMode.EDIT,
      meeting,
      onSave: (updatedMeeting) => {
        // Notify that a meeting was updated
        EventBus.publish(Events.MEETING_UPDATED, updatedMeeting);
      },
      ...options
    });
  }
  
  /**
   * Create a new group form
   * @param {Object} options - Additional options for the form
   */
  createGroupForm(options = {}) {
    return GroupForm.create({
      mode: GroupFormMode.CREATE,
      onSave: (group) => {
        // Notify that a group was created
        EventBus.publish(Events.GROUP_CREATED, group);
      },
      ...options
    });
  }
  
  /**
   * Create a form to edit an existing group
   * @param {Object} group - Group to edit
   * @param {Object} options - Additional options for the form
   */
  editGroupForm(group, options = {}) {
    if (!group) {
      console.error('Cannot edit group: No group data provided');
      return null;
    }
    
    return GroupForm.create({
      mode: GroupFormMode.EDIT,
      group,
      onSave: (updatedGroup) => {
        // Notify that a group was updated
        EventBus.publish(Events.GROUP_UPDATED, updatedGroup);
      },
      ...options
    });
  }
  
  /**
   * Create a new family form
   * @param {Object} options - Additional options for the form
   */
  createFamilyForm(options = {}) {
    return FamilyForm.create({
      mode: FamilyFormMode.CREATE,
      onSave: (family) => {
        // Notify that a family was created
        EventBus.publish(Events.FAMILY_CREATED, family);
      },
      ...options
    });
  }
  
  /**
   * Create a form to edit an existing family
   * @param {Object} family - Family to edit
   * @param {Object} options - Additional options for the form
   */
  editFamilyForm(family, options = {}) {
    if (!family) {
      console.error('Cannot edit family: No family data provided');
      return null;
    }
    
    return FamilyForm.create({
      mode: FamilyFormMode.EDIT,
      family,
      onSave: (updatedFamily) => {
        // Notify that a family was updated
        EventBus.publish(Events.FAMILY_UPDATED, updatedFamily);
      },
      ...options
    });
  }
}

// Export a singleton instance
export const formManager = new FormManager();
export default formManager;