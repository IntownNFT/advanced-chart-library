import { useState, useRef } from 'react';
import { CandleData, DrawingState, DrawingObject } from '../types/chartTypes';
import { generateId, duplicateDrawing } from '../utils/drawingUtils';

export const useChartState = () => {
  // Chart dimensions
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  // Data state
  const [data, setData] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isUsingDemoData, setIsUsingDemoData] = useState(false);
  
  // Viewport control
  const [viewportOffset, setViewportOffset] = useState(0);
  const [viewportSize, setViewportSize] = useState(100);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mousePosition, setMousePosition] = useState<{ x: number, y: number } | null>(null);
  
  // Price range state
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null);
  const [customPriceRange, setCustomPriceRange] = useState<{ min: number; max: number } | null>(null);
  const [verticalOffset, setVerticalOffset] = useState(0);
  
  // Hover state
  const [hoveredCandleIndex, setHoveredCandleIndex] = useState<number | null>(null);
  
  // Price scaling state
  const [isPriceScaling, setIsPriceScaling] = useState(false);
  const [priceScaleStartY, setPriceScaleStartY] = useState(0);
  const [priceScaleStartRange, setPriceScaleStartRange] = useState<{ min: number; max: number } | null>(null);
  
  // Animation state
  const requestRef = useRef<number>();
  const [isAnimating, setIsAnimating] = useState(false);
  const targetValues = useRef({ viewportOffset: 0, verticalOffset: 0 });
  
  // Direct dragging state
  const isDirectDragging = useRef(false);
  
  // Text input state
  const [isTextInputActive, setIsTextInputActive] = useState(false);
  const [textInputValue, setTextInputValue] = useState('');
  const [textInputPosition, setTextInputPosition] = useState<{ x: number, y: number } | null>(null);
  
  // Drawing tool menu state
  const [toolMenuPosition, setToolMenuPosition] = useState<{ x: number, y: number } | null>(null);
  const [selectedDrawingObject, setSelectedDrawingObject] = useState<DrawingObject | null>(null);
  const [isResizingDrawing, setIsResizingDrawing] = useState(false);
  
  // Drawing state
  const [drawingState, setDrawingState] = useState<DrawingState>({
    lines: [],
    measurements: [],
    fibonaccis: [],
    texts: [],
    drawings: [],
    currentLine: null,
    currentMeasurement: null,
    currentFibonacci: null,
    currentText: null,
    currentDrawing: null,
    isDrawing: false,
    selectedDrawing: {
      type: null,
      id: null
    },
    hoveredDrawing: {
      type: null,
      id: null
    },
    resizingDrawing: {
      type: null,
      id: null,
      handleIndex: null
    }
  });

  // Drawing handlers
  const handleDrawingColorChange = (id: string, color: string) => {
    const { type } = drawingState.selectedDrawing;
    
    if (!type) return;
    
    if (type === 'line') {
      setDrawingState(prev => ({
        ...prev,
        lines: prev.lines.map(line => 
          line.id === id ? { ...line, color } : line
        )
      }));
    } else if (type === 'measurement') {
      setDrawingState(prev => ({
        ...prev,
        measurements: prev.measurements.map(measurement => 
          measurement.id === id ? { ...measurement, color } : measurement
        )
      }));
    } else if (type === 'fibonacci') {
      setDrawingState(prev => ({
        ...prev,
        fibonaccis: prev.fibonaccis.map(fibonacci => 
          fibonacci.id === id ? { ...fibonacci, color } : fibonacci
        )
      }));
    } else if (type === 'text') {
      setDrawingState(prev => ({
        ...prev,
        texts: prev.texts.map(text => 
          text.id === id ? { ...text, color } : text
        )
      }));
    } else if (type === 'drawing') {
      setDrawingState(prev => ({
        ...prev,
        drawings: prev.drawings.map(drawing => 
          drawing.id === id ? { ...drawing, color } : drawing
        )
      }));
    }
  };

  const handleDrawingWidthChange = (id: string, width: number) => {
    const { type } = drawingState.selectedDrawing;
    
    if (!type) return;
    
    if (type === 'line') {
      setDrawingState(prev => ({
        ...prev,
        lines: prev.lines.map(line => 
          line.id === id ? { ...line, width } : line
        )
      }));
    } else if (type === 'measurement') {
      setDrawingState(prev => ({
        ...prev,
        measurements: prev.measurements.map(measurement => 
          measurement.id === id ? { ...measurement, width } : measurement
        )
      }));
    } else if (type === 'fibonacci') {
      setDrawingState(prev => ({
        ...prev,
        fibonaccis: prev.fibonaccis.map(fibonacci => 
          fibonacci.id === id ? { ...fibonacci, width } : fibonacci
        )
      }));
    } else if (type === 'text') {
      setDrawingState(prev => ({
        ...prev,
        texts: prev.texts.map(text => 
          text.id === id ? { ...text, fontSize: width } : text
        )
      }));
    } else if (type === 'drawing') {
      setDrawingState(prev => ({
        ...prev,
        drawings: prev.drawings.map(drawing => 
          drawing.id === id ? { ...drawing, width } : drawing
        )
      }));
    }
  };

  const handleDrawingDelete = (id: string) => {
    const { type } = drawingState.selectedDrawing;
    
    if (!type) return;
    
    if (type === 'line') {
      setDrawingState(prev => ({
        ...prev,
        lines: prev.lines.filter(line => line.id !== id),
        selectedDrawing: { type: null, id: null }
      }));
    } else if (type === 'measurement') {
      setDrawingState(prev => ({
        ...prev,
        measurements: prev.measurements.filter(m => m.id !== id),
        selectedDrawing: { type: null, id: null }
      }));
    } else if (type === 'fibonacci') {
      setDrawingState(prev => ({
        ...prev,
        fibonaccis: prev.fibonaccis.filter(f => f.id !== id),
        selectedDrawing: { type: null, id: null }
      }));
    } else if (type === 'text') {
      setDrawingState(prev => ({
        ...prev,
        texts: prev.texts.filter(t => t.id !== id),
        selectedDrawing: { type: null, id: null }
      }));
    } else if (type === 'drawing') {
      setDrawingState(prev => ({
        ...prev,
        drawings: prev.drawings.filter(d => d.id !== id),
        selectedDrawing: { type: null, id: null }
      }));
    }
    
    setToolMenuPosition(null);
    setSelectedDrawingObject(null);
  };

  const handleDrawingLockToggle = (id: string, locked: boolean) => {
    const { type } = drawingState.selectedDrawing;
    
    if (!type) return;
    
    if (type === 'line') {
      setDrawingState(prev => ({
        ...prev,
        lines: prev.lines.map(line => 
          line.id === id ? { ...line, locked } : line
        )
      }));
    } else if (type === 'measurement') {
      setDrawingState(prev => ({
        ...prev,
        measurements: prev.measurements.map(m => 
          m.id === id ? { ...m, locked } : m
        )
      }));
    } else if (type === 'fibonacci') {
      setDrawingState(prev => ({
        ...prev,
        fibonaccis: prev.fibonaccis.map(f => 
          f.id === id ? { ...f, locked } : f
        )
      }));
    } else if (type === 'text') {
      setDrawingState(prev => ({
        ...prev,
        texts: prev.texts.map(t => 
          t.id === id ? { ...t, locked } : t
        )
      }));
    } else if (type === 'drawing') {
      setDrawingState(prev => ({
        ...prev,
        drawings: prev.drawings.map(d => 
          d.id === id ? { ...d, locked } : d
        )
      }));
    }
  };

  const handleDrawingDuplicate = (id: string) => {
    const { type } = drawingState.selectedDrawing;
    
    if (!type || !selectedDrawingObject) return;
    
    const newDrawing = duplicateDrawing(type, selectedDrawingObject);
    
    if (type === 'line') {
      setDrawingState(prev => ({
        ...prev,
        lines: [...prev.lines, newDrawing as any],
        selectedDrawing: { type, id: newDrawing.id }
      }));
    } else if (type === 'measurement') {
      setDrawingState(prev => ({
        ...prev,
        measurements: [...prev.measurements, newDrawing as any],
        selectedDrawing: { type, id: newDrawing.id }
      }));
    } else if (type === 'fibonacci') {
      setDrawingState(prev => ({
        ...prev,
        fibonaccis: [...prev.fibonaccis, newDrawing as any],
        selectedDrawing: { type, id: newDrawing.id }
      }));
    } else if (type === 'text') {
      setDrawingState(prev => ({
        ...prev,
        texts: [...prev.texts, newDrawing as any],
        selectedDrawing: { type, id: newDrawing.id }
      }));
    } else if (type === 'drawing') {
      setDrawingState(prev => ({
        ...prev,
        drawings: [...prev.drawings, newDrawing as any],
        selectedDrawing: { type, id: newDrawing.id }
      }));
    }
    
    if (toolMenuPosition) {
      setToolMenuPosition({
        x: toolMenuPosition.x + 20,
        y: toolMenuPosition.y + 20
      });
    }
    
    setSelectedDrawingObject(newDrawing);
  };

  const handleCloseToolMenu = () => {
    setToolMenuPosition(null);
    setSelectedDrawingObject(null);
    setDrawingState(prev => ({
      ...prev,
      selectedDrawing: { type: null, id: null }
    }));
  };

  const getDrawingById = (type: string, id: string): DrawingObject | null => {
    if (type === 'line') {
      return drawingState.lines.find(line => line.id === id) || null;
    } else if (type === 'measurement') {
      return drawingState.measurements.find(measurement => measurement.id === id) || null;
    } else if (type === 'fibonacci') {
      return drawingState.fibonaccis.find(fibonacci => fibonacci.id === id) || null;
    } else if (type === 'text') {
      return drawingState.texts.find(text => text.id === id) || null;
    } else if (type === 'drawing') {
      return drawingState.drawings.find(drawing => drawing.id === id) || null;
    }
    return null;
  };

  const updateResizedDrawing = (type: string, id: string, drawing: DrawingObject) => {
    if (type === 'line') {
      setDrawingState(prev => ({
        ...prev,
        lines: prev.lines.map(line => 
          line.id === id ? drawing as any : line
        )
      }));
    } else if (type === 'measurement') {
      setDrawingState(prev => ({
        ...prev,
        measurements: prev.measurements.map(measurement => 
          measurement.id === id ? drawing as any : measurement
        )
      }));
    } else if (type === 'fibonacci') {
      setDrawingState(prev => ({
        ...prev,
        fibonaccis: prev.fibonaccis.map(fibonacci => 
          fibonacci.id === id ? drawing as any : fibonacci
        )
      }));
    } else if (type === 'text') {
      setDrawingState(prev => ({
        ...prev,
        texts: prev.texts.map(text => 
          text.id === id ? drawing as any : text
        )
      }));
    } else if (type === 'drawing') {
      setDrawingState(prev => ({
        ...prev,
        drawings: prev.drawings.map(d => 
          d.id === id ? drawing as any : d
        )
      }));
    }
  };

  const clearAllDrawings = () => {
    setDrawingState({
      lines: [],
      measurements: [],
      fibonaccis: [],
      texts: [],
      drawings: [],
      currentLine: null,
      currentMeasurement: null,
      currentFibonacci: null,
      currentText: null,
      currentDrawing: null,
      isDrawing: false,
      selectedDrawing: {
        type: null,
        id: null
      },
      hoveredDrawing: {
        type: null,
        id: null
      },
      resizingDrawing: {
        type: null,
        id: null,
        handleIndex: null
      }
    });
    setToolMenuPosition(null);
    setSelectedDrawingObject(null);
  };

  return {
    // State
    dimensions,
    setDimensions,
    data,
    setData,
    loading,
    setLoading,
    error,
    setError,
    isInitialized,
    setIsInitialized,
    isUsingDemoData,
    setIsUsingDemoData,
    viewportOffset,
    setViewportOffset,
    viewportSize,
    setViewportSize,
    isDragging,
    setIsDragging,
    dragStart,
    setDragStart,
    mousePosition,
    setMousePosition,
    priceRange,
    setPriceRange,
    customPriceRange,
    setCustomPriceRange,
    verticalOffset,
    setVerticalOffset,
    hoveredCandleIndex,
    setHoveredCandleIndex,
    isPriceScaling,
    setIsPriceScaling,
    priceScaleStartY,
    setPriceScaleStartY,
    priceScaleStartRange,
    setPriceScaleStartRange,
    isAnimating,
    setIsAnimating,
    targetValues,
    isDirectDragging,
    isTextInputActive,
    setIsTextInputActive,
    textInputValue,
    setTextInputValue,
    textInputPosition,
    setTextInputPosition,
    toolMenuPosition,
    setToolMenuPosition,
    selectedDrawingObject,
    setSelectedDrawingObject,
    isResizingDrawing,
    setIsResizingDrawing,
    drawingState,
    setDrawingState,

    // Handlers
    handleDrawingColorChange,
    handleDrawingWidthChange,
    handleDrawingDelete,
    handleDrawingLockToggle,
    handleDrawingDuplicate,
    handleCloseToolMenu,
    getDrawingById,
    updateResizedDrawing,
    clearAllDrawings
  };
}; 