const config = require('../config');

/**
 * 文本分块服务
 * 策略：多分隔符优先 + 固定长度 + 重叠
 */
class ChunkerService {
  /**
   * 分割文本为多个 chunk
   * @param {string} text - 原始文本
   * @param {object} options - 配置选项
   * @returns {string[]} 文本块数组
   */
  splitText(text, options = {}) {
    const {
      chunkSize = config.chunkSize,
      overlap = config.chunkOverlap,
      separators = ['\n\n', '\n', '。', '！', '？', '，', ' ', ''],
    } = options;

    const chunks = [];

    // 尝试使用分隔符分割
    for (const sep of separators) {
      if (text.includes(sep)) {
        const parts = text.split(sep);
        let currentChunk = '';

        for (const part of parts) {
          if (currentChunk.length + part.length + sep.length <= chunkSize) {
            currentChunk += (currentChunk ? sep : '') + part;
          } else {
            if (currentChunk) {
              chunks.push(currentChunk);
            }
            currentChunk = part;

            // 如果单个部分超过 chunkSize，强制截断
            while (currentChunk.length > chunkSize) {
              // 尝试在字符边界截断（避免切断 UTF-8 多字节字符）
              let cutIndex = chunkSize;
              
              // 如果截断位置在多字节字符中间，向前调整
              while (cutIndex > 0 && (currentChunk.charCodeAt(cutIndex) & 0xc0) === 0x80) {
                cutIndex--;
              }
              
              chunks.push(currentChunk.substring(0, cutIndex));
              currentChunk = currentChunk.substring(cutIndex - overlap);
            }
          }
        }

        if (currentChunk) {
          chunks.push(currentChunk);
        }
        break;
      }
    }

    // 如果没有分隔符，按固定长度分割
    if (chunks.length === 0) {
      for (let i = 0; i < text.length; i += chunkSize - overlap) {
        chunks.push(text.substring(i, i + chunkSize));
      }
    }

    return chunks;
  }
}

module.exports = new ChunkerService();
