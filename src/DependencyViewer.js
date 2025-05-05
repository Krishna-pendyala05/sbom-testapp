// src/DependencyViewer.js
import React, { useState, useEffect } from 'react';

function DependencyViewer() {
  const [dependencies, setDependencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('all'); // 'all', 'builtin', 'third-party'
  const [stats, setStats] = useState({
    total: 0,
    builtIn: 0,
    thirdParty: 0,
    unresolved: 0
  });

  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:4001/monitor/dependencies');
        
        if (!response.ok) {
          throw new Error(`Error fetching dependencies: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("Raw dependency data:", data); // For debugging
        
        // Extract the actual dependencies array from response
        const dependencyArray = data.dependencies || [];
        
        // Count by type
        const builtInCount = dependencyArray.filter(d => d.module_type === 'builtin').length;
        const thirdPartyCount = dependencyArray.filter(d => d.module_type === 'third-party').length;
        const unresolvedCount = dependencyArray.filter(d => 
          d.module_type === 'unresolved' || !d.module_type
        ).length;
        
        setDependencies(dependencyArray);
        setStats({
          total: dependencyArray.length,
          builtIn: builtInCount,
          thirdParty: thirdPartyCount,
          unresolved: unresolvedCount
        });
        
        setLoading(false);
      } catch (err) {
        console.error("Error loading dependencies:", err);
        setError(`Failed to load dependencies: ${err.message}`);
        setLoading(false);
      }
    };

    fetchDependencies();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchDependencies, 5000);
    return () => clearInterval(interval);
  }, []);

  // Filter dependencies based on current view
  const filteredDependencies = dependencies.filter(dep => {
    if (view === 'all') return true;
    if (view === 'built-ins') return dep.module_type === 'builtin';
    if (view === 'third-party') return dep.module_type === 'third-party';
    return true;
  });

  if (loading) return <div className="loading-indicator">Loading dependencies...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;

  return (
    <div className="dependency-viewer">
      <h2>Runtime Dependencies ({stats.total})</h2>
      
      <div className="dependency-stats">
        <div className="stat">
          <span className="label">Built-in Modules:</span> 
          <span className="count">{stats.builtIn}</span>
        </div>
        <div className="stat">
          <span className="label">Third-Party Packages:</span> 
          <span className="count">{stats.thirdParty}</span>
        </div>
        <div className="stat">
          <span className="label">Unresolved:</span> 
          <span className="count">{stats.unresolved}</span>
        </div>
      </div>
      
      <div className="filter-buttons">
        <button 
          className={view === 'all' ? 'active' : ''} 
          onClick={() => setView('all')}
        >
          All
        </button>
        <button 
          className={view === 'built-ins' ? 'active' : ''} 
          onClick={() => setView('built-ins')}
        >
          Built-ins
        </button>
        <button 
          className={view === 'third-party' ? 'active' : ''} 
          onClick={() => setView('third-party')}
        >
          Third-Party
        </button>
      </div>
      
      <div className="dependency-list">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Version</th>
              <th>Type</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {filteredDependencies.length > 0 ? (
              filteredDependencies.map((dep, index) => (
                <tr key={index} className={`type-${dep.module_type || 'unknown'}`}>
                  <td>{dep.name || dep.package || 'Unknown'}</td>
                  <td>{dep.version || 'N/A'}</td>
                  <td>{dep.module_type || 'unknown'}</td>
                  <td>{dep.detected_by || 'N/A'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="no-dependencies">
                  No dependencies found for the selected filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DependencyViewer;