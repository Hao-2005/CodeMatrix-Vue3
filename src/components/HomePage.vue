<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const features = [
  {
    title: '功能点度量',
    desc: '基于 IFPUG 标准，通过 UFP 与 VAF 量化系统功能规模，评估开发工作量。',
    path: '/fp',
    icon: '◈',
    color: '#4a9eff',
    gradient: 'linear-gradient(135deg, #e8f3ff 0%, #dbeeff 100%)',
    accentColor: '#3b6fd4',
    tag: 'IFPUG',
  },
  {
    title: '用例点度量',
    desc: '依据 Karner 方法，结合用例复杂度与技术/环境因子，精准估算项目规模。',
    path: '/use-case',
    icon: '◉',
    color: '#36c9a0',
    gradient: 'linear-gradient(135deg, #e6faf4 0%, #d2f5e8 100%)',
    accentColor: '#22a87e',
    tag: 'UCP',
  },
  {
    title: '面向对象度量',
    desc: '运用 CK 度量套件，从类的耦合、内聚、继承等维度全面分析 OO 设计质量。',
    path: '/class-diagram',
    icon: '⬡',
    color: '#9b72e8',
    gradient: 'linear-gradient(135deg, #f3eeff 0%, #ebe0ff 100%)',
    accentColor: '#7c4fd4',
    tag: 'CK Suite',
  },
  {
    title: '代码度量',
    desc: '静态分析代码复杂度、行数及注释覆盖率，量化可维护性与技术债务。',
    path: '/code-metric',
    icon: '⟨/⟩',
    color: '#f5a623',
    gradient: 'linear-gradient(135deg, #fff8e8 0%, #ffefd0 100%)',
    accentColor: '#d4820a',
    tag: 'Static',
  },
]

const aiFeatures = [
  {
    title: 'AI 对话与评估',
    desc: '智能分析度量结果，提供专业建议与风险预警，辅助工程决策。',
    icon: '✦',
    color: '#e05c7a',
  },
  {
    title: 'AI 代码优化',
    desc: '基于度量数据自动识别代码异味，生成可执行的重构方案。',
    icon: '⚡',
    color: '#4a9eff',
  },
]

const stats = [
  { label: '支持度量方法', value: '4', unit: '种' },
  { label: 'AI 功能', value: '2', unit: '项' },
  { label: '度量维度', value: '20+', unit: '个' },
  { label: '结果可视化', value: '全', unit: '覆盖' },
]

const visible = ref(false)
onMounted(() => {
  setTimeout(() => { visible.value = true }, 80)
})
</script>

<template>
  <div class="home-page" :class="{ 'is-visible': visible }">

    <!-- Hero -->
    <section class="hero">
      <div class="hero-bg">
        <div class="grid-pattern"></div>
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
      </div>
      <div class="hero-content">
        <div class="hero-badge">Software Measurement Platform</div>
        <h1 class="hero-title">
          软件度量<br/>
          <span class="hero-accent">智能分析平台</span>
        </h1>
        <p class="hero-sub">
          集成功能点、用例点、面向对象与代码静态度量，结合 AI 智能评估，<br/>
          为软件工程项目提供全方位的量化分析与决策支持。
        </p>
        <div class="hero-actions">
          <button class="btn-primary" @click="router.push('/fp')">
            <span>开始度量</span>
            <span class="btn-arrow">→</span>
          </button>
          <button class="btn-ghost" @click="router.push('/code-metric')">
            查看代码度量
          </button>
        </div>
      </div>
      <div class="hero-visual">
        <div class="visual-card vc-1">
          <div class="vc-label">功能点</div>
          <div class="vc-value" style="color:#4a9eff">FP</div>
          <div class="vc-bar"><div class="vc-fill" style="width:78%;background:#4a9eff"></div></div>
        </div>
        <div class="visual-card vc-2">
          <div class="vc-label">用例点</div>
          <div class="vc-value" style="color:#36c9a0">UCP</div>
          <div class="vc-bar"><div class="vc-fill" style="width:62%;background:#36c9a0"></div></div>
        </div>
        <div class="visual-card vc-3">
          <div class="vc-label">CK 度量</div>
          <div class="vc-value" style="color:#9b72e8">OO</div>
          <div class="vc-bar"><div class="vc-fill" style="width:85%;background:#9b72e8"></div></div>
        </div>
        <div class="visual-card vc-4">
          <div class="vc-label">代码复杂度</div>
          <div class="vc-value" style="color:#f5a623">CC</div>
          <div class="vc-bar"><div class="vc-fill" style="width:55%;background:#f5a623"></div></div>
        </div>
      </div>
    </section>

    <!-- Stats Bar -->
    <section class="stats-bar">
      <div
        v-for="(s, i) in stats"
        :key="i"
        class="stat-item"
      >
        <span class="stat-value">{{ s.value }}</span>
        <span class="stat-unit">{{ s.unit }}</span>
        <span class="stat-label">{{ s.label }}</span>
      </div>
    </section>

    <!-- Feature Cards -->
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">度量方法</h2>
        <p class="section-desc">四种经典软件度量标准，覆盖规模估算到质量评估的完整流程</p>
      </div>
      <div class="features-grid">
        <div
          v-for="(f, i) in features"
          :key="i"
          class="feature-card"
          :style="{ '--card-color': f.color, '--card-gradient': f.gradient, '--card-accent': f.accentColor }"
          @click="router.push(f.path)"
        >
          <div class="fc-top">
            <div class="fc-icon" :style="{ color: f.color }">{{ f.icon }}</div>
            <span class="fc-tag" :style="{ color: f.accentColor, background: f.gradient }">{{ f.tag }}</span>
          </div>
          <h3 class="fc-title">{{ f.title }}</h3>
          <p class="fc-desc">{{ f.desc }}</p>
          <div class="fc-footer">
            <span class="fc-link">进入度量 →</span>
          </div>
          <div class="fc-bg-accent"></div>
        </div>
      </div>
    </section>

    <!-- AI Features -->
    <section class="section ai-section">
      <div class="ai-inner">
        <div class="ai-left">
          <div class="ai-badge">✦ AI 增强</div>
          <h2 class="ai-title">智能辅助<br/>驱动决策</h2>
          <p class="ai-desc">
            内置 AI 引擎深度集成度量数据，不仅能回答工程问题，更能主动识别潜在风险，提供量化的优化建议。
          </p>
          <div class="ai-cards">
            <div
              v-for="(a, i) in aiFeatures"
              :key="i"
              class="ai-feature-item"
            >
              <span class="ai-feat-icon" :style="{ color: a.color }">{{ a.icon }}</span>
              <div>
                <div class="ai-feat-title">{{ a.title }}</div>
                <div class="ai-feat-desc">{{ a.desc }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="ai-right">
          <div class="ai-chat-demo">
            <div class="demo-bar">
              <span class="demo-dot" style="background:#ff5f57"></span>
              <span class="demo-dot" style="background:#febc2e"></span>
              <span class="demo-dot" style="background:#28c840"></span>
              <span class="demo-title">AI 智能分析</span>
            </div>
            <div class="demo-body">
              <div class="demo-msg ai">
                <div class="msg-avatar">AI</div>
                <div class="msg-bubble">检测到模块耦合度（CBO）偏高，建议引入接口抽象层以降低依赖。</div>
              </div>
              <div class="demo-msg user">
                <div class="msg-bubble">如何优化功能点中的 EIF 数量？</div>
                <div class="msg-avatar">U</div>
              </div>
              <div class="demo-msg ai">
                <div class="msg-avatar">AI</div>
                <div class="msg-bubble">可考虑合并相似外部接口、提取公共数据服务，预计可减少约 15% 的 UFP。</div>
              </div>
              <div class="demo-typing">
                <div class="msg-avatar">AI</div>
                <div class="typing-dots"><span></span><span></span><span></span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Quick Start -->
    <section class="section quick-section">
      <div class="section-header">
        <h2 class="section-title">快速导航</h2>
        <p class="section-desc">选择度量方式，立即开始分析</p>
      </div>
      <div class="quick-grid">
        <div
          v-for="(f, i) in features"
          :key="i"
          class="quick-item"
          @click="router.push(f.path)"
        >
          <div class="qi-icon" :style="{ color: f.color }">{{ f.icon }}</div>
          <span class="qi-label">{{ f.title }}</span>
          <span class="qi-arrow" :style="{ color: f.color }">→</span>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="home-footer">
      <div class="footer-logo">
        <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="12" stroke="#4a9eff" stroke-width="2.5" fill="none"/>
          <path d="M8 14 L12 10 L16 14 L20 10" stroke="#4a9eff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
        <span>软件度量系统</span>
      </div>
      <span class="footer-copy">软件工程课程项目 · Vue 3 + Spring Boot</span>
    </footer>
  </div>
</template>

<style scoped>
/* ===== Base ===== */
.home-page {
  width: 100%;
  min-height: 100vh;
  background: #f4f7fc;
  overflow-x: hidden;
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.home-page.is-visible {
  opacity: 1;
  transform: translateY(0);
}

/* ===== Hero ===== */
.hero {
  position: relative;
  background: linear-gradient(135deg, #1a2a4a 0%, #1e3460 60%, #24417a 100%);
  padding: 64px 48px 56px;
  display: flex;
  align-items: center;
  gap: 48px;
  overflow: hidden;
  min-height: 360px;
}

.hero-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.grid-pattern {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(74,158,255,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(74,158,255,0.06) 1px, transparent 1px);
  background-size: 40px 40px;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.18;
}
.blob-1 {
  width: 340px; height: 340px;
  background: #4a9eff;
  top: -80px; right: 160px;
  animation: blobFloat 8s ease-in-out infinite;
}
.blob-2 {
  width: 240px; height: 240px;
  background: #9b72e8;
  bottom: -60px; right: 60px;
  animation: blobFloat 10s ease-in-out infinite reverse;
}

@keyframes blobFloat {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-20px) scale(1.05); }
}

.hero-content {
  flex: 1;
  position: relative;
  z-index: 1;
}

.hero-badge {
  display: inline-block;
  padding: 4px 14px;
  border-radius: 20px;
  background: rgba(74,158,255,0.15);
  border: 1px solid rgba(74,158,255,0.35);
  color: #7ec8ff;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 20px;
}

.hero-title {
  font-size: 42px;
  font-weight: 800;
  color: #e8eef8;
  line-height: 1.2;
  margin: 0 0 16px;
  letter-spacing: 1px;
}

.hero-accent {
  background: linear-gradient(90deg, #4a9eff, #7ec8ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-sub {
  font-size: 14px;
  color: #93aacc;
  line-height: 1.9;
  margin: 0 0 32px;
  max-width: 480px;
}

.hero-actions {
  display: flex;
  gap: 14px;
  align-items: center;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 28px;
  background: linear-gradient(90deg, #3b6fd4, #4a9eff);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(74,158,255,0.4);
  transition: transform 0.15s, box-shadow 0.15s;
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(74,158,255,0.5);
}
.btn-arrow {
  font-size: 16px;
  transition: transform 0.2s;
}
.btn-primary:hover .btn-arrow {
  transform: translateX(4px);
}

.btn-ghost {
  padding: 12px 24px;
  background: transparent;
  color: #93aacc;
  border: 1.5px solid rgba(255,255,255,0.15);
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-ghost:hover {
  border-color: rgba(74,158,255,0.5);
  color: #7ec8ff;
  background: rgba(74,158,255,0.06);
}

/* Hero Visual */
.hero-visual {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  flex-shrink: 0;
  width: 260px;
  position: relative;
  z-index: 1;
}

.visual-card {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 14px 16px;
  backdrop-filter: blur(6px);
  transition: transform 0.2s;
}
.visual-card:hover { transform: translateY(-2px); }

.vc-label { font-size: 11px; color: #7a90b0; margin-bottom: 4px; }
.vc-value { font-size: 18px; font-weight: 800; margin-bottom: 8px; }
.vc-bar { height: 4px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; }
.vc-fill { height: 100%; border-radius: 4px; transition: width 1s ease; }

/* ===== Stats Bar ===== */
.stats-bar {
  background: #fff;
  border-bottom: 1px solid #e8eef8;
  display: flex;
  justify-content: center;
  padding: 0;
}

.stat-item {
  display: flex;
  align-items: baseline;
  gap: 4px;
  padding: 22px 48px;
  border-right: 1px solid #e8eef8;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
}
.stat-item:last-child { border-right: none; }

.stat-value {
  font-size: 28px;
  font-weight: 800;
  color: #1e2d4a;
  line-height: 1;
}
.stat-unit {
  font-size: 13px;
  color: #4a9eff;
  font-weight: 700;
  margin-right: 8px;
}
.stat-label {
  font-size: 12px;
  color: #8a94a6;
  width: 100%;
  text-align: center;
  margin-top: 2px;
}

/* ===== Sections ===== */
.section {
  padding: 56px 48px;
}

.section-header {
  margin-bottom: 36px;
}

.section-title {
  font-size: 24px;
  font-weight: 800;
  color: #1e2d4a;
  margin: 0 0 8px;
  letter-spacing: 0.5px;
}

.section-desc {
  font-size: 13.5px;
  color: #8a94a6;
  margin: 0;
}

/* ===== Feature Cards ===== */
.features-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.feature-card {
  position: relative;
  background: #fff;
  border-radius: 16px;
  padding: 26px 24px;
  cursor: pointer;
  overflow: hidden;
  border: 1.5px solid #edf2fa;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  box-shadow: 0 2px 12px rgba(30,45,74,0.05);
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(30,45,74,0.12);
  border-color: var(--card-color);
}

.feature-card:hover .fc-bg-accent {
  opacity: 1;
}

.fc-bg-accent {
  position: absolute;
  inset: 0;
  background: var(--card-gradient);
  opacity: 0;
  transition: opacity 0.25s;
  z-index: 0;
}

.fc-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
}

.fc-icon {
  font-size: 26px;
  line-height: 1;
}

.fc-tag {
  font-size: 10.5px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 20px;
  letter-spacing: 0.5px;
}

.fc-title {
  font-size: 15px;
  font-weight: 700;
  color: #1e2d4a;
  margin: 0 0 10px;
  position: relative;
  z-index: 1;
}

.fc-desc {
  font-size: 12.5px;
  color: #6b7a94;
  line-height: 1.8;
  margin: 0 0 20px;
  position: relative;
  z-index: 1;
}

.fc-footer {
  position: relative;
  z-index: 1;
}

.fc-link {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--card-color);
  transition: letter-spacing 0.2s;
}

.feature-card:hover .fc-link {
  letter-spacing: 1px;
}

/* ===== AI Section ===== */
.ai-section {
  background: linear-gradient(135deg, #1a2a4a 0%, #1e3460 100%);
  padding: 56px 48px;
}

.ai-inner {
  display: flex;
  gap: 56px;
  align-items: center;
}

.ai-left {
  flex: 1;
}

.ai-badge {
  display: inline-block;
  padding: 4px 14px;
  border-radius: 20px;
  background: rgba(74,158,255,0.15);
  border: 1px solid rgba(74,158,255,0.3);
  color: #7ec8ff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 20px;
}

.ai-title {
  font-size: 32px;
  font-weight: 800;
  color: #e8eef8;
  line-height: 1.25;
  margin: 0 0 16px;
}

.ai-desc {
  font-size: 13.5px;
  color: #7a90b0;
  line-height: 1.9;
  margin: 0 0 32px;
  max-width: 400px;
}

.ai-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ai-feature-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 20px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  transition: background 0.15s;
}
.ai-feature-item:hover {
  background: rgba(255,255,255,0.09);
}

.ai-feat-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 1px;
}

.ai-feat-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #c8d8f0;
  margin-bottom: 4px;
}

.ai-feat-desc {
  font-size: 12px;
  color: #7a90b0;
  line-height: 1.7;
}

/* AI Chat Demo */
.ai-right {
  flex: 1;
  display: flex;
  justify-content: center;
}

.ai-chat-demo {
  width: 100%;
  max-width: 400px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  overflow: hidden;
  backdrop-filter: blur(8px);
}

.demo-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  background: rgba(255,255,255,0.05);
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.demo-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.demo-title {
  margin-left: 8px;
  font-size: 12px;
  color: #7a90b0;
  font-weight: 600;
}

.demo-body {
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.demo-msg {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.demo-msg.user {
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b6fd4, #4a9eff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}
.demo-msg.user .msg-avatar {
  background: linear-gradient(135deg, #36c9a0, #22a87e);
}

.msg-bubble {
  background: rgba(255,255,255,0.07);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 12px;
  color: #c8d8f0;
  line-height: 1.7;
  max-width: 280px;
}
.demo-msg.user .msg-bubble {
  background: rgba(74,158,255,0.15);
  color: #a8ccf0;
}

.demo-typing {
  display: flex;
  align-items: center;
  gap: 10px;
}

.typing-dots {
  display: flex;
  gap: 5px;
  padding: 12px 14px;
  background: rgba(255,255,255,0.07);
  border-radius: 10px;
}

.typing-dots span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #4a9eff;
  animation: typingBounce 1.2s ease-in-out infinite;
}
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typingBounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-5px); opacity: 1; }
}

/* ===== Quick Grid ===== */
.quick-section {
  background: #fff;
  border-top: 1px solid #e8eef8;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.quick-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 20px;
  background: #f7faff;
  border: 1.5px solid #e8eef8;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.18s;
}
.quick-item:hover {
  background: #fff;
  border-color: #4a9eff;
  box-shadow: 0 4px 16px rgba(74,158,255,0.1);
  transform: translateY(-2px);
}

.qi-icon {
  font-size: 20px;
  flex-shrink: 0;
}
.qi-label {
  flex: 1;
  font-size: 13.5px;
  font-weight: 600;
  color: #2d3748;
}
.qi-arrow {
  font-size: 16px;
  font-weight: 700;
  transition: transform 0.2s;
}
.quick-item:hover .qi-arrow {
  transform: translateX(4px);
}

/* ===== Footer ===== */
.home-footer {
  background: #fff;
  border-top: 1px solid #e8eef8;
  padding: 20px 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.footer-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #4a6fa5;
}

.footer-copy {
  font-size: 12px;
  color: #a0aec0;
}

/* ===== Responsive ===== */
@media (max-width: 1100px) {
  .features-grid,
  .quick-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .hero-visual {
    display: none;
  }
}
</style>