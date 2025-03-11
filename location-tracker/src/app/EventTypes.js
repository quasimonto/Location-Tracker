/**
 * EventTypes.js
 * Centralized definition of event types used throughout the application
 */

/**
 * Application event types
 * @enum {string}
 */
export const Events = {
    // UI navigation events
    TAB_CHANGED: 'tabChanged',
    SEARCH_UPDATED: 'searchUpdated',
    FILTERS_UPDATED: 'filtersUpdated',
    VISIBILITY_TOGGLED: 'visibilityToggled',
    
    // Map events
    MAP_READY: 'mapReady',
    MAP_CLICKED: 'mapClicked',
    MAP_MOVED: 'mapMoved',
    MAP_ZOOM_CHANGED: 'mapZoomChanged',
    MARKER_CLICKED: 'markerClicked',
    MARKER_DRAGGED: 'markerDragged',
    
    // Item selection events
    ITEM_SELECTED: 'itemSelected',
    PERSON_SELECTED: 'personSelected',
    MEETING_SELECTED: 'meetingSelected',
    GROUP_SELECTED: 'groupSelected',
    FAMILY_SELECTED: 'familySelected',
    
    // Item drag events
    ITEM_DRAG_START: 'itemDragStart',
    ITEM_DRAG_END: 'itemDragEnd',
    ITEM_DROP: 'itemDrop',
    
    // CRUD action button events
    ADD_PERSON_CLICKED: 'addPersonClicked',
    EDIT_PERSON_CLICKED: 'editPersonClicked',
    DELETE_PERSON_CLICKED: 'deletePersonClicked',
    VIEW_PERSON_CLICKED: 'viewPersonClicked',
    
    ADD_MEETING_CLICKED: 'addMeetingClicked',
    EDIT_MEETING_CLICKED: 'editMeetingClicked',
    DELETE_MEETING_CLICKED: 'deleteMeetingClicked',
    VIEW_MEETING_CLICKED: 'viewMeetingClicked',
    
    CREATE_GROUP_CLICKED: 'createGroupClicked',
    EDIT_GROUP_CLICKED: 'editGroupClicked',
    DELETE_GROUP_CLICKED: 'deleteGroupClicked',
    VIEW_GROUP_CLICKED: 'viewGroupClicked',
    AUTO_GROUP_CLICKED: 'autoGroupClicked',
    
    ADD_FAMILY_CLICKED: 'addFamilyClicked',
    EDIT_FAMILY_CLICKED: 'editFamilyClicked',
    DELETE_FAMILY_CLICKED: 'deleteFamilyClicked',
    VIEW_FAMILY_CLICKED: 'viewFamilyClicked',
    
    // State change events
    PERSONS_UPDATED: 'personsUpdated',
    MEETINGS_UPDATED: 'meetingsUpdated',
    GROUPS_UPDATED: 'groupsUpdated',
    FAMILIES_UPDATED: 'familiesUpdated',
    
    PERSON_CREATED: 'personCreated',
    PERSON_UPDATED: 'personUpdated',
    PERSON_DELETED: 'personDeleted',
    
    MEETING_CREATED: 'meetingCreated',
    MEETING_UPDATED: 'meetingUpdated',
    MEETING_DELETED: 'meetingDeleted',
    
    GROUP_CREATED: 'groupCreated',
    GROUP_UPDATED: 'groupUpdated',
    GROUP_DELETED: 'groupDeleted',
    
    FAMILY_CREATED: 'familyCreated',
    FAMILY_UPDATED: 'familyUpdated',
    FAMILY_DELETED: 'familyDeleted',
    
    // Modal events
    MODAL_OPENED: 'modalOpened',
    MODAL_CLOSED: 'modalClosed',
    MODAL_CONFIRMED: 'modalConfirmed',
    MODAL_CANCELLED: 'modalCancelled',
    MODAL_DESTROYED: 'modalDestroyed',
    
    // Form events
    FORM_SUBMITTED: 'formSubmitted',
    FORM_CANCELLED: 'formCancelled',
    FORM_VALUE_CHANGED: 'formValueChanged',
    FORM_VALIDATION_ERROR: 'formValidationError',
    FORM_RESET: 'formReset',
    FORM_CLEARED: 'formCleared',
    
    // Configuration events
    OPEN_CONFIG_CLICKED: 'openConfigClicked',
    CONFIG_UPDATED: 'configUpdated',
    
    // Import/export events
    EXPORT_DATA_CLICKED: 'exportDataClicked',
    IMPORT_DATA_CLICKED: 'importDataClicked',
    IMPORT_FILE_SELECTED: 'importFileSelected',
    IMPORT_COMPLETED: 'importCompleted',
    EXPORT_COMPLETED: 'exportCompleted',

    
    // Data import/export events
    DATA_IMPORTED: 'dataImported',
    DATA_EXPORTED: 'dataExported',
    DATA_UPDATED: 'dataUpdated',
    
    // Travel time events
    TRAVEL_TIME_CALCULATED: 'travelTimeCalculated',
    SHOW_TRAVEL_TIMES: 'showTravelTimes',
    
    // Help events
    SHOW_HELP_CLICKED: 'showHelpClicked',
    
    // Error events
    ERROR_OCCURRED: 'errorOccurred'
  };
  
  export default Events;