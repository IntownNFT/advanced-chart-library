export type ChartType = 'candlestick' | 'area';
export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

export interface SymbolInfo {
  name: string;
  code: string;
  type: string;
  exchange: string;
  currency_code: string;
  country?: string;
  description: string;
}

export interface FavoriteSymbol extends SymbolInfo {
  addedAt: number;
}

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Indicator {
  type: 'sma' | 'ema' | 'bollinger' | 'rsi' | 'macd' | 'volume' | 'stochastic' | 'custom';
  period?: number;
  color: string;
  data?: number[];
  params?: Record<string, any>;
  name?: string;
  overlay?: boolean;  // Whether the indicator overlays on the main chart
  height?: number;    // Height for bottom indicators (percentage of total height)
  panel?: string;     // Identifier for the panel this indicator belongs to
}

export interface ChartConfig {
  data: CandleData[];
  width: number;
  height: number;
  chartType: ChartType;
  indicators: Indicator[];
  timeframe: Timeframe;
  symbol?: string;
  priceRange?: { min: number; max: number };
  minimizeGrid?: boolean;
  virtualBoundaries?: {
    leftPadding: number;
    rightPadding: number;
    totalWidth: number;
    visibleRange: {
      start: number;  // Start index of visible data
      end: number;    // End index of visible data
      bufferSize: number;  // Number of extra candles to render beyond visible area
    };
    scale: number;  // Current zoom level
  };
  hoveredCandle?: CandleData | null;
  showOHLC?: boolean;
}

export interface ScaleInfo {
  min: number;
  max: number;
  pixelRatio: number;
}

// Drawing tools types
export interface Point {
  x: number;
  y: number;
  price?: number;
  time?: number;
  dataIndex?: number;  // Index of the candle in the data array
}

export interface ChartLine {
  id: string;
  points: Point[];
  color: string;
  width: number;
  locked?: boolean;
}

export interface ChartMeasurement {
  id: string;
  startPoint: Point;
  endPoint: Point;
  color: string;
  width: number;
  priceDifference: number;
  percentDifference: number;
  locked?: boolean;
}

export interface ChartFibonacci {
  id: string;
  startPoint: Point;
  endPoint: Point;
  levels: number[];
  color: string;
  width: number;
  locked?: boolean;
}

export interface ChartText {
  id: string;
  position: Point;
  text: string;
  color: string;
  fontSize: number;
  locked?: boolean;
}

export interface ChartDrawing {
  id: string;
  points: Point[];
  color: string;
  width: number;
  locked?: boolean;
}

export interface DrawingState {
  lines: ChartLine[];
  measurements: ChartMeasurement[];
  fibonaccis: ChartFibonacci[];
  texts: ChartText[];
  drawings: ChartDrawing[];
  currentLine: ChartLine | null;
  currentMeasurement: ChartMeasurement | null;
  currentFibonacci: ChartFibonacci | null;
  currentText: ChartText | null;
  currentDrawing: ChartDrawing | null;
  isDrawing: boolean;
  selectedDrawing: {
    type: 'line' | 'measurement' | 'fibonacci' | 'text' | 'drawing' | null;
    id: string | null;
  };
  hoveredDrawing: {
    type: 'line' | 'measurement' | 'fibonacci' | 'text' | 'drawing' | null;
    id: string | null;
  };
  resizingDrawing: {
    type: 'line' | 'measurement' | 'fibonacci' | 'text' | 'drawing' | null;
    id: string | null;
    handleIndex: number | null; // Index of which handle is being dragged
  };
}

export type DrawingObject = ChartLine | ChartMeasurement | ChartFibonacci | ChartText | ChartDrawing;