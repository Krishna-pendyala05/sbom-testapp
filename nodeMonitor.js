// Node.js Runtime Dependency Monitor with Enhanced Metadata Extraction and Production Bundle Support
const { spawn } = require('child_process');
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

// Create express server
const app = express();
const PORT = 4001;
const dynamicDepsFile = path.join(process.cwd(), 'dynamic-dependencies.json');
const runtimeDepsFile = path.join(process.cwd(), 'runtime-dependencies.json');

/**
 * Start the development mode monitor with require hook and API endpoints
 */
function startDevMonitor() {
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

  // Add endpoint to get production dependencies
  app.get('/monitor/production-dependencies', (req, res) => {
    try {
      if (!fs.existsSync(runtimeDepsFile)) {
        return res.status(404).json({ 
          error: 'Production dependencies not found',
          message: 'Run with "production" mode first to generate production dependencies'
        });
      }
      
      const content = fs.readFileSync(runtimeDepsFile, 'utf8');
      const deps = JSON.parse(content || '[]');
      
      // Extract npm packages from webpack module paths
      const npmPackages = extractNpmPackages(deps);
      
      res.json({
        total: deps.length,
        npm_packages: {
          count: npmPackages.length,
          packages: npmPackages
        },
        modules: deps
      });
    } catch (err) {
      res.status(500).json({ 
        error: 'Failed to read production dependencies',
        message: err.message
      });
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

  // Test runner endpoint
  app.post('/monitor/run-tests', (req, res) => {
    console.log('Received request to run server-side tests');
    
    const { spawn } = require('child_process');
    const testProcess = spawn('node', ['server-test-runner.js'], {
      stdio: 'inherit' // Show output in server console
    });
    
    testProcess.on('error', (err) => {
      console.error('Failed to start test process:', err);
      res.status(500).json({ 
        success: false, 
        message: `Failed to start tests: ${err.message}`
      });
    });
    // We don't wait for completion since tests might take time
    // Just confirm we started the process
    res.status(200).json({ 
    success: true, 
    message: 'Server tests started. Check server logs for details.'
    });
  });

  // Enhanced dependencies endpoint to include source information
  app.get('/monitor/dependencies/context', (req, res) => {
    try {
      const content = fs.readFileSync(dynamicDepsFile, 'utf8');
      const deps = JSON.parse(content || '[]');
      
      // Group by detected_by to show which dependencies came from where
      const groupedBySource = {};
      
      deps.forEach(dep => {
        const source = dep.detected_by || 'unknown';
        if (!groupedBySource[source]) {
          groupedBySource[source] = [];
        }
        groupedBySource[source].push(dep);
      });
      
      res.json({
        total: deps.length,
        sources: Object.keys(groupedBySource),
        dependencies: groupedBySource
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to read dependencies with context' });
    }
  });

  // Start the server
  app.listen(PORT, () => {
    console.log(`Enhanced Node.js dependency monitoring server running on port ${PORT}`);
    console.log(`Dependencies will be saved to: ${dynamicDepsFile}`);
    console.log(`Currently tracking ${trackedModules.size} dependencies (including built-ins)`);
  });

  console.log('Enhanced Node.js dependency monitoring enabled (including built-in modules)');
}

/**
 * Extract npm package names from webpack module paths
 */
function extractNpmPackages(modules) {
  const npmPackages = new Map();
  
  modules.forEach(mod => {
    const name = mod.name || '';
    
    // Look for node_modules pattern in the module path
    if (name.includes('node_modules')) {
      // Handle both Windows and Unix-style paths
      const match = name.match(/node_modules[\/\\](@[^\/\\]+[\/\\][^\/\\]+|[^\/\\]+)/);
      if (match && match[1]) {
        const pkgName = match[1].replace(/\\/g, '/');
        
        // Handle scoped packages
        if (!npmPackages.has(pkgName)) {
          npmPackages.set(pkgName, {
            name: pkgName,
            count: 1,
            size: mod.size || 0,
            chunks: Array.isArray(mod.chunks) ? [...mod.chunks] : []
          });
        } else {
          const existing = npmPackages.get(pkgName);
          existing.count++;
          existing.size += (mod.size || 0);
          // Merge chunks without duplicates
          if (Array.isArray(mod.chunks)) {
            mod.chunks.forEach(chunk => {
              if (!existing.chunks.includes(chunk)) {
                existing.chunks.push(chunk);
              }
            });
          }
        }
      }
    }
  });
  
  return Array.from(npmPackages.values());
}

/**
 * Run the production build and extract dependencies from webpack stats
 */
async function startProdMonitor() {
  try {
    // 1) run the build with stats
    console.log('🔨 Building with stats...');
    console.log('This may take a while, please be patient...');
    
    // First make sure the output directory exists
    const statsOutputDir = path.join(process.cwd(), 'build');
    if (!fs.existsSync(statsOutputDir)) {
      fs.mkdirSync(statsOutputDir, { recursive: true });
    }
    
    const statsOutputPath = path.join(statsOutputDir, 'webpack-stats.json');
    
    // Create a subprocess that captures the output of the build process
    let capturedStdout = '';
    let capturedStderr = '';
    
    await new Promise((resolve, reject) => {
      const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      
      // Command to run build with stats options but capture output
      const buildProcess = spawn(
        npmCmd,
        ['run', 'build', '--', '--stats', '--profile', '--json'],
        { stdio: ['inherit', 'pipe', 'pipe'] } // Capture stdout and stderr
      );
      
      buildProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        capturedStdout += chunk;
        process.stdout.write(chunk); // Show in console too
      });
      
      buildProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        capturedStderr += chunk;
        process.stderr.write(chunk); // Show in console too
      });
      
      buildProcess.on('exit', code => {
        if (code === 0) {
          console.log('✅ Build completed successfully');
          resolve();
        } else {
          reject(new Error(`Build process failed with exit code ${code}`));
        }
      });
      
      buildProcess.on('error', err => {
        reject(new Error(`Failed to start build process: ${err.message}`));
      });
    });
    
    // 2) For CRA, we need an alternative approach since stats.json isn't automatically generated
    console.log('🔍 Analyzing production build...');
    
    // Option A: Try to extract stats from the captured output
    const statsJsonMatch = capturedStdout.match(/\{[\s\S]*"modules"[\s\S]*\}/);
    let stats = null;
    
    if (statsJsonMatch) {
      try {
        console.log('📊 Found webpack stats in build output');
        stats = JSON.parse(statsJsonMatch[0]);
        // Save the extracted stats for future reference
        fs.writeFileSync(statsOutputPath, JSON.stringify(stats, null, 2));
        console.log(`📄 Saved extracted webpack stats to: ${statsOutputPath}`);
      } catch (err) {
        console.log('⚠️ Failed to parse stats from output:', err.message);
      }
    }
    
    // Option B: If Option A fails, analyze the build directory directly
    if (!stats) {
      console.log('📂 Falling back to direct analysis of build directory...');
      
      // Create a basic stats structure
      stats = {
        modules: [],
        chunks: [],
        assets: []
      };
    
      // Discover the generated JavaScript files in the build directory
      const buildJsDir = path.join(process.cwd(), 'build', 'static', 'js');
      if (fs.existsSync(buildJsDir)) {
        const jsFiles = fs.readdirSync(buildJsDir)
          .filter(file => file.endsWith('.js') || file.endsWith('.chunk.js'));
            
        console.log(`📄 Found ${jsFiles.length} JavaScript files in build output`);
        
        // For each JS file, analyze and extract module info
        jsFiles.forEach(file => {
          const filePath = path.join(buildJsDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const fileSize = fs.statSync(filePath).size;
          
          // Create a chunk entry for this file
          const chunkId = file.split('.')[0];
          stats.chunks.push({
            id: chunkId,
            names: [file],
            size: fileSize
          });
          
          // Extract npm package references
          // Look for import patterns and node_modules references
          const nodeModulesRegex = /node_modules[\\/](@[^\\/]+[\\/][^\\/]+|[^\\/]+)/g;
          let match;
          const packages = new Set();
          
          while ((match = nodeModulesRegex.exec(content)) !== null) {
            const pkgPath = match[1].replace(/\\/g, '/');
            packages.add(pkgPath);
          }
          
          // Add these as modules
          packages.forEach(pkg => {
            stats.modules.push({
              name: `node_modules/${pkg}`,
              chunks: [chunkId],
              size: Math.floor(fileSize / packages.size) // Approximate size
            });
          });
          
          // Add the chunk file itself
          stats.assets.push({
            name: file,
            size: fileSize,
            chunks: [chunkId]
          });
        });
      }
    }
      
    // 3) extract module information
    const modulesCount = stats.modules?.length || 0;
    console.log(`🧩 Extracting module information from ${modulesCount} modules...`);
    
    const moduleData = (stats.modules || []).map(m => ({
      name: m.name || 'unknown',
      size: m.size || 0,
      chunks: m.chunks || [],
      issuerPath: m.issuerPath ? m.issuerPath.map(i => i.name || 'unknown') : [],
      reasons: m.reasons ? m.reasons.map(r => r.moduleName || 'unknown').filter(Boolean) : [],
      isNpmPackage: m.name && m.name.includes('node_modules')
    }));
    
    // 4) write to runtime-dependencies.json
    console.log(`💾 Writing dependency information to ${runtimeDepsFile}...`);
    fs.writeFileSync(runtimeDepsFile, JSON.stringify(moduleData, null, 2));
    
    // 5) extract and write npm packages summary
    const npmPackages = extractNpmPackages(moduleData);
    
    const summaryFile = path.join(process.cwd(), 'npm-packages-summary.json');
    fs.writeFileSync(summaryFile, JSON.stringify(npmPackages, null, 2));
    
    console.log(`✅ Production dependency analysis complete!`);
    console.log(`📦 Found ${npmPackages.length} npm packages in the production build`);
    console.log(`📄 Full module list written to: ${runtimeDepsFile}`);
    console.log(`📄 NPM packages summary written to: ${summaryFile}`);
    
    // 6) provide some useful stats
    const totalSize = moduleData.reduce((sum, mod) => sum + (mod.size || 0), 0);
    const npmSize = npmPackages.reduce((sum, pkg) => sum + (pkg.size || 0), 0);
    
    console.log(`\n📊 Stats Summary:`);
    console.log(`Total modules: ${moduleData.length}`);
    console.log(`Total size: ${(totalSize / 1024).toFixed(2)} KB`);
    console.log(`NPM packages: ${npmPackages.length}`);
    console.log(`NPM packages size: ${(npmSize / 1024).toFixed(2)} KB (${(totalSize > 0 ? ((npmSize / totalSize) * 100).toFixed(2) : 0)}%)`);
    
    // 7) suggest next steps
    console.log(`\n🔍 Next Steps:`);
    console.log(`- Review ${summaryFile} for a list of all npm packages in your build`);
    console.log(`- Run the server with 'node nodeMonitor.js' to access the dependency API`);
    console.log(`- Access /monitor/production-dependencies endpoint to view production deps`);
    
  } catch (error) {
    console.error(`❌ Error in production monitoring:`, error);
    process.exit(1);
  }
}

// Decide which mode to run based on command line argument
const mode = process.argv[2];

if (mode === 'production') {
  console.log('🚀 Starting production dependency monitor...');
  startProdMonitor().catch(err => {
    console.error('❌ Production monitoring failed:', err);
    process.exit(1);
  });
} else {
  console.log('🚀 Starting development dependency monitor...');
  startDevMonitor();
}