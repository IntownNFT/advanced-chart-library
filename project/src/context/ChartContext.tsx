import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ChartType, Timeframe, Indicator } from '../types/chartTypes';
import { ChartTool } from '../components/ChartToolbar';

interface ChartContextType {
  chartType: ChartType;
  setChartType: (type: ChartType) => void;
  viewport: {
    scale: number;
    offset: number;
    visibleRange: { start: number; end: number };
  };
  setViewport: (viewport: {
    scale: number;
    offset: number;
    visibleRange: { start: number; end: number };
  }) => void;
  timeframe: Timeframe;
  setTimeframe: (timeframe: Timeframe) => void;
  indicators: Indicator[];
  addIndicator: (indicator: Indicator) => void;
  removeIndicator: (index: number) => void;
  clearAllIndicators: () => void;
  showOHLC: boolean;
  toggleOHLC: () => void;
  selectedTool: ChartTool;
  setSelectedTool: (tool: ChartTool) => void;
}

const ChartContext = createContext<ChartContextType | undefined>(undefined);

export const useChartContext = () => {
  const context = useContext(ChartContext);
  if (!context) {
    throw new Error('useChartContext must be used within a ChartProvider');
  }
  return context;
};

export const ChartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [timeframe, setTimeframe] = useState<Timeframe>('1d');
  const [viewport, setViewport] = useState({
    scale: 1,
    offset: 0,
    visibleRange: { start: 0, end: 100 }
  });
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [showOHLC, setShowOHLC] = useState<boolean>(true);
  const [selectedTool, setSelectedTool] = useState<ChartTool>('crosshair');

  const addIndicator = (indicator: Indicator) => {
    // Check if indicator type already exists
    const exists = indicators.some(ind => ind.type === indicator.type);
    if (exists) return; // Don't add if already exists
    
    // Separate current indicators
    const overlayIndicators = indicators.filter(ind => ind.overlay);
    let bottomIndicators = indicators.filter(ind => !ind.overlay);
    
    if (indicator.overlay) {
      // Add overlay indicator at the end of overlay indicators
      setIndicators([...overlayIndicators, indicator, ...bottomIndicators]);
    } else {
      // If this is a volume indicator, add it at the end
      // Otherwise, add it before volume (if volume exists)
      if (indicator.type === 'volume') {
        setIndicators([...overlayIndicators, ...bottomIndicators, indicator]);
      } else {
        // Find volume indicator
        const volumeIndex = bottomIndicators.findIndex(ind => ind.type === 'volume');
        if (volumeIndex !== -1) {
          // Insert new indicator before volume
          bottomIndicators.splice(volumeIndex, 0, indicator);
          setIndicators([...overlayIndicators, ...bottomIndicators]);
        } else {
          // No volume indicator, just add to bottom indicators
          setIndicators([...overlayIndicators, ...bottomIndicators, indicator]);
        }
      }
    }
  };

  const removeIndicator = (index: number) => {
    setIndicators(indicators.filter((_, i) => i !== index));
  };
  
  // Enhanced with console log to debug
  const clearAllIndicators = () => {
    console.log('Clearing all indicators');
    setIndicators([]);
  };

  const toggleOHLC = () => {
    setShowOHLC(!showOHLC);
  };

  return (
    <ChartContext.Provider
      value={{
        chartType,
        setChartType,
        viewport,
        setViewport,
        timeframe,
        setTimeframe,
        indicators,
        addIndicator,
        removeIndicator,
        clearAllIndicators,
        showOHLC,
        toggleOHLC,
        selectedTool,
        setSelectedTool
      }}
    >
      {children}
    </ChartContext.Provider>
  );
};