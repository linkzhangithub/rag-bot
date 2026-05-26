/**
 * EdgeOne Serverless 入口文件
 * 支持前后端一体部署
 */

const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 创建应用
const app = express();
const PORT = process.env.PORT || 3000;

// 静态文件服务（前端）
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// 解析JSON请求体
app.use(express.json({ limit: '50mb' }));

// 后端API路由
app.use('/api', require('./backend/routes'));

// 前端路由重定向（SPA）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist', 'index.html'));
});

// 启动服务
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;