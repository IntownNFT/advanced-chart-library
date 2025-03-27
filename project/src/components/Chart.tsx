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
import { useChartEvents } from '../hooks/useChartEvents';
import { useChartState } from '../hooks/useChartState';

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
  const requestRef = useRef<number>();
  
  // Get all state and handlers from useChartState
  const chartState = useChartState();
  const {
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
    setDrawingState
  } = chartState;

  const { 
    chartType, 
    timeframe, 
    indicators, 
    showOHLC, 
    selectedTool, 
    setSelectedTool, 
    clearAllIndicators 
  } = useChartContext();
  
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
    
    // Calculate buffer size for smooth scrolling
    const bufferSize = Math.min(viewportSize * 0.5, 50);
    
    // Calculate scale based on viewport dimensions
    const scale = dimensions.width / (leftPadding + visibleData.length + rightPadding);
    
    return {
      data: visibleData,
      leftPadding,
      rightPadding,
      totalWidth: leftPadding + visibleData.length + rightPadding,
      startIndex,
      endIndex,
      visibleRange: {
        start: startIndex,
        end: endIndex,
        bufferSize
      },
      scale
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
            totalWidth: visibleDataInfo.totalWidth,
            visibleRange: visibleDataInfo.visibleRange,
            scale: visibleDataInfo.scale
          },
          hoveredCandle: getHoveredCandle(),
          showOHLC
        });

        setIsInitialized(true);
      }
    }
  }, [dimensions, data, chartType, indicators, timeframe, symbol, viewportOffset, viewportSize, customPriceRange, verticalOffset, hoveredCandleIndex, showOHLC]);
  
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
  
  // Use the useChartEvents hook
  useChartEvents({
    canvas: overlayCanvasRef.current,
    dimensions, 
    data, 
    viewportSize, 
    viewportOffset,
    verticalOffset,
    isPriceScaling,
    priceScaleStartRange,
    priceScaleStartY,
    selectedTool,
    drawingState,
    isTextInputActive,
    isResizingDrawing,
    isDragging,
    dragStart,
    isDirectDragging,
    setSelectedTool: (tool: string) => setSelectedTool(tool as any),
    setIsDragging,
    setDragStart,
    setMousePosition,
    setHoveredCandleIndex,
    setIsPriceScaling,
    setPriceScaleStartY,
    setPriceScaleStartRange,
    setCustomPriceRange,
    setViewportSize,
    setViewportOffset,
    setVerticalOffset,
    setDrawingState: (state: any) => setDrawingState(state),
    setIsResizingDrawing,
    setToolMenuPosition,
    setSelectedDrawingObject,
    getDrawingById: chartState.getDrawingById,
    updateResizedDrawing: chartState.updateResizedDrawing,
    handleCloseToolMenu: chartState.handleCloseToolMenu,
    getEffectivePriceRange,
    handleYToPrice,
    isClickOnPriceAxis,
    setTextInputPosition,
    setTextInputValue,
    setIsTextInputActive,
    setIsAnimating,
    targetValues
  });
  
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
            onClearIndicators={clearAllIndicators}
            onClearDrawings={chartState.clearAllDrawings}
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
                left: textInputPosition.x,
                top: textInputPosition.y,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <input
                id="chart-text-input"
                type="text"
                value={textInputValue}
                onChange={(e) => setTextInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (textInputValue.trim()) {
                      setDrawingState(prev => ({
                        ...prev,
                        texts: [
                          ...prev.texts,
                          {
                            id: generateId(),
                            text: textInputValue,
                            position: textInputPosition,
                            color: '#3b82f6',
                            fontSize: 14
                          }
                        ]
                      }));
                    }
                    setIsTextInputActive(false);
                    setTextInputValue('');
                    setTextInputPosition(null);
                  } else if (e.key === 'Escape') {
                    setIsTextInputActive(false);
                    setTextInputValue('');
                    setTextInputPosition(null);
                  }
                }}
                className="bg-[#1a1a1a] text-white border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>
          )}
          
          {/* Drawing tool menu */}
          {toolMenuPosition && selectedDrawingObject && (
            <DrawingToolMenu
              position={toolMenuPosition}
              drawing={selectedDrawingObject}
              type={
                'points' in selectedDrawingObject && selectedDrawingObject.points.length === 2
                  ? 'line'
                  : 'points' in selectedDrawingObject
                  ? 'drawing'
                  : 'startPoint' in selectedDrawingObject && 'endPoint' in selectedDrawingObject
                  ? 'measurement'
                  : 'startPoint' in selectedDrawingObject
                  ? 'fibonacci'
                  : 'text'
              }
              onColorChange={chartState.handleDrawingColorChange}
              onWidthChange={chartState.handleDrawingWidthChange}
              onDelete={chartState.handleDrawingDelete}
              onLockToggle={chartState.handleDrawingLockToggle}
              onDuplicate={chartState.handleDrawingDuplicate}
              onClose={chartState.handleCloseToolMenu}
            />
          )}
              </div>
            </div>
          </div>
  );
};

export default Chart;