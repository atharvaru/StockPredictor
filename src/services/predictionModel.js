import * as tf from '@tensorflow/tfjs';

function normalize(data) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  return {
    // Normalize data to range 0-1
   normalizedData: data.map(x => (x - min) / (max - min)),
    min,
    max
  };

  function denormalize(data, min, max) {
    // undo normalization
    return data.map(x => x * (max - min) + min);
  }

  function prepareData(prices, windowSize = 30) {
    // Prepare the data for training
    const X = [];
    const Y = [];
    // Create input/output pairs
    for (let i = 0; i < prices.length - windowSize; i++) {
      // windowsize previous days
      X.push(prices.slice(i, i + windowSize));
      // next day's price
      Y.push(prices[i + windowSize]);
    }
    return {
      // Convert to tensor
      X: tf.tensor2d(X),
      Y: tf.tensor1d(Y)
    };
  }
}

  async function createModel(inputShape) {
    const model = tf.sequential();
    
    // First LSTM layer with return sequences
    model.add(tf.layers.lstm({
      units: 100,
      returnSequences: true,
      inputShape: [inputShape, 1]
    }));
    
    // Add dropout to prevent overfitting
    model.add(tf.layers.dropout({ rate: 0.2 }));
    
    // Second layer
    model.add(tf.layers.lstm({
      units: 50,
      returnSequences: false
    }));
    
    model.add(tf.layers.dropout({ rate: 0.2 }));
    
    // Dense hidden layer
    model.add(tf.layers.dense({
      units: 32,
      activation: 'relu'
    }));
    
    // Output layer
    model.add(tf.layers.dense({
      units: 1
    }));
    
    // Compile model with improved learning rate
    model.compile({
      optimizer: tf.train.adam(0.0005),
      loss: 'meanSquaredError',
      metrics: ['mse']
    });
  
    return model;
  }

  export async function trainAndPredict(historicalPrices) {
    try {
      console.log('Starting prediction with historical prices:', historicalPrices);
      
      if (!historicalPrices || historicalPrices.length < 11) {
        throw new Error('Insufficient historical data for prediction (need at least 11 days)');
      }
  
      const windowSize = 14; 
      const { normalizedData, min, max } = normalize(historicalPrices);
      console.log('Normalized data:', normalizedData);
  
      const { X, y } = prepareData(normalizedData, windowSize);
      console.log('Prepared data shapes:', {
        // x is 2D tensor with shape [samples, timesteps]
        X: `${X.length} samples, ${X[0].length} timesteps, 1 feature`,
        // y is 1D tensor with shape [samples]
        y: `${y.length} samples`
      });
      // Create tensors
      const xTensor = tf.tensor3d(X);
      const yTensor = tf.tensor2d(y);
  
      console.log('Created tensors:', {
        xShape: xTensor.shape,
        yShape: yTensor.shape
      });
  
      const model = await createModel(windowSize);
      console.log('Model created, starting training...');
  
      // Train with validation split and early stopping
      const history = await model.fit(xTensor, yTensor, {
        // 150 iterations
        epochs: 150,
        // 32 samples per batch
        batchSize: 32,
        shuffle: true,
        validationSplit: 0.1,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            console.log(`Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}`);
          }
        }
      });
  
      console.log('Training completed:', history);
  
      // Prepare last window for prediction
      const lastWindow = normalizedData.slice(-windowSize).map(price => [price]);
      console.log('Last window for prediction:', lastWindow);
      // Predict next day's price
      const prediction = model.predict(tf.tensor3d([lastWindow]));
      const predictedNormalized = await prediction.data();
      const predictedPrice = denormalize(predictedNormalized[0], min, max);
  
      console.log('Prediction results:', {
        normalizedPrediction: predictedNormalized[0],
        finalPrediction: predictedPrice
      });
  
      // Calculate confidence based on validation loss
      const finalLoss = history.history.loss[history.history.loss.length - 1];
      const confidence = Math.max(0, Math.min(1, 1 - finalLoss));
  
      // Clean up tensors
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
 