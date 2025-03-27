import React from 'react';
import { useChartContext } from '../context/ChartContext';
import { ChartType, Timeframe } from '../types/chartTypes';
import { ToggleLeft, ToggleRight, ChevronDown } from 'lucide-react';

const INDICATORS = [
  { type: 'sma', name: 'SMA', period: 20, color: '#2196F3', overlay: true },
  { type: 'ema', name: 'EMA', period: 14, color: '#FF9800', overlay: true },
  { type: 'bollinger', name: 'BB', period: 20, color: '#4CAF50', params: { stdDev: 2 }, overlay: true },
  { type: 'rsi', name: 'RSI', period: 14, color: '#E91E63', overlay: false, height: 20, panel: 'rsi' },
  { type: 'macd', name: 'MACD', color: '#9C27B0', overlay: false, height: 20, panel: 'macd', params: { fast: 12, slow: 26, signal: 9 } },
  { type: 'volume', name: 'VOL', color: '#607D8B', overlay: false, height: 15, panel: 'volume' },
  { type: 'stochastic', name: 'STOCH', color: '#795548', overlay: false, height: 20, panel: 'stochastic', params: { k: 14, d: 3, smooth: 3 } }
];

const ChartControls: React.FC = () => {
  const { 
    chartType, 
    setChartType, 
    timeframe, 
    setTimeframe,
    indicators,
    addIndicator,
    removeIndicator,
    showOHLC,
    toggleOHLC
  } = useChartContext();

  const chartTypes: ChartType[] = ['candlestick', 'area'];
  const timeframes: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];
  
  return (
    <div className="flex items-center space-x-3 text-sm overflow-x-auto rounded-b-lg">
      <div className="flex items-center space-x-1.5">
        <span className="text-gray-400 text-xs">Chart</span>
        <select 
          value={chartType}
          onChange={(e) => setChartType(e.target.value as ChartType)}
          className="bg-[#141414] text-white border-0 rounded text-xs py-0.5 px-1.5 h-7 outline-none focus:outline-none focus:ring-0 appearance-none"
          style={{ WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: 'none' }}
        >
          {chartTypes.map(type => (
            <option key={type} value={type} className="bg-[#141414]">
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </select>
      </div>
      
      <div className="flex items-center space-x-1.5">
        <span className="text-gray-400 text-xs">Time</span>
        <select 
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value as Timeframe)}
          className="bg-[#141414] text-white border-0 rounded text-xs py-0.5 px-1.5 h-7 outline-none focus:outline-none focus:ring-0 appearance-none"
          style={{ WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: 'none' }}
        >
          {timeframes.map(tf => (
            <option key={tf} value={tf} className="bg-[#141414]">{tf}</option>
          ))}
        </select>
      </div>
      
      <div className="flex items-center space-x-1.5">
        <span className="text-gray-400 text-xs">Indicators</span>
        <select
          onChange={(e) => {
            const indicator = INDICATORS.find(ind => ind.type === e.target.value);
            if (indicator) {
              addIndicator({
                ...indicator,
                name: `${indicator.name} ${indicator.period || ''}`
              });
            }
            e.target.value = ''; // Reset selection after adding
          }}
          value=""
          className="bg-[#141414] text-white border-0 rounded text-xs py-0.5 px-1.5 h-7 outline-none focus:outline-none focus:ring-0 appearance-none min-w-[90px]"
          style={{ WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: 'none' }}
        >
          <option value="" disabled className="bg-[#141414]">Add...</option>
          {INDICATORS.map(ind => (
            <option 
              key={ind.type} 
              value={ind.type} 
              className="bg-[#141414]"
              disabled={indicators.some(i => i.type === ind.type)}
            >
              {ind.name}
            </option>
          ))}
        </select>
      </div>
      
      <div className="flex items-center">
        <button 
          className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded border-0 h-7 ${showOHLC ? 'bg-blue-900 text-white' : 'bg-[#141414] text-gray-300 hover:bg-gray-800'}`}
          onClick={toggleOHLC}
        >
          {showOHLC ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
          OHLC
        </button>
      </div>
      
      {indicators.length > 0 && (
        <div className="flex items-center">
          <div className="flex gap-1">
            {[...indicators].reverse().map((indicator, index) => (
              <div key={index} className="flex items-center bg-[#141414] border-0 rounded px-2 py-0.5 text-xs h-7">
                <span style={{ color: indicator.color }}>
                  {indicator.name || indicator.type.toUpperCase()}
                </span>
                <button 
                  className="ml-1 text-gray-400 hover:text-red-400"
                  onClick={() => removeIndicator(index)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartControls;