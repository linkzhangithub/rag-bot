# RAG 智能文档问答系统

基于检索增强生成（RAG）技术构建的智能问答机器人，支持多格式文档检索与精准回答。

## 🎯 核心特性

| 功能 | 说明 |
|------|------|
| 多格式支持 | TXT、Markdown、PDF、DOCX |
| 智能检索 | 混合检索：向量相似度 + 关键词匹配 + 人名加权 |
| 流式响应 | SSE 实时流式输出，渐进式显示答案 |
| 文档预览 | 点击侧边栏文档可直接预览内容 |
| 稳定可靠 | 指数退避重试、自动降级处理 |

## 🛠️ 技术栈

```
前端：Vue 3 + Vite + Axios
后端：Node.js + Express
AI：智谱 GLM-4-Flash（对话 + Embedding）
存储：本地 JSON（向量） / docs 目录（文档）
部署：腾讯云 EdgeOne（静态托管 + 云函数）
```

## 🏗️ 系统架构

```
用户交互层
    │
    ├── ChatPanel（对话面板）
    │   └── SSE 流式对话，实时显示 AI 回答
    │
    ├── DocumentList（文档列表）
    │   ├── 预置文档（docs/ 目录，不可删除）
    │   └── 上传文档（本地环境可管理）
    │
    └── DocumentPreview（文档预览）
        └── PDF/TXT/MD/DOCX 内容展示

─────────────────────────────────────────────────

API 网关层
    │
    ├── POST /api/chat/stream（对话接口）
    │   ├── 检索相关文档
    │   ├── 构建 Prompt
    │   └── 流式返回 LLM 回答
    │
    ├── GET/POST/DELETE /api/documents（文档管理）
    │   ├── 获取文档列表
    │   ├── 上传新文档
    │   └── 删除上传的文档
    │
    └── GET /api/preview/:name（文档预览）
        └── 返回文档内容供预览

─────────────────────────────────────────────────

服务层
    │
    ├── RetrievalService（检索服务）
    │   ├── expandQuery() - 查询扩展与分词
    │   ├── extractChineseNames() - 人名识别
    │   ├── calculateKeywordScore() - 关键词匹配
    │   └── retrieve() - 混合检索 + Rerank
    │
    ├── ChatService（对话服务）
    │   ├── streamChat() - SSE 流式对话
    │   └── buildPrompt() - Prompt 构建
    │
    └── VectorStoreService（向量存储）
        ├── loadDocuments() - 加载文档
        ├── embedAndStore() - 向量化存储
        └── getAll() - 获取全部向量

─────────────────────────────────────────────────

外部服务
    │
    ├── 智谱 AI
    │   ├── GLM-4-Flash（对话生成）
    │   └── Embedding-3（文本向量化）
    │
    └── 文档解析
        ├── pdf-parse（PDF 解析）
        └── mammoth（DOCX 解析）
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 本地开发

```bash
# 1. 安装依赖
npm install
cd frontend && npm install && cd ..

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填入 ZHIPU_API_KEY

# 3. 启动后端（终端 1）
npm start

# 4. 启动前端（终端 2）
cd frontend && npm run dev

# 5. 访问 http://localhost:5173
```

### 在线演示

**访问地址**：https://your-domain.com（腾讯云 EdgeOne）

| 功能 | 本地环境 | 线上演示 |
|------|---------|---------|
| 文档上传 | ✅ 支持 | ⚠️ 仅展示 |
| 文档删除 | ✅ 支持 | ❌ 不可删除 |
| 向量检索 | ✅ 完整功能 | ✅ 预计算向量 |
| AI 对话 | ✅ 支持 | ✅ 支持 |

> ⚠️ **线上限制**：受部署环境限制，上传的文档仅作展示使用。完整的向量检索与智能问答功能请拉取项目到本地体验。

## 📖 核心功能

### 1. 混合检索策略

```
检索分数 = 向量相似度 × 50% + 关键词匹配 × 30% + 人名加权 × 20%
```

**向量相似度**：使用智谱 Embedding-3 将文本转为 1024 维向量，计算余弦相似度

**关键词匹配**：计算查询词在文档中的覆盖率

**人名加权**：识别中文人名（如"张皓泉"），对包含人名的文档给予额外加分

### 2. 查询扩展与停用词

```javascript
// 停用词列表
const stopWords = [
  // 纯虚词
  '的', '了', '在', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '会', '着', '看', '好',
  '这', '他', '她', '它', '们',
  // 连接词
  '与', '及', '或', '但', '而', '且', '并', '又', '再'
];

// 查询扩展：移除停用词，保留核心关键词
expandQuery('什么是 RAG 技术')
// → 'RAG 技术'
```

### 3. Rerank 重排序

1. 混合检索取 Top-30 候选
2. 计算关键词覆盖率
3. 综合评分：混合分数 × 70% + 覆盖率 × 30%
4. 取最终 Top-K 结果

### 4. 错误处理

- **网络错误**：指数退避重试（1s → 2s → 4s → 8s）
- **限流错误**：自动等待后重试
- **SSE 断开**：心跳包保活，失败自动重连
- **向量检索失败**：降级到全文检索

## 📦 项目结构

```
rag-bot/
├── docs/                    # 预置文档目录
│   ├── RAG系统指南.md
│   ├── 张皓泉个人简历.md
│   └── AI短剧设计.pdf
├── backend/
│   ├── config/index.js       # 配置文件
│   ├── services/
│   │   ├── embedding.service.js  # 向量化服务
│   │   ├── vector-store.service.js # 向量存储
│   │   └── retrieval.service.js   # 检索服务
│   ├── routes/
│   │   ├── chat.routes.js
│   │   └── document.routes.js
│   └── utils/
│       └── cosine.js        # 余弦相似度计算
├── frontend/
│   └── src/
│       ├── views/
│       │   ├── ChatView.vue      # 对话页面
│       │   └── DocumentPreview.vue # 文档预览
│       ├── components/
│       │   ├── ChatPanel.vue     # 对话组件
│       │   └── DocumentList.vue  # 文档列表
│       └── composables/
│           └── useChatStream.js  # SSE 流式逻辑
├── cloud-functions/          # 腾讯云云函数
│   └── api/
│       └── vector-search.js  # 云函数向量检索
├── vector-store.json         # 预计算向量数据
└── README.md
```

## 🔧 配置说明

| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `ZHIPU_API_KEY` | 智谱 API 密钥 | 必填 |
| `PORT` | 后端端口 | 3000 |
| `SIMILARITY_THRESHOLD` | 相似度阈值 | 0.25 |
| `TOP_K` | 返回文档数量 | 8 |
| `CHUNK_SIZE` | 文本分块大小 | 800 |
| `CHUNK_OVERLAP` | 分块重叠大小 | 200 |

## 📊 已知问题与优化记录

### 已修复 ✅

| 问题 | 解决方案 | 修复时间 |
|------|---------|----------|
| 查询"什么是rag"与"rag是什么"结果不一致 | 降低阈值至0.25，优化停用词 | 2026-06-18 |
| 删除文档时意外触发预览 | @click.stop 阻止事件冒泡 | 2026-06-18 |
| SSE 请求冲突 ERR_ABORTED | AbortController 取消旧请求 | 2026-06-18 |
| PDF 预览白屏 | iframe 正确加载后端接口 | 2026-06-18 |
| 中文文件名乱码 | 过滤特殊字符 [\\/:*?"<>\|] | 2026-06-18 |
| 预置文档不显示 | 从 docs 目录读取文件列表 | 2026-06-18 |
| 文件上传报错 | 使用 FormData 格式 | 2026-06-18 |
| 人名查询无法检索 | 人名识别与加权机制 | 2026-06-18 |

### 待优化 🔧

| 功能 | 当前状态 | 优化方案 |
|------|---------|----------|
| Multi-Query | 单次检索 | 并行生成多个查询变体 |
| 批量向量化 | 逐个处理 | 添加批量处理与缓存 |
| 会话持久化 | 内存存储 | Redis 会话管理 |
| 大文档处理 | 全量加载 | 流式处理支持 |

## 📄 版权

© 2026. 本项目仅供展示用途。
