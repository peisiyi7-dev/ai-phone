// Cloudflare Worker 代理脚本
async function handleOptions(request) {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Target-Url',
            'Access-Control-Max-Age': '86400',
        },
    });
}

async function handleRequest(request) {
    // 处理 CORS 预检
    if (request.method === 'OPTIONS') {
        return handleOptions(request);
    }

    // 只允许 POST 到 /v1/chat/completions
    const url = new URL(request.url);
    if (url.pathname !== '/v1/chat/completions') {
        return new Response('Not Found', { status: 404 });
    }

    // 从请求头获取目标 API 地址（由前端传递）
    let targetUrl = request.headers.get('X-Target-Url');
    if (!targetUrl) {
        targetUrl = 'https://api.deepseek.com/v1/chat/completions';
    }

    // 获取 Authorization（API Key）
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    // 读取请求体
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    // 转发请求到目标 API
    try {
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        // 兼容某些模型（如 DeepSeek-R1）将内容放在 reasoning_content
        if (data?.choices?.length > 0) {
            const choice = data.choices[0];
            if (choice?.message) {
                if ((!choice.message.content || choice.message.content === "") && choice.message.reasoning_content) {
                    choice.message.content = choice.message.reasoning_content;
                }
            }
        }

        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Proxy error: ' + error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});