// ======================== 配置 ========================
// 部署后端后，将下面的地址改为您的 Cloudflare Worker 地址
const BACKEND_URL = 'https://ai-phone.peisiyi7.workers.dev';

// ======================== 基础 ========================
function updateTime() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('phoneTime').textContent = `${h}:${m}`;
}
updateTime();
setInterval(updateTime, 1000);
function updateDate() {
    const now = new Date();
    const y = now.getFullYear();
    const mo = now.getMonth() + 1;
    const d = now.getDate();
    const w = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][now.getDay()];
    document.getElementById('dateText').textContent = `${y}年${mo}月${d}日 · ${w}`;
}
updateDate();
// ======================== Toast ========================
function showToast(msg) {
    const old = document.querySelector('.toast');
    if (old) old.remove();
    const div = document.createElement('div');
    div.className = 'toast';
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 2200);
}
// ======================== 页面切换 ========================
function hideAllPages() {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
}
function goHome() { hideAllPages(); document.getElementById('homePage').classList.add('active'); }
function openChat() { 
    hideAllPages(); 
    document.getElementById('chatPage').classList.add('active');
    updateChatHeader();
    renderChatHistory();
}
function openSettings() { hideAllPages(); document.getElementById('settingsPage').classList.add('active'); }
function openAgentManager() { 
    hideAllPages(); 
    document.getElementById('agentManagerPage').classList.add('active');
    renderAgentList();
}
// ======================== 设置交互 ========================
function toggleDarkMode() {
    const screen = document.querySelector('.screen');
    const toggle = document.getElementById('darkModeToggle');
    const newState = !toggle.checked;
    toggle.checked = newState;
    if (newState) {
        screen.style.background = '#e8e5e0';
        screen.style.color = '#1a1a1a';
        document.querySelectorAll('.home-header h1, .date-card, .app span, .notification-content strong, .notification-content p, .simple-header h2, .setting-item, .character-info strong, .character-info span, .message-bubble, .message-time')
            .forEach(el => el.style.color = '#1a1a1a');
        document.querySelector('.date-card').style.background = 'rgba(220,215,205,0.8)';
        document.querySelector('.notification').style.background = 'rgba(220,215,205,0.8)';
        document.querySelector('.chat-header').style.background = 'rgba(232,229,224,0.9)';
        document.querySelector('.chat-input-area').style.background = 'rgba(232,229,224,0.95)';
    } else {
        screen.style.background = '#fcf8f4';
        screen.style.color = '';
        document.querySelectorAll('.home-header h1, .date-card, .app span, .notification-content strong, .notification-content p, .simple-header h2, .setting-item, .character-info strong, .character-info span, .message-bubble, .message-time')
            .forEach(el => el.style.color = '');
        document.querySelector('.date-card').style.background = 'rgba(255,255,255,0.7)';
        document.querySelector('.notification').style.background = 'rgba(255,255,255,0.8)';
        document.querySelector('.chat-header').style.background = 'rgba(252,248,244,0.85)';
        document.querySelector('.chat-input-area').style.background = 'rgba(252,248,244,0.95)';
    }
    showToast(newState ? '🌙 护眼模式（浅灰）' : '☀️ 浅色模式');
}
function toggleNotification() {
    const toggle = document.getElementById('notifToggle');
    toggle.checked = !toggle.checked;
    const notif = document.querySelector('.notification');
    if (toggle.checked) {
        notif.style.opacity = '1';
        notif.style.pointerEvents = 'auto';
        showToast('🔔 通知开启');
    } else {
        notif.style.opacity = '0.4';
        notif.style.pointerEvents = 'none';
        showToast('🔕 通知关闭');
    }
}
// ======================== 智能体数据管理 ========================
const STORAGE_KEY = 'aiPhoneAgents';
const CHAT_HISTORY_KEY = 'aiPhoneChatHistory';
const DEFAULT_AGENT = {
    id: 'default',
    name: '小狐狸',
    emoji: '🦊',
    prompt: '你是一只温柔的小狐狸，用朋友的口吻和用户聊天。',
    apiType: 'openai',
    apiUrl: BACKEND_URL + '/v1/chat/completions',
    apiKey: '',
    model: 'gpt-3.5-turbo'
};
let agents = [];
let currentAgentId = 'default';
let editingAgentId = null;
// ---------- 智能体数据 ----------
function loadAgents() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            agents = JSON.parse(stored);
            if (!agents.find(a => a.id === 'default')) {
                agents.unshift(DEFAULT_AGENT);
            }
        } catch(e) {
            agents = [DEFAULT_AGENT];
        }
    } else {
        agents = [DEFAULT_AGENT];
    }
    if (!agents.find(a => a.id === currentAgentId)) {
        currentAgentId = agents[0]?.id || 'default';
    }
    saveAgents();
}
function saveAgents() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
}
function getCurrentAgent() {
    return agents.find(a => a.id === currentAgentId) || agents[0] || DEFAULT_AGENT;
}
// ---------- 聊天记录 ----------
function getChatHistoryKey(agentId) {
    return `${CHAT_HISTORY_KEY}_${agentId}`;
}
function loadChatHistory(agentId) {
    const key = getChatHistoryKey(agentId);
    const stored = localStorage.getItem(key);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch(e) {
            return [];
        }
    }
    return [];
}
function saveChatHistory(agentId, history) {
    const key = getChatHistoryKey(agentId);
    localStorage.setItem(key, JSON.stringify(history));
}
function addMessageToHistory(agentId, type, text) {
    const history = loadChatHistory(agentId);
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    history.push({
        type: type,
        text: text,
        time: `${h}:${m}`,
        timestamp: now.getTime()
    });
    saveChatHistory(agentId, history);
    return history;
}
// ======================== 渲染聊天记录 ========================
function renderChatHistory() {
    const area = document.getElementById('messageArea');
    const agent = getCurrentAgent();
    const history = loadChatHistory(agent.id);
    area.innerHTML = '';
    if (history.length === 0) {
        const defaultMessages = [
            { type: 'character', text: `你好呀 🌸 我是${agent.name}` },
            { type: 'character', text: '今天过得怎么样？' }
        ];
        for (const msg of defaultMessages) {
            appendMessageToArea(msg.type, msg.text, null, true);
            addMessageToHistory(agent.id, msg.type, msg.text);
        }
        return;
    }
    for (const msg of history) {
        appendMessageToArea(msg.type, msg.text, msg.time, true);
    }
    scrollToBottom();
}
function appendMessageToArea(type, text, timeStr, skipSave) {
    const area = document.getElementById('messageArea');
    const row = document.createElement('div');
    row.className = `message-row ${type}`;
    const agent = getCurrentAgent();
    const time = timeStr || (() => {
        const now = new Date();
        return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    })();
    if (type === 'character') {
        row.innerHTML = `
            <div class="message-avatar">${agent.emoji || '🤖'}</div>
            <div>
                <div class="message-bubble">${text}</div>
                <div class="message-time">${time}</div>
            </div>
        `;
    } else {
        row.innerHTML = `
            <div>
                <div class="message-bubble">${text}</div>
                <div class="message-time">${time}</div>
            </div>
        `;
    }
    area.appendChild(row);
    if (!skipSave) {
        addMessageToHistory(agent.id, type, text);
    }
    scrollToBottom();
}
// ======================== 智能体管理界面 ========================
function renderAgentList() {
    const container = document.getElementById('agentList');
    if (!container) return;
    container.innerHTML = '';
    if (agents.length === 0) {
        agents.push({ ...DEFAULT_AGENT, id: 'default' });
        currentAgentId = 'default';
        saveAgents();
    }
    agents.forEach(agent => {
        const card = document.createElement('div');
        card.className = 'agent-card';
        const isDefault = agent.id === currentAgentId;
        card.innerHTML = `
            <div class="agent-avatar">${agent.emoji || '🤖'}</div>
            <div class="agent-info">
                <strong>${agent.name}</strong>
                <small>${agent.apiType} · ${agent.model || '默认'}</small>
                ${agent.apiKey ? '🔑' : '🔓'}
            </div>
            ${isDefault ? '<span class="agent-badge">使用中</span>' : ''}
            <button class="delete-btn" data-id="${agent.id}" title="删除">✕</button>
        `;
        card.addEventListener('click', (e) => {
            if (e.target.closest('.delete-btn')) return;
            currentAgentId = agent.id;
            saveAgents();
            renderAgentList();
            updateChatHeader();
            if (document.getElementById('chatPage').classList.contains('active')) {
                renderChatHistory();
            }
            showToast(`已切换到 ${agent.name}`);
        });
        const delBtn = card.querySelector('.delete-btn');
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (agent.id === 'default') {
                showToast('默认智能体不能删除');
                return;
            }
            if (confirm(`确定要删除“${agent.name}”吗？`)) {
                agents = agents.filter(a => a.id !== agent.id);
                if (currentAgentId === agent.id) {
                    currentAgentId = agents.length > 0 ? agents[0].id : 'default';
                }
                saveAgents();
                renderAgentList();
                updateChatHeader();
                if (document.getElementById('chatPage').classList.contains('active')) {
                    renderChatHistory();
                }
                showToast(`已删除 ${agent.name}`);
            }
        });
        card.addEventListener('dblclick', () => {
            editAgent(agent.id);
        });
        container.appendChild(card);
    });
}
function showCreateAgentForm() {
    editingAgentId = null;
    document.getElementById('formTitle').textContent = '创建智能体';
    document.getElementById('agentFormName').value = '';
    document.getElementById('agentFormEmoji').value = '🤖';
    document.getElementById('agentFormPrompt').value = '你是一个友好的助手。';
    document.getElementById('agentFormApiType').value = 'openai';
    document.getElementById('agentFormApiUrl').value = BACKEND_URL + '/v1/chat/completions';
    document.getElementById('agentFormApiKey').value = '';
    document.getElementById('agentFormModel').value = 'gpt-3.5-turbo';
    document.getElementById('agentFormContainer').style.display = 'block';
    document.getElementById('agentList').style.display = 'none';
}
function editAgent(id) {
    const agent = agents.find(a => a.id === id);
    if (!agent) return;
    editingAgentId = id;
    document.getElementById('formTitle').textContent = '编辑智能体';
    document.getElementById('agentFormName').value = agent.name || '';
    document.getElementById('agentFormEmoji').value = agent.emoji || '🤖';
    document.getElementById('agentFormPrompt').value = agent.prompt || '';
    document.getElementById('agentFormApiType').value = agent.apiType || 'openai';
    document.getElementById('agentFormApiUrl').value = agent.apiUrl || '';
    document.getElementById('agentFormApiKey').value = agent.apiKey || '';
    document.getElementById('agentFormModel').value = agent.model || '';
    document.getElementById('agentFormContainer').style.display = 'block';
    document.getElementById('agentList').style.display = 'none';
}
function cancelAgentForm() {
    document.getElementById('agentFormContainer').style.display = 'none';
    document.getElementById('agentList').style.display = 'block';
}
function saveAgent() {
    const name = document.getElementById('agentFormName').value.trim();
    const emoji = document.getElementById('agentFormEmoji').value.trim() || '🤖';
    const prompt = document.getElementById('agentFormPrompt').value.trim();
    const apiType = document.getElementById('agentFormApiType').value;
    const apiUrl = document.getElementById('agentFormApiUrl').value.trim();
    const apiKey = document.getElementById('agentFormApiKey').value.trim();
    const model = document.getElementById('agentFormModel').value.trim();
    if (!name) { showToast('请输入名称'); return; }
    if (!prompt) { showToast('请输入系统提示词'); return; }
    if (!apiUrl) { showToast('请输入API地址'); return; }
    if (editingAgentId) {
        const agent = agents.find(a => a.id === editingAgentId);
        if (agent) {
            agent.name = name;
            agent.emoji = emoji;
            agent.prompt = prompt;
            agent.apiType = apiType;
            agent.apiUrl = apiUrl;
            agent.apiKey = apiKey;
            agent.model = model;
            saveAgents();
            showToast('已更新');
        }
    } else {
        const newAgent = {
            id: 'agent_' + Date.now(),
            name,
            emoji,
            prompt,
            apiType,
            apiUrl,
            apiKey,
            model
        };
        agents.push(newAgent);
        saveAgents();
        showToast('创建成功');
    }
    cancelAgentForm();
    renderAgentList();
    updateChatHeader();
    if (document.getElementById('chatPage').classList.contains('active')) {
        renderChatHistory();
    }
}
// ======================== 聊天页头部更新 ========================
function updateChatHeader() {
    const agent = getCurrentAgent();
    document.getElementById('chatAvatar').textContent = agent.emoji || '🤖';
    document.getElementById('chatAgentName').textContent = agent.name || '智能体';
    document.getElementById('chatAgentStatus').textContent = agent.apiKey ? '已连接' : '离线(模拟)';
}
// ======================== 聊天核心 ========================
let chatMemory = { userName: null };
function showTyping() {
    const area = document.getElementById('messageArea');
    const existing = document.getElementById('typingIndicator');
    if (existing) return;
    const agent = getCurrentAgent();
    const div = document.createElement('div');
    div.id = 'typingIndicator';
    div.className = 'typing-indicator';
    div.innerHTML = `
        <div class="message-avatar">${agent.emoji || '🤖'}</div>
        <div class="typing-dots"><span></span><span></span><span></span></div>
    `;
    area.appendChild(div);
    scrollToBottom();
}
function hideTyping() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
}
function scrollToBottom() {
    const area = document.getElementById('messageArea');
    setTimeout(() => area.scrollTop = area.scrollHeight, 20);
}
// ========== 工具：文件转base64 ==========
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
}
// ========== 发送消息（支持多模态） ==========
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const fileInput = document.getElementById('fileInput');
    const msg = input.value.trim();
    const files = fileInput.files;
    if (!msg && files.length === 0) {
        showToast('请输入文字或选择图片');
        return;
    }
    const contentParts = [];
    if (msg) {
        contentParts.push({ type: 'text', text: msg });
    }
    for (let file of files) {
        if (!file.type.startsWith('image/')) {
            showToast('只支持图片文件');
            continue;
        }
        try {
            const base64 = await fileToBase64(file);
            contentParts.push({
                type: 'image_url',
                image_url: { url: `data:${file.type};base64,${base64}` }
            });
        } catch (e) {
            showToast('图片读取失败');
            console.error(e);
        }
    }
    input.value = '';
    fileInput.value = '';
    const agent = getCurrentAgent();
    let userDisplayText = msg || '📷 图片';
    appendMessageToArea('user', userDisplayText);
    showTyping();
    try {
        let reply = '';
        if (agent.apiKey && agent.apiUrl) {
            reply = await callAIAPI(agent, contentParts);
        } else {
            reply = getLocalReply(msg, agent);
        }
        hideTyping();
        appendMessageToArea('character', reply);
    } catch (err) {
        hideTyping();
        appendMessageToArea('character', '⚠️ 调用API失败：' + err.message);
        console.error(err);
    }
}

// ========== 调用 AI API（通过 Cloudflare Worker 代理） ==========
async function callAIAPI(agent, userContent) {
    const history = loadChatHistory(agent.id);
    const now = new Date();
    const timeStr = now.toLocaleString('zh-CN', { hour12: false });
    const systemPrompt = agent.prompt + `\n\n当前时间：${timeStr}。请根据当前时间提供合适的回复（例如问候语、时间相关建议等）。`;

    const messages = [
        { role: 'system', content: systemPrompt }
    ];
    const recentHistory = history.slice(-10);
    for (const h of recentHistory) {
        if (h.type === 'user') {
            messages.push({ role: 'user', content: h.text });
        } else if (h.type === 'character') {
            messages.push({ role: 'assistant', content: h.text });
        }
    }
    messages.push({ role: 'user', content: userContent });

    const proxyUrl = BACKEND_URL + '/v1/chat/completions';

    const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${agent.apiKey}`,
            'X-Target-Url': agent.apiUrl,
        },
        body: JSON.stringify({
            model: agent.model || 'gpt-3.5-turbo',
            messages: messages,
            temperature: 0.7,
            max_tokens: 500
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API 错误 (${response.status}): ${errText}`);
    }
    const data = await response.json();
    const msgObj = data.choices?.[0]?.message;
    let reply = msgObj?.content;
    if(!reply && msgObj?.reasoning_content){
        reply = msgObj.reasoning_content;
    }
    console.log("模型返回完整data：", data);
    if (!reply) {
        console.error("返回异常data：", data);
        throw new Error('API 返回格式异常');
    }
    return reply;
}

// ========== 本地模拟回复（带记忆 + 时间感知） ==========
function getLocalReply(msg, agent) {
    const lower = msg.toLowerCase();
    const name = chatMemory.userName;
    const agentName = agent.name || '智能体';
    const now = new Date();
    const hour = now.getHours();
    let greeting = '你好';
    if (hour < 6) greeting = '深夜了';
    else if (hour < 9) greeting = '早上好';
    else if (hour < 12) greeting = '上午好';
    else if (hour < 14) greeting = '中午好';
    else if (hour < 18) greeting = '下午好';
    else if (hour < 21) greeting = '晚上好';
    else greeting = '夜深了';
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    if (lower.includes('我叫') || lower.includes('我是')) {
        const match = msg.match(/我叫\s*([\u4e00-\u9fa5a-zA-Z]+)|我是\s*([\u4e00-\u9fa5a-zA-Z]+)/);
        if (match) {
            const newName = match[1] || match[2];
            if (newName) {
                chatMemory.userName = newName;
                return `${greeting}，${newName}！好棒的名字，我记住你啦～ 我是${agentName}，现在时间是${timeStr}，多多指教 ✨`;
            }
        }
    }
    if (lower.includes('你好') || lower.includes('嗨')) {
        return name ? `${greeting} ${name}！我是${agentName}，现在${timeStr}，今天想聊什么？` : `${greeting}！我是${agentName}，很高兴认识你 🌸 当前时间 ${timeStr}`;
    }
    if (lower.includes('天气')) return '今天天气不错，适合出门走走 ☀️';
    if (lower.includes('名字')) {
        return name ? `你叫 ${name} 呀，我记着呢！` : '我还没问你的名字呢，你叫什么呀？';
    }
    if (lower.includes('帮助')) return '你可以和我聊天、告诉我你的名字，我会一直陪着你 💕';
    if (lower.includes('时间')) {
        return `现在是 ${timeStr}`;
    }
    if (lower.includes('谢谢')) return name ? `不客气 ${name}，和你聊天很开心 😊` : '不客气～';
    if (lower.includes('再见')) return name ? `再见 ${name}，随时来找我玩 👋` : '再见啦～';
    const replies = name ? [
        `嗯嗯 ${name}，我听到了，然后呢？`,
        `原来 ${name} 是这样想的，有意思！`,
        `好哦 ${name}，我记在心里了。`,
        `哈哈，${name} 你太有趣了！`,
        `我懂了 ${name}，继续说说看～`
    ] : [
        '嗯嗯，我听到了，然后呢？',
        '原来是这样想的，有意思！',
        '好哦，我记在心里了。',
        '哈哈，你太有趣了！',
        '我懂了，继续说说看～'
    ];
    return replies[Math.floor(Math.random() * replies.length)];
}
function handleEnter(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }
}
// ======================== 直接编辑当前智能体 ========================
function openCurrentAgentEditor() {
    hideAllPages();
    document.getElementById('agentManagerPage').classList.add('active');
    renderAgentList();
    const agent = getCurrentAgent();
    if (agent) {
        editAgent(agent.id);
    } else {
        showToast('没有可编辑的智能体');
    }
}
// ======================== 初始化 ========================
document.addEventListener('DOMContentLoaded', function() {
    loadAgents();
    updateChatHeader();
    renderAgentList();
    const chatPage = document.getElementById('chatPage');
    if (chatPage.classList.contains('active')) {
        renderChatHistory();
    }
    const chatBtn = document.querySelector('.phone-bottom button:nth-child(2)');
    if (chatBtn) {
        chatBtn.addEventListener('click', function() {
            setTimeout(renderChatHistory, 50);
        });
    }
});
