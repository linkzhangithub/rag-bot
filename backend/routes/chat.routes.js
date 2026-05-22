const express = require('express');
const rateLimit = require('express-rate-limit');
const retrievalService = require('../services/retrieval.service');
const llmService = require('../services/llm.service');
const sessionService = require('../services/session.service');

const router = express.Router();

// 聊天接口限流：每分钟10次（仅用于普通问答）
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, error: '请求频率过高，请稍后再试' },
  standardHeaders: true,
});

/**
 * 验证问题参数
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {boolean} 是否验证通过
 */
function validateQuestion(req, res) {
  const { question } = req.body;
  
  if (!question || typeof question !== 'string') {
    res.status(400).json({
      success: false,
      error: '缺少 question 参数或参数格式错误',
    });
    return false;
  }

  if (question.trim().length === 0) {
    res.status(400).json({ success: false, error: '问题不能为空' });
    return false;
  }

  return true;
}

/**
 * 构建来源信息
 * @param {Array} relevantDocs - 相关文档数组
 * @returns {Array} 来源信息数组
 */
function buildSources(relevantDocs) {
  return relevantDocs.map((doc) => ({
    name: doc.metadata.source,
    score: parseFloat(doc.similarity.toFixed(4)),
    snippet: doc.content.substring(0, 200) + (doc.content.length > 200 ? '...' : ''),
  }));
}

/**
 * POST /api/chat - 普通问答（非流式）
 */
router.post('/', chatLimiter, async (req, res) => {
  try {
    if (!validateQuestion(req, res)) return;

    const { question, sessionId = 'default' } = req.body;
    
    // 获取会话历史
    const session = sessionService.getOrCreate(sessionId);
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

    // 调用 LLM 生成答案
    const answer = await llmService.chat(question, relevantDocs, history);

    // 保存对话历史（保留最近5轮）
    sessionService.addMessage(sessionId, 'user', question);
    sessionService.addMessage(sessionId, 'assistant', answer);

    res.json({
      success: true,
      answer,
      sources: buildSources(relevantDocs),
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
    if (!validateQuestion(req, res)) return;

    const { question, sessionId = 'default' } = req.body;

    // 设置 SSE 响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // 发送心跳包防止代理断开（每15秒）
    heartbeatInterval = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 15000);

    // 客户端断开时清理
    req.on('close', () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      console.log('SSE 连接已关闭');
    });

    // 获取会话历史
    sessionService.getOrCreate(sessionId);
    const history = sessionService.getMessages(sessionId);

    // 检索相关文档
    const relevantDocs = await retrievalService.retrieve(question);

    if (relevantDocs.length === 0) {
      res.write(`data: ${JSON.stringify({ content: '抱歉，知识库中没有找到与您的问题相关的文档。请尝试上传相关文档或换个问题。' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    // 先发送来源信息
    res.write(`data: ${JSON.stringify({ type: 'sources', sources: buildSources(relevantDocs) })}\n\n`);

    // SSE 流式输出
    let fullAnswer = '';
    await llmService.chatStream(question, relevantDocs, res, history, (chunk) => {
      fullAnswer += chunk;
    });

    // 保存对话历史
    sessionService.addMessage(sessionId, 'user', question);
    sessionService.addMessage(sessionId, 'assistant', fullAnswer);

    if (heartbeatInterval) clearInterval(heartbeatInterval);
  } catch (error) {
    console.error('SSE 流式问答失败:', error.message);
    
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

module.exports = router;