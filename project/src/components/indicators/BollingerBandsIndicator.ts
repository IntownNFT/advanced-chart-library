import { CandleData } from '../../types/chartTypes';
import { IndicatorConfig, IndicatorResult } from './types';
import { calculateSMA } from './SMAIndicator';

export const calculateBollingerBands = (data: CandleData[], config: IndicatorConfig): IndicatorResult => {
  const { period = 20, color, params } = config;
  const stdDev = params?.stdDev || 2;
  const closes = data.map(d => d.close);
  
  const sma = calculateSMA(data, { period, color }).data as number[];
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += Math.pow(closes[i - j] - sma[i], 2);
      }
      const sd = Math.sqrt(sum / period);
      
      upper.push(sma[i] + stdDev * sd);
      lower.push(sma[i] - stdDev * sd);
    }
  }
  
  return {
    data: { upper, middle: sma, lower },
    lines: [
      {
        data: sma,
        color,
        width: 1.5
      },
      {
        data: upper,
        color,
        style: 'dashed',
        width: 1
      },
      {
        data: lower,
        color,
        style: 'dashed',
        width: 1
      }
    ],
    bands: {
      upper,
      middle: sma,
      lower,
      color,
      fillColor: `${color}15`
    }
  };
};