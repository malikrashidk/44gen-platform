const express = require('express');
const router = express.Router();
const { generateApp } = require('../services/gemini');

router.post('/', async (req, res) => {
    const { prompt, userId } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        res.write(`data: ${JSON.stringify({ status: 'generating' })}\n\n`);

        const code = await generateApp(prompt);

        res.write(`data: ${JSON.stringify({ status: 'done', code })}\n\n`);
        res.end();
    } catch (error) {
        console.error('Generation error:', error);
        res.status(500).json({ error: 'Generation failed' });
    }
});

module.exports = router;
