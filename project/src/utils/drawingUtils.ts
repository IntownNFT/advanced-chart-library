import { Point, ScaleInfo, ChartLine, ChartMeasurement, ChartFibonacci, ChartText, ChartDrawing, CandleData, DrawingObject } from '../types/chartTypes';

// Fibonacci retracement levels
export const fibonacciLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

// Generate a unique ID for drawings
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

// Get candle index from x position
export const xToDataIndex = (
  x: number,
  chartWidth: number,
  visibleDataInfo: {
    leftPadding: number;
    rightPadding: number;
    totalWidth: number;
    startIndex: number;
    endIndex: number;
  },
  data: CandleData[]
): number => {
  if (!visibleDataInfo || !data.length) return -1;
  
  const barWidth = chartWidth / visibleDataInfo.totalWidth;
  const virtualIndex = Math.floor(x / barWidth);
  const adjustedIndex = virtualIndex - visibleDataInfo.leftPadding + visibleDataInfo.startIndex;
  
  return Math.max(0, Math.min(data.length - 1, adjustedIndex));
};

// Convert data index to x position
export const dataIndexToX = (
  index: number,
  chartWidth: number,
  visibleDataInfo: {
    leftPadding: number;
    rightPadding: number;
    totalWidth: number;
    startIndex: number;
    endIndex: number;
  }
): number => {
  if (!visibleDataInfo) return 0;
  
  const barWidth = chartWidth / visibleDataInfo.totalWidth;
  const adjustedIndex = index - visibleDataInfo.startIndex + visibleDataInfo.leftPadding;
  
  return adjustedIndex * barWidth + barWidth / 2;
};

// Draw crosshair on the chart
export const drawCrosshair = (
  ctx: CanvasRenderingContext2D,
  mouseX: number,
  mouseY: number,
  width: number,
  height: number
) => {
  if (mouseX === undefined || mouseY === undefined) return;

  // Define constants for scales
  const priceScaleWidth = 60;
  const timeScaleHeight = 30;
  const chartAreaWidth = width - priceScaleWidth;
  const chartAreaHeight = height - timeScaleHeight;

  // Skip if mouse is outside chart area
  if (mouseX > chartAreaWidth || mouseY > chartAreaHeight) return;

  // Save current state
  ctx.save();

  // Set line style
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = 1;

  // Draw vertical line
  ctx.beginPath();
  ctx.moveTo(mouseX, 0);
  ctx.lineTo(mouseX, chartAreaHeight);
  ctx.stroke();

  // Draw horizontal line
  ctx.beginPath();
  ctx.moveTo(0, mouseY);
  ctx.lineTo(chartAreaWidth, mouseY);
  ctx.stroke();

  // Restore state
  ctx.restore();
};

// Get coordinates for line control points
const getLineControlPoints = (
  line: ChartLine,
  chartWidth: number, 
  height: number,
  priceRange: { min: number; max: number },
  visibleDataInfo?: {
    leftPadding: number;
    rightPadding: number;
    totalWidth: number;
    startIndex: number;
    endIndex: number;
  }
): { x1: number, y1: number, x2: number, y2: number } => {
  const { points } = line;
  
  let x1, y1, x2, y2;

  // Define constants for scales
  const timeScaleHeight = 30;
  const chartAreaHeight = height - timeScaleHeight;
  
  // If we have data index and price values, use them to position the line
  if (points[0].dataIndex !== undefined && points[0].price !== undefined && visibleDataInfo) {
    // Convert from data coordinates to screen coordinates
    x1 = dataIndexToX(points[0].dataIndex, chartWidth, visibleDataInfo);
    y1 = priceToY(points[0].price, chartAreaHeight, priceRange);
    x2 = dataIndexToX(points[1].dataIndex!, chartWidth, visibleDataInfo);
    y2 = priceToY(points[1].price!, chartAreaHeight, priceRange);
  } else {
    // Fall back to absolute coordinates if data values aren't available
    x1 = points[0].x;
    y1 = points[0].y;
    x2 = points[1].x;
    y2 = points[1].y;
  }
  
  return { x1, y1, x2, y2 };
};

// Draw control handles for any line-based drawing
const drawControlHandles = (
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  size: number = 4
) => {
  ctx.fillStyle = color;
  
  // Draw first handle
  ctx.beginPath();
  ctx.arc(x1, y1, size, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw second handle
  ctx.beginPath();
  ctx.arc(x2, y2, size, 0, Math.PI * 2);
  ctx.fill();
};

// Draw line on the chart
export const drawLine = (
  ctx: CanvasRenderingContext2D,
  line: ChartLine,
  chartWidth: number,
  height: number,
  priceRange: { min: number; max: number },
  visibleDataInfo?: {
    leftPadding: number;
    rightPadding: number;
    totalWidth: number;
    startIndex: number;
    endIndex: number;
  },
  isSelected: boolean = false,
  isHovered: boolean = false
) => {
  if (line.points.length < 2) return;
  
  const { color, width } = line;
  
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  
  const { x1, y1, x2, y2 } = getLineControlPoints(line, chartWidth, height, priceRange, visibleDataInfo);
  
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  
  // Draw control points if hovered or selected
  if (isHovered || isSelected) {
    drawControlHandles(ctx, x1, y1, x2, y2, color);
  }
  
  ctx.restore();
};

// Get coordinates for measurement control points
const getMeasurementControlPoints = (
  measurement: ChartMeasurement,
  chartWidth: number, 
  height: number,
  priceRange: { min: number; max: number },
  visibleDataInfo?: {
    leftPadding: number;
    rightPadding: number;
    totalWidth: number;
    startIndex: number;
    endIndex: number;
  }
): { x1: number, y1: number, x2: number, y2: number } => {
  const { startPoint, endPoint } = measurement;
  
  let x1, y1, x2, y2;

  // Define constants for scales
  const timeScaleHeight = 30;
  const chartAreaHeight = height - timeScaleHeight;
  
  // If we have data index and price values, use them to position the measurement
  if (startPoint.dataIndex !== undefined && startPoint.price !== undefined && visibleDataInfo) {
    // Convert from data coordinates to screen coordinates
    x1 = dataIndexToX(startPoint.dataIndex, chartWidth, visibleDataInfo);
    y1 = priceToY(startPoint.price, chartAreaHeight, priceRange);
    x2 = dataIndexToX(endPoint.dataIndex!, chartWidth, visibleDataInfo);
    y2 = priceToY(endPoint.price!, chartAreaHeight, priceRange);
  } else {
    // Fall back to absolute coordinates if data values aren't available
    x1 = startPoint.x;
    y1 = startPoint.y;
    x2 = endPoint.x;
    y2 = endPoint.y;
  }
  
  return { x1, y1, x2, y2 };
};

// Draw measurement on the chart
export const drawMeasurement = (
  ctx: CanvasRenderingContext2D,
  measurement: ChartMeasurement,
  chartWidth: number,
  height: number,
  priceRange: { min: number; max: number },
  visibleDataInfo?: {
    leftPadding: number;
    rightPadding: number;
    totalWidth: number;
    startIndex: number;
    endIndex: number;
  },
  isSelected: boolean = false,
  isHovered: boolean = false
) => {
  const { color, width, priceDifference, percentDifference } = measurement;
  
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  
  // Draw dashed line
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  
  const { x1, y1, x2, y2 } = getMeasurementControlPoints(measurement, chartWidth, height, priceRange, visibleDataInfo);
  
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  
  // Reset line dash
  ctx.setLineDash([]);
  
  // Draw control points if hovered or selected
  if (isHovered || isSelected) {
    drawControlHandles(ctx, x1, y1, x2, y2, color);
  }
  
  // Calculate text position (midpoint)
  const textX = (x1 + x2) / 2;
  const textY = (y1 + y2) / 2;
  
  // Draw label background
  const labelText = `${priceDifference.toFixed(2)} (${percentDifference.toFixed(2)}%)`;
  const textWidth = ctx.measureText(labelText).width + 10;
  const textHeight = 20;
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(textX - textWidth / 2, textY - textHeight / 2, textWidth, textHeight);
  
  // Draw label text
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'white';
  ctx.fillText(labelText, textX, textY);
  
  ctx.restore();
};

// Get coordinates for fibonacci control points
const getFibonacciControlPoints = (
  fibonacci: ChartFibonacci,
  chartWidth: number, 
  height: number,
  priceRange: { min: number; max: number },
  visibleDataInfo?: {
    leftPadding: number;
    rightPadding: number;
    totalWidth: number;
    startIndex: number;
    endIndex: number;
  }
): { x1: number, y1: number, x2: number, y2: number } => {
  const { startPoint, endPoint } = fibonacci;
  
  let x1, y1, x2, y2;

  // Define constants for scales
  const timeScaleHeight = 30;
  const chartAreaHeight = height - timeScaleHeight;
  
  // If we have data index and price values, use them to position the fibonacci
  if (startPoint.dataIndex !== undefined && startPoint.price !== undefined && visibleDataInfo) {
    // Convert from data coordinates to screen coordinates
    x1 = dataIndexToX(startPoint.dataIndex, chartWidth, visibleDataInfo);
    y1 = priceToY(startPoint.price, chartAreaHeight, priceRange);
    x2 = dataIndexToX(endPoint.dataIndex!, chartWidth, visibleDataInfo);
    y2 = priceToY(endPoint.price!, chartAreaHeight, priceRange);
  } else {
    // Fall back to absolute coordinates if data values aren't available
    x1 = startPoint.x;
    y1 = startPoint.y;
    x2 = endPoint.x;
    y2 = endPoint.y;
  }
  
  return { x1, y1, x2, y2 };
};

// Draw Fibonacci retracements
export const drawFibonacci = (
  ctx: CanvasRenderingContext2D,
  fibonacci: ChartFibonacci,
  chartWidth: number,
  height: number,
  priceRange: { min: number; max: number },
  visibleDataInfo?: {
    leftPadding: number;
    rightPadding: number;
    totalWidth: number;
    startIndex: number;
    endIndex: number;
  },
  isSelected: boolean = false,
  isHovered: boolean = false
) => {
  const { levels, color, width: lineWidth } = fibonacci;
  
  if (!fibonacci.endPoint) return;
  
  // Define constants for scales
  const priceScaleWidth = 60;
  const timeScaleHeight = 30;
  const chartAreaWidth = chartWidth - priceScaleWidth;
  const chartAreaHeight = height - timeScaleHeight;
  
  ctx.save();
  
  const { x1, y1, x2, y2 } = getFibonacciControlPoints(fibonacci, chartWidth, height, priceRange, visibleDataInfo);
  
  // Draw the main trend line
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Calculate min/max y values
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  const yRange = maxY - minY;
  
  // Draw horizontal lines for each level
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  // Define gradient colors
  const gradientColors = [
    'rgba(255, 0, 0, 0.2)',
    'rgba(255, 165, 0, 0.2)',
    'rgba(255, 255, 0, 0.2)',
    'rgba(0, 128, 0, 0.2)',
    'rgba(0, 0, 255, 0.2)',
    'rgba(75, 0, 130, 0.2)'
  ];
  
  for (let i = 0; i < levels.length - 1; i++) {
    const level = levels[i];
    const nextLevel = levels[i + 1];
    
    // Calculate Y positions
    let levelY1, levelY2;
    if (y1 < y2) {
      // Up to down
      levelY1 = y1 + level * yRange;
      levelY2 = y1 + nextLevel * yRange;
    } else {
      // Down to up
      levelY1 = y1 - level * yRange;
      levelY2 = y1 - nextLevel * yRange;
    }
    
    // Draw retracement level line
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(Math.min(x1, x2), levelY1);
    ctx.lineTo(chartAreaWidth, levelY1);
    ctx.stroke();
    
    // Fill area between levels
    ctx.fillStyle = gradientColors[i % gradientColors.length];
    ctx.beginPath();
    ctx.moveTo(Math.min(x1, x2), levelY1);
    ctx.lineTo(chartAreaWidth, levelY1);
    ctx.lineTo(chartAreaWidth, levelY2);
    ctx.lineTo(Math.min(x1, x2), levelY2);
    ctx.closePath();
    ctx.fill();
    
    // Draw level label
    ctx.fillStyle = 'white';
    ctx.fillText(`${(level * 100).toFixed(1)}%`, chartAreaWidth - 5, levelY1);
  }
  
  // Draw the final level
  const finalLevel = levels[levels.length - 1];
  let finalY;
  if (y1 < y2) {
    finalY = y1 + finalLevel * yRange;
  } else {
    finalY = y1 - finalLevel * yRange;
  }
  
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(Math.min(x1, x2), finalY);
  ctx.lineTo(chartAreaWidth, finalY);
  ctx.stroke();
  
  // Draw final level label
  ctx.fillStyle = 'white';
  ctx.fillText(`${(finalLevel * 100).toFixed(1)}%`, chartAreaWidth - 5, finalY);
  
  // Draw control points if hovered or selected
  if (isHovered || isSelected) {
    drawControlHandles(ctx, x1, y1, x2, y2, color);
  }
  
  ctx.restore();
};

// Get text control point
const getTextControlPoint = (
  text: ChartText,
  chartWidth: number, 
  height: number,
  priceRange: { min: number; max: number },
  visibleDataInfo?: {
    leftPadding: number;
    rightPadding: number;
    totalWidth: number;
    startIndex: number;
    endIndex: number;
  }
): { x: number, y: number, width: number, height: number } => {
  const { position, fontSize } = text;
  
  let x, y;

  // Define constants for scales
  const timeScaleHeight = 30;
  const chartAreaHeight = height - timeScaleHeight;
  
  // Get position based on data coordinates or screen coordinates
  if (position.dataIndex !== undefined && position.price !== undefined && visibleDataInfo) {
    // Convert from data coordinates to screen coordinates
    x = dataIndexToX(position.dataIndex, chartWidth, visibleDataInfo);
    y = priceToY(position.price, chartAreaHeight, priceRange);
  } else {
    // Fall back to absolute coordinates if data values aren't available
    x = position.x;
    y = position.y;
  }
  
  return { x, y, width: 0, height: fontSize * 1.2 };
};

// Draw text annotation
export const drawText = (
  ctx: CanvasRenderingContext2D,
  text: ChartText,
  chartWidth: number,
  height: number,
  priceRange: { min: number; max: number },
  visibleDataInfo?: {
    leftPadding: number;
    rightPadding: number;
    totalWidth: number;
    startIndex: number;
    endIndex: number;
  },
  isSelected: boolean = false,
  isHovered: boolean = false
) => {
  const { text: content, color, fontSize } = text;
  
  const { x, y } = getTextControlPoint(text, chartWidth, height, priceRange, visibleDataInfo);
  
  ctx.save();
  
  // Draw text
  ctx.font = `${fontSize}px sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(content, x, y);
  
  // Get text dimensions for the handle
  const textWidth = ctx.measureText(content).width;
  
  // Draw control handle or bounding box when hovered or selected
  if (isHovered || isSelected) {
    // Draw handle at top-left corner
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw light bounding box
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x - 2, y - 2, textWidth + 4, fontSize * 1.2 + 4);
  }
  
  ctx.restore();
};

// Get drawing control points
const getDrawingControlPoints = (
  drawing: ChartDrawing,
  chartWidth: number, 
  height: number,
  priceRange: { min: number; max: number },
  visibleDataInfo?: {
    leftPadding: number;
    rightPadding: number;
    totalWidth: number;
    startIndex: number;
    endIndex: number;
  }
): { x1: number, y1: number, x2: number, y2: number } => {
  const { points } = drawing;
  
  if (points.length < 2) {
    return { x1: 0, y1: 0, x2: 0, y2: 0 };
  }

  // Define constants for scales
  const timeScaleHeight = 30;
  const chartAreaHeight = height - timeScaleHeight;
  
  let x1, y1, x2, y2;
  
  // Get first and last points
  if (points[0].dataIndex !== undefined && points[0].price !== undefined && visibleDataInfo) {
    // First point
    x1 = dataIndexToX(points[0].dataIndex, chartWidth, visibleDataInfo);
    y1 = priceToY(points[0].price, chartAreaHeight, priceRange);
    
    // Last point
    const lastPoint = points[points.length - 1];
    x2 = dataIndexToX(lastPoint.dataIndex!, chartWidth, visibleDataInfo);
    y2 = priceToY(lastPoint.price!, chartAreaHeight, priceRange);
  } else {
    x1 = points[0].x;
    y1 = points[0].y;
    x2 = points[points.length - 1].x;
    y2 = points[points.length - 1].y;
  }
  
  return { x1, y1, x2, y2 };
};

// Draw freehand drawing
export const drawDrawing = (
  ctx: CanvasRenderingContext2D,
  drawing: ChartDrawing,
  chartWidth: number,
  height: number,
  priceRange: { min: number; max: number },
  visibleDataInfo?: {
    leftPadding: number;
    rightPadding: number;
    totalWidth: number;
    startIndex: number;
    endIndex: number;
  },
  isSelected: boolean = false,
  isHovered: boolean = false
) => {
  const { points, color, width } = drawing;
  
  if (points.length < 2) return;

  // Define constants for scales
  const timeScaleHeight = 30;
  const chartAreaHeight = height - timeScaleHeight;
  
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  
  ctx.beginPath();
  
  // If we have data coordinates, use them to draw
  if (points[0].dataIndex !== undefined && points[0].price !== undefined && visibleDataInfo) {
    // First point
    const x = dataIndexToX(points[0].dataIndex, chartWidth, visibleDataInfo);
    const y = priceToY(points[0].price, chartAreaHeight, priceRange);
    ctx.moveTo(x, y);
    
    // Remaining points
    for (let i = 1; i < points.length; i++) {
      const x = dataIndexToX(points[i].dataIndex!, chartWidth, visibleDataInfo);
      const y = priceToY(points[i].price!, chartAreaHeight, priceRange);
      ctx.lineTo(x, y);
    }
  } else {
    // Fall back to absolute coordinates
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
  }
  
  ctx.stroke();
  
  // Draw control points on hover or select
  if (isHovered || isSelected) {
    const { x1, y1, x2, y2 } = getDrawingControlPoints(drawing, chartWidth, height, priceRange, visibleDataInfo);
    drawControlHandles(ctx, x1, y1, x2, y2, color);
  }
  
  ctx.restore();
};

// Draw all chart drawings
export const drawAllDrawings = (
  ctx: CanvasRenderingContext2D,
  drawings: {
    lines: ChartLine[];
    measurements: ChartMeasurement[];
    fibonaccis: ChartFibonacci[];
    texts: ChartText[];
    drawings: ChartDrawing[];
    currentLine: ChartLine | null;
    currentMeasurement: ChartMeasurement | null;
    currentFibonacci: ChartFibonacci | null;
    currentDrawing: ChartDrawing | null;
    selectedDrawing?: { type: string | null; id: string | null };
    hoveredDrawing?: { type: string | null; id: string | null };
  },
  chartWidth: number,
  height: number = 0,
  priceRange: { min: number; max: number } = { min: 0, max: 100 },
  visibleDataInfo?: {
    leftPadding: number;
    rightPadding: number;
    totalWidth: number;
    startIndex: number;
    endIndex: number;
  }
) => {
  // Define constants for scales
  const timeScaleHeight = 30;
  const priceScaleWidth = 60;
  const chartAreaWidth = chartWidth - priceScaleWidth;
  const chartAreaHeight = height - timeScaleHeight;
  
  // Clip to main chart area to prevent drawing in scale areas
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, chartAreaWidth, chartAreaHeight);
  ctx.clip();
  
  // Draw completed drawings
  for (const line of drawings.lines) {
    const isSelected = drawings.selectedDrawing?.type === 'line' && drawings.selectedDrawing?.id === line.id;
    const isHovered = drawings.hoveredDrawing?.type === 'line' && drawings.hoveredDrawing?.id === line.id;
    drawLine(ctx, line, chartWidth, height, priceRange, visibleDataInfo, isSelected, isHovered);
  }
  
  for (const measurement of drawings.measurements) {
    const isSelected = drawings.selectedDrawing?.type === 'measurement' && drawings.selectedDrawing?.id === measurement.id;
    const isHovered = drawings.hoveredDrawing?.type === 'measurement' && drawings.hoveredDrawing?.id === measurement.id;
    drawMeasurement(ctx, measurement, chartWidth, height, priceRange, visibleDataInfo, isSelected, isHovered);
  }
  
  for (const fibonacci of drawings.fibonaccis) {
    const isSelected = drawings.selectedDrawing?.type === 'fibonacci' && drawings.selectedDrawing?.id === fibonacci.id;
    const isHovered = drawings.hoveredDrawing?.type === 'fibonacci' && drawings.hoveredDrawing?.id === fibonacci.id;
    drawFibonacci(ctx, fibonacci, chartWidth, height, priceRange, visibleDataInfo, isSelected, isHovered);
  }
  
  for (const text of drawings.texts) {
    const isSelected = drawings.selectedDrawing?.type === 'text' && drawings.selectedDrawing?.id === text.id;
    const isHovered = drawings.hoveredDrawing?.type === 'text' && drawings.hoveredDrawing?.id === text.id;
    drawText(ctx, text, chartWidth, height, priceRange, visibleDataInfo, isSelected, isHovered);
  }
  
  for (const drawing of drawings.drawings) {
    const isSelected = drawings.selectedDrawing?.type === 'drawing' && drawings.selectedDrawing?.id === drawing.id;
    const isHovered = drawings.hoveredDrawing?.type === 'drawing' && drawings.hoveredDrawing?.id === drawing.id;
    drawDrawing(ctx, drawing, chartWidth, height, priceRange, visibleDataInfo, isSelected, isHovered);
  }
  
  // Draw current in-progress drawings
  if (drawings.currentLine && drawings.currentLine.points.length > 0) {
    drawLine(ctx, drawings.currentLine, chartWidth, height, priceRange, visibleDataInfo);
  }
  
  if (drawings.currentMeasurement && drawings.currentMeasurement.startPoint) {
    drawMeasurement(ctx, drawings.currentMeasurement, chartWidth, height, priceRange, visibleDataInfo);
  }
  
  if (drawings.currentFibonacci && drawings.currentFibonacci.startPoint) {
    drawFibonacci(ctx, drawings.currentFibonacci, chartWidth, height, priceRange, visibleDataInfo);
  }
  
  if (drawings.currentDrawing && drawings.currentDrawing.points.length > 0) {
    drawDrawing(ctx, drawings.currentDrawing, chartWidth, height, priceRange, visibleDataInfo);
  }
  
  // Restore context
  ctx.restore();
};

// Calculate price from Y coordinate
export const yToPrice = (
  y: number,
  height: number,
  priceRange: { min: number; max: number }
): number => {
  const ratio = (height - y) / height;
  return priceRange.min + (ratio * (priceRange.max - priceRange.min));
};

// Calculate Y coordinate from price
export const priceToY = (
  price: number,
  height: number,
  priceRange: { min: number; max: number }
): number => {
  const ratio = (price - priceRange.min) / (priceRange.max - priceRange.min);
  return height - (ratio * height);
};

// Calculate price difference between two points
export const calculatePriceDifference = (
  startPrice: number,
  endPrice: number
): { priceDiff: number, percentDiff: number } => {
  const priceDiff = endPrice - startPrice;
  const percentDiff = (priceDiff / startPrice) * 100;
  
  return { priceDiff, percentDiff };
};

// Check if a point is on a line
export const isPointNearLine = (
  px: number, 
  py: number, 
  x1: number, 
  y1: number, 
  x2: number, 
  y2: number, 
  threshold: number = 5
): boolean => {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  
  if (lenSq !== 0) // in case of 0 length line
    param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return distance <= threshold;
};

// Check if point is inside or very near a circle
export const isPointNearPoint = (
  px: number, 
  py: number, 
  cx: number, 
  cy: number, 
  threshold: number = 10
): boolean => {
  const dx = px - cx;
  const dy = py - cy;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  return distance <= threshold;
};

// Check if a point is near text
export const isPointNearText = (
  px: number,
  py: number,
  text: ChartText,
  ctx: CanvasRenderingContext2D,
  chartWidth: number,
  height: number,
  priceRange: { min: number; max: number },
  visibleDataInfo?: {
    leftPadding: number;
    rightPadding: number;
    totalWidth: number;
    startIndex: number;
    endIndex: number;
  },
  threshold: number = 5
): boolean => {
  let textX, textY;

  // Define constants for scales
  const timeScaleHeight = 30;
  const chartAreaHeight = height - timeScaleHeight;
  
  // Get position based on data coordinates or screen coordinates
  if (text.position.dataIndex !== undefined && text.position.price !== undefined && visibleDataInfo) {
    textX = dataIndexToX(text.position.dataIndex, chartWidth, visibleDataInfo);
    textY = priceToY(text.position.price, chartAreaHeight, priceRange);
  } else {
    textX = text.position.x;
    textY = text.position.y;
  }
  
  // Measure text dimensions
  ctx.font = `${text.fontSize}px sans-serif`;
  const textWidth = ctx.measureText(text.text).width;
  const textHeight = text.fontSize * 1.2;
  
  // Check if point is within text bounds + threshold
  return (
    px >= textX - threshold &&
    px <= textX + textWidth + threshold &&
    py >= textY - threshold &&
    py <= textY + textHeight + threshold
  );
};

// Check if a point is near a drawing
export const isPointNearDrawing = (
  px: number,
  py: number,
  drawing: ChartDrawing,
  chartWidth: number,
  height: number,
  priceRange: { min: number; max: number },
  visibleDataInfo?: {
    leftPadding: number;
    rightPadding: number;
    totalWidth: number;
    startIndex: number;
    endIndex: number;
  },
  threshold: number = 5
): boolean => {
  if (drawing.points.length < 2) return false;

  // Define constants for scales
  const timeScaleHeight = 30;
  const chartAreaHeight = height - timeScaleHeight;
  
  // Check each segment of the drawing
  for (let i = 1; i < drawing.points.length; i++) {
    let x1, y1, x2, y2;
    
    // Convert data coordinates to screen coordinates if available
    if (drawing.points[i-1].dataIndex !== undefined && drawing.points[i-1].price !== undefined && visibleDataInfo) {
      x1 = dataIndexToX(drawing.points[i-1].dataIndex, chartWidth, visibleDataInfo);
      y1 = priceToY(drawing.points[i-1].price, chartAreaHeight, priceRange);
      x2 = dataIndexToX(drawing.points[i].dataIndex!, chartWidth, visibleDataInfo);
      y2 = priceToY(drawing.points[i].price!, chartAreaHeight, priceRange);
    } else {
      x1 = drawing.points[i-1].x;
      y1 = drawing.points[i-1].y;
      x2 = drawing.points[i].x;
      y2 = drawing.points[i].y;
    }
    
    if (isPointNearLine(px, py, x1, y1, x2, y2, threshold)) {
      return true;
    }
  }
  
  return false;
};

// Check if point is near a control handle
export const isPointNearHandle = (
  px: number,
  py: number,
  drawingType: string,
  drawing: DrawingObject,
  chartWidth: number,
  height: number,
  priceRange: { min: number; max: number },
  visibleDataInfo?: {
    leftPadding: number;
    rightPadding: number;
    totalWidth: number;
    startIndex: number;
    endIndex: number;
  },
  threshold: number = 10
): { isNear: boolean, handleIndex: number } => {
  let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
  
  if (drawingType === 'line') {
    const line = drawing as ChartLine;
    const coords = getLineControlPoints(line, chartWidth, height, priceRange, visibleDataInfo);
    x1 = coords.x1;
    y1 = coords.y1;
    x2 = coords.x2;
    y2 = coords.y2;
  } 
  else if (drawingType === 'measurement') {
    const measurement = drawing as ChartMeasurement;
    const coords = getMeasurementControlPoints(measurement, chartWidth, height, priceRange, visibleDataInfo);
    x1 = coords.x1;
    y1 = coords.y1;
    x2 = coords.x2;
    y2 = coords.y2;
  }
  else if (drawingType === 'fibonacci') {
    const fibonacci = drawing as ChartFibonacci;
    const coords = getFibonacciControlPoints(fibonacci, chartWidth, height, priceRange, visibleDataInfo);
    x1 = coords.x1;
    y1 = coords.y1;
    x2 = coords.x2;
    y2 = coords.y2;
  }
  else if (drawingType === 'text') {
    const text = drawing as ChartText;
    const coords = getTextControlPoint(text, chartWidth, height, priceRange, visibleDataInfo);
    x1 = coords.x;
    y1 = coords.y;
    // For text, we only have one control point
    x2 = -1000; // Set far away to ensure it's not detected
    y2 = -1000;
  }
  else if (drawingType === 'drawing') {
    const freehandDrawing = drawing as ChartDrawing;
    const coords = getDrawingControlPoints(freehandDrawing, chartWidth, height, priceRange, visibleDataInfo);
    x1 = coords.x1;
    y1 = coords.y1;
    x2 = coords.x2;
    y2 = coords.y2;
  }
  
  // Check first handle
  if (isPointNearPoint(px, py, x1, y1, threshold)) {
    return { isNear: true, handleIndex: 0 };
  }
  
  // Check second handle
  if (isPointNearPoint(px, py, x2, y2, threshold)) {
    return { isNear: true, handleIndex: 1 };
  }
  
  return { isNear: false, handleIndex: -1 };
};

// Find the nearest drawing to a given point
export const findNearestDrawing = (
  px: number,
  py: number,
  drawingState: {
    lines: ChartLine[];
    measurements: ChartMeasurement[];
    fibonaccis: ChartFibonacci[];
    texts: ChartText[];
    drawings: ChartDrawing[];
  },
  ctx: CanvasRenderingContext2D,
  chartWidth: number,
  height: number,
  priceRange: { min: number; max: number },
  visibleDataInfo?: {
    leftPadding: number;
    rightPadding: number;
    totalWidth: number;
    startIndex: number;
    endIndex: number;
  }
): { type: string | null; id: string | null; drawing: DrawingObject | null } => {
  // Define constants for scales
  const timeScaleHeight = 30;
  const chartAreaHeight = height - timeScaleHeight;
  
  // Check lines
  for (const line of drawingState.lines) {
    if (line.locked) continue; // Skip locked drawings
    
    let x1, y1, x2, y2;
    
    if (line.points[0].dataIndex !== undefined && line.points[0].price !== undefined && visibleDataInfo) {
      x1 = dataIndexToX(line.points[0].dataIndex, chartWidth, visibleDataInfo);
      y1 = priceToY(line.points[0].price, chartAreaHeight, priceRange);
      x2 = dataIndexToX(line.points[1].dataIndex!, chartWidth, visibleDataInfo);
      y2 = priceToY(line.points[1].price!, chartAreaHeight, priceRange);
    } else {
      x1 = line.points[0].x;
      y1 = line.points[0].y;
      x2 = line.points[1].x;
      y2 = line.points[1].y;
    }
    
    if (isPointNearLine(px, py, x1, y1, x2, y2)) {
      return { type: 'line', id: line.id, drawing: line };
    }
  }
  
  // Check measurements
  for (const measurement of drawingState.measurements) {
    if (measurement.locked) continue; // Skip locked drawings
    
    let x1, y1, x2, y2;
    
    if (measurement.startPoint.dataIndex !== undefined && measurement.startPoint.price !== undefined && visibleDataInfo) {
      x1 = dataIndexToX(measurement.startPoint.dataIndex, chartWidth, visibleDataInfo);
      y1 = priceToY(measurement.startPoint.price, chartAreaHeight, priceRange);
      x2 = dataIndexToX(measurement.endPoint.dataIndex!, chartWidth, visibleDataInfo);
      y2 = priceToY(measurement.endPoint.price!, chartAreaHeight, priceRange);
    } else {
      x1 = measurement.startPoint.x;
      y1 = measurement.startPoint.y;
      x2 = measurement.endPoint.x;
      y2 = measurement.endPoint.y;
    }
    
    if (isPointNearLine(px, py, x1, y1, x2, y2)) {
      return { type: 'measurement', id: measurement.id, drawing: measurement };
    }
  }
  
  // Check fibonacci levels
  for (const fibonacci of drawingState.fibonaccis) {
    if (fibonacci.locked) continue; // Skip locked drawings
    
    let x1, y1, x2, y2;
    
    if (fibonacci.startPoint.dataIndex !== undefined && fibonacci.startPoint.price !== undefined && visibleDataInfo) {
      x1 = dataIndexToX(fibonacci.startPoint.dataIndex, chartWidth, visibleDataInfo);
      y1 = priceToY(fibonacci.startPoint.price, chartAreaHeight, priceRange);
      x2 = dataIndexToX(fibonacci.endPoint.dataIndex!, chartWidth, visibleDataInfo);
      y2 = priceToY(fibonacci.endPoint.price!, chartAreaHeight, priceRange);
    } else {
      x1 = fibonacci.startPoint.x;
      y1 = fibonacci.startPoint.y;
      x2 = fibonacci.endPoint.x;
      y2 = fibonacci.endPoint.y;
    }
    
    // Check main line
    if (isPointNearLine(px, py, x1, y1, x2, y2)) {
      return { type: 'fibonacci', id: fibonacci.id, drawing: fibonacci };
    }
    
    // For simplicity, we only check the main line, not all the horizontal levels
    // A more comprehensive check would include the horizontal lines as well
  }
  
  // Check texts
  for (const text of drawingState.texts) {
    if (text.locked) continue; // Skip locked drawings
    
    if (isPointNearText(px, py, text, ctx, chartWidth, height, priceRange, visibleDataInfo)) {
      return { type: 'text', id: text.id, drawing: text };
    }
  }
  
  // Check drawings
  for (const drawing of drawingState.drawings) {
    if (drawing.locked) continue; // Skip locked drawings
    
    if (isPointNearDrawing(px, py, drawing, chartWidth, height, priceRange, visibleDataInfo)) {
      return { type: 'drawing', id: drawing.id, drawing: drawing };
    }
  }
  
  return { type: null, id: null, drawing: null };
};

// Update drawing point based on resize handle
export const updateDrawingPoint = (
  drawing: DrawingObject, 
  drawingType: string,
  handleIndex: number,
  newPoint: Point,
  chartWidth: number,
  height: number,
  priceRange: { min: number; max: number },
  visibleDataInfo?: {
    leftPadding: number;
    rightPadding: number;
    totalWidth: number;
    startIndex: number;
    endIndex: number;
  }
): DrawingObject => {
  const updatedDrawing = { ...drawing };
  
  // Define constants for scales
  const timeScaleHeight = 30;
  const chartAreaHeight = height - timeScaleHeight;
  
  // Calculate data coordinates for the new point
  let dataIndex = undefined;
  let price = undefined;
  
  if (visibleDataInfo && visibleDataInfo.data) {
    // Get data index from X position
    dataIndex = xToDataIndex(newPoint.x, chartWidth, visibleDataInfo, visibleDataInfo.data);
    
    // Get price from Y position
    price = yToPrice(newPoint.y, chartAreaHeight, priceRange);
  }
  
  // Update the specific handle based on the drawing type
  if (drawingType === 'line') {
    const line = updatedDrawing as ChartLine;
    // Create a new points array to avoid mutating the original
    line.points = [...line.points];
    
    // Update the specific point based on handleIndex
    line.points[handleIndex] = { 
      x: newPoint.x, 
      y: newPoint.y,
      dataIndex,
      price
    };
  } 
  else if (drawingType === 'measurement') {
    const measurement = updatedDrawing as ChartMeasurement;
    if (handleIndex === 0) {
      measurement.startPoint = { 
        x: newPoint.x, 
        y: newPoint.y,
        dataIndex,
        price
      };
    } else {
      measurement.endPoint = { 
        x: newPoint.x, 
        y: newPoint.y,
        dataIndex,
        price
      };
    }
    
    // Recalculate price difference
    if (measurement.startPoint.price !== undefined && measurement.endPoint.price !== undefined) {
      const { priceDiff, percentDiff } = calculatePriceDifference(
        measurement.startPoint.price,
        measurement.endPoint.price
      );
      measurement.priceDifference = priceDiff;
      measurement.percentDifference = percentDiff;
    }
  }
  else if (drawingType === 'fibonacci') {
    const fibonacci = updatedDrawing as ChartFibonacci;
    if (handleIndex === 0) {
      fibonacci.startPoint = { 
        x: newPoint.x, 
        y: newPoint.y,
        dataIndex,
        price
      };
    } else {
      fibonacci.endPoint = { 
        x: newPoint.x, 
        y: newPoint.y,
        dataIndex,
        price
      };
    }
  }
  else if (drawingType === 'text') {
    const text = updatedDrawing as ChartText;
    text.position = { 
      x: newPoint.x, 
      y: newPoint.y,
      dataIndex,
      price
    };
  }
  else if (drawingType === 'drawing') {
    const drawing = updatedDrawing as ChartDrawing;
    // Create a copy of the points array
    drawing.points = [...drawing.points];
    
    if (handleIndex === 0) {
      // Update the first point
      drawing.points[0] = { 
        x: newPoint.x, 
        y: newPoint.y,
        dataIndex,
        price
      };
    } else if (handleIndex === 1 && drawing.points.length > 0) {
      // Update the last point
      drawing.points[drawing.points.length - 1] = { 
        x: newPoint.x, 
        y: newPoint.y,
        dataIndex,
        price
      };
    }
  }
  
  return updatedDrawing;
};

// Duplicate a drawing
export const duplicateDrawing = (
  type: string,
  drawing: DrawingObject
): DrawingObject => {
  // Create a deep copy of the drawing with a new ID
  const newDrawing = JSON.parse(JSON.stringify(drawing));
  newDrawing.id = generateId();
  
  // Offset the position slightly to make it visible
  if (type === 'line') {
    const line = newDrawing as ChartLine;
    line.points.forEach(point => {
      if (!point.dataIndex) {
        point.x += 10;
        point.y += 10;
      }
    });
  } else if (type === 'measurement') {
    const measurement = newDrawing as ChartMeasurement;
    if (!measurement.startPoint.dataIndex) {
      measurement.startPoint.x += 10;
      measurement.startPoint.y += 10;
    }
    if (!measurement.endPoint.dataIndex) {
      measurement.endPoint.x += 10;
      measurement.endPoint.y += 10;
    }
  } else if (type === 'fibonacci') {
    const fibonacci = newDrawing as ChartFibonacci;
    if (!fibonacci.startPoint.dataIndex) {
      fibonacci.startPoint.x += 10;
      fibonacci.startPoint.y += 10;
    }
    if (!fibonacci.endPoint.dataIndex) {
      fibonacci.endPoint.x += 10;
      fibonacci.endPoint.y += 10;
    }
  } else if (type === 'text') {
    const text = newDrawing as ChartText;
    if (!text.position.dataIndex) {
      text.position.x += 10;
      text.position.y += 10;
    }
  } else if (type === 'drawing') {
    const drawing = newDrawing as ChartDrawing;
    drawing.points.forEach(point => {
      if (!point.dataIndex) {
        point.x += 10;
        point.y += 10;
      }
    });
  }
  
  return newDrawing;
};