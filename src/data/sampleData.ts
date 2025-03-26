import { CandleData } from '../types/chartTypes';

// Generate 100 candles of sample data
const generateCandleData = (count: number): CandleData[] => {
  const data: CandleData[] = [];
  let lastClose = 100 + Math.random() * 50;
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    // Subtract time to go back in history (newest data at the end)
    const timestamp = now.getTime() - (count - i) * 3600 * 1000;
    
    // Generate random price movement
    const change = (Math.random() - 0.5) * 2; // -1 to 1
    const volatility = 1 + Math.random();
    
    // Create a "realistic" candle
    const open = lastClose;
    const close = open + change * volatility;
    const high = Math.max(open, close) + Math.random() * volatility;
    const low = Math.min(open, close) - Math.random() * volatility;
    const volume = Math.round(1000 + Math.random() * 9000);
    
    data.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume
    });
    
    lastClose = close;
  }
  
  return data;
};

export const candleData = generateCandleData(100);