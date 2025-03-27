import React from 'react'
import ReactDOM from 'react-dom/client'
import Chart from './components/Chart'
import { ChartProvider } from './context/ChartContext'
import './index.css'

// Get URL parameters
const params = new URLSearchParams(window.location.search)
const symbol = params.get('symbol') || 'NASDAQ:AAPL'
const timeframe = params.get('timeframe') || '1h'
const width = parseInt(params.get('width') || '800')
const height = parseInt(params.get('height') || '600')

const container = document.getElementById('chart-container')
if (container) {
  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <ChartProvider>
        <Chart 
          symbol={symbol} 
          onSymbolChange={() => {}} 
          width={width} 
          height={height} 
        />
      </ChartProvider>
    </React.StrictMode>
  )
} 