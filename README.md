# RAG 智能文档问答系统

基于 Retrieval-Augmented Generation 技术构建的智能文档问答机器人。

## 🌟 功能特性

- 📄 支持多格式文档上传（TXT、Markdown、DOCX）
- 🔍 智能文档检索与精准问答
- 💬 流式响应输出，实时显示答案
- 🎨 现代化暗色主题 UI 设计
- ⚡ 指数退避重试机制，提升稳定性

## 🛠️ 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Vue 3 + Vite + Tailwind CSS |
| 后端 | Node.js + Express |
| 大模型 | 智谱 GLM-4 |
| 向量存储 | 本地向量数据库 |
| 安全 | DOMPurify XSS 防护 |

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装与运行

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install

# 启动后端服务
cd ../backend
npm start

# 启动前端开发服务器（新终端）
cd frontend
npm run dev
```

### API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/chat` | POST | 非流式问答 |
| `/api/chat/stream` | POST | SSE 流式问答 |
| `/api/documents` | GET | 获取文档列表 |
| `/api/documents/upload` | POST | 上传文档 |
| `/api/documents/:name` | DELETE | 删除文档 |

## 📁 项目结构

```
rag-bot/
├── backend/
│   ├── config/          # 配置文件
│   ├── services/        # 业务服务层
│   │   ├── llm.service.js      # LLM 服务
│   │   ├── retrieval.service.js # 检索服务
│   │   └── document.service.js  # 文档服务
│   ├── utils/           # 工具函数
│   │   ├── http-utils.js       # HTTP 请求工具
│   │   └── retry-utils.js      # 重试工具
│   ├── routes/          # API 路由
│   └── server.js        # 入口文件
├── frontend/
│   ├── src/
│   │   ├── components/  # Vue 组件
│   │   ├── views/       # 页面视图
│   │   ├── api/         # API 请求封装
│   │   └── assets/      # 静态资源
│   └── index.html
└── .env                 # 环境变量
```

## 📝 核心功能实现

### 检索增强生成流程

1. **文档上传** → 文档解析 → 文本分割 → 向量化存储
2. **用户提问** → 关键词提取 → 向量检索 → 上下文构建
3. **LLM 调用** → 流式响应 → 答案展示

### 错误处理机制

- ✅ 指数退避重试（网络错误、超时、限流）
- ✅ 状态码判断（4xx 不重试，5xx 重试）
- ✅ 请求超时处理

## 📄 版权

© 2026. 本项目仅供展示用途。