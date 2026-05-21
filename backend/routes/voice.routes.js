const express = require('express');
const voiceService = require('../services/voice.service');

const router = express.Router();

/**
 * GET /api/voice/asr-token - 获取讯飞 ASR token
 */
router.get('/asr-token', (req, res) => {
  try {
    const url = voiceService.getAsrToken();
    res.json({ success: true, url });
  } catch (error) {
    console.error('生成 ASR token 失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/voice/tts-token - 获取讯飞 TTS token
 */
router.get('/tts-token', (req, res) => {
  try {
    const url = voiceService.getTtsToken();
    res.json({ success: true, url });
  } catch (error) {
    console.error('生成 TTS token 失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
