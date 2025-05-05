// src/clientMonitor.js
console.log('📊 Enhanced Client Monitor initialized');

// Track discovered dependencies
const discoveredDependencies = new Set();

// Detect browser built-in APIs dynamically instead of hardcoding
// This creates a more comprehensive list based on the current browser environment
const browserBuiltins = (() => {
  const builtins = new Set();
  
  // Core browser globals
  ['window', 'document', 'navigator', 'location', 'history', 'localStorage', 
   'sessionStorage', 'console', 'fetch', 'XMLHttpRequest'].forEach(api => builtins.add(api));
  
  // Find all browser APIs on the window object
  for (const key in window) {
    // Filter for standard browser APIs (typically uppercase or camelCase)
    if (/^[A-Z]/.test(key) || /[A-Z]/.test(key)) {
      // Skip webpack-related globals
      if (!key.includes('webpack') && typeof window[key] !== 'undefined') {
        builtins.add(key);
      }
    }
  }
  
  return Array.from(builtins);
})();

console.log(`Detected ${browserBuiltins.length} browser built-in APIs`);

// Helper to report dependencies to server
async function reportDependency(packageName, moduleType = 'third-party') {
  if (!packageName || typeof packageName !== 'string') {
    return;
  }
  
  // Skip relative paths but not built-ins
  if (packageName.startsWith('.') || packageName.startsWith('/')) {
    return;
  }
  
  // Normalize package name (get base package)
  const basePkg = packageName.split('/')[0];
  if (discoveredDependencies.has(basePkg)) return;
  
  discoveredDependencies.add(basePkg);
  
  try {
    console.log(`📦 Detected client runtime dependency: ${basePkg} (${moduleType})`);
    await fetch('http://localhost:4001/monitor/dependency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        packageName: basePkg,
        moduleType: moduleType
      })
    });
  } catch (err) {
    console.error(`❌ Failed to report dependency ${basePkg}:`, err);
  }
}

// Detect browser built-in APIs being used
function captureBrowserAPIs() {
  browserBuiltins.forEach(api => {
    if (window[api]) {
      reportDependency(api, 'browser-builtin');
    }
  });
}

// WEBPACK MODULE DETECTION
setTimeout(() => {
  console.log('🔍 Scanning for webpack modules and browser APIs...');
  
  // Capture browser APIs
  captureBrowserAPIs();
  
  // Find webpack's modules object in the global scope
  const webpackModulesObject = 
    window.__webpack_modules__ || 
    window.webpackJsonp || 
    Object.keys(window).find(key => 
      key.startsWith('__webpack_require__') || 
      (window[key] && typeof window[key] === 'object' && window[key].c)
    );
  
  if (webpackModulesObject) {
    console.log('✅ Found webpack module system');
    
    // Get the module cache - this contains all loaded modules
    const moduleCache = 
      (window.__webpack_require__ && window.__webpack_require__.c) ||
      (webpackModulesObject && webpackModulesObject.c) ||
      {};
    
    // Scan each module for external dependencies
    Object.values(moduleCache).forEach(module => {
      if (!module) return;
      
      // Check module ID for npm package paths
      const id = module.i || module.id;
      if (typeof id === 'string' && id.includes('node_modules')) {
        const parts = id.split('node_modules/');
        if (parts.length > 1) {
          const pkgPath = parts[1];
          const pkgName = pkgPath.split('/')[0];
          if (pkgName) reportDependency(pkgName);
        }
      }
      
      // Try to get source code to find more dependencies
      try {
        const source = module.toString();
        if (source) {
          // Find require statements
          const requireMatches = source.match(/require\(['"]([^./][^'"]+)['"]\)/g);
          if (requireMatches) {
            requireMatches.forEach(match => {
              const pkg = match.replace(/require\(['"]|['"]\)/g, '').split('/')[0];
              if (pkg) reportDependency(pkg);
            });
          }
          
          // Find import statements
          const importMatches = source.match(/from\s+['"]([^./][^'"]+)['"]/g);
          if (importMatches) {
            importMatches.forEach(match => {
              const pkg = match.replace(/from\s+['"]|['"]/g, '').split('/')[0];
              if (pkg) reportDependency(pkg);
            });
          }
        }
      } catch (error) {
        // Continue even if one module fails to process
      }
    });
    
    // Scan for chunk loading functions
    if (window.__webpack_require__ && window.__webpack_require__.e) {
      const originalChunkLoader = window.__webpack_require__.e;
      window.__webpack_require__.e = function(chunkId) {
        console.log(`🧩 Loading webpack chunk: ${chunkId}`);
        return originalChunkLoader.apply(this, arguments);
      };
    }
  } else {
    console.log('⚠️ Could not detect webpack module system');
  }
  
  // Always report React as a dependency
  reportDependency('react');
  reportDependency('react-dom');
}, 1000);

// Hook dynamic imports
const originalImport = window.import;
if (typeof originalImport === 'function') {
  window.import = function(specifier) {
    if (typeof specifier === 'string') {
      const packageName = specifier.split('/')[0];
      if (packageName) reportDependency(packageName);
    }
    return originalImport.apply(this, arguments);
  };
}

// Export for manual use in components
export { reportDependency };