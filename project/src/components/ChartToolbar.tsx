import React from 'react';
import PointerTool from './tools/PointerTool';
import CrosshairTool from './tools/CrosshairTool';
import LineTool from './tools/LineTool';
import MeasureTool from './tools/MeasureTool';
import DrawTool from './tools/DrawTool';
import FibonacciTool from './tools/FibonacciTool';
import TextTool from './tools/TextTool';
import ClearButton from './tools/ClearButton';

export type ChartTool = 
  | 'pointer' 
  | 'crosshair' 
  | 'line' 
  | 'measure' 
  | 'draw' 
  | 'fibonacci' 
  | 'text';

interface ChartToolbarProps {
  selectedTool: ChartTool;
  onSelectTool: (tool: ChartTool) => void;
  onClearIndicators: () => void;
  onClearDrawings: () => void;
}

const ChartToolbar: React.FC<ChartToolbarProps> = ({ 
  selectedTool, 
  onSelectTool, 
  onClearIndicators,
  onClearDrawings 
}) => {
  const handleClearAll = () => {
    // Clear both indicators and drawings when trash icon is clicked
    console.log('Clearing all indicators and drawings');
    if (onClearIndicators) {
      onClearIndicators();
    }
    if (onClearDrawings) {
      onClearDrawings();
    }
  };

  return (
    <div className="flex flex-col items-center justify-between bg-[#0f0f0f] rounded-l-md p-1.5 h-full w-[40px]">
      <div className="flex flex-col items-center space-y-2">
        <PointerTool
          isSelected={selectedTool === 'pointer'}
          onClick={() => onSelectTool('pointer')} 
        />
        <CrosshairTool
          isSelected={selectedTool === 'crosshair'}
          onClick={() => onSelectTool('crosshair')} 
        />
        <LineTool
          isSelected={selectedTool === 'line'}
          onClick={() => onSelectTool('line')} 
        />
        <MeasureTool
          isSelected={selectedTool === 'measure'}
          onClick={() => onSelectTool('measure')} 
        />
        <DrawTool
          isSelected={selectedTool === 'draw'}
          onClick={() => onSelectTool('draw')} 
        />
        <FibonacciTool
          isSelected={selectedTool === 'fibonacci'}
          onClick={() => onSelectTool('fibonacci')} 
        />
        <TextTool
          isSelected={selectedTool === 'text'}
          onClick={() => onSelectTool('text')} 
        />
      </div>
      
      <ClearButton onClick={handleClearAll} />
    </div>
  );
};

export default ChartToolbar;