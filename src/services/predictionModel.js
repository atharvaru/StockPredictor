import * as tf from '@tensorflow/tfjs';

function normalize(data) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  return {
    normalizedData: data.map(x => (x - min) / (max - min)),
    min,
    max
  };
}

function denormalize(normalizedValue, min, max) {
  return normalizedValue * (max - min) + min;
}

function prepareData(prices, windowSize = 5) {
  const X = [];
  const y = [];

  for (let i = 0; i < prices.length - windowSize; i++) {
    const sequence = prices.slice(i, i + windowSize).map(price => [price]);
    X.push(sequence);
    y.push(prices[i + windowSize]);
  }

  return { X, y };
}

async function createModel(inputShape) {
  const model = tf.sequential();
  
  model.add(tf.layers.lstm({
    units: 50,
    inputShape: [inputShape, 1],
    returnSequences: false
  }));
  
  model.add(tf.layers.dense({ units: 1 }));
  
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'meanSquaredError'
  });

  return model;
}

export async function trainAndPredict(historicalPrices) {
  try {
    console.log('Starting prediction with historical prices:', historicalPrices);
    
    if (!historicalPrices || historicalPrices.length < 6) {
      throw new Error('Insufficient historical data for prediction');
    }

    const windowSize = 5;
    const { normalizedData, min, max } = normalize(historicalPrices);
    console.log('Normalized data:', normalizedData);

    const { X, y } = prepareData(normalizedData, windowSize);
    console.log('Prepared data shapes:', {
      X: `${X.length} samples, ${X[0].length} timesteps, ${X[0][0].length} features`,
      y: `${y.length} samples`
    });

    const xTensor = tf.tensor3d(X);
    const yTensor = tf.tensor2d(y, [y.length, 1]);

    console.log('Created tensors:', {
      xShape: xTensor.shape,
      yShape: yTensor.shape
    });

    const model = await createModel(windowSize);
    console.log('Model created, starting training...');

    const history = await model.fit(xTensor, yTensor, {
      epochs: 100,
      batchSize: 32,
      shuffle: true,
      verbose: 1
    });

    console.log('Training completed:', history);

    const lastWindow = normalizedData.slice(-windowSize).map(price => [price]);
    console.log('Last window for prediction:', lastWindow);

    const prediction = model.predict(tf.tensor3d([lastWindow]));
    const predictedNormalized = await prediction.data();
    const predictedPrice = denormalize(predictedNormalized[0], min, max);

    console.log('Prediction results:', {
      normalizedPrediction: predictedNormalized[0],
      finalPrediction: predictedPrice
    });

    const confidence = "N/A";

    tf.dispose([xTensor, yTensor, model, prediction]);

    return {
      predictedPrice,
      confidence
    };
  } catch (error) {
    console.error('Error in trainAndPredict:', error);
    throw new Error('Failed to generate prediction: ' + error.message);
  }
}