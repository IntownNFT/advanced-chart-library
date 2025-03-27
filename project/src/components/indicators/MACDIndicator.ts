import { CandleData } from '../../types/chartTypes';
import { IndicatorConfig, IndicatorResult } from './types';
import { calculateEMA } from './EMAIndicator';

export const calculateMACD = (data: CandleData[], config: IndicatorConfig): IndicatorResult => {
  const { color, params } = config;
  const fast = params?.fast || 12;
  const slow = params?.slow || 26;
  const signal = params?.signal || 9;
  
  const fastEMA = calculateEMA(data, { period: fast, color }).data as number[];
  const slowEMA = calculateEMA(data, { period: slow, color }).data as number[];
  
  const macdLine = fastEMA.map((fast, i) => {
    if (isNaN(fast) || isNaN(slowEMA[i])) return NaN;
    return fast - slowEMA[i];
  });
  
  // Calculate signal line (EMA of MACD)
  const signalLine: number[] = [];
  const signalMultiplier = 2 / (signal + 1);
  
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
      (macdLine[i] - signalLine[i-1]) * signalMultiplier + signalLine[i-1]
    );
  }
  
  // Calculate histogram
  const histogram = macdLine.map((macd, i) => {
    if (isNaN(macd) || isNaN(signalLine[i])) return NaN;
    return macd - signalLine[i];
  });
  
  return {
    data: { macd: macdLine, signal: signalLine, histogram },
    lines: [
      {
        data: macdLine,
        color,
        width: 1.5
      },
      {
        data: signalLine,
        color: '#FF9800',
        width: 1
      }
    ]
  };
};