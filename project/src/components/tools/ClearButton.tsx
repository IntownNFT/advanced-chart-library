import React from 'react';
import { Trash2 } from 'lucide-react';

interface ClearButtonProps {
  onClick: () => void;
}

const ClearButton: React.FC<ClearButtonProps> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="p-2 rounded-md text-gray-400 hover:bg-gray-800 hover:text-red-500 transition-colors mt-auto"
    title="Clear All (Indicators & Drawings)"
  >
    <Trash2 size={16} strokeWidth={1.5} />
  </button>
);

export default ClearButton;