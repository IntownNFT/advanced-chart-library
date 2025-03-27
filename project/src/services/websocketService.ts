import { CandleData } from '../types/chartTypes';

interface WebSocketSubscription {
  code: string;
  type: 'series' | 'quote';
  bar_type?: string;
  bar_interval?: number;
  recent_bars?: boolean;
}

interface WebSocketMessage {
  api_key: string;
  subscriptions: WebSocketSubscription[];
}

interface SeriesResponse {
  code: string;
  bar_end: number;
  last_update?: number;
  bar_type: string;
  series: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
}

interface WebSocketKeyResponse {
  api_key: string;
  expiration: number;
  note: string;
}

class WebSocketService {
  private static instance: WebSocketService | null = null;
  private ws: WebSocket | null = null;
  private apiKey: string = '';
  private keyExpiration: number = 0;
  private subscriptions: Map<string, WebSocketSubscription> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: number = 12000; // 12 seconds minimum
  private isConnecting: boolean = false;
  private isConnected: boolean = false;
  private callbacks: Map<string, (data: CandleData) => void> = new Map();
  private keyRefreshTimeout: NodeJS.Timeout | null = null;
  private lastMessageTime: number = 0;
  private readonly RATE_LIMIT = 30; // messages per minute
  private readonly MIN_MESSAGE_INTERVAL = 2000; // minimum time between messages in ms

  private constructor(apiKey: string, expiration: number) {
    console.log('Creating new WebSocket service with API key:', apiKey ? 'Present' : 'Missing');
    this.apiKey = apiKey;
    this.keyExpiration = expiration;
    this.scheduleKeyRefresh();
  }

  public static getInstance(apiKey: string, expiration: number): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService(apiKey, expiration);
    }
    return WebSocketService.instance;
  }

  private scheduleKeyRefresh() {
    if (this.keyRefreshTimeout) {
      clearTimeout(this.keyRefreshTimeout);
    }

    const refreshTime = (this.keyExpiration - 3600) * 1000 - Date.now();
    
    if (refreshTime > 0) {
      console.log(`Scheduling key refresh in ${Math.round(refreshTime / 1000 / 60)} minutes`);
      this.keyRefreshTimeout = setTimeout(() => {
        console.log('Key refresh scheduled');
        this.handleKeyRefresh();
      }, refreshTime);
    } else {
      this.handleKeyRefresh();
    }
  }

  private async handleKeyRefresh() {
    try {
      console.log('Refreshing WebSocket API key...');
      const response = await fetch('https://insightsentry.p.rapidapi.com/v2/websocket-key', {
        headers: {
          'x-rapidapi-key': '649dad040emsh3401dda0732635dp17b5ebjsnc41a07bd8bd1',
          'x-rapidapi-host': 'insightsentry.p.rapidapi.com'
        }
      });
      
      const data: WebSocketKeyResponse = await response.json();
      console.log('Successfully refreshed WebSocket API key');
      
      this.updateApiKey(data.api_key, data.expiration);
    } catch (error) {
      console.error('Error refreshing WebSocket API key:', error);
      setTimeout(() => this.handleKeyRefresh(), 5 * 60 * 1000);
    }
  }

  updateApiKey(newApiKey: string, newExpiration: number) {
    if (this.apiKey === newApiKey) {
      console.log('WebSocket API key unchanged, skipping update');
      return;
    }
    
    console.log('WebSocket API key updated');
    this.apiKey = newApiKey;
    this.keyExpiration = newExpiration;
    this.isConnected = false;
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.scheduleKeyRefresh();
    this.connect();
  }

  private connect() {
    if (this.isConnecting || this.isConnected) return;
    this.isConnecting = true;

    console.log('Attempting to connect to WebSocket...');
    
    try {
      this.ws = new WebSocket('wss://realtime.insightsentry.com/live');
      
      this.ws.onopen = () => {
        console.log('WebSocket connection opened successfully');
        this.reconnectAttempts = 0;
        this.reconnectTimeout = 12000;
        this.isConnecting = false;
        this.isConnected = true;
        
        // Resubscribe to all active subscriptions
        this.sendSubscriptionMessage();
      };

      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
        this.isConnecting = false;
        this.isConnected = false;
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          this.reconnectTimeout *= 2;
          console.log(`Attempting to reconnect in ${this.reconnectTimeout}ms... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          setTimeout(() => this.connect(), this.reconnectTimeout);
        } else {
          console.error('Max reconnection attempts reached');
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
        this.isConnected = false;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);

          // Handle server heartbeat
          if (data.type === 'heartbeat') {
            console.log('Received server heartbeat:', data.timestamp);
            return;
          }

          // Handle error messages
          if (data.message) {
            console.error('Server error:', data.message);
            if (data.message === 'Invalid API key was provided') {
              this.handleKeyRefresh();
            }
            return;
          }

          // Handle series data
          if (data.series) {
            const callback = this.callbacks.get(data.code);
            if (callback) {
              // Process each candle in the series
              data.series.forEach((candle: { time: number; open: number; high: number; low: number; close: number; volume: number }) => {
                const candleData: CandleData = {
                  timestamp: candle.time * 1000,
                  open: candle.open,
                  high: candle.high,
                  low: candle.low,
                  close: candle.close,
                  volume: candle.volume
                };
                
                console.log('Processing candle:', candleData);
                callback(candleData);
              });
            }
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.isConnecting = false;
      this.isConnected = false;
    }
  }

  private async sendSubscriptionMessage() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not connected, attempting to connect...');
      this.connect();
      return;
    }

    // Check rate limit
    const now = Date.now();
    const timeSinceLastMessage = now - this.lastMessageTime;
    if (timeSinceLastMessage < this.MIN_MESSAGE_INTERVAL) {
      console.log('Rate limit: Waiting before sending subscription message');
      await new Promise(resolve => setTimeout(resolve, this.MIN_MESSAGE_INTERVAL - timeSinceLastMessage));
    }

    const message: WebSocketMessage = {
      api_key: this.apiKey,
      subscriptions: Array.from(this.subscriptions.values())
    };

    console.log('Sending subscription message:', message);
    this.ws.send(JSON.stringify(message));
    this.lastMessageTime = Date.now();
  }

  subscribe(symbol: string, interval: string, callback: (data: CandleData) => void) {
    // Clear all existing subscriptions and callbacks since we only want one at a time
    this.subscriptions.clear();
    this.callbacks.clear();

    // Format symbol code
    const formattedSymbol = symbol.includes(':') ? symbol : `NASDAQ:${symbol}`;
    
    // Parse interval to get bar type and interval
    const [barInterval, barType] = this.parseInterval(interval);
    
    const subscription: WebSocketSubscription = {
      code: formattedSymbol,
      type: 'series',
      bar_type: barType,
      bar_interval: barInterval,
      recent_bars: true
    };

    console.log('Subscribing to', formattedSymbol, 'with interval', interval);
    this.subscriptions.set(formattedSymbol, subscription);
    this.callbacks.set(formattedSymbol, callback);

    // Send updated subscription message
    this.sendSubscriptionMessage();
  }

  private parseInterval(interval: string): [number, string] {
    const value = parseInt(interval.slice(0, -1));
    const unit = interval.slice(-1);
    
    switch (unit) {
      case 'm':
        return [value, 'minute'];
      case 'h':
        return [value, 'hour'];
      case 'd':
        return [value, 'day'];
      case 'w':
        return [value, 'week'];
      default:
        return [1, 'day'];
    }
  }

  // Only disconnect when explicitly called or when the component unmounts
  disconnect() {
    if (this.ws) {
      console.log('Disconnecting WebSocket...');
      this.ws.close();
      this.ws = null;
      this.subscriptions.clear();
      this.callbacks.clear();
      this.reconnectAttempts = 0;
      this.reconnectTimeout = 12000;
      this.isConnected = false;
    }
    
    if (this.keyRefreshTimeout) {
      clearTimeout(this.keyRefreshTimeout);
      this.keyRefreshTimeout = null;
    }
  }
}

export default WebSocketService; 