import axios from 'axios'
// Api key
// remeber to add api key when working but delete before pushing to github
const ALPHA_VANTAGE_API_KEY = '';
const BASE_URL = 'https://www.alphavantage.co/query';
// Function to get stock data from API
export async function getStockData(symbol) {

  try{
    console.log("'Fetching data from Alpha Vantage for symbol:", symbol);
   // get request to API for time data from stock symbol
    const response = await axios.get(BASE_URL, {
      params: {
        function: 'TIME_SERIES_DAILY',
        symbol: symbol,
        apikey: ALPHA_VANTAGE_API_KEY,
        outputsize: 'compact'
      }
    });
    console.log('Raw API response:', response.data);


    if (response.data['Error Message']) {
      throw new Error('Invalid stock symbol');
    }
    if (!response.data['Time Series (Daily)']) {
      throw new Error('No data available for this stock symbol');
    }
    // Process the data
    const timeSeriesData = response.data['Time Series (Daily)'];
    const dates = Object.keys(timeSeriesData).slice(0, 30).reverse();
    const prices = dates.map(date => parseFloat(timeSeriesData[date]['4. close']));

    if (prices.some(isNaN)) {
      throw new Error('Invalid price data received');
    }
    // Return the processed data
    console.log('Processed stock data:', { dates, prices });
    return {
      dates,
      prices
    };
  }
  // if it dont work
  catch(error){
    console.error('Error fetching stock data:', error);
    if (error.response?.status === 429) {
      throw new Error('API rate limit exceeded. Please try again in a minute.');
    }
    throw new Error(error.message || 'Failed to fetch stock data');
  }
  }
