# PowerShell script to create the Location Tracker file structure
# Run this script in the directory where you want to create the project

# Create root directory
$rootDir = "location-tracker"
New-Item -Path $rootDir -ItemType Directory -Force | Out-Null
Set-Location -Path $rootDir

# Create directories
$directories = @(
    "src",
    "src/constants",
    "src/models",
    "src/services", 
    "src/utils",
    "src/ui",
    "src/ui/components",
    "src/ui/views",
    "src/ui/map",
    "src/ui/styles",
    "src/app",
    "public",
    "public/assets",
    "dist",
    "tests",
    "docs"
)

foreach ($dir in $directories) {
    New-Item -Path $dir -ItemType Directory -Force | Out-Null
    Write-Host "Created directory: $dir"
}

# Create placeholder files
$files = @(
    # Root files
    "package.json",
    "webpack.config.js",
    ".babelrc",
    ".eslintrc.js",
    "README.md",
    
    # Public files
    "public/index.html",
    
    # Source files
    "src/index.js",
    
    # Constants
    "src/constants/index.js",
    "src/constants/api.js",
    "src/constants/map.js",
    "src/constants/ui.js",
    
    # Models
    "src/models/index.js",
    "src/models/Meeting.js",
    "src/models/Group.js",
    "src/models/Family.js",
    "src/models/Config.js",
    
    # Services
    "src/services/index.js",
    "src/services/PersonService.js",
    "src/services/MeetingService.js",
    "src/services/GroupService.js",
    "src/services/FamilyService.js",
    "src/services/ImportExportService.js",
    "src/services/StatisticsService.js",
    
    # Utils
    "src/utils/index.js",
    "src/utils/dataUtils.js",
    "src/utils/domUtils.js",
    "src/utils/storage.js",
    
    # UI
    "src/ui/index.js",
    "src/ui/components/index.js",
    "src/ui/components/Button.js",
    "src/ui/components/Card.js",
    "src/ui/components/Modal.js",
    "src/ui/components/Form.js",
    "src/ui/components/Sidebar.js",
    "src/ui/views/index.js",
    "src/ui/views/Dashboard.js",
    "src/ui/views/PersonView.js",
    "src/ui/views/MeetingView.js",
    "src/ui/views/GroupView.js",
    "src/ui/views/FamilyView.js",
    "src/ui/map/index.js",
    "src/ui/map/MapContainer.js",
    "src/ui/map/MapControls.js",
    "src/ui/map/Markers.js",
    "src/ui/map/InfoWindows.js",
    "src/ui/styles/index.css",
    "src/ui/styles/variables.css",
    "src/ui/styles/components.css",
    "src/ui/styles/layout.css",
    
    # App
    "src/app/index.js",
    "src/app/EventBus.js",
    "src/app/config.js"
)

foreach ($file in $files) {
    New-Item -Path $file -ItemType File -Force | Out-Null
    Write-Host "Created file: $file"
}

# Files you need to copy manually
$manualFiles = @(
    "src/services/StateManager.js",
    "src/utils/errorHandler.js",
    "src/models/Person.js",
    "src/app/App.js",
    "src/services/MapService.js",
    "src/utils/mapUtils.js"
)

Write-Host "`n==== Please manually create these important files: ====="
foreach ($file in $manualFiles) {
    Write-Host "- $file"
}

Write-Host "`nLocation Tracker project structure has been created successfully!"
Write-Host "Now you need to copy the implementation files from our conversation into the appropriate locations."
Write-Host "To complete the setup, run: npm install"