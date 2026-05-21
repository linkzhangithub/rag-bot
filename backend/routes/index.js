const express = require('express');
const documentRoutes = require('./document.routes');
const chatRoutes = require('./chat.routes');
const voiceRoutes = require('./voice.routes');

const router = express.Router();

// 注册路由
router.use('/documents', documentRoutes);
router.use('/chat', chatRoutes);
router.use('/voice', voiceRoutes);

module.exports = router;
