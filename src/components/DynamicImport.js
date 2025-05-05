// src/components/DynamicImport.js
import React, { useState } from 'react';

function DynamicImport() {
  const [chartData, setChartData] = useState(null);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  
  const loadChartLibrary = async () => {
    if (!libraryLoaded) {
      try {
        // Dynamically import the chart.js library
        // This pattern is common in React for code splitting and conditional loading
        const ChartModule = await import('chart.js/auto');
        setLibraryLoaded(true);
        
        // Generate some sample data for the chart
        const data = {
          labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
          datasets: [{
            label: '# of Votes',
            data: [12, 19, 3, 5, 2, 3],
            backgroundColor: [
              'rgba(255, 99, 132, 0.2)',
              'rgba(54, 162, 235, 0.2)',
              'rgba(255, 206, 86, 0.2)',
              'rgba(75, 192, 192, 0.2)',
              'rgba(153, 102, 255, 0.2)',
              'rgba(255, 159, 64, 0.2)'
            ],
            borderWidth: 1
          }]
        };
        
        setChartData(data);
        console.log('Chart.js dynamically imported');
        
        // Create a new chart in the next render cycle
        setTimeout(() => {
          const ctx = document.getElementById('myChart');
          if (ctx) {
            // This should be detected by the runtime monitor
            new ChartModule.Chart(ctx, {
              type: 'bar',
              data: data,
              options: {
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }
            });
          }
        }, 0);
      } catch (error) {
        console.error('Failed to load Chart.js:', error);
      }
    }
  };
  
  return (
    <div className="test-case">
      <h2>Test 2: Dynamic Import on User Action</h2>
      <p>This test will dynamically import Chart.js only when you click the button.</p>
      <p>Note: You'll need to add chart.js to package.json but <strong>not</strong> import it directly</p>
      
      <button onClick={loadChartLibrary} disabled={libraryLoaded}>
        {libraryLoaded ? 'Chart.js Loaded' : 'Load Chart.js Library'}
      </button>
      
      {chartData && (
        <div className="chart-container">
          <canvas id="myChart" width="400" height="200"></canvas>
        </div>
      )}
    </div>
  );
}

export default DynamicImport;