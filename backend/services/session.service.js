/**
 * 会话管理服务
 * 管理聊天会话，支持会话创建、更新、清理等功能
 */
class SessionService {
  constructor() {
    this.sessions = new Map();
    this.SESSION_TTL = 30 * 60 * 1000; // 30分钟
    this.MAX_SESSIONS = 1000;
    this.startCleanup();
  }

  /**
   * 获取或创建会话
   * @param {string} sessionId - 会话ID
   * @returns {Object} 会话对象
   */
  getOrCreate(sessionId) {
    let session = this.sessions.get(sessionId);
    
    if (!session) {
      // 检查会话数量限制
      if (this.sessions.size >= this.MAX_SESSIONS) {
        this.removeOldestSession();
      }
      
      session = {
        id: sessionId,
        messages: [],
        createdAt: Date.now(),
        lastAccessAt: Date.now(),
      };
      this.sessions.set(sessionId, session);
    }
    
    this.updateLastAccess(sessionId);
    return session;
  }

  /**
   * 更新会话最后访问时间
   * @param {string} sessionId - 会话ID
   */
  updateLastAccess(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastAccessAt = Date.now();
    }
  }

  /**
   * 添加消息到会话
   * @param {string} sessionId - 会话ID
   * @param {string} role - 角色（user/assistant）
   * @param {string} content - 消息内容
   */
  addMessage(sessionId, role, content) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages.push({ role, content, timestamp: Date.now() });
      session.lastAccessAt = Date.now();
    }
  }

  /**
   * 获取会话消息历史
   * @param {string} sessionId - 会话ID
   * @returns {Array} 消息历史
   */
  getMessages(sessionId) {
    const session = this.sessions.get(sessionId);
    return session ? session.messages : [];
  }

  /**
   * 删除会话
   * @param {string} sessionId - 会话ID
   */
  deleteSession(sessionId) {
    this.sessions.delete(sessionId);
  }

  /**
   * 删除最旧的会话
   */
  removeOldestSession() {
    let oldestId = null;
    let oldestTime = Date.now();
    
    for (const [id, session] of this.sessions) {
      if (session.createdAt < oldestTime) {
        oldestTime = session.createdAt;
        oldestId = id;
      }
    }
    
    if (oldestId) {
      this.sessions.delete(oldestId);
    }
  }

  /**
   * 清理过期会话
   */
  cleanupExpired() {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastAccessAt > this.SESSION_TTL) {
        this.sessions.delete(id);
      }
    }
  }

  /**
   * 启动定时清理任务
   */
  startCleanup() {
    setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000); // 每5分钟清理一次
  }

  /**
   * 获取会话数量
   * @returns {number} 会话数量
   */
  getSessionCount() {
    return this.sessions.size;
  }
}

module.exports = new SessionService();