// src/PerformanceMonitor.js
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import numeral from 'numeral';

const PerformanceMonitor = () => {
  const [sessionId] = useState(uuidv4());
  const [metrics, setMetrics] = useState({
    memory: 0,
    cpuUsage: 0,
    loadTime: 0,
    lastUpdated: new Date()
  });

  useEffect(() => {
    // Simulate collecting performance metrics
    const collectMetrics = () => {
      // In a real app, these would come from actual measurements
      const memory = Math.random() * 100; // MB
      const cpuUsage = Math.random() * 20; // %
      const loadTime = Math.random() * 1000; // ms
      
      setMetrics({
        memory,
        cpuUsage, 
        loadTime,
        lastUpdated: new Date()
      });
    };

    collectMetrics();
    const interval = setInterval(collectMetrics, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="performance-monitor">
      <h3>Performance Monitor</h3>
      <p>Session ID: {sessionId}</p>
      <div className="metrics">
        <div className="metric">
          <span>Memory Usage:</span>
          <span>{numeral(metrics.memory).format('0.0')} MB</span>
        </div>
        <div className="metric">
          <span>CPU Usage:</span>
          <span>{numeral(metrics.cpuUsage).format('0.0')}%</span>
        </div>
        <div className="metric">
          <span>Page Load Time:</span>
          <span>{numeral(metrics.loadTime).format('0.0')} ms</span>
        </div>
        <div className="metric">
          <span>Last Updated:</span>
          <span>{format(metrics.lastUpdated, 'HH:mm:ss')}</span>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;