import { ChartConfig, CandleData, ScaleInfo } from '../types/chartTypes';
import { formatTimestamp } from '../services/dataService';

/**
 * Calculate price scaling information 
 */
const calculatePriceScale = (data: CandleData[], height: number, padding = 0.1, priceRange?: { min: number; max: number }): ScaleInfo => {
  // If a price range is provided, use it
  if (priceRange) {
    return {
      min: priceRange.min,
      max: priceRange.max,
      pixelRatio: height / (priceRange.max - priceRange.min)
    };
  }
  
  // Otherwise calculate from data
  let min = Infinity;
  let max = -Infinity;
  
  // Find min and max prices
  data.forEach(candle => {
    min = Math.min(min, candle.low);
    max = Math.max(max, candle.high);
  });
  
  // Add padding
  const range = max - min;
  min -= range * padding;
  max += range * padding;
  
  return {
    min,
    max,
    pixelRatio: height / (max - min)
  };
};

/**
 * Convert a price to a y-coordinate
 */
const priceToY = (price: number, scale: ScaleInfo, height: number): number => {
  return height - ((price - scale.min) * scale.pixelRatio);
};

/**
 * Draw a single candlestick
 */
const drawCandle = (
  ctx: CanvasRenderingContext2D, 
  candle: CandleData, 
  x: number, 
  width: number,
  scale: ScaleInfo,
  height: number
) => {
  const isUp = candle.close >= candle.open;
  const fillColor = isUp ? '#26a69a' : '#ef5350';
  const strokeColor = isUp ? '#26a69a' : '#ef5350';
  
  const candleWidth = Math.max(1, width * 0.8);
  const halfCandleWidth = candleWidth / 2;
  
  const openY = priceToY(candle.open, scale, height);
  const closeY = priceToY(candle.close, scale, height);
  const highY = priceToY(candle.high, scale, height);
  const lowY = priceToY(candle.low, scale, height);
  
  // Draw the wick
  ctx.beginPath();
  ctx.moveTo(x, highY);
  ctx.lineTo(x, lowY);
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1;
  ctx.stroke();
  
  // Draw the body
  ctx.fillStyle = fillColor;
  ctx.fillRect(
    x - halfCandleWidth,
    Math.min(openY, closeY),
    candleWidth,
    Math.max(1, Math.abs(closeY - openY))
  );
};

/**
 * Draw area chart
 */
const drawAreaChart = (
  ctx: CanvasRenderingContext2D,
  data: CandleData[],
  scale: ScaleInfo,
  barWidth: number,
  width: number,
  height: number
) => {
  if (data.length === 0) return;
  
  ctx.beginPath();
  
  // Start at the bottom left
  ctx.moveTo(0, height);
  
  // Draw to the first point
  const firstY = priceToY(data[0].close, scale, height);
  ctx.lineTo(barWidth / 2, firstY);
  
  // Draw the price line
  data.forEach((candle, i) => {
    const x = i * barWidth + barWidth / 2;
    const y = priceToY(candle.close, scale, height);
    ctx.lineTo(x, y);
  });
  
  // Complete the path back to the bottom right
  ctx.lineTo(data.length * barWidth - barWidth / 2, height);
  ctx.closePath();
  
  // Fill with gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, 'rgba(33, 150, 243, 0.3)');
  gradient.addColorStop(1, 'rgba(33, 150, 243, 0.0)');
  
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Draw the price line on top
  ctx.beginPath();
  ctx.strokeStyle = '#2196F3';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round'; // Smooth line connections
}
/**
 * Draw grid lines
 */
const drawGrid = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: ScaleInfo
) => {
  // Define price scale width - this is the width of the area on the right side
  const priceScaleWidth = 60;
  // Define time scale height - this is the height of the area at the bottom
  const timeScaleHeight = 30;
  // Calculate the main chart area width and height
  const chartAreaWidth = width - priceScaleWidth;
  const chartAreaHeight = height - timeScaleHeight;
  
};

/**
 * Determine the appropriate time interval for labels based on timeframe
 */
const getTimeInterval = (timeframe: string, dataLength: number): number => {
  // Return the number of candles to skip between labels
  switch (timeframe) {
    case '1d':
      // For daily, show monthly labels (approximately every 30 candles)
      return Math.max(1, Math.floor(dataLength / 12));
    case '4h':
      // For 4h, show labels every few days (approximately every 18 candles = 3 days)
      return Math.max(1, Math.floor(dataLength / 20));
    case '1h':
      // For 1h, show daily labels (approximately every 24 candles)
      return Math.max(1, Math.floor(dataLength / 24));
    case '5m':
      // For 5m, show labels every 3 hours (36 candles = 3 hours)
      return Math.max(1, Math.floor(dataLength / 36));
    case '1m':
      // For 1m, show labels every 30 minutes (30 candles = 30 minutes)
      return Math.max(1, Math.floor(dataLength / 30));
    default:
      return Math.max(1, Math.floor(dataLength / 12));
  }
};

/**
 * Format time label based on timeframe
 */
const formatTimeLabel = (timestamp: number, timeframe: string): string => {
  const date = new Date(timestamp);
  
  switch (timeframe) {
    case '1d': 
      return date.toLocaleString('default', { month: 'short', year: '2-digit' });
    case '4h':
      return date.toLocaleString('default', { 
        month: 'short', 
        day: 'numeric' 
      });
    case '1h':
      return date.toLocaleString('default', { day: 'numeric', month: 'short' });
    case '5m':
      const hours = date.getHours();
      const hoursFormatted = hours.toString().padStart(2, '0');
      return `${hoursFormatted}:00`;
    case '1m':
      const hour = date.getHours();
      const minutes = date.getMinutes();
      const minutesRounded = Math.floor(minutes / 30) * 30;
      const minutesFormatted = minutesRounded.toString().padStart(2, '0');
      return `${hour.toString().padStart(2, '0')}:${minutesFormatted}`;
    default:
      return formatTimestamp(timestamp, timeframe);
  }
};

/**
 * Draw time scale with minimal grid lines
 */
const drawTimeScale = (
  ctx: CanvasRenderingContext2D,
  data: CandleData[],
  barWidth: number,
  width: number,
  height: number,
  timeframe: string,
  minimizeGrid: boolean = false,
  virtualBoundaries?: { leftPadding: number; rightPadding: number; totalWidth: number }
) => {
  if (data.length === 0) return;
  
  // Define constants for the time scale
  const timeScaleHeight = 30; // Height of the time scale area
  const priceScaleWidth = 60; // Width of price scale on the right
  const chartAreaWidth = width - priceScaleWidth;
  const chartAreaHeight = height - timeScaleHeight;
  
  // Handle virtual boundaries (empty space beyond data)
  const effectiveBarWidth = virtualBoundaries ? width / virtualBoundaries.totalWidth : barWidth;
  
  // Offset for left padding (empty space to the left)
  const leftPaddingOffset = virtualBoundaries ? virtualBoundaries.leftPadding * effectiveBarWidth : 0;
  
  // Get appropriate step size based on timeframe and zoom level
  let baseStep = getTimeInterval(timeframe, data.length);
  
  // Adjust step size based on zoom level to prevent label overlap
  const minLabelWidth = 80; // Minimum pixels between labels
  const zoomAdjustedStep = Math.max(1, Math.ceil(minLabelWidth / effectiveBarWidth));
  const step = Math.max(baseStep, zoomAdjustedStep);
  
  // Draw time scale background
  ctx.fillStyle = 'rgba(15, 15, 15, 0.9)'; // Darker background for time scale
  ctx.fillRect(0, chartAreaHeight, chartAreaWidth, timeScaleHeight);
  
  // Draw separator line between chart and time scale
  ctx.beginPath();
  ctx.moveTo(0, chartAreaHeight);
  ctx.lineTo(chartAreaWidth, chartAreaHeight);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  // Font settings for time labels
  ctx.fillStyle = '#888';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '11px sans-serif';
  
  // Calculate visible range based on virtual boundaries
  const startIndex = virtualBoundaries ? Math.max(0, Math.floor(virtualBoundaries.leftPadding)) : 0;
  const endIndex = virtualBoundaries ? Math.ceil(virtualBoundaries.totalWidth - virtualBoundaries.rightPadding) : data.length;
  
  // Draw the time labels and grid lines for visible range
  // Always start from the first visible candle
  for (let i = 0; i < Math.max(endIndex, data.length); i += step) {
    // Calculate position with left padding offset
    const x = leftPaddingOffset + i * effectiveBarWidth + effectiveBarWidth / 2;
    
    // Skip if beyond visible range
    if (x < 0 || x > chartAreaWidth) continue;
    
    // Get candle data or project future time
    let timestamp;
    if (i >= 0 && i < data.length) {
      timestamp = data[i].timestamp;
    } else {
      // Project future time based on the last candle's interval
      const lastCandle = data[data.length - 1];
      const secondLastCandle = data[data.length - 2];
      const interval = lastCandle.timestamp - secondLastCandle.timestamp;
      timestamp = i < 0 
        ? lastCandle.timestamp - Math.abs(i) * interval // Past time
        : lastCandle.timestamp + (i - data.length + 1) * interval; // Future time
    }
    
    // Draw vertical grid line extending into chart area
    if (!minimizeGrid || i % (step * 2) === 0) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, chartAreaHeight);
      ctx.strokeStyle = minimizeGrid ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)';
      ctx.stroke();
    }
    
    // Always draw a tick mark at the top of the time scale
    ctx.beginPath();
    ctx.moveTo(x, chartAreaHeight);
    ctx.lineTo(x, chartAreaHeight + 4);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.stroke();
    
    // Format and draw the time label
    const formattedTime = formatTimeLabel(timestamp, timeframe);
    ctx.fillStyle = '#888';
    
    // Ensure text doesn't get cut off at edges
    const textWidth = ctx.measureText(formattedTime).width;
    const textX = Math.max(textWidth/2, Math.min(chartAreaWidth - textWidth/2, x));
    ctx.fillText(formattedTime, textX, chartAreaHeight + timeScaleHeight/2);
  }
  
  // Draw additional time information at the right edge
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  
  // Add zoom indicator if zoomed
  if (effectiveBarWidth > barWidth) {
    const zoomLevel = Math.round((effectiveBarWidth / barWidth) * 100) / 100;
    ctx.fillStyle = '#888';
    ctx.fillText(`${zoomLevel}x`, chartAreaWidth - 10, chartAreaHeight + timeScaleHeight/2);
  }
};

/**
 * Draw price scale with minimal grid lines
 */
const drawPriceScale = (
  ctx: CanvasRenderingContext2D,
  scale: ScaleInfo,
  width: number,
  height: number,
  minimizeGrid: boolean = false
) => {
  // Define constants for scales
  const priceScaleWidth = 60;
  const timeScaleHeight = 30;
  const chartAreaHeight = height - timeScaleHeight;
  
  // For minimized grid, show fewer labels
  const numLabels = minimizeGrid ? 5 : 8;
  const range = scale.max - scale.min;
  const step = range / (numLabels - 1);
  
  ctx.fillStyle = '#888';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = '11px sans-serif';
  
  // Draw price scale background for better visibility
  ctx.fillStyle = 'rgba(15, 15, 15, 0.9)'; // Slightly darker than chart background
  ctx.fillRect(width - priceScaleWidth, 0, priceScaleWidth, chartAreaHeight);
  
  // Draw price axis line
  ctx.beginPath();
  ctx.moveTo(width - priceScaleWidth, 0);
  ctx.lineTo(width - priceScaleWidth, chartAreaHeight);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  for (let i = 0; i < numLabels; i++) {
    const price = scale.min + (step * i);
    const y = priceToY(price, scale, chartAreaHeight);
    
    // Skip if outside visible chart area
    if (y < 0 || y > chartAreaHeight) continue;
    
    // Draw line (skip first and last lines)
    if (!minimizeGrid && i !== 0 && i !== numLabels - 1) {
      ctx.beginPath();
      ctx.moveTo(width - priceScaleWidth, y);
      ctx.lineTo(width, y);
      ctx.strokeStyle = minimizeGrid ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.15)';
      ctx.stroke();
    }
    
    // Always draw a tick mark at the edge of the price scale
    ctx.beginPath();
    ctx.moveTo(width - priceScaleWidth, y);
    ctx.lineTo(width - priceScaleWidth + 4, y);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.stroke();
    
    // Format price with appropriate decimal places
    let priceText = formatPrice(price);
    
    // Draw price label
    ctx.fillStyle = '#888';
    ctx.fillText(priceText, width - 8, y);
  }
};

/**
 * Calculate Simple Moving Average (SMA)
 */
const calculateSMA = (data: CandleData[], period: number): number[] => {
  const sma = [];
  const closes = data.map(d => d.close);
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      sma.push(NaN); // Not enough data
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += closes[i - j];
      }
      sma.push(sum / period);
    }
  }
  
  return sma;
};

// Calculate RSI
const calculateRSI = (data: CandleData[], period: number): number[] => {
  const rsi = [];
  const changes = [];
  
  // Calculate price changes
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i].close - data[i-1].close);
  }
  
  // Initialize with NaN for the first period
  for (let i = 0; i < period; i++) {
    rsi.push(NaN);
  }
  
  // Calculate RSI
  for (let i = period; i < data.length; i++) {
    let gains = 0;
    let losses = 0;
    
    // Calculate average gains and losses
    for (let j = i - period; j < i; j++) {
      if (changes[j] > 0) gains += changes[j];
      if (changes[j] < 0) losses -= changes[j];
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }
  
  return rsi;
};

// Calculate MACD
const calculateMACD = (data: CandleData[], fast: number = 12, slow: number = 26, signal: number = 9): { macd: number[], signal: number[], histogram: number[] } => {
  const closes = data.map(d => d.close);
  const fastEMA = calculateEMA(data, fast);
  const slowEMA = calculateEMA(data, slow);
  
  const macdLine = fastEMA.map((fast, i) => {
    if (isNaN(fast) || isNaN(slowEMA[i])) return NaN;
    return fast - slowEMA[i];
  });
  
  // Calculate signal line (EMA of MACD)
  const signalLine = [];
  let multiplier = 2 / (signal + 1);
  
  for (let i = 0; i < macdLine.length; i++) {
    if (i < signal - 1) {
      signalLine.push(NaN);
      continue;
    }
    
    if (i === signal - 1) {
      let sum = 0;
      for (let j = 0; j < signal; j++) {
        sum += macdLine[i - j];
      }
      signalLine.push(sum / signal);
      continue;
    }
    
    signalLine.push(
      (macdLine[i] - signalLine[i-1]) * multiplier + signalLine[i-1]
    );
  }
  
  // Calculate histogram
  const histogram = macdLine.map((macd, i) => {
    if (isNaN(macd) || isNaN(signalLine[i])) return NaN;
    return macd - signalLine[i];
  });
  
  return { macd: macdLine, signal: signalLine, histogram };
};

// Calculate Stochastic Oscillator
const calculateStochastic = (data: CandleData[], k: number = 14, d: number = 3, smooth: number = 3): { k: number[], d: number[] } => {
  const kLine = [];
  
  // Calculate %K
  for (let i = 0; i < data.length; i++) {
    if (i < k - 1) {
      kLine.push(NaN);
      continue;
    }
    
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    
    for (let j = 0; j < k; j++) {
      const index = i - j;
      highestHigh = Math.max(highestHigh, data[index].high);
      lowestLow = Math.min(lowestLow, data[index].low);
    }
    
    const currentClose = data[i].close;
    kLine.push(((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100);
  }
  
  // Calculate %D (SMA of %K)
  const dLine = [];
  for (let i = 0; i < kLine.length; i++) {
    if (i < d - 1) {
      dLine.push(NaN);
      continue;
    }
    
    let sum = 0;
    for (let j = 0; j < d; j++) {
      sum += kLine[i - j];
    }
    dLine.push(sum / d);
  }
  
  return { k: kLine, d: dLine };
};

// Calculate ATR (Average True Range)
const calculateATR = (data: CandleData[], period: number = 14): number[] => {
  const tr = [];
  const atr = [];
  
  // Calculate True Range
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      tr.push(data[i].high - data[i].low);
      continue;
    }
    
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = data[i-1].close;
    
    tr.push(Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    ));
  }
  
  // Calculate ATR
  for (let i = 0; i < tr.length; i++) {
    if (i < period - 1) {
      atr.push(NaN);
      continue;
    }
    
    if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += tr[i - j];
      }
      atr.push(sum / period);
      continue;
    }
    
    atr.push((atr[i-1] * (period - 1) + tr[i]) / period);
  }
  
  return atr;
};


/**
 * Calculate Exponential Moving Average (EMA)
 */
const calculateEMA = (data: CandleData[], period: number): number[] => {
  const ema = [];
  const closes = data.map(d => d.close);
  const multiplier = 2 / (period + 1);
  
  // First EMA is SMA
  let sum = 0;
  for (let i = 0; i < period && i < closes.length; i++) {
    sum += closes[i];
  }
  const firstEMA = sum / Math.min(period, closes.length);
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      ema.push(NaN); // Not enough data
    } else if (i === period - 1) {
      ema.push(firstEMA);
    } else {
      ema.push(closes[i] * multiplier + ema[i - 1] * (1 - multiplier));
    }
  }
  
  return ema;
};

/**
 * Calculate Bollinger Bands
 */
const calculateBollingerBands = (data: CandleData[], period: number, stdDev: number = 2): { upper: number[], middle: number[], lower: number[] } => {
  const middle = calculateSMA(data, period);
  const upper = [];
  const lower = [];
  const closes = data.map(d => d.close);
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
    } else {
      // Calculate standard deviation
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += Math.pow(closes[i - j] - middle[i], 2);
      }
      const sd = Math.sqrt(sum / period);
      
      // Calculate bands
      upper.push(middle[i] + stdDev * sd);
      lower.push(middle[i] - stdDev * sd);
    }
  }
  
  return { upper, middle, lower };
};

/**
 * Format price with proper decimal places
 */
export const formatPrice = (price: number): string => {
  if (price >= 1000) return price.toFixed(2);
  if (price >= 100) return price.toFixed(2);
  if (price >= 10) return price.toFixed(3);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
};

/**
 * Draw indicators with smooth lines
 */
const drawIndicators = (
  ctx: CanvasRenderingContext2D,
  config: ChartConfig,
  scale: ScaleInfo,
  barWidth: number
) => {
  const { data, indicators, height, virtualBoundaries, width } = config;
  
  if (data.length === 0 || indicators.length === 0) return;
  
  // Define constants for scales
  const priceScaleWidth = 60;
  const timeScaleHeight = 30;
  const chartAreaWidth = width - priceScaleWidth;
  const chartAreaHeight = height - timeScaleHeight;
  
  // Handle virtual boundaries (empty space beyond data)
  const effectiveBarWidth = virtualBoundaries ? 
    config.width / virtualBoundaries.totalWidth : barWidth;
  
  // Offset for left padding (empty space to the left)
  const leftPaddingOffset = virtualBoundaries ? 
    virtualBoundaries.leftPadding * effectiveBarWidth : 0;
  
  // Save the canvas state to apply clipping
  ctx.save();
  
  // Apply clipping to prevent indicators drawing over price area
  ctx.beginPath();
  ctx.rect(0, 0, chartAreaWidth, chartAreaHeight);
  ctx.clip();
  
  indicators.forEach(indicator => {
    let indicatorData: number[] | { upper: number[], middle: number[], lower: number[] } | undefined;
    
    // Calculate indicator data if not provided
    if (!indicator.data) {
      switch (indicator.type) {
        case 'sma':
          indicatorData = calculateSMA(data, indicator.period || 20);
          break;
        case 'ema':
          indicatorData = calculateEMA(data, indicator.period || 14);
          break;
        case 'bollinger':
          indicatorData = calculateBollingerBands(data, indicator.period || 20, indicator.params?.stdDev || 2);
          break;
        case 'rsi':
          indicatorData = calculateRSI(data, indicator.period || 14);
          break;
        case 'macd': {
          const macdData = calculateMACD(
            data,
            indicator.params?.fast || 12,
            indicator.params?.slow || 26,
            indicator.params?.signal || 9
          );
          indicatorData = macdData.macd;
          // Draw signal line
          ctx.beginPath();
          ctx.strokeStyle = '#FF9800';
          ctx.lineWidth = 1;
          
          macdData.signal.forEach((value, i) => {
            if (!isNaN(value)) {
              const x = leftPaddingOffset + i * effectiveBarWidth + effectiveBarWidth / 2;
              const y = priceToY(value, scale, chartAreaHeight);
              
              if (i === 0 || isNaN(macdData.signal[i - 1])) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            }
          });
          
          ctx.stroke();
          
          // Draw histogram
          const barWidth = effectiveBarWidth * 0.8;
          macdData.histogram.forEach((value, i) => {
            if (!isNaN(value)) {
              const x = leftPaddingOffset + i * effectiveBarWidth;
              const y = priceToY(Math.max(0, value), scale, chartAreaHeight);
              const height = Math.abs(priceToY(0, scale, chartAreaHeight) - y);
              
              ctx.fillStyle = value >= 0 ? '#4CAF50' : '#FF5252';
              ctx.fillRect(x, y, barWidth, height);
            }
          });
          break;
        }
        case 'volume': {
          // Draw volume bars
          const maxVolume = Math.max(...data.map(d => d.volume));
          const volumeScale = chartAreaHeight / maxVolume;
          
          data.forEach((candle, i) => {
            const x = leftPaddingOffset + i * effectiveBarWidth;
            const height = candle.volume * volumeScale;
            const y = chartAreaHeight - height;
            
            ctx.fillStyle = candle.close >= candle.open ? 
              'rgba(38, 166, 154, 0.3)' : 
              'rgba(239, 83, 80, 0.3)';
            ctx.fillRect(x, y, effectiveBarWidth * 0.8, height);
          });
          return;
        }
        case 'stochastic': {
          const stochData = calculateStochastic(
            data,
            indicator.params?.k || 14,
            indicator.params?.d || 3,
            indicator.params?.smooth || 3
          );
          
          // Draw %K line
          ctx.beginPath();
          ctx.strokeStyle = indicator.color;
          ctx.lineWidth = 1;
          
          stochData.k.forEach((value, i) => {
            if (!isNaN(value)) {
              const x = leftPaddingOffset + i * effectiveBarWidth + effectiveBarWidth / 2;
              const y = priceToY(value, scale, chartAreaHeight);
              
              if (i === 0 || isNaN(stochData.k[i - 1])) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            }
          });
          
          ctx.stroke();
          
          // Draw %D line
          ctx.beginPath();
          ctx.strokeStyle = '#FF9800';
          ctx.lineWidth = 1;
          
          stochData.d.forEach((value, i) => {
            if (!isNaN(value)) {
              const x = leftPaddingOffset + i * effectiveBarWidth + effectiveBarWidth / 2;
              const y = priceToY(value, scale, chartAreaHeight);
              
              if (i === 0 || isNaN(stochData.d[i - 1])) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            }
          });
          
          ctx.stroke();
          return;
        }
        case 'atr':
          indicatorData = calculateATR(data, indicator.period || 14);
          break;
        default:
          return;
      }
    } else {
      indicatorData = indicator.data;
    }
    
    // Set smooth line rendering
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    if (indicator.type === 'bollinger' && typeof indicatorData !== 'number') {
      const bollingerBands = indicatorData as { upper: number[], middle: number[], lower: number[] };
      
      // Draw middle band
      ctx.beginPath();
      ctx.strokeStyle = indicator.color;
      ctx.lineWidth = 1.5;
      
      let firstPoint = true;
      bollingerBands.middle.forEach((value, i) => {
        if (!isNaN(value)) {
          const x = leftPaddingOffset + i * effectiveBarWidth + effectiveBarWidth / 2;
          const y = priceToY(value, scale, chartAreaHeight);
          
          if (firstPoint || isNaN(bollingerBands.middle[i - 1])) {
            ctx.moveTo(x, y);
            firstPoint = false;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      
      ctx.stroke();
      
      // Draw upper band
      ctx.beginPath();
      ctx.strokeStyle = indicator.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      
      firstPoint = true;
      bollingerBands.upper.forEach((value, i) => {
        if (!isNaN(value)) {
          const x = leftPaddingOffset + i * effectiveBarWidth + effectiveBarWidth / 2;
          const y = priceToY(value, scale, chartAreaHeight);
          
          if (firstPoint || isNaN(bollingerBands.upper[i - 1])) {
            ctx.moveTo(x, y);
            firstPoint = false;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      
      ctx.stroke();
      
      // Draw lower band
      ctx.beginPath();
      ctx.strokeStyle = indicator.color;
      
      firstPoint = true;
      bollingerBands.lower.forEach((value, i) => {
        if (!isNaN(value)) {
          const x = leftPaddingOffset + i * effectiveBarWidth + effectiveBarWidth / 2;
          const y = priceToY(value, scale, chartAreaHeight);
          
          if (firstPoint || isNaN(bollingerBands.lower[i - 1])) {
            ctx.moveTo(x, y);
            firstPoint = false;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // Draw line-based indicator
      const lineData = indicatorData as number[];
      
      ctx.beginPath();
      ctx.strokeStyle = indicator.color;
      ctx.lineWidth = 1.5;
      
      let firstPoint = true;
      lineData.forEach((value, i) => {
        if (!isNaN(value)) {
          const x = leftPaddingOffset + i * effectiveBarWidth + effectiveBarWidth / 2;
          const y = priceToY(value, scale, chartAreaHeight);
          
          if (firstPoint || isNaN(lineData[i - 1])) {
            ctx.moveTo(x, y);
            firstPoint = false;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      
      ctx.stroke();
    }
  });
  
  // Restore canvas state to remove clipping
  ctx.restore();
};

/**
 * Draw chart information (symbol, timeframe) and OHLC info
 */
const drawChartInfo = (
  ctx: CanvasRenderingContext2D,
  config: ChartConfig
) => {
  if (!config.symbol) return;
  
  // Define constants for scales
  const timeScaleHeight = 30;
  const chartAreaHeight = config.height - timeScaleHeight;
  
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  // Draw symbol and timeframe
  ctx.fillText(`${config.symbol} · ${config.timeframe}`, 10, 10);
  
  // Check if OHLC display is enabled
  if (!config.showOHLC) return;
  
  // Draw OHLC data if available
  if (config.data.length > 0) {
    // Determine which candle to use - hovered candle or latest candle
    const candle = config.hoveredCandle || config.data[config.data.length - 1];
    const isUp = candle.close >= candle.open;
    
    // Position for OHLC data (after symbol)
    const symbolTextWidth = ctx.measureText(`${config.symbol} · ${config.timeframe}`).width;
    let xPos = symbolTextWidth + 35;
    
    // Helper function to draw a value with specified color
    const drawValue = (label: string, value: number, color: string) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(label, xPos, 10);
      
      const labelWidth = ctx.measureText(label).width;
      xPos += labelWidth + 5;
      
      ctx.fillStyle = color;
      const formattedValue = formatPrice(value);
      ctx.fillText(formattedValue, xPos, 10);
      
      const valueWidth = ctx.measureText(formattedValue).width;
      xPos += valueWidth + 15;
    };
    
    // Draw OHLC values with proper colors
    const priceColor = isUp ? '#26a69a' : '#ef5350';
    drawValue('O', candle.open, priceColor);
    drawValue('H', candle.high, '#26a69a');
    drawValue('L', candle.low, '#ef5350');
    drawValue('C', candle.close, priceColor);
    
    // Draw change/percentage
    const priceDiff = candle.close - candle.open;
    const percentChange = (priceDiff / candle.open) * 100;
    
    ctx.fillStyle = isUp ? '#26a69a' : '#ef5350';
    ctx.fillText(`${priceDiff >= 0 ? '+' : ''}${formatPrice(priceDiff)} (${percentChange.toFixed(2)}%)`, xPos, 10);
  }
};

/**
 * Draw chart with virtual boundaries support
 */
export const drawChart = (ctx: CanvasRenderingContext2D, config: ChartConfig) => {
  const { data, width, height, chartType, timeframe, priceRange, minimizeGrid, virtualBoundaries } = config;
  
  // Calculate bar width based on virtual boundaries if provided
  const barWidth = virtualBoundaries ? 
    width / virtualBoundaries.totalWidth : 
    width / data.length;
  
  // Handle virtual boundaries (empty space beyond data)
  const effectiveBarWidth = virtualBoundaries ? 
    width / virtualBoundaries.totalWidth : barWidth;
  
  // Separate indicators into overlay and bottom
  const overlayIndicators = config.indicators.filter(i => i.overlay !== false);
  const bottomIndicators = config.indicators.filter(i => i.overlay === false);
  
  // Calculate heights for bottom indicators
  const totalBottomHeight = bottomIndicators.reduce((sum, ind) => sum + (ind.height || 20), 0);
  const mainChartHeightPercent = 100 - totalBottomHeight;
  
  // Define constants for scales
  const priceScaleWidth = 60;
  const timeScaleHeight = 30;
  const chartAreaWidth = width - priceScaleWidth;
  
  // Calculate heights for each section
  const totalHeight = height - timeScaleHeight;
  const mainChartHeight = (totalHeight * mainChartHeightPercent) / 100;
  
  // Draw background - Updated to darker color #0f0f0f
  ctx.fillStyle = '#0f0f0f';
  ctx.fillRect(0, 0, width, height);
  
  if (!data || data.length === 0) return;
  
  // Calculate price scale
  const scale = calculatePriceScale(data, mainChartHeight * 0.9, 0.1, priceRange);
  
  // Draw grid - this is the explicit grid pattern
  drawGrid(ctx, width, height, scale);
  
  // Draw axis scales
  drawPriceScale(ctx, scale, width, height, minimizeGrid);
  drawTimeScale(ctx, data, barWidth, width, height, timeframe, minimizeGrid, virtualBoundaries);
  
  // Left padding offset for drawing data
  const leftPaddingOffset = virtualBoundaries ? 
    virtualBoundaries.leftPadding * barWidth : 0;
  
  // Save canvas state
  ctx.save();
  
  // Apply clipping to main chart area
  ctx.beginPath();
  ctx.rect(0, 0, chartAreaWidth, mainChartHeight);
  ctx.clip();
  
  // Draw chart based on type
  switch (chartType) {
    case 'candlestick':
      data.forEach((candle, i) => {
        const x = leftPaddingOffset + i * barWidth + barWidth / 2;
        // Skip bars outside the visible area
        if (x + barWidth / 2 < 0 || x - barWidth / 2 > chartAreaWidth) return;
        drawCandle(ctx, candle, x, barWidth, scale, mainChartHeight);
      });
      break;
    case 'area':
      drawAreaChart(ctx, data, scale, barWidth, width, mainChartHeight);
      break;
  }
  
  // Restore canvas state
  ctx.restore();
  
  // Draw overlay indicators
  if (overlayIndicators.length > 0) {
    const overlayConfig = { ...config, indicators: overlayIndicators };
    drawIndicators(ctx, overlayConfig, scale, barWidth);
  }
  
  // Draw chart info with OHLC
  drawChartInfo(ctx, config);
  
  // Draw bottom indicators
  let currentY = mainChartHeight;
  
  // Draw background for each indicator panel
  bottomIndicators.forEach(indicator => {
    const indicatorHeight = (totalHeight * (indicator.height || 20)) / 100;
    
    // Draw panel background
    ctx.fillStyle = 'rgba(20, 20, 20, 0.5)';
    ctx.fillRect(0, currentY, chartAreaWidth, indicatorHeight);
    
    // Draw indicator name
    ctx.font = '10px sans-serif';
    ctx.fillStyle = indicator.color;
    ctx.textAlign = 'left';
    ctx.fillText(indicator.name || indicator.type.toUpperCase(), 5, currentY + 15);
    
    currentY += indicatorHeight;
  });
  
  // Reset currentY for actual indicator drawing
  currentY = mainChartHeight;
  
  bottomIndicators.forEach(indicator => {
    const indicatorHeight = (totalHeight * (indicator.height || 20)) / 100;
    
    // Draw separator line
    ctx.beginPath();
    ctx.moveTo(0, currentY);
    ctx.lineTo(chartAreaWidth, currentY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.stroke();
    
    // Calculate scale for this indicator
    let indicatorScale;
    switch (indicator.type) {
      case 'rsi':
        indicatorScale = { min: 0, max: 100, pixelRatio: indicatorHeight / 100 };
        // Draw reference lines for RSI
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.setLineDash([2, 2]);
        [30, 70].forEach(level => {
          const y = currentY + indicatorHeight - (level * indicatorHeight / 100);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(chartAreaWidth, y);
          ctx.stroke();
        });
        ctx.setLineDash([]);
        break;
      case 'stochastic':
        indicatorScale = { min: 0, max: 100, pixelRatio: indicatorHeight / 100 };
        // Draw reference lines for Stochastic
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.setLineDash([2, 2]);
        [20, 80].forEach(level => {
          const y = currentY + indicatorHeight - (level * indicatorHeight / 100);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(chartAreaWidth, y);
          ctx.stroke();
        });
        ctx.setLineDash([]);
        break;
      case 'volume': {
        const maxVolume = Math.max(...data.map(d => d.volume));
        indicatorScale = { min: 0, max: maxVolume, pixelRatio: indicatorHeight / maxVolume };
        
        // Draw volume bars aligned to bottom
        data.forEach((candle, i) => {
          const x = leftPaddingOffset + i * effectiveBarWidth;
          const height = candle.volume * indicatorScale.pixelRatio;
          
          ctx.fillStyle = candle.close >= candle.open ? 
            'rgba(38, 166, 154, 0.3)' : 
            'rgba(239, 83, 80, 0.3)';
          ctx.fillRect(
            x, 
            currentY + indicatorHeight - height, // Start from bottom
            effectiveBarWidth * 0.8,
            height
          );
        });
        return; // Skip default indicator drawing
        break;
      }
      case 'macd': {
        const macdData = calculateMACD(data);
        const values = [...macdData.macd, ...macdData.signal, ...macdData.histogram];
        const validValues = values.filter(v => !isNaN(v));
        const max = Math.max(...validValues);
        const min = Math.min(...validValues);
        const range = max - min;
        const padding = range * 0.1;
        indicatorScale = {
          min: min - padding,
          max: max + padding,
          pixelRatio: indicatorHeight / (range + 2 * padding)
        };
        
        // Draw zero line for MACD
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        const zeroY = currentY + indicatorHeight / 2;
        ctx.beginPath();
        ctx.moveTo(0, zeroY);
        ctx.lineTo(chartAreaWidth, zeroY);
        ctx.stroke();
        break;
      }
      case 'atr': {
        const atrData = calculateATR(data);
        const validValues = atrData.filter(v => !isNaN(v));
        const max = Math.max(...validValues);
        const padding = max * 0.1;
        indicatorScale = {
          min: 0,
          max: max + padding,
          pixelRatio: indicatorHeight / (max + padding)
        };
        
        // Draw midpoint line for ATR
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        const midY = currentY + indicatorHeight / 2;
        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(chartAreaWidth, midY);
        ctx.stroke();
        break;
      }
      default:
        indicatorScale = scale;
    }
    
    // Draw indicator name and value
    ctx.font = '10px sans-serif';
    ctx.fillStyle = indicator.color;
    ctx.textAlign = 'left';
    ctx.fillText(indicator.name || indicator.type.toUpperCase(), 5, currentY + 15);
    
    // Draw current value
    let currentValue = '';
    switch (indicator.type) {
      case 'rsi': {
        const rsiData = calculateRSI(data, indicator.period || 14);
        currentValue = rsiData[rsiData.length - 1].toFixed(2);
        break;
      }
      case 'macd': {
        const macdData = calculateMACD(data);
        currentValue = macdData.macd[macdData.macd.length - 1].toFixed(2);
        break;
      }
      case 'stochastic': {
        const stochData = calculateStochastic(data);
        currentValue = stochData.k[stochData.k.length - 1].toFixed(2);
        break;
      }
      case 'atr': {
        const atrData = calculateATR(data);
        currentValue = atrData[atrData.length - 1].toFixed(2);
        break;
      }
    }
    if (currentValue) {
      ctx.textAlign = 'right';
      ctx.fillText(currentValue, chartAreaWidth - 5, currentY + 15);
    }
    
    // Save context for this indicator
    ctx.save();
    ctx.translate(0, currentY);
    ctx.rect(0, 0, chartAreaWidth, indicatorHeight);
    ctx.clip();
    const indicatorConfig = { ...config, indicators: [indicator], height: indicatorHeight };
    drawIndicators(ctx, indicatorConfig, indicatorScale, barWidth);
    ctx.restore();
    
    currentY += indicatorHeight;
  });
};