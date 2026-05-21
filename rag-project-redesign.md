# RAG 知识库项目重构方案

> 目标：把当前的单文件演示项目，重构成可放进作品集、直接拿 offer 的完整项目。

---

## 一、项目定位

**产品名：** 私有知识库问答系统

**一句话介绍：** 用户上传文档，AI 基于文档内容回答问题，支持语音输入和流式输出。

**对标产品：** Notion AI、腾讯文档 AI、AskYourPDF

**目标用户：** 需要快速检索私有文档的个人或小团队

**盈利模式：** 免费演示版，后续可扩展 SaaS 订阅

---

## 二、技术架构

```
┌─────────────────────────────────────────────────────┐
│                    前端（Vue 3）                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ 文档上传 │  │ 问答对话  │  │ 知识库管理 │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       └─────────────┬┴──────────────┘              │
│                     │ SSE 流式                      │
└─────────────────────┼──────────────────────────────┘
                      │
┌─────────────────────┼──────────────────────────────┐
│                    后端（Node.js）                    │
│  ┌──────────┐  ┌────┴────┐  ┌──────────┐        │
│  │ 文档处理 │  │ 向量检索 │  │  LLM 调用 │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       └─────────────┼┴──────────────┘              │
│                     │                              │
│  ┌──────────┐  ┌────┴────┐  ┌──────────┐        │
│  │ Chunk 分块 │  │ 向量存储 │  │ Prompt 工程 │        │
│  └──────────┘  └────────┘  └──────────┘        │
└───────────────────────────────────────────────────┘
                      │
              ┌───────┴───────┐
              │  智谱 GLM-4   │
              │  讯飞语音 API  │
              └───────────────┘
```

---

## 三、后端重构

### 3.1 目录结构

```
backend/
├── server.js                    # 入口，启动服务
├── config/
│   └── index.js                 # 环境变量配置
├── routes/
│   ├── index.js                 # 路由汇总
│   ├── document.routes.js        # 文档上传/删除/列表
│   ├── chat.routes.js            # 问答接口
│   └── voice.routes.js           # 语音 token 接口
├── services/
│   ├── index.js                 # service 汇总
│   ├── chunker.service.js       # 文本分块
│   ├── embedding.service.js      # 向量嵌入
│   ├── retrieval.service.js       # 相似度检索
│   ├── llm.service.js            # LLM 调用 + SSE 流式
│   └── voice.service.js          # 讯飞 WebSocket URL 生成
├── utils/
│   ├── cosine.js                # 余弦相似度（手写，不用库）
│   ├── markdown.js              # markdown 解析
│   └── errors.js                # 统一错误类
├── data/
│   └── vector-store.json         # 向量持久化（JSON 文件）
└── tests/
    ├── cosine.test.js           # 余弦相似度单元测试
    ├── chunker.test.js          # 分块策略测试
    └── retrieval.test.js         # 检索逻辑测试
```

**每个文件行数限制：≤200 行**

### 3.2 核心功能实现

#### A. 文本分块（chunker.service.js）

```javascript
// 策略：多分隔符 + 固定长度 + 重叠
// 面试可讲：为什么这样设计？相比固定长度切分好在哪？

class ChunkerService {
  splitText(text, options = {}) {
    const { chunkSize = 800, overlap = 200, separators = ['\n\n', '\n', '。', '！', '？'] } = options;
    // 实现见原 server.js 第 141-174 行
    // 重点：保留分隔符，防止句子被切断
  }
}
```

**面试话术：** "我用多分隔符优先切分，保证每个 chunk 是完整的句子或段落。只有当段落超过 chunkSize 时才强制截断。重叠 200 字是为了保留上下文连贯性。"

#### B. 向量检索（retrieval.service.js）

```javascript
// 流程：问题 embedding → 余弦相似度 → 阈值过滤 → Top-K 排序

class RetrievalService {
  async retrieve(query, options = {}) {
    const { topK = 8, threshold = 0.35 } = options;
    const queryEmbedding = await embeddingService.getEmbedding(query);
    const similarities = this.vectorStore.map((chunk, i) => ({
      index: i,
      score: cosine(queryEmbedding, chunk.embedding)
    }));
    similarities.sort((a, b) => b.score - a.score);
    return similarities
      .filter(s => s.score >= threshold)
      .slice(0, topK)
      .map(s => this.vectorStore[s.index]);
  }
}
```

**面试话术：** "阈值 0.35 是实验出来的。0.3 以下噪声太多，0.4 以上漏召。Top-8 是因为智谱上下文窗口有限，8 个 800 字 chunk 刚好 6400 字，加 prompt 不超 8000。"

#### C. SSE 流式输出（llm.service.js）

```javascript
// 核心：res.write() + text/event-stream

async generateStream(question, relevantDocs, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const stream = await llm.call(question, relevantDocs);
  for await (const chunk of stream) {
    res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
  }
  res.write('data: [DONE]\n\n');
  res.end();
}
```

**面试话术：** "SSE 是服务端推流，客户端用 EventSource 接收。相比完整返回，SSE 让用户第一时间看到回答，不用等 10 秒。WebSocket 我也了解过，但这里不需要双向通信，SSE 更轻量。"

#### D. 持久化（vector-store.json）

```javascript
// 启动时从 JSON 加载，文档增删时写入
// 面试可讲：为什么不用 Redis？演示环境用 JSON，生产用向量数据库

class VectorStore {
  constructor(filePath = './data/vector-store.json') {
    this.filePath = filePath;
    this.data = this.load();
  }

  load() {
    if (fs.existsSync(this.filePath)) {
      return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
    }
    return [];
  }

  save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }
}
```

### 3.3 接口设计

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/documents` | GET | 获取文档列表 |
| `/api/documents` | POST | 上传文档 |
| `/api/documents/:name` | DELETE | 删除文档 |
| `/api/chat/stream` | POST | SSE 流式问答 |
| `/api/chat` | POST | 普通问答（非 SSE，兜底） |
| `/api/voice/asr-token` | GET | 获取讯飞 ASR token |
| `/api/voice/tts-token` | GET | 获取讯飞 TTS token |

---

## 四、前端重构

### 4.1 目录结构

```
frontend/src/
├── main.js
├── App.vue
├── api/
│   ├── document.api.js            # 文档 CRUD
│   ├── chat.api.js               # 问答接口（SSE）
│   └── voice.api.js             # 语音 token
├── components/
│   ├── DocumentUploader.vue       # 拖拽上传区
│   ├── DocumentList.vue           # 已上传文档列表
│   ├── ChatWindow.vue            # 问答对话窗口（核心）
│   ├── ChatMessage.vue            # 单条消息
│   ├── SourceList.vue            # 引用来源列表
│   └── VoiceInput.vue            # 语音输入
├── composables/
│   ├── useChatStream.js          # SSE 流式对话逻辑
│   ├── useDocument.js            # 文档管理
│   └── useVoice.js              # 语音输入/输出
├── stores/
│   └── chat.store.js             # Pinia，对话历史
└── styles/
    └── main.css
```

### 4.2 SSE 流式对话实现（useChatStream.js）

```javascript
// 面试可讲：AbortController 取消请求，ReadableStream 解析 SSE

export function useChatStream() {
  const messages = ref([]);
  const isGenerating = ref(false);
  let abortController = null;

  async function sendMessage(content) {
    // 1. 添加用户消息
    messages.value.push({ role: 'user', content });
    messages.value.push({ role: 'assistant', content: '' });
    isGenerating.value = true;

    // 2. 创建 AbortController
    abortController = new AbortController();

    // 3. SSE 请求
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: content }),
      signal: abortController.signal
    });

    // 4. 解析 SSE 流
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      // 格式: data: {"content":"xxx"}\n\n
      chunk.split('\n').forEach(line => {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.content === '[DONE]') return;
          // 更新最后一条助手消息
          messages.value[messages.value.length - 1].content += data.content;
        }
      });
    }

    isGenerating.value = false;
  }

  function stop() {
    abortController?.abort();
    isGenerating.value = false;
  }

  return { messages, isGenerating, sendMessage, stop };
}
```

### 4.3 组件设计

#### ChatWindow.vue（核心）

**功能：**
- 消息列表（用户灰右、AI 黑左）
- 流式打字效果（逐字显示）
- 停止生成按钮
- 消息复制按钮
- 引用来源展示（可折叠）

**面试可讲：** "打字效果不是 setInterval，是 SSE 流驱动。服务端推一个字，前端追加一个字，延迟 < 50ms。"

---

## 五、UI 设计

### 5.1 整体风格

**参考：** Notion AI + Linear 的设计风格

- 深色主题（#0F172A 背景）
- 左侧文档管理，右侧问答
- 卡片式布局，留白充足
- 主色调：#3B82F6（蓝色，纯色，不渐变）

### 5.2 布局

```
┌─────────────────────────────────────────────────────────┐
│  顶部栏：Logo + 标题 + 主题切换                            │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│  侧边栏      │  主内容区                                 │
│  280px      │                                          │
│              │  ┌────────────────────────────────┐     │
│  上传区域     │  │  ChatWindow（对话窗口）           │     │
│  ──────────  │  │  用户消息（灰色，右对齐）           │     │
│  文档列表     │  │  AI 回答（白色，左对齐，打字效果）   │     │
│  - doc1.md   │  │  [引用来源，可折叠]               │     │
│  - doc2.txt  │  └────────────────────────────────┘     │
│              │                                          │
│              │  ┌────────────────────────────────┐     │
│              │  │  输入框 + 发送 + 语音输入          │     │
│              │  └────────────────────────────────┘     │
└──────────────┴──────────────────────────────────────────┘
```

### 5.3 状态设计

| 状态 | 视觉表现 |
|------|---------|
| 空知识库 | 引导提示 + 上传区域突出显示 |
| 上传中 | 进度条 + 文件名 + 取消按钮 |
| 上传失败 | 红色提示 + 重试按钮 |
| 问答中 | 输入框禁用 + 停止按钮 |
| SSE 流式 | 打字效果 + "停止"按钮 |
| 无匹配答案 | AI 回答"未找到相关内容" + 来源列表为空 |

---

## 六、产品细节

### 6.1 空状态引导

**知识库为空时：**
- 大标题："开始构建你的知识库"
- 副标题："上传 .md 或 .txt 文档，AI 将基于这些文档回答你的问题"
- 上传区域占屏幕 40% 高度，带动画

### 6.2 引用来源展示

每条 AI 回答下方，显示"参考文档"：
- 显示文档名 + 相似度分数（保留 2 位小数）
- 点击展开原始文本片段
- 面试可讲："用户需要知道答案从哪来，增加可信度"

### 6.3 文档管理

- 显示每个文档的 chunk 数量
- 支持删除（带确认弹窗）
- 搜索过滤（文档名包含关键字）

---

## 七、测试

### 7.1 单元测试（必须）

```javascript
// tests/cosine.test.js
describe('余弦相似度', () => {
  test('相同向量相似度为 1', () => {
    const vec = [1, 2, 3];
    expect(cosineSimilarity(vec, vec)).toBeCloseTo(1);
  });

  test('垂直向量相似度为 0', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  test('反向向量相似度为 -1', () => {
    expect(cosineSimilarity([1, 2], [-1, -2])).toBeCloseTo(-1);
  });
});

// tests/chunker.test.js
describe('文本分块', () => {
  test('短文本不分割', () => {
    const chunks = splitText('这是一段短文本');
    expect(chunks.length).toBe(1);
  });

  test('长文本按段落分割', () => {
    const longText = '第一段。\n\n第二段。';
    const chunks = splitText(longText);
    expect(chunks.length).toBeGreaterThan(0);
  });
});
```

### 7.2 集成测试

- 上传文档 → 检查 chunk 数量
- 提问 → 检查返回格式
- SSE 连接 → 检查流式输出

---

## 八、面试话术准备

### 必问 1：为什么选 RAG？

**参考回答：** "RAG 是目前大模型落地最成熟的方式。直接用 LLM 的问题是知识更新慢、幻觉多。RAG 通过检索相关文档片段作为上下文，让 LLM 在限定范围内回答，既保证答案有依据，又支持私有知识。"

### 必问 2：分块策略怎么设计的？

**参考回答：** "我考虑了三个维度：语义完整性、上下文长度、召回率。800 字是经验值，太短丢失上下文，太长超出 LLM 窗口。重叠 200 字防止句子被切断。分隔符优先段落，其次句子，保留语义。"

### 必问 3：阈值 0.35 怎么来的？

**参考回答：** "我做了对比实验。0.3 以下低相关文档也会被召进来，0.4 以上高相关文档被漏掉。0.35 是我跑了几十个 query 后的经验值。未来可以做成可配置的，让用户自己调。"

### 必问 4：SSE 和 WebSocket 区别？

**参考回答：** "WebSocket 是双向通信，需要握手协议，适合实时游戏、聊天等多交互场景。SSE 是单向基于 HTTP，服务端推客户端收，自动重连，实现更简单。问答场景只有服务端返回，不需要双向，SSE 更合适。"

### 必问 5：如何避免幻觉？

**参考回答：** "三层：1. Prompt 里明确要求'只基于参考文档回答，不要编造'。2. 相似度阈值过滤低相关文档。3. 引用来源展示，用户能验证答案出处。"

---

## 九、优先级执行顺序

| 阶段 | 任务 | 预计时间 | 目的 |
|------|------|---------|------|
| 1 | 后端模块化 + SSE | 2-3 天 | 核心功能 |
| 2 | 前端 Vue 重构 + SSE | 2-3 天 | 前端能力证明 |
| 3 | UI 设计 + 状态设计 | 1-2 天 | 作品集展示效果 |
| 4 | 持久化 + 测试 | 1 天 | 工程完整性 |
| 5 | 消化代码 + 准备话术 | 3-5 天 | 面试准备 |
| **总计** | | **9-14 天** | |

---

## 十、禁止事项

- ❌ 不要加 LangChain / LlamaIndex（面试会问为什么用，你答不上来）
- ❌ 不要加用户登录注册（偏离主题，增加复杂度）
- ❌ 不要加多模型切换（演示项目不需要）
- ❌ 不要加复杂的权限系统
- ❌ 不要用数据库（SQLite/Redis 都不要），就用 JSON 文件持久化
