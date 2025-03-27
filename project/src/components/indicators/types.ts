import { CandleData } from '../../types/chartTypes';

export interface IndicatorConfig {
  period?: number;
  color: string;
  params?: Record<string, any>;
}

export interface IndicatorResult {
  data: number[] | { [key: string]: number[] };
  lines: {
    data: number[];
    color: string;
    style?: 'solid' | 'dashed';
    width?: number;
  }[];
  bands?: {
    upper: number[];
    middle: number[];
    lower: number[];
    color: string;
    fillColor?: string;
  };
}