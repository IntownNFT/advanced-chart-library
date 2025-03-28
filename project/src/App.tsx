import React, { useState, useEffect } from 'react';
import Chart from './components/Chart';
import { ChartProvider } from './context/ChartContext';
import { fetchHistoricalData } from './services/dataService';
import { Timeframe } from './types/chartTypes';

function App() {
  // Get URL parameters
  const params = new URLSearchParams(window.location.search);
  const initialSymbol = params.get('symbol') || 'NASDAQ:AAPL';
  const initialTimeframe = (params.get('timeframe') || '1h') as Timeframe;
  
  const [symbol, setSymbol] = useState<string>(initialSymbol);
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe);
  
  const handleSymbolChange = async (newSymbol: string) => {
    setSymbol(newSymbol);
    // Update URL without reloading the page
    const newParams = new URLSearchParams(window.location.search);
    newParams.set('symbol', newSymbol);
    window.history.replaceState({}, '', `?${newParams.toString()}`);
  };

  const handleTimeframeChange = (newTimeframe: Timeframe) => {
    setTimeframe(newTimeframe);
    // Update URL without reloading the page
    const newParams = new URLSearchParams(window.location.search);
    newParams.set('timeframe', newTimeframe);
    window.history.replaceState({}, '', `?${newParams.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <ChartProvider>
        <div className="h-screen">
          <Chart 
            symbol={symbol} 
            onSymbolChange={handleSymbolChange} 
            timeframe={timeframe}
            onTimeframeChange={handleTimeframeChange}
            height={600} 
          />
        </div>
      </ChartProvider>
    </div>
  );
}

export default App;