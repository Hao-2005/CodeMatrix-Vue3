<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import axios from 'axios'
import * as echarts from 'echarts'
import AIChatPanel from './AIChatPanel.vue'

const selectedFile = ref(null)
const previewContent = ref([])
const metrics = ref({
  nullLines: 0,
  annoLines: 0,
  codeLines: 0,
  allLines: 0,
  logicLines: 0,
})
const methodRows = ref([])
const isAnalyzing = ref(false)
const errorMessage = ref('')
const lineChartRef = ref(null)
const structureChartRef = ref(null)

let lineChart = null
let structureChart = null

const hasAnalysisResult = computed(() => Boolean(selectedFile.value))
const methodCount = computed(() => methodRows.value.length)
const classCount = computed(() => new Set(methodRows.value.map((item) => item.className)).size)

const previewLines = computed(() =>
  previewContent.value.map((content, index) => ({
    number: index + 1,
    content,
  })),
)

function resetAnalysisState() {
  metrics.value = {
    nullLines: 0,
    annoLines: 0,
    codeLines: 0,
    allLines: 0,
    logicLines: 0,
  }
  methodRows.value = []
}

function disposeCharts() {
  if (lineChart) {
    lineChart.dispose()
    lineChart = null
  }
  if (structureChart) {
    structureChart.dispose()
    structureChart = null
  }
}

function renderCharts() {
  if (!hasAnalysisResult.value || !lineChartRef.value || !structureChartRef.value) return

  if (!lineChart) {
    lineChart = echarts.init(lineChartRef.value)
  }
  if (!structureChart) {
    structureChart = echarts.init(structureChartRef.value)
  }

  lineChart.setOption({
    animationDuration: 500,
    grid: {
      left: 36,
      right: 16,
      top: 30,
      bottom: 30,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    xAxis: {
      type: 'category',
      data: ['空行', '注释', '非注释', '物理行', '逻辑行'],
      axisLine: {
        lineStyle: { color: '#d7e2f2' },
      },
      axisTick: { show: false },
      axisLabel: {
        color: '#6b7a90',
        fontSize: 12,
      },
    },
    yAxis: {
      type: 'value',
      splitLine: {
        lineStyle: {
          color: '#edf2f9',
          type: 'dashed',
        },
      },
      axisLabel: {
        color: '#8a97ab',
        fontSize: 12,
      },
    },
    series: [
      {
        type: 'bar',
        barWidth: 26,
        itemStyle: {
          borderRadius: [10, 10, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#5ca3ff' },
            { offset: 1, color: '#3578f6' },
          ]),
        },
        data: [
          metrics.value.nullLines,
          metrics.value.annoLines,
          metrics.value.codeLines,
          metrics.value.allLines,
          metrics.value.logicLines,
        ],
      },
    ],
  })

  structureChart.setOption({
    animationDuration: 500,
    tooltip: {
      trigger: 'item',
    },
    legend: {
      bottom: 0,
      icon: 'circle',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: {
        color: '#6b7a90',
      },
    },
    series: [
      {
        type: 'pie',
        radius: ['54%', '76%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        label: {
          formatter: '{b}\n{c}',
          color: '#42526b',
          fontSize: 12,
        },
        itemStyle: {
          borderColor: '#ffffff',
          borderWidth: 4,
        },
        data: [
          { value: classCount.value, name: '类数量', itemStyle: { color: '#4f8cff' } },
          { value: methodCount.value, name: '方法数量', itemStyle: { color: '#53c7a5' } },
        ],
      },
    ],
  })
}

function normalizeMethodRows(astClasses) {
  return astClasses.flatMap((item) =>
    (item.methodList || []).map((method) => ({
      className: item.className || '-',
      methodName: method.methodName || '-',
      accessAuthority: method.accessAuthority || '-',
      returnType: method.returnType || '-',
    })),
  )
}

async function analyzeSelectedFile(file) {
  if (!file) return

  selectedFile.value = file
  isAnalyzing.value = true
  errorMessage.value = ''
  resetAnalysisState()

  try {
    const text = await file.text()
    previewContent.value = text.split(/\r?\n/)

    const astFormData = new FormData()
    astFormData.append('javaFile', file)

    const codeLinesFormData = new FormData()
    codeLinesFormData.append('javaFile', file)

    const [astResponse, codeLinesResponse] = await Promise.all([
      axios.post('http://localhost:8080/api/AST/ASTControl', astFormData),
      axios.post('http://localhost:8080/api/CodeLines/codeLine', codeLinesFormData),
    ])

    methodRows.value = normalizeMethodRows(astResponse.data?.data || [])
    metrics.value = {
      nullLines: codeLinesResponse.data?.data?.nullLines ?? 0,
      annoLines: codeLinesResponse.data?.data?.annoLines ?? 0,
      codeLines: codeLinesResponse.data?.data?.codeLines ?? 0,
      allLines: codeLinesResponse.data?.data?.allLines ?? 0,
      logicLines: codeLinesResponse.data?.data?.logicLines ?? 0,
    }
  } catch (error) {
    resetAnalysisState()
    errorMessage.value = '文件预览成功，但解析接口调用失败，请确认后端已启动。'
  } finally {
    isAnalyzing.value = false
    nextTick(() => {
      renderCharts()
    })
  }
}

function handleFileChange(event) {
  const file = event.target.files?.[0]
  analyzeSelectedFile(file)
}

watch(
  [
    hasAnalysisResult,
    methodCount,
    classCount,
    () => metrics.value.nullLines,
    () => metrics.value.annoLines,
    () => metrics.value.codeLines,
    () => metrics.value.allLines,
    () => metrics.value.logicLines,
  ],
  async ([visible]) => {
    if (!visible) {
      disposeCharts()
      return
    }

    await nextTick()
    renderCharts()
  },
)

onBeforeUnmount(() => {
  disposeCharts()
})

const codeMetricPayload = computed(() => ({
  projectName: '软件度量平台',
  metricSystem: 'Code',
  context: '版本发布前代码规模评估',
  metrics: {
    注释行数:    metrics.value.annoLines,
    非注释行数:  metrics.value.codeLines,
    物理代码行数: metrics.value.allLines,
    逻辑代码行数: metrics.value.logicLines,
  },
}))
</script>

<template>
  <div class="code-metric-page">
    <header class="page-toolbar">
      <div class="title-block">
        <h1 class="page-title">代码辅助度量</h1>
        <p class="page-subtitle">上传代码文件后，系统会自动展示源码预览、代码行统计和方法信息。</p>
      </div>
    </header>

    <section v-if="!hasAnalysisResult" class="upload-landing card">
      <div class="landing-copy">
        <span class="landing-badge">Code Insight</span>
        <h2>先上传一个代码文件，开始本次辅助度量</h2>
        <p>
          上传前我们先把界面聚焦在核心动作上。选择文件后，页面会自动展开源码预览、代码行解析结果和代码信息表格。
        </p>
        <div class="landing-features">
          <div class="feature-pill">源码预览</div>
          <div class="feature-pill">代码行统计</div>
          <div class="feature-pill">方法信息提取</div>
        </div>
      </div>

      <div class="landing-upload-panel">
        <div class="section-header">
          <h2>上传代码文件</h2>
        </div>
        <label class="upload-dropzone landing-dropzone">
          <div class="upload-cloud">☁</div>
          <div class="upload-title">点击上传代码文件</div>
          <div class="upload-desc">支持 .java、.py、.js、.cpp、.c、.ts 等代码文件</div>
          <span class="upload-button">选择文件</span>
          <input class="file-input" type="file" accept=".java,.py,.js,.cpp,.c,.ts,.tsx,.jsx" @change="handleFileChange" />
        </label>
        <p v-if="isAnalyzing" class="status-text">正在解析文件，请稍候...</p>
        <p v-else-if="errorMessage" class="status-text error">{{ errorMessage }}</p>
      </div>
    </section>

    <section v-else class="content-grid">
      <div class="left-panel card">
        <div class="section-header">
          <h2>代码预览</h2>
          <span class="file-chip">{{ selectedFile?.name }}</span>
        </div>
        <div class="code-viewer">
          <div v-for="line in previewLines" :key="line.number" class="code-line">
            <span class="line-number">{{ line.number }}</span>
            <code class="line-content">{{ line.content || ' ' }}</code>
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div class="card upload-card compact-upload-card">
          <div class="section-header">
            <h2>重新上传文件</h2>
          </div>
          <label class="upload-dropzone compact-dropzone">
            <div class="upload-cloud small-cloud">☁</div>
            <div class="upload-title">切换代码文件</div>
            <div class="upload-desc">上传新的文件后，左侧和下方结果会同步刷新</div>
            <span class="upload-button">重新选择</span>
            <input class="file-input" type="file" accept=".java,.py,.js,.cpp,.c,.ts,.tsx,.jsx" @change="handleFileChange" />
          </label>
          <p v-if="isAnalyzing" class="status-text">正在解析文件，请稍候...</p>
          <p v-else-if="errorMessage" class="status-text error">{{ errorMessage }}</p>
        </div>

        <div class="card">
          <div class="section-header">
            <h2>代码行解析结果</h2>
          </div>
          <div class="metrics-grid">
            <div class="metric-row">
              <span>空行数</span>
              <strong>{{ metrics.nullLines }}</strong>
              <span>注释行数</span>
              <strong>{{ metrics.annoLines }}</strong>
            </div>
            <div class="metric-row">
              <span>非注释行数</span>
              <strong>{{ metrics.codeLines }}</strong>
              <span>物理代码行数</span>
              <strong>{{ metrics.allLines }}</strong>
            </div>
            <div class="metric-row">
              <span>逻辑代码行数</span>
              <strong>{{ metrics.logicLines }}</strong>
              <span class="metric-empty"></span>
              <strong class="metric-empty"></strong>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="section-header">
            <h2>代码信息</h2>
          </div>
          <div class="table-wrap">
            <table class="info-table">
              <thead>
                <tr>
                  <th>类名</th>
                  <th>方法名</th>
                  <th>访问权限</th>
                  <th>返回值</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in methodRows" :key="`${row.className}-${row.methodName}-${row.returnType}`">
                  <td>{{ row.className }}</td>
                  <td>{{ row.methodName }}</td>
                  <td>{{ row.accessAuthority }}</td>
                  <td>{{ row.returnType }}</td>
                </tr>
                <tr v-if="!methodRows.length">
                  <td colspan="4" class="empty-cell">暂无解析结果</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="section-header">
            <h2>度量可视化</h2>
          </div>
          <div class="charts-grid">
            <div class="chart-panel">
              <div class="chart-caption">代码行统计分布</div>
              <div ref="lineChartRef" class="chart-box"></div>
            </div>
            <div class="chart-panel">
              <div class="chart-caption">代码结构概览</div>
              <div ref="structureChartRef" class="chart-box"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <AIChatPanel
      :suggestions="[
        { label: '什么是代码度量', type: 'chat' },
        { label: '分析代码度量结果', type: 'metric' },
      ]"
      :metric-payload="codeMetricPayload"
      welcome-message="您好，有什么可以帮助您？"
    />
  </div>
</template>

<style scoped>
.code-metric-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 20px;
  padding: 18px 8px 8px;
}

.title-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.page-title {
  font-size: 28px;
  line-height: 1.2;
  font-weight: 700;
  color: #1e2d4a;
}

.page-subtitle {
  color: #6b7a90;
  font-size: 14px;
  line-height: 1.7;
  max-width: 620px;
}

.card {
  background: #ffffff;
  border: 1px solid #e6ecf5;
  border-radius: 18px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}

.upload-landing {
  display: grid;
  grid-template-columns: 1.15fr 0.95fr;
  gap: 24px;
  padding: 30px;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.12), transparent 35%),
    linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
}

.landing-copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 18px;
  min-height: 420px;
}

.landing-badge {
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

.landing-copy h2 {
  font-size: 34px;
  line-height: 1.25;
  color: #1e2d4a;
  max-width: 560px;
}

.landing-copy p {
  max-width: 580px;
  color: #61728d;
  font-size: 15px;
  line-height: 1.9;
}

.landing-features {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.feature-pill {
  padding: 11px 16px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #dfe9f9;
  color: #39557f;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.07);
}

.landing-upload-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 26px;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  border: 1px solid #e7eef8;
}

.content-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1.05fr 1.1fr;
  gap: 18px;
  min-height: 0;
}

.left-panel,
.right-panel {
  min-height: 0;
}

.left-panel {
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.right-panel {
  display: grid;
  grid-template-rows: auto auto auto;
  gap: 18px;
  align-content: start;
}

.upload-card,
.right-panel > .card:not(.upload-card) {
  padding: 18px 20px;
}

.compact-upload-card {
  background: linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.section-header h2 {
  font-size: 18px;
  color: #1e293b;
  font-weight: 700;
}

.file-chip {
  padding: 6px 12px;
  border-radius: 999px;
  background: #edf4ff;
  color: #3b82f6;
  font-size: 12px;
  font-weight: 600;
}

.upload-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-radius: 16px;
  border: 2px dashed #cfdcf2;
  background: #fbfcff;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.upload-dropzone:hover {
  border-color: #8fb7ff;
  background: #f5f9ff;
  transform: translateY(-1px);
}

.landing-dropzone {
  min-height: 320px;
}

.compact-dropzone {
  min-height: 170px;
}

.upload-cloud {
  font-size: 58px;
  line-height: 1;
  color: #9dbcf7;
}

.small-cloud {
  font-size: 42px;
}

.upload-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

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

.file-input {
  display: none;
}

.status-text {
  margin-top: 12px;
  font-size: 14px;
  color: #64748b;
}

.status-text.error {
  color: #dc2626;
}

.code-viewer {
  flex: 1;
  overflow: auto;
  border-radius: 14px;
  border: 1px solid #e6edf7;
  background: linear-gradient(180deg, #ffffff 0%, #fbfcff 100%);
  padding: 14px 0;
}

.code-line {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  padding: 0 16px;
  min-height: 30px;
}

.line-number {
  text-align: right;
  color: #7c8aa5;
  font-size: 14px;
  line-height: 30px;
  user-select: none;
}

.line-content {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 14px;
  line-height: 30px;
  color: #1f2937;
}

.metrics-grid {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e6ecf5;
}

.charts-grid {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 16px;
}

.chart-panel {
  border: 1px solid #e6ecf5;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfcff 100%);
  padding: 14px;
}

.chart-caption {
  font-size: 14px;
  font-weight: 700;
  color: #334155;
  margin-bottom: 10px;
}

.chart-box {
  width: 100%;
  height: 240px;
}

.metric-row {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr 1.1fr 0.9fr;
}

.metric-row span,
.metric-row strong {
  padding: 14px 20px;
  border-right: 1px solid #e6ecf5;
  border-bottom: 1px solid #e6ecf5;
}

.metric-row span {
  background: #fbfcff;
  color: #1f2937;
  font-weight: 600;
}

.metric-row strong {
  background: #ffffff;
  color: #1e293b;
  font-size: 28px;
  font-weight: 700;
  text-align: center;
}

.metric-row:last-child span,
.metric-row:last-child strong {
  border-bottom: 0;
}

.metric-row span:last-child,
.metric-row strong:last-child {
  border-right: 0;
}

.metric-empty {
  background: #ffffff !important;
}

.table-wrap {
  overflow: auto;
}

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
  padding: 14px 18px;
  text-align: left;
  border-right: 1px solid #e6ecf5;
  border-bottom: 1px solid #e6ecf5;
}

.info-table th {
  background: #fbfcff;
  color: #334155;
  font-size: 15px;
  font-weight: 700;
}

.info-table td {
  color: #334155;
  font-size: 15px;
}

.info-table th:last-child,
.info-table td:last-child {
  border-right: 0;
}

.info-table tbody tr:last-child td {
  border-bottom: 0;
}

.empty-cell {
  text-align: center !important;
  color: #94a3b8 !important;
}

@media (max-width: 1200px) {
  .upload-landing,
  .content-grid {
    grid-template-columns: 1fr;
  }

  .landing-copy {
    min-height: auto;
  }

  .left-panel {
    min-height: 480px;
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .page-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .upload-landing {
    padding: 18px;
  }

  .landing-copy h2 {
    font-size: 28px;
  }

  .metric-row {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
