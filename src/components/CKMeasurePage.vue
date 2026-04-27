<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import * as echarts from 'echarts'
import AIChatPanel from './AIChatPanel.vue'

const router = useRouter()

const selectedFile = ref(null)
const fileContent  = ref('')
const filename     = ref('')
const isUploading  = ref(false)
const isFetching   = ref(false)
const uploadError  = ref('')
const fetchError   = ref('')
const ckData       = ref([])

const radarChartRef    = ref(null)
const parallelChartRef = ref(null)
let radarChart    = null
let parallelChart = null

const metrics = ['WMC', 'RFC', 'DIT', 'NOC', 'LCOM', 'CBO']
const metricDesc = {
  WMC:  '每个类的加权方法数',
  RFC:  '类的响应集',
  DIT:  '继承树深度',
  NOC:  '子类数量',
  LCOM: '方法缺乏内聚度',
  CBO:  '类之间的耦合',
}

const hasFile = computed(() => !!fileContent.value)

const summary = computed(() => {
  if (!ckData.value.length) return null
  const result = {}
  metrics.forEach(m => {
    const key  = m.toLowerCase()
    const vals = ckData.value.map(d => d[key] ?? 0)
    result[m] = {
      max: Math.max(...vals),
      avg: (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2),
    }
  })
  return result
})

function disposeCharts() {
  radarChart?.dispose();    radarChart    = null
  parallelChart?.dispose(); parallelChart = null
}

function resizeCharts() {
  radarChart?.resize()
  parallelChart?.resize()
}

function renderRadarChart() {
  if (!radarChartRef.value || !ckData.value.length) return
  if (!radarChart) radarChart = echarts.init(radarChartRef.value)

  const maxVals   = metrics.map(m => Math.max(...ckData.value.map(d => d[m.toLowerCase()] ?? 0), 1))
  const indicator = metrics.map((m, i) => ({ name: m, max: maxVals[i] }))
  const seriesData = ckData.value.map(cls => ({
    name:  cls.name,
    value: metrics.map(m => cls[m.toLowerCase()] ?? 0),
  }))
  const colors = ['#4f8cff', '#34d399', '#f59e0b', '#a78bfa', '#fb7185', '#38bdf8']

  radarChart.setOption({
    backgroundColor: 'transparent',
    color: colors,
    tooltip: { trigger: 'item' },
    legend: {
      bottom: 0, left: 'center',
      textStyle: { color: '#5f6f89', fontSize: 12 },
      itemWidth: 10, itemHeight: 10,
    },
    radar: {
      indicator,
      shape: 'polygon',
      splitNumber: 4,
      radius: '62%',
      center: ['50%', '46%'],
      axisName: { color: '#29426a', fontSize: 13, fontWeight: 700 },
      splitLine: { lineStyle: { color: '#dce8fb', width: 1 } },
      splitArea: { areaStyle: { color: ['rgba(79,140,255,0.04)', 'rgba(79,140,255,0.02)'] } },
      axisLine:  { lineStyle: { color: '#cfdcf2' } },
    },
    series: [{
      type: 'radar',
      data: seriesData,
      areaStyle: { opacity: 0.08 },
      lineStyle: { width: 2 },
      symbol: 'circle',
      symbolSize: 5,
    }],
  })
}

function renderParallelChart() {
  if (!parallelChartRef.value || !ckData.value.length) return
  if (!parallelChart) parallelChart = echarts.init(parallelChartRef.value)

  // 每个维度自适应最大值，最小值统一为 0
  const axisMax = metrics.map(m =>
    Math.max(...ckData.value.map(d => d[m.toLowerCase()] ?? 0), 1)
  )

  const parallelAxis = metrics.map((m, i) => ({
    dim: i,
    name: m,
    min: 0,
    max: axisMax[i],
    nameTextStyle: { color: '#29426a', fontWeight: 700, fontSize: 13 },
    axisLine:  { lineStyle: { color: '#cfdcf2' } },
    axisTick:  { lineStyle: { color: '#cfdcf2' } },
    axisLabel: { color: '#7a8aa3', fontSize: 11 },
    splitLine: { lineStyle: { color: '#e8eef8', type: 'dashed' } },
  }))

  const colors = ['#4f8cff', '#34d399', '#f59e0b', '#a78bfa', '#fb7185', '#38bdf8', '#f97316', '#14b8a6']

  const series = ckData.value.map((cls, i) => ({
    type: 'parallel',
    name: cls.name,
    smooth: true,
    lineStyle: {
      color:   colors[i % colors.length],
      width:   2.5,
      opacity: 0.82,
    },
    data: [metrics.map(m => cls[m.toLowerCase()] ?? 0)],
  }))

  parallelChart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: params => params.seriesName },
    parallel: {
      left: 48, right: 48, top: 40, bottom: 64,
      parallelAxisDefault: { type: 'value', nameLocation: 'end' },
    },
    parallelAxis,
    series,
    legend: {
      bottom: 4, left: 'center',
      data: ckData.value.map(d => d.name),
      textStyle: { color: '#5f6f89', fontSize: 11 },
      itemWidth: 16, itemHeight: 3,
    },
  })
}

async function uploadFile(file) {
  if (!file) return
  selectedFile.value = file
  isUploading.value  = true
  uploadError.value  = ''
  ckData.value       = []
  fileContent.value  = ''
  filename.value     = ''

  const reader = new FileReader()
  reader.onload = e => { fileContent.value = e.target.result }
  reader.readAsText(file, 'UTF-8')

  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await axios.post('http://localhost:8080/api/uploadFile', formData)
    filename.value = res.data?.data ?? res.data?.filename ?? file.name
  } catch {
    uploadError.value = '文件上传失败，请确认后端已启动。'
  } finally {
    isUploading.value = false
  }
}

async function fetchCKMetrics() {
  if (!filename.value) return
  isFetching.value = true
  fetchError.value = ''
  ckData.value     = []

  try {
    const res = await axios.post('http://localhost:8080/api/ck/ck?name=' + filename.value)
    ckData.value = res.data?.data ?? []
  } catch {
    fetchError.value = 'CK 度量分析失败，请确认文件格式正确并重试。'
  } finally {
    isFetching.value = false
  }
}

function handleFileChange(event) {
  const file = event.target.files?.[0]
  if (file) uploadFile(file)
}

watch(ckData, async () => {
  if (!ckData.value.length) { disposeCharts(); return }
  await nextTick()
  renderRadarChart()
  renderParallelChart()
})

function goToAIOptimize() {
  router.push({
    path: '/ai-optimize',
    query: { filename: filename.value, originalCode: fileContent.value }
  })
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  disposeCharts()
})

const ckMetricPayload = computed(() => {
  const metricsObj = {}

  ckData.value.forEach((cls, index) => {
    const i = index + 1

    metricsObj[`WMC${i}`] = cls.wmc ?? '-'
    metricsObj[`RFC${i}`] = cls.rfc ?? '-'
    metricsObj[`DIT${i}`] = cls.dit ?? '-'
    metricsObj[`NOC${i}`] = cls.noc ?? '-'
    metricsObj[`LCOM${i}`] = cls.lcom ?? '-'
    metricsObj[`CBO${i}`] = cls.cbo ?? '-'
  })

  return {
    projectName: '软件度量平台',
    metricSystem: 'CK',
    context: '类图CK度量分析',
    metrics: metricsObj,
  }
})
</script>

<template>
  <div class="ck-page">

    <header class="page-toolbar">
      <div class="title-block">
        <h1 class="page-title">面向对象度量</h1>
        <p class="page-subtitle">上传xml文件后，系统会自动进行CK度量。</p>
      </div>
      <button v-if="hasFile" class="ai-btn" @click="goToAIOptimize">
        <span class="ai-btn-icon">✨</span> AI 优化代码
      </button>
    </header>

    <!-- 上传前：英雄区（左描述 + 右上传窗口） -->
    <section v-if="!hasFile" class="hero-card card">
      <div class="hero-copy">
        <span class="hero-badge">CK METRICS</span>
        <h2>上传 XML 文件，开始面向对象度量</h2>
        <p>
          CK 度量组由 Chidamber &amp; Kemerer 于 1994 年提出，是面向对象软件质量评估的经典标准。
          上传包含类结构信息的 XML 文件后，系统将自动计算六项核心指标，并通过雷达图与平行坐标图呈现多维度分析结果。
        </p>
        <div class="metric-tags">
          <span v-for="m in metrics" :key="m" class="metric-tag">
            <strong>{{ m }}</strong>{{ metricDesc[m] }}
          </span>
        </div>
      </div>

      <div class="hero-upload">
        <div class="section-header">
          <h2>上传代码文件</h2>
          <span v-if="selectedFile" class="file-chip">{{ selectedFile.name }}</span>
        </div>
        <label class="upload-dropzone">
          <div class="upload-cloud">☁</div>
          <div class="upload-title">点击上传代码文件</div>
          <div class="upload-desc">支持 .xml 格式的面向对象代码文件</div>
          <span class="upload-button">选择文件</span>
          <input class="file-input" type="file" accept=".xml" @change="handleFileChange" />
        </label>
        <p v-if="isUploading" class="status-text">正在上传文件，请稍候…</p>
        <p v-else-if="uploadError" class="status-text error">{{ uploadError }}</p>
      </div>
    </section>

    <!-- 上传后：左右分栏 -->
    <div v-if="hasFile" class="split-layout">

      <aside class="file-preview card">
        <div class="section-header">
          <h2>文件内容预览</h2>
          <span class="file-chip">{{ selectedFile?.name }}</span>
        </div>
        <pre class="code-preview">{{ fileContent }}</pre>
      </aside>

      <div class="right-panel">

        <section class="card upload-card">
          <div class="section-header">
            <div>
              <span class="hero-badge">CK METRICS</span>
              <h2 style="margin-top:10px;">重新上传或开始分析</h2>
            </div>
            <span v-if="filename" class="success-chip">✓ {{ filename }}</span>
          </div>

          <label class="upload-dropzone compact">
            <div class="upload-cloud small">☁</div>
            <div class="upload-title small">点击重新上传 .xml 文件</div>
            <span class="upload-button">选择文件</span>
            <input class="file-input" type="file" accept=".xml" @change="handleFileChange" />
          </label>

          <p v-if="isUploading" class="status-text">正在上传文件，请稍候…</p>
          <p v-else-if="uploadError" class="status-text error">{{ uploadError }}</p>

          <button
            v-if="filename && !isUploading"
            class="analyze-btn"
            :disabled="isFetching"
            @click="fetchCKMetrics"
          >
            <span v-if="isFetching">正在分析…</span>
            <span v-else>开始 CK 分析</span>
          </button>

          <p v-if="fetchError" class="status-text error" style="margin-top:8px;">{{ fetchError }}</p>
        </section>

        <section v-if="ckData.length" class="summary-grid">
          <div class="summary-card card">
            <span class="summary-label">分析类数</span>
            <strong class="summary-value">{{ ckData.length }}</strong>
          </div>
          <div v-for="m in metrics" :key="m" class="summary-card card">
            <span class="summary-label">{{ m }} 均值</span>
            <strong class="summary-value accent">{{ summary[m].avg }}</strong>
          </div>
        </section>

        <section v-if="ckData.length" class="card result-card">
          <div class="section-header">
            <h2>CK 度量结果明细</h2>
          </div>
          <div class="table-wrap">
            <table class="info-table">
              <thead>
                <tr>
                  <th>类名</th>
                  <th v-for="m in metrics" :key="m" :title="metricDesc[m]">{{ m }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="cls in ckData" :key="cls.name">
                  <td class="class-name">{{ cls.name }}</td>
                  <td v-for="m in metrics" :key="m">{{ cls[m.toLowerCase()] ?? '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="metric-legend">
            <div v-for="m in metrics" :key="m" class="legend-item">
              <strong>{{ m }}</strong>
              <span>{{ metricDesc[m] }}</span>
            </div>
          </div>
        </section>

        <section v-if="ckData.length" class="card charts-card">
          <div class="section-header">
            <h2>度量可视化</h2>
          </div>
          <div class="charts-grid">
            <div class="chart-panel">
              <div class="chart-caption">雷达图 — 各类综合 CK 指标</div>
              <div ref="radarChartRef" class="chart-box"></div>
            </div>
            <div class="chart-panel">
              <div class="chart-caption">平行坐标图 — 多维度趋势对比</div>
              <div ref="parallelChartRef" class="chart-box"></div>
            </div>
          </div>
        </section>

      </div>
    </div>

    <AIChatPanel
      :suggestions="[
        { label: '什么是CK度量', type: 'chat' },
        { label: '分析CK度量结果', type: 'metric' },
      ]"
      :metric-payload="ckMetricPayload"
      welcome-message="您好，有什么可以帮助您？"
    />
  </div>
</template>

<style scoped>
.ck-page {
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
}

.ai-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 22px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(124, 58, 237, 0.28);
  transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
  align-self: center;
}

.ai-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(124, 58, 237, 0.38);
}

.ai-btn-icon { font-size: 16px; }

.title-block { display: flex; flex-direction: column; gap: 8px; }

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1e2d4a;
  line-height: 1.2;
}

.page-subtitle {
  color: #6b7a90;
  font-size: 14px;
  line-height: 1.7;
}

.card {
  background: #ffffff;
  border: 1px solid #e6ecf5;
  border-radius: 18px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}

/* 英雄区 */
.hero-card {
  display: grid;
  grid-template-columns: 1.15fr 0.95fr;
  gap: 24px;
  padding: 28px;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.12), transparent 34%),
    linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
}

.hero-copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 18px;
}

.hero-badge {
  width: fit-content;
  padding: 8px 14px;
  border-radius: 999px;
  background: #eaf2ff;
  color: #3b82f6;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-copy h2 {
  font-size: 32px;
  line-height: 1.28;
  color: #1e2d4a;
  max-width: 620px;
}

.hero-copy p {
  max-width: 560px;
  color: #61728d;
  font-size: 15px;
  line-height: 1.9;
}

.metric-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.metric-tag {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 8px;
  background: #f0f6ff;
  border: 1px solid #dae8fb;
  font-size: 13px;
  color: #4b5980;
}

.metric-tag strong {
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
  min-width: 36px;
}

.hero-upload {
  padding: 24px;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  border: 1px solid #e7eef8;
}

/* 上传后分栏 */
.split-layout {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 18px;
  align-items: start;
}

.right-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* 左侧文件预览 */
.file-preview {
  padding: 18px 20px;
  position: sticky;
  top: 18px;
  max-height: calc(100vh - 100px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.code-preview {
  flex: 1;
  overflow: auto;
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
  word-break: normal;
}

/* 右侧上传卡 */
.upload-card {
  padding: 24px 28px;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.09), transparent 34%),
    linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
}

.upload-card h2 {
  font-size: 20px;
  color: #1e2d4a;
  font-weight: 700;
}

/* 上传拖放区 */
.upload-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 280px;
  border-radius: 16px;
  border: 2px dashed #cfdcf2;
  background: #fbfcff;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, transform 0.2s;
}

.upload-dropzone.compact {
  min-height: 140px;
  margin-top: 14px;
}

.upload-dropzone:hover {
  border-color: #8fb7ff;
  background: #f5f9ff;
  transform: translateY(-1px);
}

.upload-cloud       { font-size: 58px; color: #9dbcf7; line-height: 1; }
.upload-cloud.small { font-size: 38px; }
.upload-title       { font-size: 18px; font-weight: 700; color: #1f2937; }
.upload-title.small { font-size: 15px; }

.upload-desc {
  color: #7c8aa5;
  font-size: 14px;
  line-height: 1.7;
  max-width: 360px;
}

.upload-button {
  margin-top: 6px;
  padding: 12px 28px;
  border-radius: 10px;
  background: linear-gradient(135deg, #3b82f6, #4f8cff);
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
  box-shadow: 0 12px 24px rgba(59, 130, 246, 0.2);
}

.file-input { display: none; }

.status-text         { margin-top: 12px; font-size: 14px; color: #64748b; }
.status-text.error   { color: #dc2626; }
.status-text.success { color: #059669; }

.success-chip {
  padding: 5px 12px;
  border-radius: 999px;
  background: #ecfdf5;
  color: #059669;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid #a7f3d0;
}

.analyze-btn {
  margin-top: 16px;
  width: 100%;
  padding: 14px 0;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #3b82f6, #4f8cff);
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
  box-shadow: 0 10px 24px rgba(59, 130, 246, 0.25);
}

.analyze-btn:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(59, 130, 246, 0.32);
}

.analyze-btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* 摘要 */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-label { color: #6b7a90; font-size: 13px; }
.summary-value { font-size: 26px; line-height: 1; color: #1e293b; font-weight: 700; }
.summary-value.accent { color: #3b82f6; }

/* 结果表 */
.result-card { padding: 18px 20px; }
.table-wrap  { overflow: auto; }

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
  padding: 12px 16px;
  text-align: center;
  border-right: 1px solid #e6ecf5;
  border-bottom: 1px solid #e6ecf5;
  font-size: 14px;
}

.info-table th {
  background: #f4f8ff;
  color: #334155;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.04em;
}

.info-table td { color: #334155; }

.info-table th:first-child,
.info-table td:first-child { text-align: left; }

.info-table th:last-child,
.info-table td:last-child { border-right: 0; }

.info-table tbody tr:last-child td { border-bottom: 0; }
.info-table tbody tr:hover td     { background: #f8fbff; }

.class-name { font-weight: 600; color: #2563eb; }

.metric-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #e6ecf5;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  background: #f4f8ff;
  font-size: 12px;
  color: #4b5980;
}

.legend-item strong { color: #2563eb; font-size: 12px; min-width: 34px; }

/* 图表 */
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
  background:
    radial-gradient(circle at top right, rgba(79, 140, 255, 0.07), transparent 28%),
    linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
}

.chart-caption {
  margin-bottom: 10px;
  color: #314566;
  font-size: 14px;
  font-weight: 700;
}

.chart-box { width: 100%; height: 380px; }

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.section-header h2 { font-size: 18px; color: #1e293b; font-weight: 700; }

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

/* 响应式 */
@media (max-width: 1280px) {
  .hero-card    { grid-template-columns: 1fr; }
  .split-layout { grid-template-columns: 300px 1fr; }
  .summary-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

@media (max-width: 1024px) {
  .split-layout { grid-template-columns: 1fr; }
  .file-preview { position: static; max-height: 300px; }
  .charts-grid  { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>