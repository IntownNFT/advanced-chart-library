import axios from 'axios';
import { format } from 'date-fns';
import { CandleData } from '../types/chartTypes';
import WebSocketService from './websocketService';

interface SymbolInfo {
  code: string;
  name: string;
  exchange: string;
  type: string;
}

interface WebSocketKeyResponse {
  api_key: string;
  expiration: number;
  note: string;
}

// REST API key for getting WebSocket key
const REST_API_KEY = '649dad040emsh3401dda0732635dp17b5ebjsnc41a07bd8bd1';

// Initialize WebSocket service as null - will be created when needed
let wsService: WebSocketService | null = null;
let wsKeyPromise: Promise<WebSocketKeyResponse> | null = null;

/**
 * Get WebSocket API key from the server
 */
export const getWebSocketKey = async (): Promise<WebSocketKeyResponse> => {
  // If there's already a pending request, return that promise
  if (wsKeyPromise) {
    return wsKeyPromise;
  }

  // Create new promise for the request
  wsKeyPromise = (async () => {
    try {
      console.log('Requesting WebSocket API key...');
      const response = await axios.get('https://insightsentry.p.rapidapi.com/v2/websocket-key', {
        headers: {
          'x-rapidapi-key': REST_API_KEY,
          'x-rapidapi-host': 'insightsentry.p.rapidapi.com'
        }
      });
      console.log('Successfully obtained WebSocket API key');
      return response.data;
    } catch (error) {
      console.error('Error getting WebSocket key:', error);
      throw new Error('Failed to get WebSocket API key');
    } finally {
      // Clear the promise after it's resolved or rejected
      wsKeyPromise = null;
    }
  })();

  return wsKeyPromise;
};

/**
 * Search for symbols
 */
export const searchSymbols = async (query: string): Promise<SymbolInfo[]> => {
  try {
    const response = await axios.get('https://insightsentry.p.rapidapi.com/v2/symbols/search', {
      params: { query },
      headers: {
        'x-rapidapi-key': '649dad040emsh3401dda0732635dp17b5ebjsnc41a07bd8bd1',
        'x-rapidapi-host': 'insightsentry.p.rapidapi.com'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error searching symbols:', error);
    return [];
  }
};

/**
 * Fetch historical OHLC data from InsightSentry API
 */
export const fetchHistoricalData = async (
  symbol: string,
  interval: string = 'daily',
  outputSize: string = 'compact'
): Promise<CandleData[]> => {
  try {
    // Format symbol code - ensure it's in the correct format (e.g., "NASDAQ:AAPL")
    const formattedSymbol = symbol.includes(':') ? symbol : `NASDAQ:${symbol}`;
    
    const response = await axios.get(`https://insightsentry.p.rapidapi.com/v2/symbols/${formattedSymbol}/history`, {
      params: {
        bar_interval: '1',
        bar_type: mapTimeframeToBarType(interval)
      },
      headers: {
        'x-rapidapi-key': '649dad040emsh3401dda0732635dp17b5ebjsnc41a07bd8bd1',
        'x-rapidapi-host': 'insightsentry.p.rapidapi.com'
      }
    });

    if (!response.data || !Array.isArray(response.data.series)) {
      console.warn('No data available for this symbol. Using demo data instead.');
      return getDemoData(symbol, interval);
    }
    
    // Convert InsightSentry data to our CandleData format
    const candles: CandleData[] = response.data.series.map((candle: any) => ({
      timestamp: candle.time * 1000, // Convert to milliseconds
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
      volume: parseInt(candle.volume, 10)
    }));

    // Sort by timestamp (oldest first)
    return candles.sort((a, b) => a.timestamp - b.timestamp);
  } catch (error: any) {
    console.error('Error fetching historical data:', error.message);
    return getDemoData(symbol, interval);
  }
};

/**
 * Map internal timeframe format to InsightSentry bar type
 */
const mapTimeframeToBarType = (timeframe: string): string => {
  switch (timeframe) {
    case '1m': return 'minute';
    case '5m': return 'minute';
    case '15m': return 'minute';
    case '30m': return 'minute';
    case '1h': return 'hour';
    case '4h': return 'hour';
    case '1d': return 'day';
    case '1w': return 'week';
    default: return 'day';
  }
};

/**
 * Get demo data when API fails or for testing
 */
const getDemoData = (symbol: string, interval: string): CandleData[] => {
  // Generate demo data based on the symbol name to make it somewhat unique
  const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const volatility = (seed % 10) + 5; // 5-15 range
  const trend = (seed % 3) - 1; // -1, 0, or 1 (down, sideways, up)
  
  const count = 100;
  const data: CandleData[] = [];
  
  // Base price derived from symbol
  let lastClose = 100 + (seed % 400);
  
  // Generate dates based on the interval
  const now = new Date();
  let intervalMs = 24 * 60 * 60 * 1000; // Default to daily
  
  switch (interval) {
    case '1m': intervalMs = 60 * 1000; break;
    case '5m': intervalMs = 5 * 60 * 1000; break;
    case '15m': intervalMs = 15 * 60 * 1000; break;
    case '1h': intervalMs = 60 * 60 * 1000; break;
    case '4h': intervalMs = 4 * 60 * 60 * 1000; break;
    case '1d': intervalMs = 24 * 60 * 60 * 1000; break;
    case '1w': intervalMs = 7 * 24 * 60 * 60 * 1000; break;
  }
  
  for (let i = 0; i < count; i++) {
    const timestamp = now.getTime() - (count - i) * intervalMs;
    
    // Create somewhat realistic price movement
    const trendFactor = trend * 0.2;
    const randomFactor = (Math.random() - 0.5) * 2;
    const change = (trendFactor + randomFactor) * volatility;
    
    const open = lastClose;
    const close = Math.max(1, open + change);
    const high = Math.max(open, close) + Math.random() * volatility;
    const low = Math.min(open, close) - Math.random() * volatility;
    const volume = Math.round((1000 + Math.random() * 9000) * (1 + seed % 10));
    
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

/**
 * Format a timestamp for display
 */
export const formatTimestamp = (timestamp: number, timeframe: string): string => {
  const date = new Date(timestamp);
  
  switch (timeframe) {
    case '1m':
      return format(date, 'HH:mm');
    case '5m':
      return format(date, 'HH:mm');
    case '15m':
    case '30m':
      return format(date, 'HH:mm');
    case '1h':
      return format(date, 'dd MMM');
    case '4h':
      return format(date, 'dd MMM');
    case '1d':
      return format(date, 'MMM yy');
    case '1w':
      return format(date, 'MMM yyyy');
    default:
      return format(date, 'dd MMM yyyy');
  }
};

/**
 * Subscribe to realtime data
 */
export async function subscribeToRealtimeData(
  symbol: string,
  timeframe: string,
  onData: (data: CandleData) => void
): Promise<() => void> {
  try {
    console.log('Setting up realtime subscription...');
    
    // Get WebSocket key if we don't have a service instance
    if (!wsService) {
      const wsKeyResponse = await getWebSocketKey();
      wsService = WebSocketService.getInstance(wsKeyResponse.api_key, wsKeyResponse.expiration);
    }
    
    // Convert timeframe to interval format (e.g., "1m", "5m", "1h")
    const interval = timeframe.replace(/\s+/g, '');
    
    // Subscribe to the symbol
    wsService.subscribe(symbol, interval, (newCandle: CandleData) => {
      console.log('Received new candle:', newCandle);
      onData(newCandle);
    });

    // Return empty cleanup function since we don't need to unsubscribe
    return () => {
      console.log('Cleaning up chart component...');
    };
  } catch (error) {
    console.error('Error setting up WebSocket subscription:', error);
    throw error;
  }
}