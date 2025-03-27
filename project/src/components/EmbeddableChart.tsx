import React from 'react';
import Chart from './Chart';
import { ChartProvider } from '../context/ChartContext';
import { Timeframe } from '../types/chartTypes';

interface EmbeddableChartProps {
  symbol: string;
  timeframe: Timeframe;
  width?: number;
  height?: number;
}

const EmbeddableChart: React.FC<EmbeddableChartProps> = ({ 
  symbol, 
  timeframe, 
  width = 800, 
  height = 600 
}) => {
  return (
    <div className="bg-[#141414]" style={{ width, height }}>
      <ChartProvider>
        <Chart 
          symbol={symbol} 
          onSymbolChange={() => {}}
          timeframe={timeframe}
          height={height} 
        />
      </ChartProvider>
    </div>
  );
};

export default EmbeddableChart; 