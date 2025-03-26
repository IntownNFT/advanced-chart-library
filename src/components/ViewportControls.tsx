import React from 'react';
import { ZoomIn, ZoomOut, MoveHorizontal } from 'lucide-react';
import { useChartContext } from '../context/ChartContext';

interface ViewportControlsProps {
  onReset: () => void;
}

const ViewportControls: React.FC<ViewportControlsProps> = ({ onReset }) => {
  const { viewport, setViewport } = useChartContext();

  const handleZoomIn = () => {
    setViewport(prev => ({
      ...prev,
      scale: Math.min(prev.scale * 1.2, 10) // Max zoom 10x
    }));
  };

  const handleZoomOut = () => {
    setViewport(prev => ({
      ...prev,
      scale: Math.max(prev.scale / 1.2, 0.1) // Min zoom 0.1x
    }));
  };

  return (
    <div className="absolute bottom-4 right-4 flex gap-2">
      <button
        onClick={handleZoomIn}
        className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
        title="Zoom In"
      >
        <ZoomIn size={16} />
      </button>
      <button
        onClick={handleZoomOut}
        className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
        title="Zoom Out"
      >
        <ZoomOut size={16} />
      </button>
      <button
        onClick={onReset}
        className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
        title="Reset View"
      >
        <MoveHorizontal size={16} />
      </button>
    </div>
  );
};

export default ViewportControls;