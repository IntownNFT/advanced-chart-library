import { CandleData } from '../../types/chartTypes';
import { IndicatorConfig, IndicatorResult } from './types';

export const calculateEMA = (data: CandleData[], config: IndicatorConfig): IndicatorResult => {
  const { period = 20, color } = config;
  const closes = data.map(d => d.close);
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // First EMA is SMA
  let sum = 0;
  for (let i = 0; i < period && i < closes.length; i++) {
    sum += closes[i];
  }
  const firstEMA = sum / Math.min(period, closes.length);
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      ema.push(NaN);
    } else if (i === period - 1) {
      ema.push(firstEMA);
    } else {
      ema.push(closes[i] * multiplier + ema[i - 1] * (1 - multiplier));
    }
  }
  
  return {
    data: ema,
    lines: [{
      data: ema,
      color,
      width: 1.5
    }]
  };
};