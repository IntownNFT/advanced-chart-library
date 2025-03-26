import React from 'react';
import { createRoot } from 'react-dom/client';
import EmbeddableChart from './components/EmbeddableChart';

// Function to get URL parameters
const getUrlParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    symbol: params.get('symbol') || 'NASDAQ:AAPL',
    timeframe: params.get('timeframe') || '1h',
    width: parseInt(params.get('width') || '800'),
    height: parseInt(params.get('height') || '600')
  };
};

// Initialize the chart
const initChart = () => {
  const container = document.getElementById('chart-container');
  if (!container) return;

  const { symbol, timeframe, width, height } = getUrlParams();
  
  const root = createRoot(container);
  root.render(
    <EmbeddableChart 
      symbol={symbol} 
      timeframe={timeframe} 
      width={width} 
      height={height} 
    />
  );
};

// Initialize when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChart);
} else {
  initChart();
} 