const express = require('express');
const documentRoutes = require('./document.routes');
const chatRoutes = require('./chat.routes');
const docsRoutes = require('./docs.routes');

const router = express.Router();

// 注册路由
router.use('/documents', documentRoutes);
router.use('/docs', docsRoutes);
router.use('/chat', chatRoutes);

module.exports = router;
