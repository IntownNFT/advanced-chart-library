import React, { useRef, useEffect, useState } from 'react';
import { useChartContext } from '../context/ChartContext';
import { CandleData, DrawingState, Point, DrawingObject } from '../types/chartTypes';
import { drawChart } from '../utils/chartRenderer';
import { fetchHistoricalData, subscribeToRealtimeData } from '../services/dataService';
import ChartControls from './ChartControls';
import SymbolSearch from './SymbolSearch';
import ChartToolbar from './ChartToolbar';
import DrawingToolMenu from './DrawingToolMenu';
import { 
  drawCrosshair, 
  generateId, 
  drawAllDrawings, 
  calculatePriceDifference, 
  yToPrice,
  fibonacciLevels,
  xToDataIndex,
  dataIndexToX,
  findNearestDrawing,
  isPointNearHandle,
  updateDrawingPoint,
  duplicateDrawing
} from '../utils/drawingUtils';

// Add timeframe interval helper function
const getTimeframeInterval = (timeframe: string): number => {
  const value = parseInt(timeframe.slice(0, -1));
  const unit = timeframe.slice(-1);
  
  switch (unit) {
    case 'm': return value * 60; // minutes to seconds
    case 'h': return value * 3600; // hours to seconds
    case 'd': return value * 86400; // days to seconds
    case 'w': return value * 604800; // weeks to seconds
    default: return 60; // default to 1 minute
  }
};

interface ChartProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  width?: number;
  height: number;
}

const Chart: React.FC<ChartProps> = ({ symbol, onSymbolChange, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartAreaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const { 
    chartType, 
    timeframe, 
    indicators, 
    showOHLC, 
    selectedTool, 
    setSelectedTool, 
    clearAllIndicators 
  } = useChartContext();
  
  const [data, setData] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isUsingDemoData, setIsUsingDemoData] = useState(false);
  
  // For viewport control - now without constraints
  const [viewportOffset, setViewportOffset] = useState(0); // Can be negative or beyond data boundaries
  const [viewportSize, setViewportSize] = useState(100); // How many candles to display
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mousePosition, setMousePosition] = useState<{ x: number, y: number } | null>(null);
  
  // Min and max price for Y-axis scaling
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null);
  const [customPriceRange, setCustomPriceRange] = useState<{ min: number; max: number } | null>(null);
  
  // Vertical offset for panning up/down - can be any value
  const [verticalOffset, setVerticalOffset] = useState(0);
  
  // Track the hovered candle index
  const [hoveredCandleIndex, setHoveredCandleIndex] = useState<number | null>(null);

  // Y-axis drag mode for price scaling
  const [isPriceScaling, setIsPriceScaling] = useState(false);
  const [priceScaleStartY, setPriceScaleStartY] = useState(0);
  const [priceScaleStartRange, setPriceScaleStartRange] = useState<{ min: number; max: number } | null>(null);
  
  // Animation values
  const requestRef = useRef<number>();
  const [isAnimating, setIsAnimating] = useState(false);
  const targetValues = useRef({ viewportOffset: 0, verticalOffset: 0 });
  
  // Track whether changes came from direct user dragging
  const isDirectDragging = useRef(false);
  
  // Track if text input is active
  const [isTextInputActive, setIsTextInputActive] = useState(false);
  const [textInputValue, setTextInputValue] = useState('');
  const [textInputPosition, setTextInputPosition] = useState<{ x: number, y: number } | null>(null);
  
  // Drawing tool menu
  const [toolMenuPosition, setToolMenuPosition] = useState<{ x: number, y: number } | null>(null);
  const [selectedDrawingObject, setSelectedDrawingObject] = useState<DrawingObject | null>(null);
  
  // Track resizing of drawing objects
  const [isResizingDrawing, setIsResizingDrawing] = useState(false);
  
  // Drawing state for all drawing tools
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
  
  // Add unsubscribe function ref
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  // Fetch data when symbol or timeframe changes
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        setIsUsingDemoData(false);
        setCustomPriceRange(null);
        setVerticalOffset(0);
        setHoveredCandleIndex(null);
        
        const historicalData = await fetchHistoricalData(symbol, timeframe);
        
        // Check if using demo data
        if (historicalData.length > 0 && historicalData[0].timestamp % 1000 === 0) {
          setIsUsingDemoData(true);
        }
        
        setData(historicalData);
        
        // Set initial viewport to show the most recent data
        setViewportOffset(historicalData.length - viewportSize);
        
        // Calculate global price range for the entire dataset
        if (historicalData.length > 0) {
          let min = Math.min(...historicalData.map(candle => candle.low));
          let max = Math.max(...historicalData.map(candle => candle.high));
          const range = max - min;
          // Add padding
          min -= range * 0.05;
          max += range * 0.05;
          setPriceRange({ min, max });
        }

        // Subscribe to realtime data
        console.log('Setting up realtime subscription...');
        unsubscribeRef.current = await subscribeToRealtimeData(
          symbol,
          timeframe,
          (newCandle: CandleData) => {
            console.log('Received new candle:', newCandle);
            setData(prevData => {
              // Find the last candle in the historical data
              const lastCandle = prevData[prevData.length - 1];
              
              // If we have historical data, ensure the new candle starts where historical ends
              if (lastCandle) {
                // If the new candle is from the same time period as the last candle,
                // update the last candle instead of adding a new one
                if (Math.floor(newCandle.timestamp / 1000) === Math.floor(lastCandle.timestamp / 1000)) {
                  // Update the last candle with new data
                  const updatedData = [...prevData];
                  updatedData[updatedData.length - 1] = newCandle;
                  return updatedData;
                }
                
                // If the new candle is from a future time period, add it
                if (newCandle.timestamp > lastCandle.timestamp) {
                  return [...prevData, newCandle];
                }
                
                // If the new candle is from a past time period, ignore it
                return prevData;
              }
              
              // If no historical data, just add the new candle
              return [newCandle];
            });

            // Update price range if needed
            setPriceRange(prevRange => {
              if (!prevRange) return { min: newCandle.low, max: newCandle.high };
              return {
                min: Math.min(prevRange.min, newCandle.low),
                max: Math.max(prevRange.max, newCandle.high)
              };
            });
          }
        );

      } catch (err) {
        setError('Failed to load market data. Please try again later.');
        console.error('Error loading market data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();

    // Cleanup function
    return () => {
      // No need to unsubscribe, just let the WebSocket connection stay alive
      console.log('Cleaning up chart component...');
    };
  }, [symbol, timeframe]);
  
  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (chartAreaRef.current) {
        const rect = chartAreaRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: rect.height
        });
      }
    };
    
    // Initial update and then listen for resize events
    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    
    if (chartAreaRef.current) {
      resizeObserver.observe(chartAreaRef.current);
    }
    
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      if (chartAreaRef.current) {
        resizeObserver.unobserve(chartAreaRef.current);
      }
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);
  
  // Animation loop for smooth transitions - only used when not directly dragging
  useEffect(() => {
    const animate = (time: number) => {
      if (!isAnimating) {
        requestRef.current = requestAnimationFrame(animate);
        return;
      }
      
      // Skip animation during direct dragging for immediate response
      if (isDirectDragging.current) {
        requestRef.current = requestAnimationFrame(animate);
        return;
      }
      
      let stillAnimating = false;
      
      // Animate viewport offset (horizontal position) - no constraints
      if (Math.abs(targetValues.current.viewportOffset - viewportOffset) > 0.01) {
        const newViewportOffset = viewportOffset + (targetValues.current.viewportOffset - viewportOffset) * 0.3; // Faster easing
        setViewportOffset(newViewportOffset);
        stillAnimating = true;
      }
      
      // Animate vertical offset - no constraints
      if (Math.abs(targetValues.current.verticalOffset - verticalOffset) > 0.01) {
        const newVerticalOffset = verticalOffset + (targetValues.current.verticalOffset - verticalOffset) * 0.3; // Faster easing
        setVerticalOffset(newVerticalOffset);
        stillAnimating = true;
      }
      
      if (!stillAnimating) {
        setIsAnimating(false);
      }
      
      requestRef.current = requestAnimationFrame(animate);
    };
    
    requestRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isAnimating, viewportOffset, verticalOffset]);
  
  // Get visible data based on viewport - allow for out-of-bounds regions
  const getVisibleData = () => {
    // If offset is negative, we'll show empty space at the left
    const startIndex = Math.max(0, Math.floor(viewportOffset));
    const endIndex = Math.min(data.length, Math.floor(viewportOffset + viewportSize));
    
    // Get actual visible data
    const visibleData = data.slice(startIndex, endIndex);
    
    // Add padding on either side if we're viewing beyond the data boundaries
    const leftPadding = viewportOffset < 0 ? Math.abs(Math.floor(viewportOffset)) : 0;
    const rightPadding = Math.max(0, Math.floor(viewportOffset + viewportSize) - data.length);
    
    return {
      data: visibleData,
      leftPadding,
      rightPadding,
      totalWidth: leftPadding + visibleData.length + rightPadding,
      startIndex,
      endIndex
    };
  };
  
  // Get effective price range (custom or calculated)
  const getEffectivePriceRange = () => {
    let effectiveRange;
    
    if (customPriceRange) {
      effectiveRange = customPriceRange;
    } else if (priceRange) {
      effectiveRange = priceRange;
    } else {
      // Fallback to visible data
      const visibleData = getVisibleData().data;
      if (visibleData.length === 0) return { min: 0, max: 100 };
      
      let min = Math.min(...visibleData.map(candle => candle.low));
      let max = Math.max(...visibleData.map(candle => candle.high));
      const range = max - min;
      min -= range * 0.05;
      max += range * 0.05;
      effectiveRange = { min, max };
    }
    
    // Apply vertical offset - no constraints on how far we can move vertically
    if (verticalOffset !== 0) {
      const range = effectiveRange.max - effectiveRange.min;
      const offsetAmount = range * (verticalOffset / dimensions.height);
      return {
        min: effectiveRange.min + offsetAmount,
        max: effectiveRange.max + offsetAmount
      };
    }
    
    return effectiveRange;
  };
  
  // Get the currently hovered candle
  const getHoveredCandle = () => {
    if (hoveredCandleIndex === null || hoveredCandleIndex < 0 || hoveredCandleIndex >= data.length) {
      return null;
    }
    return data[hoveredCandleIndex];
  };

  // Render chart
  useEffect(() => {
    if (canvasRef.current && dimensions.width > 0 && dimensions.height > 0 && data.length > 0) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        // Set up high-resolution canvas
        const pixelRatio = window.devicePixelRatio || 1;
        canvasRef.current.width = dimensions.width * pixelRatio;
        canvasRef.current.height = dimensions.height * pixelRatio;
        canvasRef.current.style.width = `${dimensions.width}px`;
        canvasRef.current.style.height = `${dimensions.height}px`;
        ctx.scale(pixelRatio, pixelRatio);
        
        // Enable smooth rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Clear canvas
        ctx.clearRect(0, 0, dimensions.width, dimensions.height);
        
        // Get data with potential out-of-bounds regions
        const visibleDataInfo = getVisibleData();
        const effectivePriceRange = getEffectivePriceRange();
        
        drawChart(ctx, {
          data: visibleDataInfo.data,
          width: dimensions.width,
          height: dimensions.height,
          chartType,
          indicators,
          timeframe,
          symbol,
          priceRange: effectivePriceRange,
          minimizeGrid: true,
          virtualBoundaries: {
            leftPadding: visibleDataInfo.leftPadding,
            rightPadding: visibleDataInfo.rightPadding,
            totalWidth: visibleDataInfo.totalWidth
          },
          hoveredCandle: getHoveredCandle(),
          showOHLC
        });

        setIsInitialized(true);
      }
    }
  }, [data, dimensions, chartType, indicators, timeframe, viewportOffset, viewportSize, customPriceRange, verticalOffset, showOHLC, hoveredCandleIndex]);
  
  // Render overlay with drawings and crosshair
  useEffect(() => {
    if (overlayCanvasRef.current && dimensions.width > 0 && dimensions.height > 0) {
      const ctx = overlayCanvasRef.current.getContext('2d');
      if (ctx) {
        // Set up high-resolution canvas
        const pixelRatio = window.devicePixelRatio || 1;
        overlayCanvasRef.current.width = dimensions.width * pixelRatio;
        overlayCanvasRef.current.height = dimensions.height * pixelRatio;
        overlayCanvasRef.current.style.width = `${dimensions.width}px`;
        overlayCanvasRef.current.style.height = `${dimensions.height}px`;
        ctx.scale(pixelRatio, pixelRatio);
        
        // Clear canvas
        ctx.clearRect(0, 0, dimensions.width, dimensions.height);
        
        // Draw crosshair if we have a mouse position and crosshair tool is selected
        if (mousePosition && selectedTool === 'crosshair') {
          drawCrosshair(ctx, mousePosition.x, mousePosition.y, dimensions.width, dimensions.height);
        }
        
        // Get data with potential out-of-bounds regions
        const visibleDataInfo = getVisibleData();
        const effectivePriceRange = getEffectivePriceRange();
        
        // Draw all drawings with data coordinates for proper positioning
        drawAllDrawings(ctx, {
          lines: drawingState.lines,
          measurements: drawingState.measurements,
          fibonaccis: drawingState.fibonaccis,
          texts: drawingState.texts,
          drawings: drawingState.drawings,
          currentLine: drawingState.currentLine,
          currentMeasurement: drawingState.currentMeasurement,
          currentFibonacci: drawingState.currentFibonacci,
          currentDrawing: drawingState.currentDrawing,
          selectedDrawing: drawingState.selectedDrawing,
          hoveredDrawing: drawingState.hoveredDrawing
        }, dimensions.width, dimensions.height, effectivePriceRange, visibleDataInfo);
      }
    }
  }, [dimensions, mousePosition, selectedTool, drawingState, viewportOffset, viewportSize, customPriceRange, verticalOffset]);
  
  // Y coordinate to price conversion
  const handleYToPrice = (y: number) => {
    const range = getEffectivePriceRange();
    return yToPrice(y, dimensions.height, range);
  };

  // Check if click is on the price axis (right edge)
  const isClickOnPriceAxis = (x: number) => {
    return x > dimensions.width - 60; // 60px wide area for price axis
  };
  
  // Handle drawing color change
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
  
  // Handle drawing width change
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
  
  // Handle drawing deletion
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
    
    // Close the menu
    setToolMenuPosition(null);
    setSelectedDrawingObject(null);
  };
  
  // Handle drawing lock toggle
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
  
  // Handle drawing duplication
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
    
    // Set new position for the menu near the duplicated object
    setToolMenuPosition({
      x: toolMenuPosition!.x + 20,
      y: toolMenuPosition!.y + 20
    });
    
    setSelectedDrawingObject(newDrawing);
  };
  
  // Close the drawing tool menu
  const handleCloseToolMenu = () => {
    setToolMenuPosition(null);
    setSelectedDrawingObject(null);
    setDrawingState(prev => ({
      ...prev,
      selectedDrawing: { type: null, id: null }
    }));
  };
  
  // Get drawing object by type and id
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
  
  // Update resized drawing
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
  
  // Handle mouse interactions
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    
    // Calculate bar width (pixel width of each candle)
    const visibleDataInfo = getVisibleData();
    const totalVisibleItems = visibleDataInfo.totalWidth;
    const barWidth = dimensions.width / (totalVisibleItems || 1);
    
    // Function to check if mouse is directly over a candle
    const checkIfOverCandle = (mouseX: number) => {
      if (!visibleDataInfo) return -1;
      
      const virtualIndex = Math.floor(mouseX / barWidth);
      const adjustedIndex = virtualIndex - visibleDataInfo.leftPadding;
      
      if (adjustedIndex >= 0 && adjustedIndex < visibleDataInfo.data.length) {
        const candleX = (visibleDataInfo.leftPadding + adjustedIndex) * barWidth + barWidth / 2;
        const candleWidth = barWidth * 0.8; // Match the width in drawCandle function
        
        // Check if within the candle width
        if (Math.abs(mouseX - candleX) <= candleWidth / 2) {
          return visibleDataInfo.startIndex + adjustedIndex;
        }
      }
      
      return -1;
    };
    
    const handleMouseDown = (e: MouseEvent) => {
      if (isTextInputActive) return; // Skip mouse handling if text input is active
      
      // Only start dragging with left mouse button
      if (e.button === 0) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Create a point at the current mouse position
        const currentPoint: Point = { x: mouseX, y: mouseY };
        
        // Get the data index for this x position
        const dataIndex = xToDataIndex(mouseX, dimensions.width, visibleDataInfo, data);
        if (dataIndex >= 0) {
          currentPoint.dataIndex = dataIndex;
        }
        
        // Add price information
        const price = handleYToPrice(mouseY);
        currentPoint.price = price;
        
        // Check if clicking on price axis for price scaling
        if (isClickOnPriceAxis(mouseX)) {
          setIsPriceScaling(true);
          setPriceScaleStartY(e.clientY);
          setPriceScaleStartRange(getEffectivePriceRange());
          canvas.style.cursor = 'ns-resize';
        } 
        // If we have a hovered drawing, check if clicking on a handle point
        else if (drawingState.hoveredDrawing.type && drawingState.hoveredDrawing.id) {
          const drawing = getDrawingById(drawingState.hoveredDrawing.type, drawingState.hoveredDrawing.id);
          
          if (drawing) {
            const { isNear, handleIndex } = isPointNearHandle(
              mouseX, 
              mouseY, 
              drawingState.hoveredDrawing.type,
              drawing,
              dimensions.width,
              dimensions.height,
              getEffectivePriceRange(),
              visibleDataInfo
            );
            
            if (isNear) {
              // Start resizing operation
              setIsResizingDrawing(true);
              setDrawingState(prev => ({
                ...prev,
                resizingDrawing: {
                  type: prev.hoveredDrawing.type,
                  id: prev.hoveredDrawing.id,
                  handleIndex
                }
              }));
              canvas.style.cursor = 'grabbing';
              
              // Select the drawing automatically
              setDrawingState(prev => ({
                ...prev,
                selectedDrawing: {
                  type: prev.hoveredDrawing.type,
                  id: prev.hoveredDrawing.id
                }
              }));
              
              e.preventDefault();
              return;
            }
          }
          
          // If clicked on the drawing but not on a handle, show the menu
          setDrawingState(prev => ({
            ...prev,
            selectedDrawing: { 
              type: prev.hoveredDrawing.type, 
              id: prev.hoveredDrawing.id 
            }
          }));
          
          // Position the menu near the drawing
          setToolMenuPosition({ x: mouseX, y: mouseY });
          setSelectedDrawingObject(drawing);
          
          e.preventDefault();
          return;
        }
        // If pointer tool is selected, check if clicking on an existing drawing
        else if (selectedTool === 'pointer' || selectedTool === 'crosshair') {
          const ctx = canvas.getContext('2d')!;
          const nearestDrawing = findNearestDrawing(
            mouseX,
            mouseY,
            drawingState,
            ctx,
            dimensions.width,
            dimensions.height,
            getEffectivePriceRange(),
            visibleDataInfo
          );
          
          if (nearestDrawing.type && nearestDrawing.id && nearestDrawing.drawing) {
            // Select the drawing and show the menu
            setDrawingState(prev => ({
              ...prev,
              selectedDrawing: { 
                type: nearestDrawing.type as any, 
                id: nearestDrawing.id 
              }
            }));
            
            // Position the menu near the drawing
            setToolMenuPosition({ x: mouseX, y: mouseY });
            setSelectedDrawingObject(nearestDrawing.drawing);
          } else {
            // If clicking elsewhere, close any open menus and deselect drawings
            handleCloseToolMenu();
            
            // Regular panning for both pointer and crosshair tools
            setIsDragging(true);
            setDragStart({ x: e.clientX, y: e.clientY });
            canvas.style.cursor = selectedTool === 'pointer' ? 'grabbing' : 'crosshair';
          }
        }
        // Handle drawing tools
        else if (selectedTool === 'line') {
          // Start a new line
          setDrawingState(prev => ({
            ...prev,
            currentLine: {
              id: generateId(),
              points: [currentPoint, { ...currentPoint }], // Start point and temp end point
              color: '#3b82f6', // Blue
              width: 2
            },
            isDrawing: true
          }));
        }
        else if (selectedTool === 'measure') {
          // Start a measurement
          setDrawingState(prev => ({
            ...prev,
            currentMeasurement: {
              id: generateId(),
              startPoint: currentPoint,
              endPoint: { ...currentPoint },
              color: '#10b981', // Green
              width: 2,
              priceDifference: 0,
              percentDifference: 0
            },
            isDrawing: true
          }));
        }
        else if (selectedTool === 'fibonacci') {
          // Start a fibonacci
          setDrawingState(prev => ({
            ...prev,
            currentFibonacci: {
              id: generateId(),
              startPoint: currentPoint,
              endPoint: { ...currentPoint },
              levels: fibonacciLevels,
              color: '#8b5cf6', // Purple
              width: 2
            },
            isDrawing: true
          }));
        }
        else if (selectedTool === 'text') {
          // Set text input position and activate it
          setTextInputPosition({ x: mouseX, y: mouseY });
          setTextInputValue('');
          setIsTextInputActive(true);
          // Focus the text input when it becomes visible
          setTimeout(() => {
            const input = document.getElementById('chart-text-input');
            if (input) {
              input.focus();
            }
          }, 10);
        }
        else if (selectedTool === 'draw') {
          // Start freehand drawing
          setDrawingState(prev => ({
            ...prev,
            currentDrawing: {
              id: generateId(),
              points: [currentPoint],
              color: '#ec4899', // Pink
              width: 2
            },
            isDrawing: true
          }));
        }
        
        // Mark that we're now in direct dragging mode for immediate response
        isDirectDragging.current = true;
        e.preventDefault(); // Prevent text selection during drag
      }
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (isTextInputActive) return; // Skip mouse handling if text input is active
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Update mouse position for crosshair
      setMousePosition({
        x: mouseX,
        y: mouseY
      });
      
      // Check if hovering over a candlestick
      const candleIndex = checkIfOverCandle(mouseX);
      
      // Update hovered candle index
      setHoveredCandleIndex(candleIndex >= 0 ? candleIndex : null);
      
      // If resizing a drawing
      if (isResizingDrawing && drawingState.resizingDrawing.type && drawingState.resizingDrawing.id !== null) {
        const { type, id, handleIndex } = drawingState.resizingDrawing;
        
        if (handleIndex !== null) {
          const drawing = getDrawingById(type, id);
          
          if (drawing) {
            // Create a point at the current mouse position
            const newPoint: Point = { x: mouseX, y: mouseY };
            
            // Add price information - needed for data-based drawings
            const price = handleYToPrice(mouseY);
            newPoint.price = price;
            
            // Get data index for this x position
            const dataIndex = xToDataIndex(mouseX, dimensions.width, visibleDataInfo, data);
            if (dataIndex >= 0) {
              newPoint.dataIndex = dataIndex;
            }
            
            // Update the drawing point based on mouse position
            const updatedDrawing = updateDrawingPoint(
              drawing,
              type,
              handleIndex,
              newPoint,
              dimensions.width,
              dimensions.height,
              getEffectivePriceRange(),
              visibleDataInfo
            );
            
            // Update the drawing in state
            updateResizedDrawing(type, id, updatedDrawing);
          }
        }
        
        return;
      }
      
      // Check if hovering over a drawing
      const ctx = canvas.getContext('2d')!;
      const nearestDrawing = findNearestDrawing(
        mouseX,
        mouseY,
        drawingState,
        ctx,
        dimensions.width,
        dimensions.height,
        getEffectivePriceRange(),
        visibleDataInfo
      );
      
      // Update hovered drawing
      setDrawingState(prev => ({
        ...prev,
        hoveredDrawing: {
          type: nearestDrawing.type as any,
          id: nearestDrawing.id
        }
      }));
      
      // Update cursor based on position and selected tool
      if (!isDragging && !isPriceScaling && !drawingState.isDrawing) {
        if (isClickOnPriceAxis(mouseX)) {
          canvas.style.cursor = 'ns-resize';
        } 
        // If hovering over a drawing handle, show resize cursor
        else if (nearestDrawing.type && nearestDrawing.id && nearestDrawing.drawing) {
          const { isNear } = isPointNearHandle(
            mouseX, 
            mouseY, 
            nearestDrawing.type,
            nearestDrawing.drawing,
            dimensions.width,
            dimensions.height,
            getEffectivePriceRange(),
            visibleDataInfo
          );
          
          if (isNear) {
            canvas.style.cursor = 'grab';
          } else if (selectedTool === 'pointer') {
            canvas.style.cursor = 'grab';
          } else if (selectedTool === 'crosshair') {
            canvas.style.cursor = 'crosshair';
          }
        } 
        else if (selectedTool === 'pointer') {
          canvas.style.cursor = 'grab';
        } else if (selectedTool === 'crosshair') {
          canvas.style.cursor = 'crosshair';
        } else if (['line', 'measure', 'fibonacci'].includes(selectedTool)) {
          canvas.style.cursor = 'cell';
        } else if (selectedTool === 'text') {
          canvas.style.cursor = 'text';
        } else if (selectedTool === 'draw') {
          canvas.style.cursor = 'pencil';
        } else {
          canvas.style.cursor = 'grab';
        }
      }
      
      // Handle drawing tools during mouse move
      if (drawingState.isDrawing) {
        // Get the data index for this x position
        const dataIndex = xToDataIndex(mouseX, dimensions.width, visibleDataInfo, data);
        
        // Get price for this y position
        const price = handleYToPrice(mouseY);
        
        if (drawingState.currentLine) {
          // Update the end point of the line
          setDrawingState(prev => {
            if (!prev.currentLine) return prev;
            const updatedLine = { ...prev.currentLine };
            updatedLine.points[1] = { 
              x: mouseX, 
              y: mouseY,
              dataIndex: dataIndex >= 0 ? dataIndex : undefined,
              price
            };
            return { ...prev, currentLine: updatedLine };
          });
        }
        else if (drawingState.currentMeasurement) {
          // Update the end point of the measurement
          const { priceDiff, percentDiff } = calculatePriceDifference(
            drawingState.currentMeasurement.startPoint.price!,
            price
          );
          
          setDrawingState(prev => {
            if (!prev.currentMeasurement) return prev;
            return {
              ...prev,
              currentMeasurement: {
                ...prev.currentMeasurement,
                endPoint: { 
                  x: mouseX, 
                  y: mouseY, 
                  price,
                  dataIndex: dataIndex >= 0 ? dataIndex : undefined
                },
                priceDifference: priceDiff,
                percentDifference: percentDiff
              }
            };
          });
        }
        else if (drawingState.currentFibonacci) {
          // Update the end point of the fibonacci
          setDrawingState(prev => {
            if (!prev.currentFibonacci) return prev;
            return {
              ...prev,
              currentFibonacci: {
                ...prev.currentFibonacci,
                endPoint: { 
                  x: mouseX, 
                  y: mouseY, 
                  price,
                  dataIndex: dataIndex >= 0 ? dataIndex : undefined
                }
              }
            };
          });
        }
        else if (drawingState.currentDrawing) {
          // Add a point to the drawing
          setDrawingState(prev => {
            if (!prev.currentDrawing) return prev;
            return {
              ...prev,
              currentDrawing: {
                ...prev.currentDrawing,
                points: [
                  ...prev.currentDrawing.points, 
                  { 
                    x: mouseX, 
                    y: mouseY,
                    price,
                    dataIndex: dataIndex >= 0 ? dataIndex : undefined
                  }
                ]
              }
            };
          });
        }
      }
      
      // Handle price scaling (Y-axis drag)
      if (isPriceScaling && priceScaleStartRange) {
        const deltaY = e.clientY - priceScaleStartY;
        
        // Calculate zoom factor based on drag amount (up = zoom in, down = zoom out)
        const zoomFactor = 1 + (deltaY * 0.005);
        
        // Get the initial range size
        const initialRange = priceScaleStartRange.max - priceScaleStartRange.min;
        
        // Calculate new range size with zoom
        const newRangeSize = initialRange * zoomFactor;
        
        // Calculate new min and max keeping the center point fixed
        const centerPrice = (priceScaleStartRange.min + priceScaleStartRange.max) / 2;
        const newMin = centerPrice - (newRangeSize / 2);
        const newMax = centerPrice + (newRangeSize / 2);
        
        // Set the new price range
        setCustomPriceRange({ min: newMin, max: newMax });
        
        return;
      }
      
      // Handle dragging - with no constraints
      if (isDragging) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        
        // Handle completely free panning (both X and Y)
        handleCompletelyFreePanning(deltaX, deltaY);
        
        // Update drag reference point
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    };
    
    const handleCompletelyFreePanning = (deltaX: number, deltaY: number) => {
      // Handle horizontal movement (x-axis) - completely unconstrained
      if (Math.abs(deltaX) > 0) {
        // Convert pixel movement to candle count movement
        const sensitivity = 1.2; // Increased for better response
        const candlesToShift = (deltaX * sensitivity) / barWidth;
        
        // Allow any position - no min/max constraints
        const newOffset = viewportOffset - candlesToShift;
        
        // For direct dragging - set immediately
        if (isDirectDragging.current) {
          setViewportOffset(newOffset);
        } else {
          // For inertia or programmatic movement - use animation
          targetValues.current.viewportOffset = newOffset;
          setIsAnimating(true);
        }
      }
      
      // Handle vertical movement (y-axis) - completely unconstrained
      if (Math.abs(deltaY) > 0) {
        // Update vertical offset - no constraints
        const newOffset = verticalOffset + deltaY;
        
        // For direct dragging - set immediately
        if (isDirectDragging.current) {
          setVerticalOffset(newOffset);
        } else {
          // For inertia or programmatic movement - use animation
          targetValues.current.verticalOffset = newOffset;
          setIsAnimating(true);
        }
      }
    };
    
    // Important: This is the handler that resets the dragging state
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        // Complete any drawing operations
        if (drawingState.isDrawing) {
          if (drawingState.currentLine) {
            // Add the line to the list of completed lines
            setDrawingState(prev => ({
              ...prev,
              lines: [...prev.lines, prev.currentLine!],
              currentLine: null,
              isDrawing: false
            }));
            
            // Switch back to crosshair after drawing
            setSelectedTool('crosshair');
          } 
          else if (drawingState.currentMeasurement) {
            // Add the measurement to the list of completed measurements
            setDrawingState(prev => ({
              ...prev,
              measurements: [...prev.measurements, prev.currentMeasurement!],
              currentMeasurement: null,
              isDrawing: false
            }));
            
            // Switch back to crosshair after drawing
            setSelectedTool('crosshair');
          }
          else if (drawingState.currentFibonacci) {
            // Add the fibonacci to the list of completed fibonaccis
            setDrawingState(prev => ({
              ...prev,
              fibonaccis: [...prev.fibonaccis, prev.currentFibonacci!],
              currentFibonacci: null,
              isDrawing: false
            }));
            
            // Switch back to crosshair after drawing
            setSelectedTool('crosshair');
          }
          else if (drawingState.currentDrawing) {
            // Add the drawing to the list of completed drawings
            setDrawingState(prev => ({
              ...prev,
              drawings: [...prev.drawings, prev.currentDrawing!],
              currentDrawing: null,
              isDrawing: false
            }));
            
            // Switch back to crosshair after drawing
            setSelectedTool('crosshair');
          }
        }
        
        // Reset resizing state
        if (isResizingDrawing) {
          setIsResizingDrawing(false);
          setDrawingState(prev => ({
            ...prev,
            resizingDrawing: {
              type: null,
              id: null,
              handleIndex: null
            }
          }));
        }
        
        // Reset all dragging states
        setIsDragging(false);
        setIsPriceScaling(false);
        isDirectDragging.current = false;
        
        // Update cursor based on position
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        
        if (isClickOnPriceAxis(mouseX)) {
          canvas.style.cursor = 'ns-resize';
        } else if (selectedTool === 'pointer') {
          canvas.style.cursor = 'grab';
        } else if (selectedTool === 'crosshair') {
          canvas.style.cursor = 'crosshair';
        } else if (['line', 'measure', 'fibonacci'].includes(selectedTool)) {
          canvas.style.cursor = 'cell';
        } else if (selectedTool === 'text') {
          canvas.style.cursor = 'text';
        } else if (selectedTool === 'draw') {
          canvas.style.cursor = 'pencil';
        } else {
          canvas.style.cursor = 'grab';
        }
      }
    };
    
    const handleMouseLeave = () => {
      // Don't reset things if text input is active
      if (isTextInputActive) return;
      
      // Reset all states when mouse leaves
      setIsDragging(false);
      setIsPriceScaling(false);
      setMousePosition(null);
      setHoveredCandleIndex(null);
      canvas.style.cursor = 'default';
      isDirectDragging.current = false;
      
      // Clear hovered drawing
      setDrawingState(prev => ({
        ...prev,
        hoveredDrawing: {
          type: null,
          id: null
        }
      }));
    };
    
    const handleMouseEnter = (e: MouseEvent) => {
      if (isTextInputActive) return; // Skip if text input is active
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      
      // Set appropriate cursor when mouse enters
      if (isClickOnPriceAxis(mouseX)) {
        canvas.style.cursor = 'ns-resize';
      } else if (selectedTool === 'pointer') {
        canvas.style.cursor = isDragging ? 'grabbing' : 'grab';
      } else if (selectedTool === 'crosshair') {
        canvas.style.cursor = 'crosshair';
      } else if (['line', 'measure', 'fibonacci'].includes(selectedTool)) {
        canvas.style.cursor = 'cell';
      } else if (selectedTool === 'text') {
        canvas.style.cursor = 'text';
      } else if (selectedTool === 'draw') {
        canvas.style.cursor = 'pencil';
      } else {
        canvas.style.cursor = isDragging ? 'grabbing' : 'grab';
      }
    };
    
    const handleWheel = (e: WheelEvent) => {
      if (isTextInputActive) return; // Skip if text input is active
      
      e.preventDefault();
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Check if Ctrl key is pressed for vertical scaling
      if (e.ctrlKey || e.metaKey) {
        // Scale price (Y-axis) without constraints
        const currentRange = getEffectivePriceRange();
        const rangeSize = currentRange.max - currentRange.min;
        const zoomFactor = e.deltaY < 0 ? 0.9 : 1.1; // Zoom in or out
        
        // Get price at mouse position
        const cursorPrice = handleYToPrice(mouseY);
        const cursorRatio = (cursorPrice - currentRange.min) / rangeSize;
        
        // Calculate new min and max while preserving the relative mouse position
        const newMin = cursorPrice - (cursorRatio * rangeSize * zoomFactor);
        const newMax = cursorPrice + ((1 - cursorRatio) * rangeSize * zoomFactor);
        
        setCustomPriceRange({ min: newMin, max: newMax });
        
      } else {
        // Zoom time (X-axis)
        const zoomFactor = e.deltaY < 0 ? 0.85 : 1.15; // Zoom in or out
        const mousePosition = mouseX / dimensions.width; // 0 to 1
        
        // Calculate new viewport size without constraints
        const newSize = Math.max(
          1, // Allow extreme zoom in (just 1 candle)
          Math.round(viewportSize * zoomFactor)
        );
        
        if (newSize !== viewportSize) {
          // Calculate new offset based on mouse position - keep the point under the mouse at the same position
          const pointUnderMouse = viewportOffset + (mousePosition * viewportSize);
          const newOffset = pointUnderMouse - (mousePosition * newSize);
          
          setViewportSize(newSize);
          // For quick response on wheel zoom
          setViewportOffset(newOffset);
        }
      }
    };
    
    // Handle touch events for mobile
    const handleTouchStart = (e: TouchEvent) => {
      if (isTextInputActive) return; // Skip if text input is active
      
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        setIsDragging(true);
        setDragStart({ x: touch.clientX, y: touch.clientY });
        // Mark that we're now in direct dragging mode for immediate response
        isDirectDragging.current = true;
        e.preventDefault(); // Prevent scrolling
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (isTextInputActive) return; // Skip if text input is active
      
      if (e.touches.length === 1 && isDragging) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        
        // Update crosshair position
        setMousePosition({
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top
        });
        
        // Handle unconstrained pan
        const deltaX = touch.clientX - dragStart.x;
        const deltaY = touch.clientY - dragStart.y;
        
        handleCompletelyFreePanning(deltaX, deltaY);
        
        setDragStart({ x: touch.clientX, y: touch.clientY });
        e.preventDefault(); // Prevent scrolling
      }
    };
    
    const handleTouchEnd = () => {
      if (isTextInputActive) return; // Skip if text input is active
      
      setIsDragging(false);
      setIsPriceScaling(false);
      isDirectDragging.current = false;
    };
    
    // Double-click to reset view
    const handleDoubleClick = () => {
      if (isTextInputActive) return; // Skip if text input is active
      
      // Reset price scaling
      setCustomPriceRange(null);
      
      // Reset to show most recent data
      setViewportSize(Math.min(data.length, 100));
      
      // Use animation for reset
      isDirectDragging.current = false;
      targetValues.current.viewportOffset = data.length - Math.min(data.length, 100);
      targetValues.current.verticalOffset = 0;
      setIsAnimating(true);
    };
    
    // Set initial cursor based on selected tool
    if (selectedTool === 'pointer') {
      canvas.style.cursor = 'grab';
    } else if (selectedTool === 'crosshair') {
      canvas.style.cursor = 'crosshair';
    } else if (['line', 'measure', 'fibonacci'].includes(selectedTool)) {
      canvas.style.cursor = 'cell';
    } else if (selectedTool === 'text') {
      canvas.style.cursor = 'text';
    } else if (selectedTool === 'draw') {
      canvas.style.cursor = 'pencil';
    } else {
      canvas.style.cursor = 'grab';
    }
    
    // Add event listeners
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('mouseenter', handleMouseEnter);
    canvas.addEventListener('dblclick', handleDoubleClick);
    
    // Add the mouse up listener to the window to catch events outside the canvas
    window.addEventListener('mouseup', handleMouseUp);
    
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    
    // Add touch event listeners
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      // Clean up event listeners
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('mouseenter', handleMouseEnter);
      canvas.removeEventListener('dblclick', handleDoubleClick);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [
    dimensions, 
    isDragging, 
    dragStart, 
    data, 
    viewportSize, 
    viewportOffset,
    verticalOffset,
    isPriceScaling,
    priceScaleStartRange,
    selectedTool,
    drawingState,
    isTextInputActive,
    isResizingDrawing,
    setSelectedTool // Include setSelectedTool in dependencies
  ]);
  
  // Handle text input submission
  const handleTextInputSubmit = () => {
    if (textInputPosition && textInputValue.trim()) {
      // Get the data index for this x position
      const visibleDataInfo = getVisibleData();
      const dataIndex = xToDataIndex(textInputPosition.x, dimensions.width, visibleDataInfo, data);
      
      // Get price for this y position
      const price = handleYToPrice(textInputPosition.y);
      
      // Add the text to drawing state
      setDrawingState(prev => ({
        ...prev,
        texts: [
          ...prev.texts,
          {
            id: generateId(),
            position: {
              ...textInputPosition,
              dataIndex: dataIndex >= 0 ? dataIndex : undefined,
              price
            },
            text: textInputValue.trim(),
            color: '#fcd34d', // Yellow
            fontSize: 14
          }
        ]
      }));
    }
    
    // Reset text input
    setIsTextInputActive(false);
    setTextInputPosition(null);
    setTextInputValue('');
    
    // Switch back to crosshair after adding text
    setSelectedTool('crosshair');
  };
  
  // Clear all drawings
  const clearAllDrawings = () => {
    console.log('Clearing all drawings');
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
  
  // Handler for clearing indicators
  const handleClearIndicators = () => {
    console.log('Clearing all indicators from chart component');
    clearAllIndicators();
  };
  
  return (
    <div className="flex flex-col h-full" ref={containerRef}>
      {/* Chart Controls Top Bar with rounded corners */}
      <div className="bg-[#0f0f0f] p-2 rounded-t-md border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <SymbolSearch onSelectSymbol={onSymbolChange} />
          </div>
          <ChartControls />
        </div>
      </div>
      
      {/* Chart with rounded corners */}
      <div className="flex-grow relative flex overflow-hidden rounded-b-md">
        {/* Chart Toolbar - Left Side */}
        <div className="z-10 h-full">
          <ChartToolbar 
            selectedTool={selectedTool}
            onSelectTool={setSelectedTool}
            onClearIndicators={handleClearIndicators}
            onClearDrawings={clearAllDrawings}
          />
        </div>
        
        {/* Main Chart Area */}
        <div ref={chartAreaRef} className="flex-grow relative h-full ml-0.5">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-10 rounded-md">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-10 rounded-md">
              <div className="bg-red-900 text-white p-4 rounded-md max-w-md">
                <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
                <p>{error}</p>
              </div>
            </div>
          )}
          
          {isUsingDemoData && !loading && (
            <div className="absolute top-2 right-2 bg-amber-800 text-white text-xs px-3 py-1 rounded-full z-10">
              Using Demo Data
            </div>
          )}
          
          {/* Base Canvas for chart rendering */}
          <canvas
            ref={canvasRef}
            className="w-full h-full block rounded-md absolute top-0 left-0 z-0"
          />
          
          {/* Overlay Canvas for drawings and crosshair */}
          <canvas
            ref={overlayCanvasRef}
            className="w-full h-full block rounded-md absolute top-0 left-0 z-10"
          />
          
          {/* Text input for text tool */}
          {isTextInputActive && textInputPosition && (
            <div 
              className="absolute z-20" 
              style={{ 
                left: `${textInputPosition.x}px`, 
                top: `${textInputPosition.y}px` 
              }}
            >
              <input
                id="chart-text-input"
                type="text"
                value={textInputValue}
                onChange={(e) => setTextInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleTextInputSubmit();
                  } else if (e.key === 'Escape') {
                    setIsTextInputActive(false);
                    setTextInputPosition(null);
                    setSelectedTool('crosshair');
                  }
                }}
                onBlur={handleTextInputSubmit}
                className="bg-gray-900 text-white border border-gray-700 rounded p-1 text-sm"
                autoFocus
                placeholder="Enter text..."
              />
            </div>
          )}
          
          {/* Drawing tool floating menu */}
          {toolMenuPosition && selectedDrawingObject && drawingState.selectedDrawing.type && (
            <DrawingToolMenu
              type={drawingState.selectedDrawing.type as any}
              position={toolMenuPosition}
              drawing={selectedDrawingObject}
              onColorChange={handleDrawingColorChange}
              onWidthChange={handleDrawingWidthChange}
              onDelete={handleDrawingDelete}
              onLockToggle={handleDrawingLockToggle}
              onDuplicate={handleDrawingDuplicate}
              onClose={handleCloseToolMenu}
            />
          )}
          
          {/* Drawing tools active indicator */}
          {(selectedTool !== 'pointer' && selectedTool !== 'crosshair') && (
            <div className="absolute bottom-20 right-2 bg-gray-800 bg-opacity-75 text-white text-xs px-3 py-2 rounded-md border border-gray-800 z-20">
              <div className="flex items-center gap-2">
                <span className="text-blue-400 font-medium">Drawing Mode: {selectedTool.charAt(0).toUpperCase() + selectedTool.slice(1)}</span>
                <button 
                  onClick={clearAllDrawings}
                  className="bg-red-800 hover:bg-red-700 px-2 py-0.5 rounded text-white text-xs"
                >
                  Clear All
                </button>
              </div>
            </div>
          )}
                  
          
            
          </div>
        </div>
      </div>
    
  );
};

export default Chart;