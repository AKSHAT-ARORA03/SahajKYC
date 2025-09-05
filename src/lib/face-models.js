import * as faceapi from 'face-api.js';
import path from 'path';

let modelsLoaded = false;
const MODEL_PATH = '/models'; // Public folder path

export async function loadFaceModels() {
  if (modelsLoaded) return;

  try {
    console.log('🔄 Loading face-api.js models...');
    
    // Load all required models in parallel for better performance
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_PATH),
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_PATH),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_PATH),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_PATH),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_PATH),
      faceapi.nets.ageGenderNet.loadFromUri(MODEL_PATH),
    ]);
    
    modelsLoaded = true;
    console.log('✅ Face-api.js models loaded successfully');
  } catch (error) {
    console.error('❌ Failed to load face-api.js models:', error);
    throw new Error(`Face recognition models not available: ${error.message}`);
  }
}

export function areModelsLoaded() {
  return modelsLoaded;
}
