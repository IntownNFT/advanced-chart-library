import React from 'react';
import { Move, Crosshair, LineChart, ArrowUpDown, PenTool, TrendingUp, Type, Trash2 } from 'lucide-react';

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

interface ToolButtonProps {
  tool: ChartTool;
  selectedTool: ChartTool;
  onClick: () => void;
  icon: React.FC<React.ComponentProps<typeof Move>>;
  tooltip: string;
}

const ToolButton: React.FC<ToolButtonProps> = ({ tool, selectedTool, onClick, icon: Icon, tooltip }) => {
  const isSelected = tool === selectedTool;
  
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-md transition-colors ${
        isSelected 
          ? 'text-blue-400' 
          : 'text-gray-400 hover:bg-gray-800'
      }`}
      title={tooltip}
    >
      <Icon size={16} strokeWidth={1.5} />
    </button>
  );
};

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
        <ToolButton
          tool="pointer"
          selectedTool={selectedTool}
          onClick={() => onSelectTool('pointer')}
          icon={Move}
          tooltip="Pointer"
        />
        <ToolButton
          tool="crosshair"
          selectedTool={selectedTool}
          onClick={() => onSelectTool('crosshair')}
          icon={Crosshair}
          tooltip="Crosshair"
        />
        <ToolButton
          tool="line"
          selectedTool={selectedTool}
          onClick={() => onSelectTool('line')}
          icon={LineChart}
          tooltip="Line"
        />
        <ToolButton
          tool="measure"
          selectedTool={selectedTool}
          onClick={() => onSelectTool('measure')}
          icon={ArrowUpDown}
          tooltip="Measure"
        />
        <ToolButton
          tool="draw"
          selectedTool={selectedTool}
          onClick={() => onSelectTool('draw')}
          icon={PenTool}
          tooltip="Draw"
        />
        <ToolButton
          tool="fibonacci"
          selectedTool={selectedTool}
          onClick={() => onSelectTool('fibonacci')}
          icon={TrendingUp}
          tooltip="Fibonacci"
        />
        <ToolButton
          tool="text"
          selectedTool={selectedTool}
          onClick={() => onSelectTool('text')}
          icon={Type}
          tooltip="Text"
        />
      </div>
      
      {/* Trash button at the bottom */}
      <button
        onClick={handleClearAll}
        className="p-2 rounded-md text-gray-400 hover:bg-gray-800 hover:text-red-500 transition-colors mt-auto"
        title="Clear All (Indicators & Drawings)"
      >
        <Trash2 size={16} strokeWidth={1.5} />
      </button>
    </div>
  );
};

export default ChartToolbar;