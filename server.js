const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

// 加强 CORS 配置，允许所有来源、方法和头
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 对 OPTIONS 请求（预检请求）直接返回成功
app.options('*', cors());

// 解析 JSON 请求体
app.use(express.json());

// 代理转发接口
app.post('/v1/chat/completions', async (req, res) => {
    // 1. 获取前端传过来的 API 地址和 Key（你可以在智能体里随意切换目标）
    const targetUrl = req.headers['x-target-url'] || 'https://api.deepseek.com/v1/chat/completions';
    const apiKey = req.headers['authorization']; // 格式: "Bearer sk-..."

    if (!apiKey) {
        return res.status(400).json({ error: 'Missing Authorization header (API Key)' });
    }

    try {
        // 2. 转发请求到真正的 AI 接口
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': apiKey
            },
            body: JSON.stringify(req.body)
        });

        // 3. 获取 AI 返回的数据
        const data = await response.json();

        // 4. 将 AI 的回复原样返回给前端
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
