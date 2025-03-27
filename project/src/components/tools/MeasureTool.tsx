import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { ToolButtonProps } from './types';

const MeasureTool: React.FC<ToolButtonProps> = ({ isSelected, onClick }) => (
  <button
    onClick={onClick}
    className={`p-2 rounded-md transition-colors ${
      isSelected ? 'text-blue-400' : 'text-gray-400 hover:bg-gray-800'
    }`}
    title="Measure"
  >
    <ArrowUpDown size={16} strokeWidth={1.5} />
  </button>
);

export default MeasureTool;