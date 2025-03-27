import { CandleData } from '../../types/chartTypes';
import { IndicatorConfig, IndicatorResult } from './types';

export const calculateSMA = (data: CandleData[], config: IndicatorConfig): IndicatorResult => {
  const { period = 20, color } = config;
  const closes = data.map(d => d.close);
  const sma: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += closes[i - j];
      }
      sma.push(sum / period);
    }
  }
  
  return {
    data: sma,
    lines: [{
      data: sma,
      color,
      width: 1.5
    }]
  };
};