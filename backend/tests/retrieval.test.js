const vectorStore = require('../services/vector-store.service');

describe('向量存储', () => {
  beforeEach(() => {
    // 每个测试前清空数据
    vectorStore.clear();
  });

  test('初始状态为空', () => {
    expect(vectorStore.size()).toBe(0);
  });

  test('添加单个文档', () => {
    const doc = {
      content: '测试内容',
      embedding: [1, 2, 3],
      metadata: { source: 'test.md' },
    };

    vectorStore.add(doc);
    expect(vectorStore.size()).toBe(1);
  });

  test('批量添加文档', () => {
    const docs = [
      { content: '内容1', embedding: [1, 2, 3], metadata: { source: 'test1.md' } },
      { content: '内容2', embedding: [4, 5, 6], metadata: { source: 'test2.md' } },
    ];

    vectorStore.addMany(docs);
    expect(vectorStore.size()).toBe(2);
  });

  test('按来源删除文档', () => {
    const docs = [
      { content: '内容1', embedding: [1, 2, 3], metadata: { source: 'test.md' } },
      { content: '内容2', embedding: [4, 5, 6], metadata: { source: 'test.md' } },
      { content: '内容3', embedding: [7, 8, 9], metadata: { source: 'other.md' } },
    ];

    vectorStore.addMany(docs);
    const removedCount = vectorStore.removeBySource('test.md');

    expect(removedCount).toBe(2);
    expect(vectorStore.size()).toBe(1);
  });

  test('获取文档列表', () => {
    const docs = [
      { content: '内容1', embedding: [1, 2, 3], metadata: { source: 'doc1.md' } },
      { content: '内容2', embedding: [4, 5, 6], metadata: { source: 'doc1.md' } },
      { content: '内容3', embedding: [7, 8, 9], metadata: { source: 'doc2.md' } },
    ];

    vectorStore.addMany(docs);
    const docList = vectorStore.getDocumentList();

    expect(docList.length).toBe(2);
    expect(docList.find((d) => d.name === 'doc1.md').chunks).toBe(2);
    expect(docList.find((d) => d.name === 'doc2.md').chunks).toBe(1);
  });

  test('清空所有数据', () => {
    const docs = [
      { content: '内容1', embedding: [1, 2, 3], metadata: { source: 'test.md' } },
    ];

    vectorStore.addMany(docs);
    vectorStore.clear();

    expect(vectorStore.size()).toBe(0);
  });
});
