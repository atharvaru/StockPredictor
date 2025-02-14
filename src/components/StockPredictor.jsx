import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { getStockData } from '../services/stockApi';
import { trainAndPredict } from '../services/predictionModel';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function StockPredictor() {
  const [stockSymbol, setStockSymbol] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Historical Prices',
        data: [],
        borderColor: '#4F46E5',
        tension: 0.1
      },
      {
        label: 'Predicted Price',
        data: [],
        borderColor: '#EF4444',
        tension: 0.1,
        borderDash: [5, 5]
      }
    ]
  });

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Stock Price History and Prediction'
      }
    }
  };

  const predictStock = async () => {
    if (!stockSymbol) {
      setError('Please enter a stock symbol');
      return;
    }

    setLoading(true);
    setError('');
    setPrediction(null);

    try {
      console.log('Fetching stock data for:', stockSymbol);
      const stockData = await getStockData(stockSymbol);
      
      if (!stockData || !stockData.prices || stockData.prices.length === 0) {
        throw new Error('No stock data received');
      }
      
      console.log('Received stock data:', stockData);
      const currentPrice = stockData.prices[stockData.prices.length - 1];

      console.log('Training model with prices:', stockData.prices);
      const { predictedPrice, confidence } = await trainAndPredict(stockData.prices);
      console.log('Prediction result:', { predictedPrice, confidence });

      setPrediction({
        currentPrice,
        predictedPrice,
        confidence
      });
      
      setChartData({
        labels: stockData.dates,
        datasets: [
          {
            label: 'Historical Prices',
            data: stockData.prices,
            borderColor: '#4F46E5',
            tension: 0.1
          },
          {
            label: 'Predicted Price',
            data: Array(stockData.prices.length - 1).fill(null).concat([currentPrice, predictedPrice]),
            borderColor: '#EF4444',
            tension: 0.1,
            borderDash: [5, 5]
          }
        ]
      });

    } catch (err) {
      console.error('Error in predictStock:', err);
      setError(err.message || 'Failed to get prediction. Please try again.');
      setPrediction(null);
      setChartData(prev => ({
        ...prev,
        datasets: prev.datasets.map(dataset => ({ ...dataset, data: [] }))
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      predictStock();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">AI Stock Predictor</h1>
      
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="flex gap-4 mb-6">
          <input
            value={stockSymbol}
            onChange={(e) => setStockSymbol(e.target.value)}
            onKeyPress={handleKeyPress}
            type="text"
            placeholder="Enter stock symbol (e.g., AAPL)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={predictStock}
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Predicting...' : 'Predict'}
          </button>
        </div>

        {error && (
          <div className="text-red-600 mb-4 p-4 bg-red-50 rounded-md">{error}</div>
        )}

        {prediction && (
          <div className="mb-8">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500">Current Price</h3>
                <p className="text-2xl font-semibold text-gray-900">
                  ${prediction.currentPrice.toFixed(2)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500">Predicted Price</h3>
                <p className="text-2xl font-semibold text-gray-900">
                  ${prediction.predictedPrice.toFixed(2)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500">Confidence</h3>
                <p className="text-2xl font-semibold text-gray-900">
                  {typeof prediction.confidence === 'number' 
                    ? `${(prediction.confidence * 100).toFixed(1)}%`
                    : prediction.confidence}
                </p>
              </div>
            </div>

            <div className="h-64">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        )}
      </div>

      <div className="text-center text-gray-600 text-sm">
        <p>Using real market data from Alpha Vantage API</p>
        <p>Predictions are made using a TensorFlow.js LSTM neural network model</p>
      </div>
    </div>
  );
}

export default StockPredictor;