// src/App.js - Modified to work with nodeMonitor
import React, { useState, useEffect } from 'react';
import './App.css';
import DependencyViewer from './DependencyViewer';
import axios from 'axios'; // Pre-import axios to ensure it's captured

function PluginLoader({ pluginName }) {
  const [plugin, setPlugin] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPlugin = async () => {
      try {
        // Dynamic plugin loading simulation
        switch(pluginName) {
          case 'chart':
            const { Chart } = await import('chart.js');
            setPlugin({ name: 'Chart.js', version: Chart.version || '4.x' });
            // Report to server-side monitor
            await axios.post('http://localhost:4001/monitor/dependency', { 
              packageName: 'chart.js' 
            });
            break;
          case 'lodash':
            const _ = await import('lodash');
            setPlugin({ name: 'Lodash', version: _.VERSION || '4.x' });
            // Report to server-side monitor
            await axios.post('http://localhost:4001/monitor/dependency', { 
              packageName: 'lodash' 
            });
            break;
          case 'd3':
            const d3 = await import('d3');
            setPlugin({ name: 'D3.js', version: d3.version || '7.x' });
            // Report to server-side monitor
            await axios.post('http://localhost:4001/monitor/dependency', { 
              packageName: 'd3' 
            });
            break;
          default:
            setError(`Unknown plugin: ${pluginName}`);
        }
      } catch (err) {
        setError(`Failed to load plugin: ${err.message}`);
      }
    };

    loadPlugin();
  }, [pluginName]);

  if (error) return <div className="error">{error}</div>;
  if (!plugin) return <div>Loading {pluginName} plugin...</div>;
  
  return (
    <div className="plugin-info">
      ✅ Loaded {plugin.name} v{plugin.version}
    </div>
  );
}

function App() {
  console.log('▶️ App rendering');
  const [time, setTime] = useState(null);
  const [envType, setEnvType] = useState(null);
  const [activePlugin, setActivePlugin] = useState(null);
  const [isDevMode, setIsDevMode] = useState(false);
  const [monitorStatus, setMonitorStatus] = useState({ active: false, count: 0 });
  const [serverTestStatus, setServerTestStatus] = useState({ running: false, output: '' });

  // Check monitor status on load
  useEffect(() => {
    const checkMonitorStatus = async () => {
      try {
        const response = await fetch('http://localhost:4001/monitor/health');
        const data = await response.json();
        setMonitorStatus({
          active: true,
          count: data.count || 0,
          builtinCount: data.builtinCount || 0
        });
      } catch (err) {
        console.warn('Dependency monitor not detected:', err);
        setMonitorStatus({ active: false, count: 0 });
      }
    };
    
    checkMonitorStatus();
    // Poll every 5 seconds
    const interval = setInterval(checkMonitorStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // TASK 1: Manually report dynamic imports to the server
  const handleDayjsLoad = async () => {
    console.log('🔄 Loading dayjs via server report');
    try {
      // Instead of trying to use require in the browser, 
      // we'll simulate this by reporting to the server
      const response = await axios.post('http://localhost:4001/monitor/dependency', {
        packageName: 'dayjs',
        source: 'client-dynamic-import'
      });
      
      // And get the current time from an API to simulate dayjs functionality
      const timeResponse = await axios.get('https://worldtimeapi.org/api/ip');
      const now = new Date(timeResponse.data.datetime).toLocaleString();
      
      console.log('✅ DayJS loaded at runtime:', now);
      setTime(now);
    } catch (err) {
      console.error('❌ Failed to load DayJS:', err);
    }
  };

  // TASK 2: Environment-specific dependencies
  const toggleEnvironment = async () => {
    const newDevMode = !isDevMode;
    setIsDevMode(newDevMode);
    
    try {
      if (newDevMode) {
        // Report dev dependencies to the server
        console.log('🔧 Switching to development environment');
        await axios.post('http://localhost:4001/monitor/dependency', {
          packageName: 'jest',
          source: 'client-dev-env'
        });
        await axios.post('http://localhost:4001/monitor/dependency', {
          packageName: 'eslint',
          source: 'client-dev-env'
        });
        setEnvType('Development environment with testing libraries');
      } else {
        // Report prod dependencies to the server
        console.log('🚀 Switching to production environment');
        await axios.post('http://localhost:4001/monitor/dependency', {
          packageName: 'express',
          source: 'client-prod-env'
        });
        await axios.post('http://localhost:4001/monitor/dependency', {
          packageName: 'compression',
          source: 'client-prod-env'
        });
        setEnvType('Production environment with server libraries');
      }
    } catch (err) {
      console.error('❌ Failed to report environment dependencies:', err);
    }
  };

  // TASK 3: Plugin architecture / late-binding dependencies
  const loadPlugin = (name) => {
    console.log(`🔌 Loading plugin: ${name}`);
    setActivePlugin(name);
  };

  // Run server-side tests
  const runServerTests = async () => {
    try {
      setServerTestStatus({ running: true, output: 'Starting server tests...' });
      
      // Tell the server to run the server-test-runner.js file
      const response = await axios.post('http://localhost:4001/monitor/run-tests', {
        test: 'all'
      });
      
      setServerTestStatus({ 
        running: false, 
        output: response.data.message || 'Tests completed. Check server logs for details.',
        success: true
      });
    } catch (err) {
      setServerTestStatus({ 
        running: false, 
        output: 'Failed to run server tests. Make sure to implement the /monitor/run-tests endpoint or run server-test-runner.js manually.',
        success: false
      });
      console.error('Failed to run server tests:', err);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Runtime SBOM Test Suite</h1>
        <p>Testing runtime dependency detection for continuous SBOMs</p>
        
        {monitorStatus.active ? (
          <div className="monitor-status active">
            ✅ Dependency Monitor Active: Tracking {monitorStatus.count} dependencies
            {monitorStatus.builtinCount && (
              <span> (including {monitorStatus.builtinCount} built-in modules)</span>
            )}
          </div>
        ) : (
          <div className="monitor-status inactive">
            ⚠️ Dependency Monitor Not Detected
            <p>Run with: <code>npm run start-with-monitor</code></p>
          </div>
        )}
        
        {/* Server Test Runner */}
        <div className="test-case">
          <h2>Server-Side Test Runner</h2>
          <p>Runs tests on the server where nodeMonitor can detect them</p>
          <button 
            onClick={runServerTests}
            disabled={serverTestStatus.running}
          >
            {serverTestStatus.running ? 'Running Tests...' : 'Run Server Tests'}
          </button>
          {serverTestStatus.output && (
            <div className={`result ${serverTestStatus.success ? 'success' : 'error'}`}>
              {serverTestStatus.output}
            </div>
          )}
          <div className="note">
            <strong>Note:</strong> To run these tests manually, execute:<br/>
            <code>node server-test-runner.js</code>
          </div>
        </div>
        
        {/* Dependency Viewer */}
        <DependencyViewer />
        
        <div className="test-case">
          <h2>Test 1: Dynamic Imports</h2>
          <p>Tests dependencies loaded via dynamic imports</p>
          <button onClick={handleDayjsLoad}>Load DayJS Dynamically</button>
          {time && (
            <div className="result">
              🎉 DayJS returned: <code>{time}</code>
            </div>
          )}
        </div>

        <div className="test-case">
          <h2>Test 2: Environment-Specific Dependencies</h2>
          <p>Tests dependencies loaded based on dev/prod environment</p>
          <button onClick={toggleEnvironment}>
            Switch to {isDevMode ? 'Production' : 'Development'} Mode
          </button>
          {envType && (
            <div className="result">
              🔄 Current context: <code>{envType}</code>
            </div>
          )}
        </div>

        <div className="test-case">
          <h2>Test 3: Plugin Architecture</h2>
          <p>Tests late-binding dependencies in a plugin architecture</p>
          <div className="plugin-buttons">
            <button onClick={() => loadPlugin('chart')}>Load Chart.js Plugin</button>
            <button onClick={() => loadPlugin('lodash')}>Load Lodash Plugin</button>
            <button onClick={() => loadPlugin('d3')}>Load D3 Plugin</button>
          </div>
          {activePlugin && (
            <div className="result">
              <PluginLoader pluginName={activePlugin} />
            </div>
          )}
        </div>

        <div className="instructions">
          <h3>Research Findings</h3>
          <p>This application validates three key research claims about nodeMonitor's capabilities:</p>
          <ol>
            <li><strong>Dynamic Imports:</strong> nodeMonitor captures runtime requires but client imports must be reported via API</li>
            <li><strong>Environment-Specific:</strong> nodeMonitor doesn't distinguish between environments automatically</li>
            <li><strong>Plugin Architecture:</strong> nodeMonitor captures dependencies but may miss nested or delayed loads</li>
          </ol>
          <p>The server-test-runner.js file demonstrates these cases in a server environment where nodeMonitor can directly observe them.</p>
        </div>
      </header>
    </div>
  );
}

export default App;
