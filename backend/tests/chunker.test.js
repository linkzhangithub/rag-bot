const chunkerService = require('../services/chunker.service');

describe('文本分块', () => {
  test('短文本不分割', () => {
    const chunks = chunkerService.splitText('这是一段短文本');
    expect(chunks.length).toBe(1);
    expect(chunks[0]).toBe('这是一段短文本');
  });

  test('长文本按段落分割', () => {
    const longText = '第一段内容。\n\n第二段内容。\n\n第三段内容。';
    const chunks = chunkerService.splitText(longText);
    expect(chunks.length).toBeGreaterThan(0);
  });

  test('超长文本强制截断', () => {
    const veryLongText = 'a'.repeat(2000);
    const chunks = chunkerService.splitText(veryLongText, { chunkSize: 800, overlap: 200 });
    expect(chunks.length).toBeGreaterThan(1);
    // 每个 chunk 不超过 chunkSize
    chunks.forEach((chunk) => {
      expect(chunk.length).toBeLessThanOrEqual(800);
    });
  });

  test('保留分隔符', () => {
    const text = '第一句。第二句。第三句。';
    const chunks = chunkerService.splitText(text);
    // 应该包含句号
    expect(chunks.join('')).toContain('。');
  });

  test('空字符串返回空数组', () => {
    const chunks = chunkerService.splitText('');
    expect(chunks.length).toBe(0);
  });

  test('自定义配置生效', () => {
    const text = 'A'.repeat(500);
    const chunks = chunkerService.splitText(text, { chunkSize: 200, overlap: 50 });
    expect(chunks.length).toBeGreaterThan(1);
  });
});
