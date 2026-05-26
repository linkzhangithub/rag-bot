const express = require('express');
const documentRoutes = require('./document.routes');
const chatRoutes = require('./chat.routes');

const router = express.Router();

// 注册路由
router.use('/documents', documentRoutes);
router.use('/chat', chatRoutes);

module.exports = router;
