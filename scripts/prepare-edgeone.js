/**
 * 将预置文档和向量数据复制到云函数目录，随 cloud-functions 一起部署。
 * EdgeOne 的 includeFiles 对项目根目录 docs/ 打包不稳定，
 * 放在 cloud-functions/api/_data/ 下可确保运行时能读取。
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'cloud-functions', 'api', '_data');
const docsSource = path.join(root, 'docs');
const vectorSource = path.join(root, 'backend', 'data', 'vector-store.json');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (!fs.existsSync(docsSource)) {
  console.error('[prepare-edgeone] docs 目录不存在:', docsSource);
  process.exit(1);
}

if (!fs.existsSync(vectorSource)) {
  console.warn('[prepare-edgeone] 警告: vector-store.json 不存在，跳过复制');
}

fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });

copyDir(docsSource, path.join(dataDir, 'docs'));

if (fs.existsSync(vectorSource)) {
  fs.copyFileSync(vectorSource, path.join(dataDir, 'vector-store.json'));
}

const files = fs.readdirSync(path.join(dataDir, 'docs'));
console.log(`[prepare-edgeone] 已复制 ${files.length} 个文档到 cloud-functions/api/_data/docs/`);
console.log('[prepare-edgeone] 文件:', files.join(', '));
