// src/components/DataVisualizer.js
import React, { useState, useEffect, useRef } from 'react';
// We don't import d3 directly - we'll import it dynamically

function DataVisualizer() {
  const [chartRendered, setChartRendered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const chartRef = useRef(null);
  
  const renderChart = async () => {
    if (chartRendered) return;
    setIsLoading(true);
    
    try {
      // Dynamically import d3 when the chart needs to be rendered
      const d3 = await import('d3');
      console.log('D3.js library dynamically imported');
      
      // Sample data for the chart
      const data = [
        { month: 'Jan', sales: 30 },
        { month: 'Feb', sales: 45 },
        { month: 'Mar', sales: 25 },
        { month: 'Apr', sales: 60 },
        { month: 'May', sales: 40 },
        { month: 'Jun', sales: 80 }
      ];
      
      // Clear any existing chart
      d3.select(chartRef.current).selectAll('*').remove();
      
      // Set up chart dimensions
      const margin = { top: 20, right: 30, bottom: 30, left: 40 };
      const width = 500 - margin.left - margin.right;
      const height = 300 - margin.top - margin.bottom;
      
      // Create SVG
      const svg = d3.select(chartRef.current)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
      
      // Create scales
      const x = d3.scaleBand()
        .domain(data.map(d => d.month))
        .range([0, width])
        .padding(0.1);
      
      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.sales)])
        .nice()
        .range([height, 0]);
      
      // Add X axis
      svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x));
      
      // Add Y axis
      svg.append('g')
        .call(d3.axisLeft(y));
      
      // Add bars
      svg.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.month))
        .attr('y', d => y(d.sales))
        .attr('width', x.bandwidth())
        .attr('height', d => height - y(d.sales))
        .attr('fill', 'steelblue');
      
      setChartRendered(true);
    } catch (error) {
      console.error('Failed to render chart:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    // When this component mounts, log that it was loaded
    console.log('DataVisualizer component loaded');
    return () => console.log('DataVisualizer component unloaded');
  }, []);
  
  return (
    <div className="test-case">
      <h2>Test 3b: Route-Based Lazy Loading with D3.js</h2>
      <p>This component was loaded lazily when you navigated to this route.</p>
      <p>Click the button to dynamically import D3.js and render a chart.</p>
      
      <button onClick={renderChart} disabled={isLoading || chartRendered}>
        {isLoading ? 'Loading D3.js...' : chartRendered ? 'Chart Rendered' : 'Render Chart with D3.js'}
      </button>
      
      <div ref={chartRef} className="chart-container"></div>
    </div>
  );
}

export default DataVisualizer;