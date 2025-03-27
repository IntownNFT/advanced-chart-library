import { useEffect } from 'react';
import { Point } from '../types/chartTypes';
import { 
  xToDataIndex, 
  findNearestDrawing, 
  isPointNearHandle, 
  updateDrawingPoint,
  calculatePriceDifference,
  yToPrice,
  fibonacciLevels,
  generateId
} from '../utils/drawingUtils';

interface VisibleDataInfo {
  data: any[];
  leftPadding: number;
  rightPadding: number;
  totalWidth: number;
  startIndex: number;
  endIndex: number;
}

interface ChartLine {
  id: string;
  points: Point[];
  color: string;
  width: number;
}

interface ChartMeasurement {
  id: string;
  startPoint: Point;
  endPoint: Point;
  color: string;
  width: number;
  priceDifference: number;
  percentDifference: number;
}

interface ChartFibonacci {
  id: string;
  startPoint: Point;
  endPoint: Point;
  levels: number[];
  color: string;
  width: number;
}

interface ChartText {
  id: string;
  text: string;
  position: Point;
  color: string;
  fontSize: number;
}

interface ChartDrawing {
  id: string;
  points: Point[];
  color: string;
  width: number;
}

interface DrawingState {
  hoveredDrawing: {
    type: string | null;
    id: string | null;
  };
  selectedDrawing: {
    type: string | null;
    id: string | null;
  };
  resizingDrawing: {
    type: string | null;
    id: string | null;
    handleIndex: number | null;
  };
  currentLine: ChartLine | null;
  currentMeasurement: ChartMeasurement | null;
  currentFibonacci: ChartFibonacci | null;
  currentDrawing: ChartDrawing | null;
  lines: ChartLine[];
  measurements: ChartMeasurement[];
  fibonaccis: ChartFibonacci[];
  texts: ChartText[];
  drawings: ChartDrawing[];
  isDrawing: boolean;
}

interface UseChartEventsProps {
  canvas: HTMLCanvasElement | null;
  dimensions: { width: number; height: number };
  data: any[];
  viewportSize: number;
  viewportOffset: number;
  verticalOffset: number;
  isPriceScaling: boolean;
  priceScaleStartRange: { min: number; max: number } | null;
  priceScaleStartY: number;
  selectedTool: string;
  drawingState: DrawingState;
  isTextInputActive: boolean;
  isResizingDrawing: boolean;
  isDragging: boolean;
  dragStart: { x: number; y: number };
  isDirectDragging: { current: boolean };
  setSelectedTool: (tool: string) => void;
  setIsDragging: (dragging: boolean) => void;
  setDragStart: (start: { x: number; y: number }) => void;
  setMousePosition: (position: { x: number; y: number } | null) => void;
  setHoveredCandleIndex: (index: number | null) => void;
  setIsPriceScaling: (scaling: boolean) => void;
  setPriceScaleStartY: (y: number) => void;
  setPriceScaleStartRange: (range: { min: number; max: number } | null) => void;
  setCustomPriceRange: (range: { min: number; max: number } | null) => void;
  setViewportSize: (size: number) => void;
  setViewportOffset: (offset: number) => void;
  setVerticalOffset: (offset: number) => void;
  setDrawingState: React.Dispatch<React.SetStateAction<DrawingState>>;
  setIsResizingDrawing: (resizing: boolean) => void;
  setToolMenuPosition: (position: { x: number; y: number } | null) => void;
  setSelectedDrawingObject: (object: any) => void;
  getDrawingById: (type: string, id: string) => any;
  updateResizedDrawing: (type: string, id: string, drawing: any) => void;
  handleCloseToolMenu: () => void;
  getEffectivePriceRange: () => { min: number; max: number };
  handleYToPrice: (y: number) => number;
  isClickOnPriceAxis: (x: number) => boolean;
  setTextInputPosition: (position: { x: number; y: number } | null) => void;
  setTextInputValue: (value: string) => void;
  setIsTextInputActive: (active: boolean) => void;
  setIsAnimating: (animating: boolean) => void;
  targetValues: {
    current: {
      viewportOffset: number;
      verticalOffset: number;
    };
  };
}

export const useChartEvents = ({
  canvas,
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
  setSelectedTool,
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
  setDrawingState,
  setIsResizingDrawing,
  setToolMenuPosition,
  setSelectedDrawingObject,
  getDrawingById,
  updateResizedDrawing,
  handleCloseToolMenu,
  getEffectivePriceRange,
  handleYToPrice,
  isClickOnPriceAxis,
  setTextInputPosition,
  setTextInputValue,
  setIsTextInputActive,
  setIsAnimating,
  targetValues
}: UseChartEventsProps) => {
  useEffect(() => {
    if (!canvas) return;

    // Calculate bar width
    const visibleDataInfo: VisibleDataInfo = {
      data: data.slice(Math.max(0, Math.floor(viewportOffset)), Math.min(data.length, Math.floor(viewportOffset + viewportSize))),
      leftPadding: viewportOffset < 0 ? Math.abs(Math.floor(viewportOffset)) : 0,
      rightPadding: Math.max(0, Math.floor(viewportOffset + viewportSize) - data.length),
      totalWidth: Math.max(0, Math.floor(viewportOffset + viewportSize) - Math.floor(viewportOffset)),
      startIndex: Math.max(0, Math.floor(viewportOffset)),
      endIndex: Math.min(data.length, Math.floor(viewportOffset + viewportSize))
    };
    const totalVisibleItems = visibleDataInfo.totalWidth;
    const barWidth = dimensions.width / (totalVisibleItems || 1);

    // Function to check if mouse is over a candle
    const checkIfOverCandle = (mouseX: number) => {
      if (!visibleDataInfo) return -1;
      
      const virtualIndex = Math.floor(mouseX / barWidth);
      const adjustedIndex = virtualIndex - visibleDataInfo.leftPadding;
      
      if (adjustedIndex >= 0 && adjustedIndex < visibleDataInfo.data.length) {
        const candleX = (visibleDataInfo.leftPadding + adjustedIndex) * barWidth + barWidth / 2;
        const candleWidth = barWidth * 0.8;
        
        if (Math.abs(mouseX - candleX) <= candleWidth / 2) {
          return visibleDataInfo.startIndex + adjustedIndex;
        }
      }
      
      return -1;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (isTextInputActive) return;
      
      if (e.button === 0) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const currentPoint: Point = { x: mouseX, y: mouseY };
        
        const dataIndex = xToDataIndex(mouseX, dimensions.width, visibleDataInfo, data);
        if (dataIndex >= 0) {
          currentPoint.dataIndex = dataIndex;
        }
        
        const price = handleYToPrice(mouseY);
        currentPoint.price = price;
        
        if (isClickOnPriceAxis(mouseX)) {
          setIsPriceScaling(true);
          setPriceScaleStartY(e.clientY);
          setPriceScaleStartRange(getEffectivePriceRange());
          canvas.style.cursor = 'ns-resize';
        } 
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
              setIsResizingDrawing(true);
              setDrawingState((prev: DrawingState): DrawingState => ({
                ...prev,
                resizingDrawing: {
                  type: prev.hoveredDrawing.type,
                  id: prev.hoveredDrawing.id,
                  handleIndex
                },
                hoveredDrawing: prev.hoveredDrawing,
                selectedDrawing: prev.selectedDrawing,
                currentLine: prev.currentLine,
                currentMeasurement: prev.currentMeasurement,
                currentFibonacci: prev.currentFibonacci,
                currentDrawing: prev.currentDrawing,
                lines: prev.lines,
                measurements: prev.measurements,
                fibonaccis: prev.fibonaccis,
                texts: prev.texts,
                drawings: prev.drawings,
                isDrawing: prev.isDrawing
              }));
              canvas.style.cursor = 'grabbing';
              
              setDrawingState((prev: DrawingState): DrawingState => ({
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
          
          setDrawingState((prev: DrawingState): DrawingState => ({
            ...prev,
            selectedDrawing: { 
              type: prev.hoveredDrawing.type, 
              id: prev.hoveredDrawing.id 
            },
            hoveredDrawing: prev.hoveredDrawing,
            resizingDrawing: prev.resizingDrawing,
            currentLine: prev.currentLine,
            currentMeasurement: prev.currentMeasurement,
            currentFibonacci: prev.currentFibonacci,
            currentDrawing: prev.currentDrawing,
            lines: prev.lines,
            measurements: prev.measurements,
            fibonaccis: prev.fibonaccis,
            texts: prev.texts,
            drawings: prev.drawings,
            isDrawing: prev.isDrawing
          }));
          
          setToolMenuPosition({ x: mouseX, y: mouseY });
          setSelectedDrawingObject(drawing);
          
          e.preventDefault();
          return;
        }
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
            setDrawingState((prev: DrawingState): DrawingState => ({
              ...prev,
              selectedDrawing: { 
                type: nearestDrawing.type as string | null, 
                id: nearestDrawing.id 
              },
              hoveredDrawing: prev.hoveredDrawing,
              resizingDrawing: prev.resizingDrawing,
              currentLine: prev.currentLine,
              currentMeasurement: prev.currentMeasurement,
              currentFibonacci: prev.currentFibonacci,
              currentDrawing: prev.currentDrawing,
              lines: prev.lines,
              measurements: prev.measurements,
              fibonaccis: prev.fibonaccis,
              texts: prev.texts,
              drawings: prev.drawings,
              isDrawing: prev.isDrawing
            }));
            
            setToolMenuPosition({ x: mouseX, y: mouseY });
            setSelectedDrawingObject(nearestDrawing.drawing);
          } else {
            handleCloseToolMenu();
            
            setIsDragging(true);
            setDragStart({ x: e.clientX, y: e.clientY });
            canvas.style.cursor = selectedTool === 'pointer' ? 'grabbing' : 'crosshair';
          }
        }
        else if (selectedTool === 'line') {
          setDrawingState((prev: DrawingState): DrawingState => ({
            ...prev,
            currentLine: {
              id: generateId(),
              points: [currentPoint, { ...currentPoint }],
              color: '#3b82f6',
              width: 2
            },
            isDrawing: true,
            hoveredDrawing: prev.hoveredDrawing,
            selectedDrawing: prev.selectedDrawing,
            resizingDrawing: prev.resizingDrawing,
            currentMeasurement: prev.currentMeasurement,
            currentFibonacci: prev.currentFibonacci,
            currentDrawing: prev.currentDrawing,
            lines: prev.lines,
            measurements: prev.measurements,
            fibonaccis: prev.fibonaccis,
            texts: prev.texts,
            drawings: prev.drawings
          }));
        }
        else if (selectedTool === 'measure') {
          setDrawingState((prev: DrawingState): DrawingState => ({
            ...prev,
            currentMeasurement: {
              id: generateId(),
              startPoint: currentPoint,
              endPoint: { ...currentPoint },
              color: '#10b981',
              width: 2,
              priceDifference: 0,
              percentDifference: 0
            },
            isDrawing: true,
            hoveredDrawing: prev.hoveredDrawing,
            selectedDrawing: prev.selectedDrawing,
            resizingDrawing: prev.resizingDrawing,
            currentLine: prev.currentLine,
            currentFibonacci: prev.currentFibonacci,
            currentDrawing: prev.currentDrawing,
            lines: prev.lines,
            measurements: prev.measurements,
            fibonaccis: prev.fibonaccis,
            texts: prev.texts,
            drawings: prev.drawings
          }));
        }
        else if (selectedTool === 'fibonacci') {
          setDrawingState((prev: DrawingState): DrawingState => ({
            ...prev,
            currentFibonacci: {
              id: generateId(),
              startPoint: currentPoint,
              endPoint: { ...currentPoint },
              levels: fibonacciLevels,
              color: '#8b5cf6',
              width: 2
            },
            isDrawing: true,
            hoveredDrawing: prev.hoveredDrawing,
            selectedDrawing: prev.selectedDrawing,
            resizingDrawing: prev.resizingDrawing,
            currentLine: prev.currentLine,
            currentMeasurement: prev.currentMeasurement,
            currentDrawing: prev.currentDrawing,
            lines: prev.lines,
            measurements: prev.measurements,
            fibonaccis: prev.fibonaccis,
            texts: prev.texts,
            drawings: prev.drawings
          }));
        }
        else if (selectedTool === 'text') {
          setTextInputPosition({ x: mouseX, y: mouseY });
          setTextInputValue('');
          setIsTextInputActive(true);
          setTimeout(() => {
            const input = document.getElementById('chart-text-input');
            if (input) {
              input.focus();
            }
          }, 10);
        }
        else if (selectedTool === 'draw') {
          setDrawingState((prev: DrawingState): DrawingState => ({
            ...prev,
            currentDrawing: {
              id: generateId(),
              points: [currentPoint],
              color: '#ec4899',
              width: 2
            },
            isDrawing: true,
            hoveredDrawing: prev.hoveredDrawing,
            selectedDrawing: prev.selectedDrawing,
            resizingDrawing: prev.resizingDrawing,
            currentLine: prev.currentLine,
            currentMeasurement: prev.currentMeasurement,
            currentFibonacci: prev.currentFibonacci,
            lines: prev.lines,
            measurements: prev.measurements,
            fibonaccis: prev.fibonaccis,
            texts: prev.texts,
            drawings: prev.drawings
          }));
        }
        
        isDirectDragging.current = true;
        e.preventDefault();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isTextInputActive) return;
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      setMousePosition({
        x: mouseX,
        y: mouseY
      });
      
      const candleIndex = checkIfOverCandle(mouseX);
      setHoveredCandleIndex(candleIndex >= 0 ? candleIndex : null);
      
      if (isResizingDrawing && drawingState.resizingDrawing.type && drawingState.resizingDrawing.id !== null) {
        const { type, id, handleIndex } = drawingState.resizingDrawing;
        
        if (handleIndex !== null) {
          const drawing = getDrawingById(type, id);
          
          if (drawing) {
            const newPoint: Point = { x: mouseX, y: mouseY };
            const price = handleYToPrice(mouseY);
            newPoint.price = price;
            
            const dataIndex = xToDataIndex(mouseX, dimensions.width, visibleDataInfo, data);
            if (dataIndex >= 0) {
              newPoint.dataIndex = dataIndex;
            }
            
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
            
            updateResizedDrawing(type, id, updatedDrawing);
          }
        }
        
        return;
      }
      
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
      
      setDrawingState((prev: DrawingState): DrawingState => ({
        ...prev,
        hoveredDrawing: {
          type: nearestDrawing.type as string | null,
          id: nearestDrawing.id
        }
      }));
      
      if (!isDragging && !isPriceScaling && !drawingState.isDrawing) {
        if (isClickOnPriceAxis(mouseX)) {
          canvas.style.cursor = 'ns-resize';
        } 
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
      
      if (drawingState.isDrawing) {
        const dataIndex = xToDataIndex(mouseX, dimensions.width, visibleDataInfo, data);
        const price = handleYToPrice(mouseY);
        
        if (drawingState.currentLine) {
          setDrawingState((prev: DrawingState): DrawingState => {
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
          const { priceDiff, percentDiff } = calculatePriceDifference(
            drawingState.currentMeasurement.startPoint.price!,
            price
          );
          
          setDrawingState((prev: DrawingState): DrawingState => {
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
          setDrawingState((prev: DrawingState): DrawingState => {
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
          setDrawingState((prev: DrawingState): DrawingState => {
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
      
      if (isPriceScaling && priceScaleStartRange) {
        const deltaY = e.clientY - priceScaleStartY;
        const zoomFactor = 1 + (deltaY * 0.005);
        const initialRange = priceScaleStartRange.max - priceScaleStartRange.min;
        const newRangeSize = initialRange * zoomFactor;
        const centerPrice = (priceScaleStartRange.min + priceScaleStartRange.max) / 2;
        const newMin = centerPrice - (newRangeSize / 2);
        const newMax = centerPrice + (newRangeSize / 2);
        setCustomPriceRange({ min: newMin, max: newMax });
        return;
      }
      
      if (isDragging) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        
        handleCompletelyFreePanning(deltaX, deltaY);
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    };

    const handleCompletelyFreePanning = (deltaX: number, deltaY: number) => {
      if (Math.abs(deltaX) > 0) {
        const sensitivity = 1.2;
        const candlesToShift = (deltaX * sensitivity) / barWidth;
        const newOffset = viewportOffset - candlesToShift;
        
        if (isDirectDragging.current) {
          setViewportOffset(newOffset);
        } else {
          targetValues.current.viewportOffset = newOffset;
          setIsAnimating(true);
        }
      }
      
      if (Math.abs(deltaY) > 0) {
        const newOffset = verticalOffset + deltaY;
        
        if (isDirectDragging.current) {
          setVerticalOffset(newOffset);
        } else {
          targetValues.current.verticalOffset = newOffset;
          setIsAnimating(true);
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        if (drawingState.isDrawing) {
          if (drawingState.currentLine) {
            setDrawingState((prev: DrawingState): DrawingState => ({
              ...prev,
              lines: [...prev.lines, prev.currentLine!],
              currentLine: null,
              isDrawing: false
            }));
            setSelectedTool('crosshair');
          } 
          else if (drawingState.currentMeasurement) {
            setDrawingState((prev: DrawingState): DrawingState => ({
              ...prev,
              measurements: [...prev.measurements, prev.currentMeasurement!],
              currentMeasurement: null,
              isDrawing: false
            }));
            setSelectedTool('crosshair');
          }
          else if (drawingState.currentFibonacci) {
            setDrawingState((prev: DrawingState): DrawingState => ({
              ...prev,
              fibonaccis: [...prev.fibonaccis, prev.currentFibonacci!],
              currentFibonacci: null,
              isDrawing: false
            }));
            setSelectedTool('crosshair');
          }
          else if (drawingState.currentDrawing) {
            setDrawingState((prev: DrawingState): DrawingState => ({
              ...prev,
              drawings: [...prev.drawings, prev.currentDrawing!],
              currentDrawing: null,
              isDrawing: false
            }));
            setSelectedTool('crosshair');
          }
        }
        
        if (isResizingDrawing) {
          setIsResizingDrawing(false);
          setDrawingState((prev: DrawingState): DrawingState => ({
            ...prev,
            resizingDrawing: {
              type: null,
              id: null,
              handleIndex: null
            }
          }));
        }
        
        setIsDragging(false);
        setIsPriceScaling(false);
        isDirectDragging.current = false;
        
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
      if (isTextInputActive) return;
      
      setIsDragging(false);
      setIsPriceScaling(false);
      setMousePosition(null);
      setHoveredCandleIndex(null);
      canvas.style.cursor = 'default';
      isDirectDragging.current = false;
      
      setDrawingState((prev: DrawingState): DrawingState => ({
        ...prev,
        hoveredDrawing: {
          type: null,
          id: null
        }
      }));
    };

    const handleMouseEnter = (e: MouseEvent) => {
      if (isTextInputActive) return;
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      
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
      if (isTextInputActive) return;
      
      e.preventDefault();
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      if (e.ctrlKey || e.metaKey) {
        const currentRange = getEffectivePriceRange();
        const rangeSize = currentRange.max - currentRange.min;
        const zoomFactor = e.deltaY < 0 ? 0.9 : 1.1;
        
        const cursorPrice = handleYToPrice(mouseY);
        const cursorRatio = (cursorPrice - currentRange.min) / rangeSize;
        
        const newMin = cursorPrice - (cursorRatio * rangeSize * zoomFactor);
        const newMax = cursorPrice + ((1 - cursorRatio) * rangeSize * zoomFactor);
        
        setCustomPriceRange({ min: newMin, max: newMax });
        
      } else {
        const zoomFactor = e.deltaY < 0 ? 0.85 : 1.15;
        const mousePosition = mouseX / dimensions.width;
        
        const newSize = Math.max(
          1,
          Math.round(viewportSize * zoomFactor)
        );
        
        if (newSize !== viewportSize) {
          const pointUnderMouse = viewportOffset + (mousePosition * viewportSize);
          const newOffset = pointUnderMouse - (mousePosition * newSize);
          
          setViewportSize(newSize);
          setViewportOffset(newOffset);
        }
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (isTextInputActive) return;
      
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        setIsDragging(true);
        setDragStart({ x: touch.clientX, y: touch.clientY });
        isDirectDragging.current = true;
        e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isTextInputActive) return;
      
      if (e.touches.length === 1 && isDragging) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        
        setMousePosition({
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top
        });
        
        const deltaX = touch.clientX - dragStart.x;
        const deltaY = touch.clientY - dragStart.y;
        
        handleCompletelyFreePanning(deltaX, deltaY);
        
        setDragStart({ x: touch.clientX, y: touch.clientY });
        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      if (isTextInputActive) return;
      
      setIsDragging(false);
      setIsPriceScaling(false);
      isDirectDragging.current = false;
    };

    const handleDoubleClick = () => {
      if (isTextInputActive) return;
      
      setCustomPriceRange(null);
      setViewportSize(Math.min(data.length, 100));
      
      isDirectDragging.current = false;
      targetValues.current.viewportOffset = data.length - Math.min(data.length, 100);
      targetValues.current.verticalOffset = 0;
      setIsAnimating(true);
    };

    // Set initial cursor
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
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
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
    canvas,
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
    setSelectedTool,
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
    setDrawingState,
    setIsResizingDrawing,
    setToolMenuPosition,
    setSelectedDrawingObject,
    getDrawingById,
    updateResizedDrawing,
    handleCloseToolMenu,
    getEffectivePriceRange,
    handleYToPrice,
    isClickOnPriceAxis,
    setTextInputPosition,
    setTextInputValue,
    setIsTextInputActive,
    setIsAnimating,
    targetValues
  ]);
}; 