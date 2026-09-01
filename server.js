const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

// 启用 CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ==========修复1：放大JSON大小限制==========
app.use(express.json({ limit:"10mb" }));

// 代理转发接口
app.post('/v1/chat/completions', async (req, res) => {
    const targetUrl = req.headers['x-target-url'] || 'https://api.deepseek.com/v1/chat/completions';
    const apiKey = req.headers['authorization'];
    if (!apiKey) {
        return res.status(400).json({ error: 'Missing Authorization header (API Key)' });
    }
    try {
        // ==========修复2：设置超时60秒，图片推理耗时久==========
        const controller = new AbortController();
        const timeoutId = setTimeout(()=>controller.abort(),60000);

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': apiKey
            },
            body: JSON.stringify(req.body),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await response.json();
        // 修复reasoning_content回填content
        if (data.choices && data.choices[0] && data.choices[0].message) {
            const msg = data.choices[0].message;
            if (!msg.content && msg.reasoning_content) {
                msg.content = msg.reasoning_content;
            }
        }
        console.log('响应数据:', JSON.stringify(data));
        res.status(response.status).json(data);
    } catch (error) {
        console.error('代理出错:', error);
        res.status(500).json({ error: '代理服务器内部错误: ' + error.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ AI 代理已启动，监听在 http://localhost:${PORT}`);
});
