const dotenv = require('dotenv');

dotenv.config();

const config = {
  port: process.env.PORT || 3000,
  
  // 智谱 AI
  zhipuApiKey: process.env.ZHIPU_API_KEY,
  
  // RAG 配置
  chunkSize: parseInt(process.env.CHUNK_SIZE) || 800,
  chunkOverlap: parseInt(process.env.CHUNK_OVERLAP) || 200,
  similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.35,
  topK: parseInt(process.env.TOP_K) || 8,
};

// 验证必需的配置
const requiredEnvVars = ['ZHIPU_API_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  throw new Error(`缺少必需的环境变量: ${missingVars.join(', ')}`);
}

// 验证配置值范围
if (config.similarityThreshold < 0 || config.similarityThreshold > 1) {
  console.warn('警告: SIMILARITY_THRESHOLD 应该在 0-1 之间，使用默认值 0.35');
  config.similarityThreshold = 0.35;
}

if (config.topK < 1 || config.topK > 20) {
  console.warn('警告: TOP_K 应该在 1-20 之间，使用默认值 8');
  config.topK = 8;
}

module.exports = config;
