import React, { useState } from 'react';
import { Trash2, Lock, Unlock, Copy, Edit } from 'lucide-react';
import { ChartLine, ChartMeasurement, ChartFibonacci, ChartText, ChartDrawing } from '../types/chartTypes';

type DrawingType = 'line' | 'measurement' | 'fibonacci' | 'text' | 'drawing';

interface DrawingToolMenuProps {
  type: DrawingType;
  position: { x: number; y: number };
  drawing: ChartLine | ChartMeasurement | ChartFibonacci | ChartText | ChartDrawing;
  onColorChange: (id: string, color: string) => void;
  onWidthChange: (id: string, width: number) => void;
  onDelete: (id: string) => void;
  onLockToggle: (id: string, locked: boolean) => void;
  onDuplicate?: (id: string) => void;
  onClose: () => void;
}

const COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#fcd34d', // Yellow
  '#ef4444', // Red
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#ffffff', // White
  '#9ca3af', // Gray
];

const LINE_WIDTHS = [1, 2, 3, 4, 5];

const DrawingToolMenu: React.FC<DrawingToolMenuProps> = ({
  type,
  position,
  drawing,
  onColorChange,
  onWidthChange,
  onDelete,
  onLockToggle,
  onDuplicate,
  onClose
}) => {
  const [isLocked, setIsLocked] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showWidthPicker, setShowWidthPicker] = useState(false);
  
  const handleLockToggle = () => {
    const newLockedState = !isLocked;
    setIsLocked(newLockedState);
    onLockToggle(drawing.id, newLockedState);
  };
  
  const handleDelete = () => {
    onDelete(drawing.id);
    onClose();
  };
  
  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate(drawing.id);
    }
  };
  
  const handleColorSelect = (color: string) => {
    onColorChange(drawing.id, color);
    setShowColorPicker(false);
  };
  
  const handleWidthSelect = (width: number) => {
    onWidthChange(drawing.id, width);
    setShowWidthPicker(false);
  };
  
  // Get current drawing color and width
  const currentColor = 'color' in drawing ? drawing.color : '#ffffff';
  const currentWidth = 'width' in drawing ? drawing.width : 2;
  
  // Format position to ensure menu stays within viewport
  const menuStyle: React.CSSProperties = {
    left: `${position.x}px`,
    top: `${position.y}px`,
    zIndex: 30
  };
  
  return (
    <div 
      className="absolute bg-gray-800 border border-gray-700 rounded-md shadow-lg p-1"
      style={menuStyle}
      onMouseDown={(e) => e.stopPropagation()} // Prevent chart interactions when using menu
    >
      <div className="flex items-center space-x-1">
        {/* Color button */}
        <div className="relative">
          <button
            className="w-7 h-7 rounded p-1 hover:bg-gray-700 flex items-center justify-center relative"
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="Change Color"
          >
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: currentColor }}
            />
          </button>
          
          {/* Color picker dropdown */}
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-md p-1 grid grid-cols-5 gap-1 z-40 shadow-xl">
              {COLORS.map((color) => (
                <button
                  key={color}
                  className="w-5 h-5 rounded-full hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorSelect(color)}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Width button */}
        <div className="relative">
          <button
            className="w-7 h-7 rounded p-1 hover:bg-gray-700 flex items-center justify-center"
            onClick={() => setShowWidthPicker(!showWidthPicker)}
            title="Change Width"
          >
            <div className="w-4 h-[3px] rounded" style={{ 
              backgroundColor: currentColor,
              height: `${Math.min(6, currentWidth)}px`
            }}/>
          </button>
          
          {/* Width picker dropdown */}
          {showWidthPicker && (
            <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-md p-2 flex flex-col items-center gap-2 z-40 shadow-xl">
              {LINE_WIDTHS.map((width) => (
                <button
                  key={width}
                  className="w-12 flex items-center justify-center hover:bg-gray-700 rounded p-1"
                  onClick={() => handleWidthSelect(width)}
                >
                  <div 
                    className="w-10 rounded" 
                    style={{ 
                      backgroundColor: currentColor,
                      height: `${width}px` 
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Lock/Unlock button */}
        <button
          className="w-7 h-7 rounded p-1 hover:bg-gray-700 text-gray-300 hover:text-white"
          onClick={handleLockToggle}
          title={isLocked ? "Unlock" : "Lock"}
        >
          {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
        </button>
        
        {/* Duplicate button (optional) */}
        {onDuplicate && (
          <button
            className="w-7 h-7 rounded p-1 hover:bg-gray-700 text-gray-300 hover:text-white"
            onClick={handleDuplicate}
            title="Duplicate"
          >
            <Copy className="w-4 h-4" />
          </button>
        )}
        
        {/* Edit text button (only for text type) */}
        {type === 'text' && (
          <button
            className="w-7 h-7 rounded p-1 hover:bg-gray-700 text-gray-300 hover:text-white"
            onClick={() => {/* Add edit text logic here */}}
            title="Edit Text"
          >
            <Edit className="w-4 h-4" />
          </button>
        )}
        
        {/* Delete button */}
        <button
          className="w-7 h-7 rounded p-1 hover:bg-gray-700 text-gray-300 hover:text-red-400"
          onClick={handleDelete}
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default DrawingToolMenu;