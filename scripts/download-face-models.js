const fs = require('fs');
const https = require('https');
const path = require('path');

const models = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
  'face_expression_model-weights_manifest.json',
  'face_expression_model-shard1',
  'age_gender_model-weights_manifest.json',
  'age_gender_model-shard1'
];

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
const modelsDir = path.join(process.cwd(), 'public/models');

// Create models directory if it doesn't exist
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
  console.log('📁 Created models directory');
}

function downloadModel(modelName) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(modelsDir, modelName);
    
    // Check if file already exists
    if (fs.existsSync(filePath)) {
      console.log(`✓ ${modelName} already exists, skipping`);
      resolve();
      return;
    }
    
    const file = fs.createWriteStream(filePath);
    
    console.log(`📥 Downloading ${modelName}...`);
    
    https.get(`${baseUrl}/${modelName}`, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          const stats = fs.statSync(filePath);
          const fileSize = (stats.size / 1024).toFixed(2);
          console.log(`✅ Downloaded ${modelName} (${fileSize} KB)`);
          resolve();
        });
      } else {
        fs.unlink(filePath, () => {}); // Delete partial file
        reject(new Error(`Failed to download ${modelName}: HTTP ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(filePath, () => {}); // Delete partial file
      reject(err);
    });
  });
}

async function downloadAllModels() {
  console.log('🚀 Starting face-api.js models download...');
  console.log(`📂 Download directory: ${modelsDir}`);
  
  try {
    // Download models with retry logic
    for (const model of models) {
      let retries = 3;
      while (retries > 0) {
        try {
          await downloadModel(model);
          break;
        } catch (error) {
          retries--;
          if (retries === 0) {
            console.error(`❌ Failed to download ${model} after 3 attempts:`, error.message);
            throw error;
          }
          console.log(`⚠️ Retrying ${model} (${3 - retries}/3)...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }
    }
    
    console.log('🎉 All face-api.js models downloaded successfully!');
    
    // Verify all models exist and show total size
    let totalSize = 0;
    let missingModels = [];
    
    models.forEach(model => {
      const filePath = path.join(modelsDir, model);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      } else {
        missingModels.push(model);
      }
    });
    
    if (missingModels.length > 0) {
      console.warn('⚠️ Missing models:', missingModels);
    } else {
      console.log(`📊 Total models size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
      console.log('✅ All models verified and ready for use!');
    }
    
  } catch (error) {
    console.error('❌ Model download failed:', error);
    process.exit(1);
  }
}

// Run if this script is executed directly
if (require.main === module) {
  downloadAllModels();
}

module.exports = { downloadAllModels };
