import { CandleData } from '../../types/chartTypes';
import { IndicatorConfig, IndicatorResult } from './types';

export const calculateRSI = (data: CandleData[], config: IndicatorConfig): IndicatorResult => {
  const { period = 14, color } = config;
  const changes: number[] = [];
  const rsi: number[] = [];
  
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
  
  return {
    data: rsi,
    lines: [{
      data: rsi,
      color,
      width: 1.5
    }]
  };
};