import React from 'react';
import Chart from './Chart';
import { ChartProvider } from '../context/ChartContext';

interface EmbeddableChartProps {
  symbol: string;
  timeframe: string;
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
    <div style={{ width, height }}>
      <ChartProvider>
        <Chart 
          symbol={symbol} 
          onSymbolChange={() => {}} 
          height={height} 
        />
      </ChartProvider>
    </div>
  );
};

export default EmbeddableChart; 