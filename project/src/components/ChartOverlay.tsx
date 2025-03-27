import React from 'react';
import { CandleData } from '../types/chartTypes';
import { useChartContext } from '../context/ChartContext';

interface ChartOverlayProps {
  width: number;
  height: number;
  mousePosition: { x: number, y: number };
  data: CandleData[];
  priceRange: { min: number; max: number };
  viewportInfo?: {
    leftPadding: number;
    rightPadding: number;
    totalWidth: number;
    startIndex: number;
    endIndex: number;
  };
}

const ChartOverlay: React.FC<ChartOverlayProps> = ({ 
  width, 
  height, 
  mousePosition, 
  data,
  priceRange,
  viewportInfo
}) => {
  // This component is now empty since we removed the OHLC popup
  // We keep the component for potential future overlay features
  return null;
};

export default ChartOverlay;