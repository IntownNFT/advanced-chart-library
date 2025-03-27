import { CandleData } from '../../types/chartTypes';
import { IndicatorConfig, IndicatorResult } from './types';

export const calculateVolume = (data: CandleData[], config: IndicatorConfig): IndicatorResult => {
  const volumes = data.map(d => ({
    value: d.volume,
    isUp: d.close >= d.open
  }));
  
  return {
    data: volumes.map(v => v.value),
    lines: [{
      data: volumes.map(v => v.value),
      color: config.color,
      width: 1.5
    }]
  };
};