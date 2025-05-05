// src/components/DataFormatter.js
import React, { useState, useEffect } from 'react';
// We don't import lodash at the top level - we'll import it dynamically
// This simulates a component that only needs lodash when it's actually used

function DataFormatter() {
  const [formattedData, setFormattedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const processData = async () => {
    setIsProcessing(true);
    
    try {
      // Dynamically import lodash only when needed
      const _ = await import('lodash');
      console.log('Lodash library dynamically imported');
      
      // Sample data to process
      const rawData = [
        { id: 1, name: 'john doe', email: 'john@example.com', visits: 13 },
        { id: 2, name: 'jane smith', email: 'JANE@EXAMPLE.COM', visits: 4 },
        { id: 3, name: 'BOB JOHNSON', email: 'bob@example.com', visits: 25 },
        { id: 4, name: 'alice williams', email: 'alice@example.com', visits: 19 },
      ];
      
      // Use lodash functions to process the data
      // This should be detected by the runtime monitor
      const processed = rawData.map(item => ({
        id: item.id,
        name: _.startCase(item.name), // Convert to proper case
        email: _.toLower(item.email), // Normalize email to lowercase
        visits: item.visits,
        status: item.visits > 10 ? 'active' : 'inactive'
      }));
      
      // Use another lodash function
      const grouped = _.groupBy(processed, 'status');
      
      setFormattedData({
        processed,
        grouped,
        totals: {
          active: _.sumBy(processed.filter(i => i.status === 'active'), 'visits'),
          inactive: _.sumBy(processed.filter(i => i.status === 'inactive'), 'visits')
        }
      });
    } catch (error) {
      console.error('Failed to process data:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  useEffect(() => {
    // When this component mounts, log that it was loaded
    console.log('DataFormatter component loaded');
    return () => console.log('DataFormatter component unloaded');
  }, []);
  
  return (
    <div className="test-case">
      <h2>Test 3a: Route-Based Lazy Loading with Lodash</h2>
      <p>This component was loaded lazily when you navigated to this route.</p>
      <p>Click the button to dynamically import and use Lodash for data formatting.</p>
      
      <button onClick={processData} disabled={isProcessing}>
        {isProcessing ? 'Processing...' : 'Process Data with Lodash'}
      </button>
      
      {formattedData && (
        <div className="result">
          <h3>Processed Data:</h3>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Visits</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {formattedData.processed.map(item => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.name}</td>
                  <td>{item.email}</td>
                  <td>{item.visits}</td>
                  <td>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <h3>Summary:</h3>
          <p>Active users: {formattedData.grouped.active?.length || 0} (Total visits: {formattedData.totals.active})</p>
          <p>Inactive users: {formattedData.grouped.inactive?.length || 0} (Total visits: {formattedData.totals.inactive})</p>
        </div>
      )}
    </div>
  );
}

export default DataFormatter;