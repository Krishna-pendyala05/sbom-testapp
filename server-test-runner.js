// server-test-runner.js - Fixed version that doesn't start a second server
// This file will execute server-side versions of our test cases
// that can be detected by the existing nodeMonitor

console.log('🚀 Starting server-side test runner for nodeMonitor');

// Import the require hook directly to avoid starting another server
// Track required modules to avoid duplicates
const trackedModules = new Set();

// We'll directly use the addDependency function logic without importing nodeMonitor
// This is a simplified version of the function from nodeMonitor.js
function addDependency(packageName, source = 'server-test-runner') {
  // Only filter out relative paths, not built-ins
  if (packageName.startsWith('.') || packageName.startsWith('/')) {
    return;
  }
  
  // Extract the base package name (e.g., 'lodash' from 'lodash/fp')
  const basePkg = packageName.split('/')[0];
  
  // Skip if already tracked within this test run
  if (trackedModules.has(basePkg)) {
    return;
  }
  
  trackedModules.add(basePkg);
  
  try {
    // We don't need to write to the file here - the existing nodeMonitor instance will do that
    // Just output that we detected it
    console.log(`Detected dependency in test: ${basePkg} (via ${source})`);
    
    // The actual require call is what the nodeMonitor will hook and record
    return require(basePkg);
  } catch (error) {
    console.error(`Error loading dependency ${packageName}:`, error.message);
    return null;
  }
}

// ========== TEST 1: DYNAMIC LOADING ==========
console.log('\n📦 TEST 1: DYNAMIC LOADING OF DEPENDENCIES');

// Basic dynamic require
console.log('1.1: Basic dynamic require');
function dynamicRequire(packageName) {
  console.log(`Dynamically requiring: ${packageName}`);
  try {
    const pkg = require(packageName);
    console.log(`✅ Successfully loaded: ${packageName}`);
    return pkg;
  } catch (err) {
    console.error(`❌ Failed to load: ${packageName}`, err.message);
    return null;
  }
}

// Conditional require based on feature flag
console.log('1.2: Conditional require based on feature flag');
const FEATURE_FLAG_ENABLED = true;
if (FEATURE_FLAG_ENABLED) {
  console.log('Feature flag enabled, loading dayjs');
  const dayjs = dynamicRequire('dayjs');
  if (dayjs) {
    console.log(`Current time: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`);
  }
} else {
  console.log('Feature flag disabled, skipping dayjs');
}

// Delayed require
console.log('1.3: Delayed require');
setTimeout(() => {
  console.log('Loading moment.js after 2 second delay');
  const moment = dynamicRequire('moment');
  if (moment) {
    console.log(`Current time with moment: ${moment().format('LLLL')}`);
  }
}, 2000);

// ========== TEST 2: ENVIRONMENT-SPECIFIC DEPENDENCIES ==========
console.log('\n📦 TEST 2: ENVIRONMENT-SPECIFIC DEPENDENCIES');

// Simulate switching environments
function loadEnvironmentSpecificDeps(env) {
  console.log(`2.1: Loading dependencies for ${env} environment`);
  process.env.NODE_ENV = env;
  
  if (env === 'development') {
    // Dev-only dependencies
    console.log('Loading development-only dependencies');
    const devDeps = [
      'nodemon',
      'eslint',
      'jest'
    ];
    
    devDeps.forEach(dep => {
      try {
        require(dep);
        console.log(`✅ Loaded dev dependency: ${dep}`);
      } catch (err) {
        console.log(`⚠️ Dev dependency not available: ${dep}`);
      }
    });
  } else {
    // Prod-only dependencies
    console.log('Loading production-only dependencies');
    const prodDeps = [
      'express',
      'cors',
      'compression'
    ];
    
    prodDeps.forEach(dep => {
      try {
        require(dep);
        console.log(`✅ Loaded prod dependency: ${dep}`);
      } catch (err) {
        console.log(`⚠️ Prod dependency not available: ${dep}`);
      }
    });
  }
}

// Test both environments
loadEnvironmentSpecificDeps('development');
setTimeout(() => {
  loadEnvironmentSpecificDeps('production');
}, 3000);

// ========== TEST 3: DEPENDENCY EXECUTION CONTEXT ==========
console.log('\n📦 TEST 3: DEPENDENCY EXECUTION CONTEXT');

// Plugin system simulation
class PluginManager {
  constructor() {
    this.plugins = {};
    console.log('3.1: Plugin manager initialized');
  }
  
  registerPlugin(name, initFn) {
    console.log(`Registering plugin: ${name}`);
    this.plugins[name] = initFn;
  }
  
  loadPlugin(name) {
    console.log(`3.2: Loading plugin: ${name}`);
    if (this.plugins[name]) {
      const plugin = this.plugins[name]();
      console.log(`✅ Plugin ${name} loaded: ${plugin.name} v${plugin.version}`);
      return plugin;
    }
    return null;
  }
}

// Create plugin manager
const pluginManager = new PluginManager();

// Register plugins
pluginManager.registerPlugin('lodash', () => {
  const _ = require('lodash');
  return { name: 'Lodash', version: _.VERSION };
});

pluginManager.registerPlugin('axios', () => {
  const axios = require('axios');
  return { name: 'Axios', version: axios.VERSION || 'unknown' };
});

// Plugins that download additional code
pluginManager.registerPlugin('complex-plugin', () => {
  console.log('3.3: Loading complex plugin with nested dependencies');
  // This plugin loads additional dependencies
  const _ = require('lodash');
  const dayjs = require('dayjs');
  
  // Simulate downloading additional code at runtime
  setTimeout(() => {
    console.log('Plugin is downloading additional modules...');
    try {
      const uuid = require('uuid');
      console.log(`✅ Plugin downloaded additional module: uuid v${uuid.version}`);
    } catch (err) {
      console.log('⚠️ Failed to download additional modules');
    }
  }, 1000);
  
  return { name: 'ComplexPlugin', version: '1.0.0' };
});

// Load plugins with delay to simulate user interaction
setTimeout(() => {
  pluginManager.loadPlugin('lodash');
}, 4000);

setTimeout(() => {
  pluginManager.loadPlugin('axios');
}, 5000);

setTimeout(() => {
  pluginManager.loadPlugin('complex-plugin');
}, 6000);

// Keep the process running
console.log('\n⏳ Test runner will continue executing for 10 seconds...');
setTimeout(() => {
  console.log('✅ Test runner complete');
}, 10000);