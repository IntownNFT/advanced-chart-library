import React from 'react';
import { LineChart } from 'lucide-react';
import { ToolButtonProps } from './types';

const LineTool: React.FC<ToolButtonProps> = ({ isSelected, onClick }) => (
  <button
    onClick={onClick}
    className={`p-2 rounded-md transition-colors ${
      isSelected ? 'text-blue-400' : 'text-gray-400 hover:bg-gray-800'
    }`}
    title="Line"
  >
    <LineChart size={16} strokeWidth={1.5} />
  </button>
);

export default LineTool;