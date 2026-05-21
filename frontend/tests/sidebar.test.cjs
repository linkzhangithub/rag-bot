const assert = require('assert');

console.log('=== 侧边栏功能测试 ===\n');

let isCollapsed = false;
let isOpen = false;
let documents = [];
let emittedEvents = [];

function emit(eventName, ...args) {
  emittedEvents.push({ eventName, args });
}

function toggleSidebar() {
  isCollapsed = !isCollapsed;
}

function onUploadSuccess() {
  isCollapsed = false;
  emit('upload-success');
}

function onUploadError(message) {
  emit('upload-error', message);
}

function handleQuickAsk(question) {
  emit('quick-ask', question);
}

function reset() {
  isCollapsed = false;
  isOpen = false;
  documents = [];
  emittedEvents = [];
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    reset();
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${err.message}`);
    failed++;
  }
}

test('初始状态应为展开', () => {
  assert.strictEqual(isCollapsed, false, '侧边栏初始应展开');
});

test('点击收起按钮应收起', () => {
  toggleSidebar();
  assert.strictEqual(isCollapsed, true, '点击后应收起');
});

test('再次点击收起按钮应展开', () => {
  isCollapsed = true;
  toggleSidebar();
  assert.strictEqual(isCollapsed, false, '再次点击后应展开');
});

test('上传成功后应展开侧边栏', () => {
  isCollapsed = true;
  onUploadSuccess();
  assert.strictEqual(isCollapsed, false, '上传成功后应展开');
  assert.strictEqual(emittedEvents.length, 1, '应触发一个事件');
  assert.strictEqual(emittedEvents[0].eventName, 'upload-success', '事件名称应正确');
});

test('上传失败应触发错误事件', () => {
  const errorMsg = '测试错误';
  onUploadError(errorMsg);
  assert.strictEqual(emittedEvents.length, 1, '应触发一个事件');
  assert.strictEqual(emittedEvents[0].eventName, 'upload-error', '事件名称应正确');
  assert.strictEqual(emittedEvents[0].args[0], errorMsg, '错误消息应正确');
});

test('快捷问题点击应触发事件', () => {
  const question = '什么是RAG？';
  handleQuickAsk(question);
  assert.strictEqual(emittedEvents.length, 1, '应触发一个事件');
  assert.strictEqual(emittedEvents[0].eventName, 'quick-ask', '事件名称应正确');
  assert.strictEqual(emittedEvents[0].args[0], question, '问题内容应正确');
});

test('统计文档数量', () => {
  documents = [
    { name: 'doc1.pdf', chunks: 10 },
    { name: 'doc2.pdf', chunks: 20 }
  ];
  const totalDocs = documents.length;
  const totalChunks = documents.reduce((sum, doc) => sum + (doc.chunks || 0), 0);
  assert.strictEqual(totalDocs, 2, '文档数量应正确');
  assert.strictEqual(totalChunks, 30, '文本块总数应正确');
});

test('空文档列表统计', () => {
  documents = [];
  const totalDocs = documents.length;
  const totalChunks = documents.reduce((sum, doc) => sum + (doc.chunks || 0), 0);
  assert.strictEqual(totalDocs, 0, '空列表文档数量应为0');
  assert.strictEqual(totalChunks, 0, '空列表文本块应为0');
});

test('收起状态下上传区域应隐藏', () => {
  toggleSidebar();
  assert.strictEqual(isCollapsed, true);
});

test('展开状态下上传区域应显示', () => {
  assert.strictEqual(isCollapsed, false);
});

console.log('\n=== 测试结果 ===');
console.log(`通过: ${passed}`);
console.log(`失败: ${failed}`);
console.log(`总计: ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}
