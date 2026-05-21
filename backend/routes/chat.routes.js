const express = require('express');
const rateLimit = require('express-rate-limit');
const retrievalService = require('../services/retrieval.service');
const llmService = require('../services/llm.service');

const router = express.Router();

// 聊天接口限流：每分钟10次（仅用于普通问答）
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, error: '请求频率过高，请稍后再试' },
  standardHeaders: true,
});

// 会话存储（内存Map）+ TTL 清理
const chatSessions = new Map();
const SESSION_TTL = 30 * 60 * 1000; // 30分钟过期
const MAX_SESSIONS = 1000; // 最大会话数

// 定期清理过期会话（每5分钟）
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [sessionId, data] of chatSessions.entries()) {
    if (now - data.lastAccess > SESSION_TTL) {
      chatSessions.delete(sessionId);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`清理了 ${cleanedCount} 个过期会话`);
  }
  
  // 如果会话数超过限制，删除最旧的
  if (chatSessions.size > MAX_SESSIONS) {
    const sorted = Array.from(chatSessions.entries())
      .sort((a, b) => a[1].lastAccess - b[1].lastAccess);
    
    const toDelete = sorted.slice(0, chatSessions.size - MAX_SESSIONS);
    toDelete.forEach(([id]) => chatSessions.delete(id));
    console.log(`清理了 ${toDelete.length} 个最旧会话（超出限制）`);
  }
}, 5 * 60 * 1000);

// 进程退出时清理定时器
process.on('beforeExit', () => {
  clearInterval(cleanupInterval);
});

/**
 * POST /api/chat - 普通问答（非流式）
 */
router.post('/', chatLimiter, async (req, res) => {
  try {
    const { question, sessionId = 'default' } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        success: false,
        error: '缺少 question 参数或参数格式错误',
      });
    }

    if (question.trim().length === 0) {
      return res.status(400).json({ success: false, error: '问题不能为空' });
    }

    // 获取或创建会话历史
    if (!chatSessions.has(sessionId)) {
      chatSessions.set(sessionId, { messages: [], lastAccess: Date.now() });
    }
    const session = chatSessions.get(sessionId);
    session.lastAccess = Date.now(); // 更新最后访问时间
    const history = session.messages;

    // 检索相关文档
    const relevantDocs = await retrievalService.retrieve(question);

    if (relevantDocs.length === 0) {
      return res.json({
        success: true,
        answer: '知识库为空或未找到相关文档，请先上传相关文档后再提问。',
        sources: [],
      });
    }

    // 调用 LLM 生成答案（传入历史）
    const answer = await llmService.chat(question, relevantDocs, history);

    // 保存对话历史（保留最近5轮）
    history.push({ role: 'user', content: question });
    history.push({ role: 'assistant', content: answer });
    if (history.length > 10) { // 5轮对话 = 10条消息
      session.messages = history.slice(-10);
    }

    // 构建来源信息（包含文档名、相似度、内容片段）
    const sources = relevantDocs.map((doc) => ({
      name: doc.metadata.source,
      score: parseFloat(doc.similarity.toFixed(4)),
      snippet: doc.content.substring(0, 200) + (doc.content.length > 200 ? '...' : ''),
    }));

    res.json({
      success: true,
      answer,
      sources,
    });
  } catch (error) {
    console.error('处理问题失败:', error.message);
    res.status(500).json({
      success: false,
      error: `处理问题时发生错误: ${error.message}`,
    });
  }
});

/**
 * POST /api/chat/stream - SSE 流式问答
 */
router.post('/stream', async (req, res) => {
  let heartbeatInterval = null;
  
  try {
    const { question, sessionId = 'default' } = req.body;

    if (!question || typeof question !== 'string') {
      res.status(400).json({
        success: false,
        error: '缺少 question 参数或参数格式错误',
      });
      return;
    }

    if (question.trim().length === 0) {
      res.status(400).json({ success: false, error: '问题不能为空' });
      return;
    }

    // 设置 SSE 响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // 禁用 Nginx 缓冲
    });

    // 发送心跳包防止代理断开（每15秒）
    heartbeatInterval = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 15000);

    // 客户端断开时清理
    req.on('close', () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      console.log('SSE 连接已关闭');
    });

    // 获取或创建会话历史
    if (!chatSessions.has(sessionId)) {
      chatSessions.set(sessionId, { messages: [], lastAccess: Date.now() });
    }
    const session = chatSessions.get(sessionId);
    session.lastAccess = Date.now(); // 更新最后访问时间
    const history = session.messages;

    // 检索相关文档
    const relevantDocs = await retrievalService.retrieve(question);

    if (relevantDocs.length === 0) {
      // 没有相关文档时，发送友好提示
      res.write(`data: ${JSON.stringify({ content: '抱歉，知识库中没有找到与您的问题相关的文档。请尝试上传相关文档或换个问题。' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    // 先发送来源信息
    const sources = relevantDocs.map((doc) => ({
      name: doc.metadata.source,
      score: parseFloat(doc.similarity.toFixed(4)),
      snippet: doc.content.substring(0, 200) + (doc.content.length > 200 ? '...' : ''),
    }));
    res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);

    // SSE 流式输出（传入历史）
    let fullAnswer = '';
    await llmService.chatStream(question, relevantDocs, res, history, (chunk) => {
      fullAnswer += chunk;
    });

    // 保存对话历史
    history.push({ role: 'user', content: question });
    history.push({ role: 'assistant', content: fullAnswer });
    if (history.length > 10) {
      session.messages = history.slice(-10);
    }

    // 清理心跳定时器
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
  } catch (error) {
    console.error('SSE 流式问答失败:', error.message);
    
    // 清理心跳定时器
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    
    // 如果响应头已发送，无法再发送错误
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    } else {
      // 否则通过 SSE 发送错误
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

module.exports = router;
