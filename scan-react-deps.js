
// React dependency scanner for SBOM
// This script will scan your React application's dependencies and 
// add them to the dynamic-dependencies.json file

// First, load our monitor
require('./nodeMonitor');

console.log('Scanning React application dependencies...');

// Get the package.json
const packageJson = require('./package.json');

// Force loading of all direct dependencies
console.log('Loading direct dependencies...');
Object.keys(packageJson.dependencies || {}).forEach(pkg => {
  try {
    require(pkg);
    console.log(`Loaded ${pkg}`);
  } catch (err) {
    console.error(`Failed to load ${pkg}: ${err.message}`);
  }
});

// Try to load some common React-specific dependencies
console.log('Scanning for common React dependencies...');
const reactSpecific = [
  'react', 'react-dom', 'react-router', 'react-router-dom', 
  'redux', 'react-redux', '@reduxjs/toolkit',
  'axios', 'styled-components', '@mui/material'
];

reactSpecific.forEach(pkg => {
  try {
    require(pkg);
    console.log(`Loaded ${pkg}`);
  } catch (err) {
    // Ignore errors - just trying common packages
  }
});

console.log('Dependency scanning complete. Check dynamic-dependencies.json for results.');
