const http = require('http');

function testHealth() {
  return new Promise((resolve) => {
    http.get('http://localhost:3000/health', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('健康检查:', result);
          resolve(true);
        } catch (e) {
          console.error('解析健康检查响应失败:', e);
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.error('健康检查失败:', err.message);
      resolve(false);
    });
  });
}

function testChat() {
  return new Promise((resolve) => {
    console.log('开始测试聊天...');
    const data = JSON.stringify({ question: 'RAG' });
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 30000
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          console.log('聊天响应:', result);
          resolve(true);
        } catch (e) {
          console.error('解析聊天响应失败:', e);
          console.error('原始响应:', responseData);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.error('聊天测试失败:', err.message);
      resolve(false);
    });

    req.on('timeout', () => {
      console.error('请求超时');
      req.destroy();
      resolve(false);
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('=== 开始调试测试 ===');
  
  console.log('\n1. 测试健康检查...');
  const healthOK = await testHealth();
  
  if (!healthOK) {
    console.log('健康检查失败，退出');
    return;
  }
  
  console.log('\n2. 测试聊天功能...');
  await testChat();
  
  console.log('\n=== 测试完成 ===');
}

main();