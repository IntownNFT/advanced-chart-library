import React, { useState } from 'react';
import Chart from './components/Chart';
import { ChartProvider } from './context/ChartContext';
import { fetchHistoricalData } from './services/dataService';

function App() {
  const [symbol, setSymbol] = useState<string>('NASDAQ:AAPL');
  
  const handleSymbolChange = async (newSymbol: string) => {
    setSymbol(newSymbol);
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <header className="p-4 bg-[#141414]">
        <h1 className="text-2xl font-bold text-center">Advanced Chart Library</h1>
      </header>
      
      <main className="p-4 flex-grow">
        <ChartProvider>
          <div className="rounded-lg overflow-hidden h-[calc(100vh-150px)]">
            <Chart symbol={symbol} onSymbolChange={handleSymbolChange} height={600} />
          </div>
        </ChartProvider>
      </main>
      
      <footer className="mt-8 p-4 text-center text-gray-500 text-sm">
        <p>Custom HTML5 Trading Chart Library</p>
        
        {/* Embed Instructions */}
        <div className="mt-8 p-6 bg-[#1a1a1a] rounded-lg max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold mb-4">Embed Instructions</h2>
          <p className="mb-4">Copy and paste this code to embed the chart in your website:</p>
          <pre className="bg-[#2a2a2a] p-4 rounded-lg overflow-x-auto">
            <code>{`<iframe 
  src="https://your-domain.com/embed.html?symbol=NASDAQ:AAPL&timeframe=1h&width=800&height=600" 
  width="800" 
  height="600" 
  frameborder="0" 
  allowfullscreen
></iframe>`}</code>
          </pre>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">URL Parameters:</h3>
            <ul className="list-disc list-inside space-y-2">
              <li><code>symbol</code> - Trading symbol (e.g., NASDAQ:AAPL, BINANCE:BTCUSDT)</li>
              <li><code>timeframe</code> - Chart timeframe (e.g., 1m, 5m, 15m, 1h, 4h, 1d)</li>
              <li><code>width</code> - Chart width in pixels (default: 800)</li>
              <li><code>height</code> - Chart height in pixels (default: 600)</li>
            </ul>
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Example:</h3>
            <pre className="bg-[#2a2a2a] p-4 rounded-lg overflow-x-auto">
              <code>{`https://your-domain.com/embed.html?symbol=BINANCE:BTCUSDT&timeframe=1h&width=1000&height=700`}</code>
            </pre>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;