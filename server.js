const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

// 启用 CORS（允许所有来源、方法、头）
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 解析 JSON 请求体
app.use(express.json());

// 代理转发接口
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

// 启动服务
app.listen(PORT, () => {
    console.log(`✅ AI 代理已启动，监听在 http://localhost:${PORT}`);
    console.log(`📌 请在前端智能体配置中，将 API 地址改为: http://localhost:${PORT}/v1/chat/completions`);
});
