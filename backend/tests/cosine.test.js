const { cosineSimilarity } = require('../utils/cosine');

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

  test('正常向量相似度在 -1 到 1 之间', () => {
    const result = cosineSimilarity([1, 2, 3], [4, 5, 6]);
    expect(result).toBeGreaterThanOrEqual(-1);
    expect(result).toBeLessThanOrEqual(1);
  });

  test('零向量返回 0', () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
  });

  test('向量长度不匹配抛出错误', () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow('向量长度不匹配或为空');
  });

  test('空向量抛出错误', () => {
    expect(() => cosineSimilarity([], [])).toThrow('向量长度不匹配或为空');
  });
});
