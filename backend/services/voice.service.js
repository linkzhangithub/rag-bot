const crypto = require('crypto');
const config = require('../config');
const { ValidationError } = require('../utils/errors');

/**
 * 讯飞语音服务
 * 生成 WebSocket 鉴权 URL
 */
class VoiceService {
  /**
   * 生成讯飞 WebSocket URL
   * @param {string} apiPath - API 路径
   * @param {string} host - 主机地址
   * @returns {string} WebSocket URL
   */
  generateWebSocketUrl(apiPath, host) {
    if (!config.xunfeiAppId || !config.xunfeiApiKey || !config.xunfeiApiSecret) {
      throw new ValidationError('缺少讯飞 API 配置');
    }

    const ts = Math.floor(Date.now() / 1000);
    const date = new Date(ts * 1000).toUTCString();

    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${apiPath} HTTP/1.1`;
    const signature = crypto
      .createHmac('sha256', config.xunfeiApiSecret)
      .update(signatureOrigin)
      .digest('base64');

    const authorization = `hmac username="${config.xunfeiApiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;

    return `wss://${host}${apiPath}?authorization=${encodeURIComponent(authorization)}&appid=${config.xunfeiAppId}&ts=${ts}`;
  }

  /**
   * 获取 ASR（语音识别）token
   * @returns {string} WebSocket URL
   */
  getAsrToken() {
    return this.generateWebSocketUrl('/v2/iat', 'iat-api.xfyun.cn');
  }

  /**
   * 获取 TTS（语音合成）token
   * @returns {string} WebSocket URL
   */
  getTtsToken() {
    return this.generateWebSocketUrl('/v2/tts', 'tts-api.xfyun.cn');
  }
}

module.exports = new VoiceService();
