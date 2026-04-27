<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import * as echarts from 'echarts'

const route  = useRoute()
const router = useRouter()

const originalCode  = ref(route.query.originalCode || '')
const originalFile  = ref(route.query.filename || '')
const optimizedCode = ref('')
const aiLoading     = ref(false)
const aiError       = ref('')

const saveLoading   = ref(false)
const savedFilename = ref('')
const saveError     = ref('')

const ckLoading     = ref(false)
const ckError       = ref('')
const ckOriginal    = ref([])
const ckOptimized   = ref([])

const radarOrigRef  = ref(null)
const radarOptRef   = ref(null)
let radarOrigChart  = null
let radarOptChart   = null

const metrics    = ['WMC', 'RFC', 'DIT', 'NOC', 'LCOM', 'CBO']
const metricDesc = {
  WMC: '每个类的加权方法数', RFC: '类的响应集',
  DIT: '继承树深度',         NOC: '子类数量',
  LCOM: '方法缺乏内聚度',   CBO: '类之间的耦合',
}

const hasOptimized = computed(() => !!optimizedCode.value)
const hasBothCK    = computed(() => ckOriginal.value.length && ckOptimized.value.length)

function summaryOf(data) {
  if (!data.length) return null
  const r = {}
  metrics.forEach(m => {
    const vals = data.map(d => d[m.toLowerCase()] ?? 0)
    r[m] = {
      max: Math.max(...vals),
      avg: (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2),
    }
  })
  return r
}

const summaryOrig = computed(() => summaryOf(ckOriginal.value))
const summaryOpt  = computed(() => summaryOf(ckOptimized.value))

// ── AI 优化 ──────────────────────────────────────────────────────────────────
async function requestAIOptimize() {
  if (!originalCode.value) return
  aiLoading.value = true
  aiError.value   = ''
  optimizedCode.value = ''
  savedFilename.value = ''
  ckOriginal.value    = []
  ckOptimized.value   = []

  try {
    const res = await axios.post('http://localhost:8080/api/ai/optimize', {
      code:     originalCode.value,
      filename: originalFile.value,
    })
    optimizedCode.value = res.data?.data ?? res.data?.optimizedCode ?? ''
  } catch {
    aiError.value = 'AI 优化请求失败，请确认后端 AI 接口已启动。'
  } finally {
    aiLoading.value = false
  }
}

// ── 保存优化后代码并获取 CK ──────────────────────────────────────────────────
async function saveAndAnalyze() {
  if (!optimizedCode.value) return
  saveLoading.value = true
  saveError.value   = ''
  savedFilename.value = ''
  ckOriginal.value    = []
  ckOptimized.value   = []

  try {
    // 1. 把优化后代码转成 Blob，用 multipart/form-data 上传（与原始接口一致）
    const blob = new Blob([optimizedCode.value], { type: 'text/xml' })
    const optimizedFilename = 'ai_optimized_' + originalFile.value
    const formData = new FormData()
    formData.append('file', blob, optimizedFilename)
    await axios.post('http://localhost:8080/api/uploadFile', formData)
    savedFilename.value = optimizedFilename

    // 2. 并行跑两份 CK
    ckLoading.value = true
    ckError.value   = ''
    const [origRes, optRes] = await Promise.all([
      axios.post('http://localhost:8080/api/ck/ck?name=' + originalFile.value),
      axios.post('http://localhost:8080/api/ck/ck?name=' + savedFilename.value),
    ])
    ckOriginal.value  = origRes.data?.data ?? []
    ckOptimized.value = optRes.data?.data  ?? []
  } catch {
    saveError.value = '保存或 CK 分析失败，请确认后端已启动。'
  } finally {
    saveLoading.value = false
    ckLoading.value   = false
  }
}

// ── 图表 ─────────────────────────────────────────────────────────────────────
function buildRadarOption(data, title) {
  const maxVals   = metrics.map(m => Math.max(...data.map(d => d[m.toLowerCase()] ?? 0), 1))
  const indicator = metrics.map((m, i) => ({ name: m, max: maxVals[i] }))
  const colors    = ['#4f8cff', '#34d399', '#f59e0b', '#a78bfa', '#fb7185', '#38bdf8']
  return {
    backgroundColor: 'transparent',
    color: colors,
    title: { text: title, left: 'center', top: 4, textStyle: { fontSize: 13, color: '#314566', fontWeight: 700 } },
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, left: 'center', textStyle: { color: '#5f6f89', fontSize: 11 }, itemWidth: 10, itemHeight: 10 },
    radar: {
      indicator, shape: 'polygon', splitNumber: 4, radius: '58%', center: ['50%', '50%'],
      axisName: { color: '#29426a', fontSize: 12, fontWeight: 700 },
      splitLine: { lineStyle: { color: '#dce8fb' } },
      splitArea: { areaStyle: { color: ['rgba(79,140,255,0.04)', 'rgba(79,140,255,0.02)'] } },
      axisLine:  { lineStyle: { color: '#cfdcf2' } },
    },
    series: [{
      type: 'radar',
      data: data.map(cls => ({ name: cls.name, value: metrics.map(m => cls[m.toLowerCase()] ?? 0) })),
      areaStyle: { opacity: 0.08 },
      lineStyle: { width: 2 },
      symbol: 'circle', symbolSize: 5,
    }],
  }
}

function renderCharts() {
  if (radarOrigRef.value && ckOriginal.value.length) {
    if (!radarOrigChart) radarOrigChart = echarts.init(radarOrigRef.value)
    radarOrigChart.setOption(buildRadarOption(ckOriginal.value, '原始代码'))
  }
  if (radarOptRef.value && ckOptimized.value.length) {
    if (!radarOptChart) radarOptChart = echarts.init(radarOptRef.value)
    radarOptChart.setOption(buildRadarOption(ckOptimized.value, 'AI 优化后'))
  }
}

function disposeCharts() {
  radarOrigChart?.dispose(); radarOrigChart = null
  radarOptChart?.dispose();  radarOptChart  = null
}

function resizeCharts() {
  radarOrigChart?.resize()
  radarOptChart?.resize()
}

watch(hasBothCK, async (v) => {
  if (!v) { disposeCharts(); return }
  await nextTick()
  renderCharts()
})

window.addEventListener('resize', resizeCharts)
onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  disposeCharts()
})

// ── Delta helpers ─────────────────────────────────────────────────────────────
// Lower is better for WMC, RFC, LCOM, CBO; DIT and NOC are neutral
const lowerIsBetter = new Set(['WMC', 'RFC', 'LCOM', 'CBO'])

function deltaLabel(m) {
  const orig = parseFloat(summaryOrig.value?.[m]?.avg)
  const opt  = parseFloat(summaryOpt.value?.[m]?.avg)
  if (isNaN(orig) || isNaN(opt)) return '-'
  const diff = opt - orig
  if (Math.abs(diff) < 0.005) return '持平'
  const sign = diff > 0 ? '+' : ''
  return `${sign}${diff.toFixed(2)}`
}

function deltaClass(m) {
  const orig = parseFloat(summaryOrig.value?.[m]?.avg)
  const opt  = parseFloat(summaryOpt.value?.[m]?.avg)
  if (isNaN(orig) || isNaN(opt)) return ''
  const diff = opt - orig
  if (Math.abs(diff) < 0.005) return 'delta-neutral'
  const improved = lowerIsBetter.has(m) ? diff < 0 : diff > 0
  return improved ? 'delta-good' : 'delta-bad'
}

</script>

<template>
  <div class="ai-page">

    <header class="page-toolbar">
      <div class="title-block">
        <button class="back-btn" @click="router.back()">← 返回</button>
        <h1 class="page-title">AI 优化代码对比</h1>
        <p class="page-subtitle">基于原始代码生成 AI 优化版本，并对比 CK 度量指标变化。</p>
      </div>
      <div class="toolbar-actions">
        <span v-if="originalFile" class="file-chip">{{ originalFile }}</span>
        <button class="ai-btn" :disabled="aiLoading || !originalCode" @click="requestAIOptimize">
          <span v-if="aiLoading" class="spinner"></span>
          <span v-else>✨</span>
          {{ aiLoading ? 'AI 优化中…' : '开始 AI 优化' }}
        </button>
      </div>
    </header>

    <p v-if="aiError" class="status-text error">{{ aiError }}</p>

    <!-- 代码对比区 -->
    <section class="compare-card card">
      <div class="compare-grid">
        <div class="code-panel">
          <div class="panel-header">
            <span class="panel-badge original">原始代码</span>
            <span class="panel-filename">{{ originalFile }}</span>
          </div>
          <pre class="code-block">{{ originalCode || '（暂无代码）' }}</pre>
        </div>

        <div class="divider-col">
          <div class="divider-line"></div>
          <div class="divider-icon">⇄</div>
          <div class="divider-line"></div>
        </div>

        <div class="code-panel">
          <div class="panel-header">
            <span class="panel-badge optimized">AI 优化后</span>
            <span v-if="savedFilename" class="panel-filename">{{ savedFilename }}</span>
          </div>
          <div v-if="aiLoading" class="loading-placeholder">
            <div class="loading-dots"><span></span><span></span><span></span></div>
            <p>AI 正在分析并优化代码，请稍候…</p>
          </div>
          <pre v-else class="code-block">{{ optimizedCode || '（点击"开始 AI 优化"生成优化代码）' }}</pre>
        </div>
      </div>

      <div v-if="hasOptimized && !savedFilename" class="analyze-bar">
        <p v-if="saveError" class="status-text error">{{ saveError }}</p>
        <button class="analyze-btn" :disabled="saveLoading || ckLoading" @click="saveAndAnalyze">
          <span v-if="saveLoading || ckLoading" class="spinner dark"></span>
          {{ saveLoading ? '保存中…' : ckLoading ? 'CK 分析中…' : '保存并对比 CK 度量' }}
        </button>
      </div>
    </section>

    <!-- CK 对比结果 -->
    <template v-if="hasBothCK">

      <!-- 摘要对比 -->
      <section class="card metrics-compare-card">
        <div class="section-header">
          <h2>CK 度量对比摘要</h2>
        </div>
        <div class="metrics-table-wrap">
          <table class="compare-table">
            <thead>
              <tr>
                <th>指标</th>
                <th>说明</th>
                <th>原始均值</th>
                <th>优化后均值</th>
                <th>变化</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in metrics" :key="m">
                <td class="metric-name">{{ m }}</td>
                <td class="metric-desc">{{ metricDesc[m] }}</td>
                <td>{{ summaryOrig?.[m]?.avg ?? '-' }}</td>
                <td>{{ summaryOpt?.[m]?.avg ?? '-' }}</td>
                <td>
                  <span v-if="summaryOrig && summaryOpt" :class="deltaClass(m)">
                    {{ deltaLabel(m) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 雷达图对比 -->
      <section class="card charts-card">
        <div class="section-header"><h2>雷达图对比</h2></div>
        <div class="charts-grid">
          <div class="chart-panel">
            <div ref="radarOrigRef" class="chart-box"></div>
          </div>
          <div class="chart-panel">
            <div ref="radarOptRef" class="chart-box"></div>
          </div>
        </div>
      </section>

      <!-- 明细表对比 -->
      <section class="card result-card">
        <div class="section-header"><h2>类级别 CK 明细对比</h2></div>
        <div class="detail-grid">
          <div>
            <p class="table-label">原始代码</p>
            <div class="table-wrap">
              <table class="info-table">
                <thead><tr><th>类名</th><th v-for="m in metrics" :key="m">{{ m }}</th></tr></thead>
                <tbody>
                  <tr v-for="cls in ckOriginal" :key="cls.name">
                    <td class="class-name">{{ cls.name }}</td>
                    <td v-for="m in metrics" :key="m">{{ cls[m.toLowerCase()] ?? '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <p class="table-label optimized-label">AI 优化后</p>
            <div class="table-wrap">
              <table class="info-table">
                <thead><tr><th>类名</th><th v-for="m in metrics" :key="m">{{ m }}</th></tr></thead>
                <tbody>
                  <tr v-for="cls in ckOptimized" :key="cls.name">
                    <td class="class-name">{{ cls.name }}</td>
                    <td v-for="m in metrics" :key="m">{{ cls[m.toLowerCase()] ?? '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

    </template>

  </div>
</template>

<style scoped>
.ai-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.page-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px 8px 4px;
  gap: 16px;
}

.title-block { display: flex; flex-direction: column; gap: 6px; }

.back-btn {
  width: fit-content;
  padding: 5px 14px;
  border-radius: 8px;
  border: 1px solid #d1ddf0;
  background: #f4f8ff;
  color: #3b6fd4;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.back-btn:hover { background: #e8f0ff; }

.page-title {
  font-size: 26px;
  font-weight: 700;
  color: #1e2d4a;
  line-height: 1.2;
}

.page-subtitle { color: #6b7a90; font-size: 14px; line-height: 1.7; }

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  align-self: center;
}

.file-chip {
  padding: 5px 12px;
  border-radius: 999px;
  background: #edf4ff;
  color: #3b82f6;
  font-size: 12px;
  font-weight: 600;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 22px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(124,58,237,0.28);
  transition: opacity 0.2s, transform 0.15s;
}
.ai-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.ai-btn:disabled { opacity: 0.55; cursor: not-allowed; }

.status-text       { font-size: 14px; color: #64748b; }
.status-text.error { color: #dc2626; }

.card {
  background: #fff;
  border: 1px solid #e6ecf5;
  border-radius: 18px;
  box-shadow: 0 10px 30px rgba(15,23,42,0.06);
}

/* ── 代码对比 ── */
.compare-card { padding: 20px 24px; }

.compare-grid {
  display: grid;
  grid-template-columns: 1fr 32px 1fr;
  gap: 0;
  min-height: 420px;
}

.code-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.panel-badge {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.panel-badge.original  { background: #edf4ff; color: #3b82f6; }
.panel-badge.optimized { background: #f3e8ff; color: #7c3aed; }

.panel-filename {
  font-size: 12px;
  color: #7a8aa3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.code-block {
  flex: 1;
  margin: 0;
  padding: 14px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e6ecf5;
  font-size: 12px;
  line-height: 1.7;
  color: #334155;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  white-space: pre;
  overflow: auto;
  max-height: 520px;
}

.divider-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 4px;
}
.divider-line { flex: 1; width: 1px; background: #e6ecf5; }
.divider-icon { color: #a0aec0; font-size: 18px; }

.loading-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e6ecf5;
  color: #7a8aa3;
  font-size: 14px;
  min-height: 200px;
}

.loading-dots { display: flex; gap: 6px; }
.loading-dots span {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #a855f7;
  animation: bounce 1.2s infinite ease-in-out;
}
.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
  40%            { transform: scale(1);   opacity: 1;   }
}

.analyze-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e6ecf5;
}

.analyze-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #3b82f6, #4f8cff);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(59,130,246,0.25);
  transition: opacity 0.2s, transform 0.15s;
}
.analyze-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.analyze-btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* ── 摘要对比表 ── */
.metrics-compare-card { padding: 18px 20px; }

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.section-header h2 { font-size: 18px; color: #1e293b; font-weight: 700; }

.metrics-table-wrap { overflow: auto; }

.compare-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid #e6ecf5;
  border-radius: 12px;
  overflow: hidden;
}
.compare-table th,
.compare-table td {
  padding: 11px 16px;
  text-align: center;
  border-right: 1px solid #e6ecf5;
  border-bottom: 1px solid #e6ecf5;
  font-size: 14px;
}
.compare-table th { background: #f4f8ff; color: #334155; font-weight: 700; font-size: 13px; }
.compare-table th:last-child,
.compare-table td:last-child { border-right: 0; }
.compare-table tbody tr:last-child td { border-bottom: 0; }
.compare-table tbody tr:hover td { background: #f8fbff; }

.metric-name { font-weight: 700; color: #2563eb; text-align: left; }
.metric-desc { color: #6b7a90; font-size: 13px; text-align: left; }

.delta-good    { color: #059669; font-weight: 700; }
.delta-bad     { color: #dc2626; font-weight: 700; }
.delta-neutral { color: #64748b; }

/* ── 图表 ── */
.charts-card { padding: 18px 20px; }
.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}
.chart-panel {
  padding: 16px;
  border-radius: 16px;
  border: 1px solid #e6ecf5;
  background: linear-gradient(180deg, #fff 0%, #f9fbff 100%);
}
.chart-box { width: 100%; height: 340px; }

/* ── 明细表 ── */
.result-card { padding: 18px 20px; }
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.table-label {
  font-size: 13px;
  font-weight: 700;
  color: #3b82f6;
  margin-bottom: 8px;
}
.table-label.optimized-label { color: #7c3aed; }
.table-wrap { overflow: auto; }

.info-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid #e6ecf5;
  border-radius: 12px;
  overflow: hidden;
}
.info-table th,
.info-table td {
  padding: 10px 14px;
  text-align: center;
  border-right: 1px solid #e6ecf5;
  border-bottom: 1px solid #e6ecf5;
  font-size: 13px;
}
.info-table th { background: #f4f8ff; color: #334155; font-weight: 700; }
.info-table th:last-child,
.info-table td:last-child { border-right: 0; }
.info-table tbody tr:last-child td { border-bottom: 0; }
.info-table tbody tr:hover td { background: #f8fbff; }
.class-name { font-weight: 600; color: #2563eb; text-align: left; }

/* ── spinner ── */
.spinner {
  display: inline-block;
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
.spinner.dark {
  border-color: rgba(59,130,246,0.3);
  border-top-color: #3b82f6;
}
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 1024px) {
  .compare-grid { grid-template-columns: 1fr; }
  .divider-col  { flex-direction: row; height: 32px; }
  .divider-line { flex: 1; height: 1px; width: auto; }
  .charts-grid  { grid-template-columns: 1fr; }
  .detail-grid  { grid-template-columns: 1fr; }
}
</style>
