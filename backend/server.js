const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const routes = require('./routes');
const documentService = require('./services/document.service');
const vectorStore = require('./services/vector-store.service');

const app = express();

// 中间件
app.use(express.json());
app.use(cors());
// 静态文件服务 - 支持前端 public 目录和根目录
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));
app.use(express.static(path.join(__dirname, '..')));

// 请求日志
app.use((req, res, next) => {
  console.log(`收到请求: ${req.method} ${req.path}`);
  next();
});

// 路由（限流在 routes 内部配置）
app.use('/api', routes);

// 记录启动时间
const startTime = new Date();

// API 状态缓存（每60秒检查一次）
let apiStatusCache = { status: 'unknown', lastCheck: 0 };
const API_CHECK_INTERVAL = 60 * 1000; // 60秒

async function checkApiStatus() {
  const now = Date.now();
  
  // 如果缓存未过期，直接返回
  if (now - apiStatusCache.lastCheck < API_CHECK_INTERVAL) {
    return apiStatusCache.status;
  }
  
  // 检查 API 连通性
  try {
    const https = require('https');
    await new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'open.bigmodel.cn',
          port: 443,
          path: '/api/paas/v4/models',
          method: 'GET',
          headers: {
            Authorization: `Bearer ${config.zhipuApiKey}`,
          },
        },
        (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`API返回状态码: ${res.statusCode}`));
          }
        }
      );
      req.on('error', (err) => reject(err));
      req.setTimeout(3000, () => {
        req.destroy();
        reject(new Error('API连接超时'));
      });
      req.end();
    });
    
    apiStatusCache = { status: 'connected', lastCheck: now };
    return 'connected';
  } catch (e) {
    apiStatusCache = { status: 'failed', lastCheck: now };
    return 'failed';
  }
}

// 健康检查（详细信息）
app.get('/health', async (req, res) => {
  try {
    // 使用缓存的 API 状态
    const apiStatus = await checkApiStatus();

    res.json({
      success: true,
      status: 'running',
      uptime: Math.floor((Date.now() - startTime.getTime()) / 1000), // 运行时长（秒）
      startedAt: startTime.toISOString(),
      documentCount: vectorStore.size(),
      apiStatus,
      version: '2.0.0',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '健康检查失败',
    });
  }
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('未捕获的错误:', err);
  res.status(500).json({ success: false, error: '服务器内部错误' });
});

// 启动服务器
async function startServer() {
  try {
    console.log('开始启动服务器...');

    // 初始化知识库
    await documentService.initializeKnowledgeBase();

    app.listen(config.port, () => {
      console.log('========================================');
      console.log(`服务器运行在 http://localhost:${config.port}`);
      console.log('========================================');
      console.log('测试命令:');
      console.log(`curl -X POST http://localhost:${config.port}/api/chat -H "Content-Type: application/json" -d '{"question":"测试一下"}'`);
      console.log(`curl -X POST http://localhost:${config.port}/api/chat/stream -H "Content-Type: application/json" -d '{"question":"测试SSE"}'`);
      console.log('========================================');
    });
  } catch (error) {
    console.error('启动服务器失败:', error.message);
    process.exit(1);
  }
}

console.log('启动应用...');
startServer();
