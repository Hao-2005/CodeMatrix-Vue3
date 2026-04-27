<script setup>
import { ref, nextTick, watch } from 'vue'
import axios from 'axios'
import { marked } from 'marked'

// ==================== Props ====================
const props = defineProps({
  // 推荐提问列表，格式：[{ label: '问题文本', type: 'chat' | 'metric' }]
  suggestions: {
    type: Array,
    default: () => [],
  },
  // 当点击"分析度量结果"时，传入 metric-review 接口所需的 payload
  metricPayload: {
    type: Object,
    default: null,
  },
  // 初始欢迎语
  welcomeMessage: {
    type: String,
    default: '你好，有问题可以随时问我！',
  },
})

// ==================== 展开/收起 ====================
const isOpen = ref(false)

function togglePanel() {
  isOpen.value = !isOpen.value
  if (isOpen.value && messages.value.length === 0) {
    // 首次展开，发送欢迎语
    messages.value.push({ role: 'ai', content: props.welcomeMessage, time: getTime() })
  }
}

// ==================== 消息列表 ====================
const messages = ref([])
const inputText = ref('')
const isLoading = ref(false)
const messagesEndRef = ref(null)

function getTime() {
  const now = new Date()
  return now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')
}

async function scrollToBottom() {
  await nextTick()
  if (messagesEndRef.value) {
    messagesEndRef.value.scrollIntoView({ behavior: 'smooth' })
  }
}

// ==================== 发送消息 ====================
async function sendMessage(text) {
  const content = (text || inputText.value).trim()
  if (!content || isLoading.value) return

  messages.value.push({ role: 'user', content, time: getTime() })
  inputText.value = ''
  isLoading.value = true
  console.log('Sending message:', content)
  console.log('Loading:', isLoading.value)
  await scrollToBottom()

  try {
    const res = await axios.post('http://localhost:8080/api/ai/chat', { prompt: content })
    console.log('Response:', res.data)
    const reply = res.data?.data?.answer || '抱歉，未能获取回复。'
    console.log('Reply:', reply)
    messages.value.push({ role: 'ai', content: reply, time: getTime() })
    console.log('Messages:', messages.value)
  } catch {
    messages.value.push({ role: 'ai', content: '请求失败，请检查网络连接或稍后重试。', time: getTime() })
  } finally {
    isLoading.value = false
    console.log('Loading:', isLoading.value)
    await scrollToBottom()
  }
}

// ==================== 推荐提问点击 ====================
async function handleSuggestion(suggestion) {
  if (isLoading.value) return

  if (suggestion.type === 'metric' && props.metricPayload) {
    // 分析度量结果：直接调用 metric-review 接口
    messages.value.push({ role: 'user', content: suggestion.label, time: getTime() })
    isLoading.value = true
    await scrollToBottom()
    try {
      const res = await axios.post('http://localhost:8080/api/ai/metric-review', props.metricPayload)
      const d = res.data?.data || res.data
      let reply = ''
      if (typeof d === 'string') {
        reply = d
      } else if (d) {
        const parts = []
        if (d.overallAssessment) parts.push(`**总体评价**\n${d.overallAssessment}`)
        if (d.riskLevel)         parts.push(`**风险等级**：${d.riskLevel}`)
        if (d.keyFindings)       parts.push(`**关键发现**\n${Array.isArray(d.keyFindings) ? d.keyFindings.join('\n') : d.keyFindings}`)
        if (d.suggestions)       parts.push(`**改进建议**\n${Array.isArray(d.suggestions) ? d.suggestions.join('\n') : d.suggestions}`)
        reply = parts.join('\n\n') || JSON.stringify(d)
      } else {
        reply = '暂无分析结果。'
      }
      messages.value.push({ role: 'ai', content: reply, time: getTime() })
    } catch {
      messages.value.push({ role: 'ai', content: '度量分析请求失败，请稍后重试。', time: getTime() })
    } finally {
      isLoading.value = false
      await scrollToBottom()
    }
  } else {
    // 普通问题：走 chat 接口
    await sendMessage(suggestion.label)
  }
}

function renderMarkdown(content) {
  return marked.parse(content || '')
}

// ==================== 键盘发送 ====================
function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}
</script>

<template>
  <!-- 收起状态：仅显示悬浮按钮 -->
  <div v-if="!isOpen" class="ai-fab" @click="togglePanel" title="展开AI对话">
    <img src="../assets/AI.png" alt="AI" class="fab-avatar" />
    <span class="fab-label">AI对话助手</span>
    <span class="fab-arrow">›</span>
  </div>

  <!-- 展开状态：右侧面板 -->
  <transition name="slide-panel">
    <div v-if="isOpen" class="ai-panel">
      <!-- 头部 -->
      <div class="panel-header">
        <div class="header-left">
          <img src="../assets/AI.png" alt="AI" class="header-avatar" />
          <div class="header-info">
            <span class="header-title">软件质量保证-杨老师</span>
            <span class="header-subtitle">帮助你分析代码、解释问题、生成建议</span>
          </div>
        </div>
        <button class="close-btn" @click="togglePanel" title="收起">‹</button>
      </div>

      <!-- 消息区 -->
      <div class="messages-area">
        <div
          v-for="(msg, idx) in messages"
          :key="idx"
          class="message-row"
          :class="msg.role === 'user' ? 'user-row' : 'ai-row'"
        >
          <!-- AI 头像 -->
          <img v-if="msg.role === 'ai'" src="../assets/AI.png" alt="AI" class="msg-avatar" />

          <div class="msg-body">
            <div
              class="msg-bubble"
              :class="msg.role === 'user' ? 'user-bubble' : 'ai-bubble'"
            >
              <span class="msg-text markdown-body" v-html="renderMarkdown(msg.content)"></span>
            </div>
            <span class="msg-time">{{ msg.time }}</span>
          </div>

          <!-- 用户头像 -->
          <img v-if="msg.role === 'user'" src="../assets/user.png" alt="用户" class="msg-avatar" />
        </div>

        <!-- 加载动画 -->
        <div v-if="isLoading" class="message-row ai-row">
          <img src="../assets/AI.png" alt="AI" class="msg-avatar" />
          <div class="msg-body">
            <div class="msg-bubble ai-bubble loading-bubble">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>
          </div>
        </div>

        <div ref="messagesEndRef"></div>
      </div>

      <!-- 推荐提问 -->
      <div v-if="suggestions.length" class="suggestions-area">
        <span class="suggestions-label">推荐提问</span>
        <div class="suggestions-list">
          <button
            v-for="(s, i) in suggestions"
            :key="i"
            class="suggestion-chip"
            @click="handleSuggestion(s)"
          >{{ s.label }}</button>
        </div>
      </div>

      <!-- 输入区 -->
      <div class="input-area">
        <textarea
          v-model="inputText"
          class="chat-input"
          placeholder="输入问题，例如：这个类的复杂度高吗？"
          rows="2"
          @keydown="handleKeydown"
        ></textarea>
        <button class="send-btn" @click="sendMessage" :disabled="isLoading">
          <img
            :src="inputText.trim() ? '../src/assets/send.png' : '../src/assets/cannotSend.png'"
            alt="发送"
            class="send-icon"
          />
        </button>
      </div>

      <div class="panel-footer">
        <span>ⓘ AI 生成的内容仅供参考，请结合实际情况判断</span>
      </div>
    </div>
  </transition>
</template>

<style scoped>
/* ========== 悬浮按钮（收起态） ========== */
.ai-fab {
  position: fixed;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  border: 1px solid #e0e8f4;
  border-right: none;
  border-radius: 12px 0 0 12px;
  padding: 14px 10px;
  cursor: pointer;
  box-shadow: -2px 0 16px rgba(74, 158, 255, 0.12);
  z-index: 1000;
  transition: box-shadow 0.2s;
  writing-mode: vertical-rl;
  text-orientation: mixed;
}
.ai-fab:hover {
  box-shadow: -4px 0 24px rgba(74, 158, 255, 0.22);
}
.fab-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  writing-mode: horizontal-tb;
  margin-bottom: 4px;
}
.fab-label {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  writing-mode: vertical-rl;
}
.fab-arrow {
  font-size: 16px;
  color: #4a9eff;
  writing-mode: horizontal-tb;
}

/* ========== 面板容器 ========== */
.ai-panel {
  position: fixed;
  right: 0;
  top: 0;
  height: 100vh;
  width: 340px;
  background: #f7f9fc;
  border-left: 1px solid #e0e8f4;
  box-shadow: -4px 0 32px rgba(74, 158, 255, 0.10);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  overflow: hidden;
}

/* ========== 面板过渡动画 ========== */
.slide-panel-enter-active,
.slide-panel-leave-active {
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.28s;
}
.slide-panel-enter-from,
.slide-panel-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* ========== 头部 ========== */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 14px;
  background: #ffffff;
  border-bottom: 1px solid #e8eef8;
  flex-shrink: 0;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.header-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e8f0fe;
}
.header-info {
  display: flex;
  flex-direction: column;
}
.header-title {
  font-size: 15px;
  font-weight: 700;
  color: #1e2d4a;
  line-height: 1.3;
}
.header-subtitle {
  font-size: 11px;
  color: #8a94a6;
  margin-top: 1px;
}
.close-btn {
  background: none;
  border: none;
  font-size: 22px;
  color: #8a94a6;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  line-height: 1;
  transition: background 0.15s, color 0.15s;
}
.close-btn:hover {
  background: #f0f4fa;
  color: #334155;
}

/* ========== 消息区 ========== */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  scroll-behavior: smooth;
}
.messages-area::-webkit-scrollbar {
  width: 4px;
}
.messages-area::-webkit-scrollbar-thumb {
  background: #d0d9e8;
  border-radius: 4px;
}

.message-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.user-row {
  flex-direction: row-reverse;
}
.msg-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 2px;
  background: #e8f0fe;
}
.msg-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-width: 78%;
}
.user-row .msg-body {
  align-items: flex-end;
}

.msg-bubble {
  padding: 10px 13px;
  border-radius: 12px;
  font-size: 13.5px;
  line-height: 1.6;
  word-break: break-word;
}
.user-bubble {
  background: #EDF3FE;
  color: #1e2d4a;
  border-bottom-right-radius: 4px;
}
.ai-bubble {
  background: #ffffff;
  color: #1e2d4a;
  border: 1px solid #e8eef8;
  border-bottom-left-radius: 4px;
}

.msg-time {
  font-size: 11px;
  color: #b0bad0;
  padding: 0 2px;
}

/* ========== 加载动画 ========== */
.loading-bubble {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 12px 16px;
}
.dot {
  width: 7px;
  height: 7px;
  background: #4a9eff;
  border-radius: 50%;
  animation: bounce 1.2s infinite ease-in-out;
}
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
  40%            { transform: scale(1);   opacity: 1; }
}

/* ========== 推荐提问 ========== */
.suggestions-area {
  padding: 10px 14px 10px;
  border-top: 1px solid #e8eef8;
  flex-shrink: 0;
}
.suggestions-label {
  font-size: 12px;
  color: #8a94a6;
  font-weight: 600;
  display: block;
  margin-bottom: 7px;
}
.suggestions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.suggestion-chip {
  background: #f0f5ff;
  border: 1px solid #c7d9f8;
  color: #3b72d4;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 20px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;
}
.suggestion-chip:hover {
  background: #ddeaff;
  border-color: #4a9eff;
}

/* ========== 输入区 ========== */
.input-area {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 14px;
  background: #ffffff;
  border-top: 1px solid #e8eef8;
  flex-shrink: 0;
}
.chat-input {
  flex: 1;
  border: 1px solid #dde5f0;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13px;
  color: #1e2d4a;
  resize: none;
  outline: none;
  font-family: inherit;
  line-height: 1.5;
  background: #f7f9fc;
  transition: border-color 0.2s;
}
.chat-input:focus {
  border-color: #4a9eff;
  background: #ffffff;
}
.chat-input::placeholder {
  color: #b0bad0;
}
.send-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.15s;
  display: flex;
  align-items: center;
}
.send-btn:hover:not(:disabled) {
  transform: scale(1.08);
}
.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.send-icon {
  width: 36px;
  height: 36px;
  object-fit: contain;
}

/* ========== 底部说明 ========== */
.panel-footer {
  text-align: center;
  font-size: 11px;
  color: #b0bad0;
  padding: 6px 14px 10px;
  background: #ffffff;
  flex-shrink: 0;
}

/* Markdown 渲染样式 */
:deep(.markdown-body) {
  line-height: 1.7;
  font-size: 13.5px;
  color: #1e2d4a;
}
:deep(.markdown-body h1),
:deep(.markdown-body h2),
:deep(.markdown-body h3) {
  font-weight: 700;
  margin: 10px 0 6px;
  color: #1e2d4a;
}
:deep(.markdown-body h1) { font-size: 16px; }
:deep(.markdown-body h2) { font-size: 15px; }
:deep(.markdown-body h3) { font-size: 14px; }
:deep(.markdown-body p)  { margin: 4px 0; }
:deep(.markdown-body strong) { font-weight: 700; color: #1a2d4a; }
:deep(.markdown-body em)     { font-style: italic; }
:deep(.markdown-body ul),
:deep(.markdown-body ol) {
  padding-left: 18px;
  margin: 6px 0;
}
:deep(.markdown-body li) { margin: 3px 0; }
:deep(.markdown-body code) {
  background: #f0f4fa;
  border-radius: 4px;
  padding: 1px 5px;
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  font-size: 12.5px;
  color: #3b6fd4;
}
:deep(.markdown-body pre) {
  background: #f0f4fa;
  border-radius: 8px;
  padding: 12px 14px;
  overflow-x: auto;
  margin: 8px 0;
}
:deep(.markdown-body pre code) {
  background: none;
  padding: 0;
  color: #1e2d4a;
}
:deep(.markdown-body blockquote) {
  border-left: 3px solid #4a9eff;
  margin: 6px 0;
  padding: 4px 12px;
  color: #5a6a80;
  background: #f5f8ff;
  border-radius: 0 6px 6px 0;
}
:deep(.markdown-body hr) {
  border: none;
  border-top: 1px solid #e8eef8;
  margin: 10px 0;
}
:deep(.markdown-body table) {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
  font-size: 13px;
}
:deep(.markdown-body th),
:deep(.markdown-body td) {
  border: 1px solid #dde5f0;
  padding: 6px 10px;
  text-align: left;
}
:deep(.markdown-body th) {
  background: #f0f5ff;
  font-weight: 700;
}
</style>