# Advanced HTML5 Charting Library

A high-performance charting library built with HTML5 Canvas, React, and TypeScript. Similar to TradingView, this library provides professional-grade charting capabilities with a focus on performance and extensibility.

## Features

- 📊 HTML5 Canvas-based rendering for maximum performance
- 📈 Multiple chart types (candlestick, area)
- 📉 Technical indicators (SMA, EMA, RSI, MACD, etc.)
- 🔍 Interactive zooming and panning
- ⚡ Real-time data support
- 🎨 Drawing tools (lines, measurements, Fibonacci)
- 🎯 Customizable timeframes
- 📱 Mobile-friendly with touch support
- 🔌 Easy embedding in any website

## Quick Start

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Embedding the Chart

You can embed the chart in any website using an iframe. Simply point to your deployed chart application:

```html
<iframe 
  src="https://your-domain.com?symbol=NASDAQ:AAPL&timeframe=1h"
  width="800" 
  height="600" 
  style="border: none; border-radius: 8px; background: #141414;"
  loading="lazy"
></iframe>
```

### URL Parameters

- `symbol` - Trading symbol (e.g., NASDAQ:AAPL, BINANCE:BTCUSDT)
- `timeframe` - Chart timeframe (1m, 5m, 15m, 1h, 4h, 1d)

The chart will automatically adjust to the iframe's dimensions.

## Creating New Tools

The chart library is designed to be easily extensible. Here's how to create a new tool:

1. Create a new tool component in `src/components/tools`:

```tsx
// src/components/tools/NewTool.tsx
import React from 'react';
import { YourIcon } from 'lucide-react';
import { ToolButtonProps } from './types';

const NewTool: React.FC<ToolButtonProps> = ({ isSelected, onClick }) => (
  <button
    onClick={onClick}
    className={`p-2 rounded-md transition-colors ${
      isSelected ? 'text-blue-400' : 'text-gray-400 hover:bg-gray-800'
    }`}
    title="Your Tool Name"
  >
    <YourIcon size={16} strokeWidth={1.5} />
  </button>
);

export default NewTool;
```

2. Add the tool type to `ChartTool` in `src/components/ChartToolbar.tsx`:

```typescript
export type ChartTool = 
  | 'pointer' 
  | 'crosshair'
  | 'your-new-tool';
```

3. Import and add the tool to the toolbar in `ChartToolbar.tsx`:

```tsx
import NewTool from './tools/NewTool';

// Add to the toolbar JSX
<NewTool
  isSelected={selectedTool === 'your-new-tool'}
  onClick={() => onSelectTool('your-new-tool')}
/>
```

## Creating New Indicators

To add a new technical indicator:

1. Create a new indicator file in `src/components/indicators`:

```typescript
// src/components/indicators/NewIndicator.ts
import { CandleData } from '../../types/chartTypes';
import { IndicatorConfig, IndicatorResult } from './types';

export const calculateNewIndicator = (
  data: CandleData[], 
  config: IndicatorConfig
): IndicatorResult => {
  const { period = 14, color } = config;
  const result: number[] = [];
  
  // Your indicator calculation logic here
  
  return {
    data: result,
    lines: [{
      data: result,
      color,
      width: 1.5
    }]
  };
};
```

2. Export the indicator from `src/components/indicators/index.ts`:

```typescript
export * from './NewIndicator';
```

3. Add the indicator type to `INDICATORS` array in `src/components/ChartControls.tsx`:

```typescript
const INDICATORS = [
  // ... existing indicators
  {
    type: 'new-indicator',
    name: 'NEW',
    period: 14,
    color: '#2196F3',
    overlay: true // or false for separate panel
  }
];
```

## Project Structure

```
src/
├── components/        # React components
│   ├── tools/        # Drawing tools
│   └── indicators/   # Technical indicators
├── context/          # React context
├── hooks/            # Custom hooks
├── services/         # Data services
├── types/            # TypeScript types
└── utils/            # Utility functions
```

## Performance Considerations

- Canvas-based rendering for optimal performance
- Viewport-based rendering to handle large datasets
- Efficient data processing algorithms
- WebSocket support for real-time data
- Touch optimization for mobile devices

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.