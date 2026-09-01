const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

// 加强 CORS 配置
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());

app.use(express.json());

app.post('/v1/chat/completions', async (req, res) => {
    const targetUrl = req.headers['x-target-url'] || 'https://api.deepseek.com/v1/chat/completions';
    const apiKey = req.headers['authorization'];
    if (!apiKey) {
        return res.status(400).json({ error: 'Missing Authorization header (API Key)' });
    }
    try {
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': apiKey
            },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error('代理出错:', error);
        res.status(500).json({ error: '代理服务器内部错误: ' + error.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ AI 代理已启动，监听在 http://localhost:${PORT}`);
});
