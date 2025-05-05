// src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';
import { reportDependency } from './clientMonitor';
import DependencyViewer from './DependencyViewer';

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
            break;
          case 'lodash':
            const _ = await import('lodash');
            setPlugin({ name: 'Lodash', version: _.VERSION || '4.x' });
            break;
          case 'd3':
            const d3 = await import('d3');
            setPlugin({ name: 'D3.js', version: d3.version || '7.x' });
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

  // TASK 1: Conditional dynamic import of DayJS
  const handleDayjsLoad = async () => {
    console.log('🔄 Loading dayjs dynamically');
    try {
      const dayjs = (await import('dayjs')).default;
      const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
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
    
    if (newDevMode) {
      // Development-only packages
      console.log('🔧 Switching to development environment');
      try {
        const { render } = await import('@testing-library/react');
        setEnvType('Development environment with @testing-library/react');
      } catch (err) {
        console.error('❌ Failed to load dev dependencies:', err);
      }
    } else {
      // Production-only packages
      console.log('🚀 Switching to production environment');
      try {
        const axios = (await import('axios')).default;
        setEnvType('Production environment with axios');
      } catch (err) {
        console.error('❌ Failed to load prod dependencies:', err);
      }
    }
  };

  // TASK 3: Plugin architecture / late-binding dependencies
  const loadPlugin = (name) => {
    console.log(`🔌 Loading plugin: ${name}`);
    setActivePlugin(name);
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
          <p>This application validates three key research claims about static SBOM limitations:</p>
          <ol>
            <li><strong>Dynamic Imports:</strong> Static SBOMs miss dependencies loaded via dynamic imports</li>
            <li><strong>Environment-Specific:</strong> Static SBOMs can't distinguish between dev-only and prod-only dependencies</li>
            <li><strong>Plugin Architecture:</strong> Static SBOMs miss dependencies loaded through late-binding mechanisms</li>
          </ol>
          <p>The runtime monitor captures all these dependencies automatically, creating a more comprehensive SBOM.</p>
        </div>
      </header>
    </div>
  );
}

export default App;
