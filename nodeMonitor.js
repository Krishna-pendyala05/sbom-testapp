
// Node.js Runtime Dependency Monitor with Enhanced Metadata Extraction
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

// Create express server
const app = express();
const PORT = 4001;
const dynamicDepsFile = path.join(process.cwd(), 'dynamic-dependencies.json');

// Enable CORS and JSON parsing
app.use(cors());
app.use(bodyParser.json());

// Track required modules to avoid duplicates
const trackedModules = new Set();

// Get built-in modules dynamically from Node.js itself
// This replaces the hardcoded list with a dynamic one
const builtinModules = (() => {
  try {
    // Modern approach (Node.js 8.9.0+)
    return require('module').builtinModules;
  } catch (err) {
    try {
      // Fallback for older Node.js versions using the 'builtin-modules' package
      return require('builtin-modules');
    } catch (fallbackErr) {
      // Last resort fallback - minimal list of common built-ins
      console.warn('Could not detect built-in modules dynamically. Using fallback list.');
      return [
        'assert', 'buffer', 'child_process', 'cluster', 'console', 'crypto', 
        'dgram', 'dns', 'events', 'fs', 'http', 'https', 'module', 'net', 
        'os', 'path', 'process', 'querystring', 'readline', 'stream', 
        'string_decoder', 'timers', 'tls', 'url', 'util', 'vm', 'zlib'
      ];
    }
  }
})();

// Log the detected built-in modules
console.log(`Detected ${builtinModules.length} built-in Node.js modules`);

// Check if a module is built-in (for categorization, not filtering)
function isBuiltinModule(moduleName) {
  return builtinModules.includes(moduleName);
}

// Helper to get package metadata
function getPackageMetadata(packageName) {
  try {
    // Categorize built-in modules but don't filter them out
    if (isBuiltinModule(packageName)) {
      return {
        name: packageName,
        version: process.version, // Use Node.js version for built-ins
        type: 'runtime',
        timestamp: new Date().toISOString(),
        detected_by: 'node-monitor',
        module_type: 'builtin',
        node_version: process.version,
        purl: `pkg:nodejs/${packageName}@${process.version}`,
        description: `Node.js built-in module`
      };
    }
    
    // Extract the base package name (e.g., 'lodash' from 'lodash/fp')
    const basePkg = packageName.split('/')[0];
    
    // Find the package.json for this module
    let packageJsonPath;
    try {
      // Try to resolve the package's main file
      const resolvedPath = require.resolve(`${basePkg}/package.json`);
      packageJsonPath = resolvedPath;
    } catch (err) {
      try {
        // Use Node's module resolution to find where the package is installed
        const mainModulePath = require.resolve(basePkg);
        const nodeModulesPath = mainModulePath.substring(0, mainModulePath.indexOf('node_modules') + 12);
        packageJsonPath = path.join(nodeModulesPath, basePkg, 'package.json');
      } catch (innerErr) {
        // If we can't resolve the module, just return basic info
        return {
          name: basePkg,
          version: 'unknown',
          type: 'runtime',
          timestamp: new Date().toISOString(),
          detected_by: 'node-monitor',
          module_type: 'third-party',
          error: `Could not resolve module: ${innerErr.message}`
        };
      }
    }
    
    // Read and parse the package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    return {
      name: basePkg,
      version: packageJson.version || 'unknown',
      license: packageJson.license || 'unknown',
      type: 'runtime',
      timestamp: new Date().toISOString(),
      detected_by: 'node-monitor',
      module_type: 'third-party',
      author: packageJson.author ? (typeof packageJson.author === 'string' ? packageJson.author : JSON.stringify(packageJson.author)) : 'unknown',
      repository: packageJson.repository ? (typeof packageJson.repository === 'string' ? packageJson.repository : packageJson.repository.url || JSON.stringify(packageJson.repository)) : 'unknown',
      purl: `pkg:npm/${basePkg}@${packageJson.version || 'unknown'}`,
      description: packageJson.description || ''
    };
  } catch (error) {
    console.error(`Error getting metadata for ${packageName}:`, error);
    return {
      name: packageName,
      version: 'unknown',
      type: 'runtime',
      timestamp: new Date().toISOString(),
      detected_by: 'node-monitor',
      module_type: 'unresolved',
      error: `Failed to extract metadata: ${error.message}`
    };
  }
}

// Helper to add a dependency to the dynamic dependencies file
function addDependency(packageName, source = 'node-monitor') {
  // Only filter out relative paths, not built-ins
  if (packageName.startsWith('.') || packageName.startsWith('/')) {
    return;
  }
  
  // Extract the base package name (e.g., 'lodash' from 'lodash/fp')
  const basePkg = packageName.split('/')[0];
  
  // Skip if already tracked
  if (trackedModules.has(basePkg)) {
    return;
  }
  
  trackedModules.add(basePkg);
  
  try {
    // Get complete metadata for this package
    const metadata = getPackageMetadata(packageName);
    
    // Read the current dependencies
    let deps = [];
    if (fs.existsSync(dynamicDepsFile)) {
      try {
        const content = fs.readFileSync(dynamicDepsFile, 'utf8');
        if (content && content.trim()) {
          deps = JSON.parse(content);
        }
      } catch (error) {
        console.error('Error parsing dynamic dependencies file:', error);
      }
    }
    
    // Check if this dependency is already in the list
    const existingIndex = deps.findIndex(d => 
      (d.name === metadata.name || d.package === metadata.name) && d.type === 'runtime'
    );
    
    if (existingIndex === -1) {
      // Add the new dependency with full metadata
      deps.push(metadata);
      
      // Write back to the file
      fs.writeFileSync(dynamicDepsFile, JSON.stringify(deps, null, 2), 'utf8');
      console.log(`Added dynamic dependency: ${metadata.name}@${metadata.version} (${metadata.module_type})`);
    }
    
    return metadata;
  } catch (error) {
    console.error(`Error adding dependency ${packageName}:`, error);
    return null;
  }
}

// Hook CommonJS require - this captures server-side dependencies
const originalRequire = module.constructor.prototype.require;
module.constructor.prototype.require = function(path) {
  addDependency(path);
  return originalRequire.apply(this, arguments);
};

// SCAN EXISTING REQUIRE CACHE
console.log('Scanning Node.js require cache for loaded modules...');
Object.keys(require.cache).forEach(modulePath => {
  // For built-in modules
  if (builtinModules.some(mod => modulePath.includes(mod))) {
    const moduleName = modulePath.split('/').pop();
    if (builtinModules.includes(moduleName)) {
      addDependency(moduleName, 'require-cache');
    }
  }
  
  // For node_modules
  if (modulePath.includes('node_modules')) {
    const parts = modulePath.split('node_modules/');
    if (parts.length > 1) {
      const moduleName = parts[1].split('/')[0];
      addDependency(moduleName, 'require-cache');
    }
  }
});

// Add built-in modules that might not be in require.cache but are available
builtinModules.forEach(mod => {
  addDependency(mod, 'builtin-scan');
});

// API endpoint for client to report dynamic imports
app.post('/monitor/dependency', (req, res) => {
  const { packageName } = req.body;
  
  if (!packageName || typeof packageName !== 'string') {
    return res.status(400).json({ error: 'Invalid package name' });
  }
  
  const metadata = addDependency(packageName, 'client-report');
  res.status(metadata ? 201 : 200).json({ 
    success: true, 
    message: `Processed dependency: ${packageName}` 
  });
});

// Health check endpoint
app.get('/monitor/health', (req, res) => {
  res.json({
    status: 'running',
    dependencies: Array.from(trackedModules),
    count: trackedModules.size,
    builtinCount: builtinModules.length
  });
});

// Enhanced dependencies endpoint with filtering options
app.get('/monitor/dependencies', (req, res) => {
  try {
    const content = fs.readFileSync(dynamicDepsFile, 'utf8');
    const deps = JSON.parse(content || '[]');
    
    // Allow filtering by type
    const { type, includeBuiltins } = req.query;
    
    let filteredDeps = deps;
    
    // Filter by module type if specified
    if (type) {
      filteredDeps = deps.filter(dep => dep.module_type === type);
    }
    
    // Filter out built-ins if requested (for backward compatibility)
    if (includeBuiltins === 'false') {
      filteredDeps = filteredDeps.filter(dep => dep.module_type !== 'builtin');
    }
    
    // Group by module type
    const grouped = {
      built_in: filteredDeps.filter(dep => dep.module_type === 'builtin'),
      third_party: filteredDeps.filter(dep => dep.module_type === 'third-party'),
      unresolved: filteredDeps.filter(dep => dep.module_type === 'unresolved')
    };
    
    res.json({
      total: filteredDeps.length,
      grouped: grouped,
      dependencies: filteredDeps
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read dependencies' });
  }
});

// Initialize dependencies file if it doesn't exist
if (!fs.existsSync(dynamicDepsFile)) {
  fs.writeFileSync(dynamicDepsFile, '[]', 'utf8');
  console.log(`Created dynamic dependencies file at: ${dynamicDepsFile}`);
} else {
  // Load existing entries into tracking set
  try {
    const content = fs.readFileSync(dynamicDepsFile, 'utf8');
    const deps = JSON.parse(content || '[]');
    deps.forEach(dep => {
      const name = dep.name || dep.package;
      if (name) trackedModules.add(name);
    });
    console.log(`Loaded ${trackedModules.size} existing dependencies from file`);
  } catch (err) {
    console.warn('Could not load existing dependencies:', err);
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`Enhanced Node.js dependency monitoring server running on port ${PORT}`);
  console.log(`Dependencies will be saved to: ${dynamicDepsFile}`);
  console.log(`Currently tracking ${trackedModules.size} dependencies (including built-ins)`);
});

console.log('Enhanced Node.js dependency monitoring enabled (including built-in modules)');
      