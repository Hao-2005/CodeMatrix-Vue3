<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import axios from 'axios'
import * as echarts from 'echarts'

const selectedFile = ref(null)
const isAnalyzing = ref(false)
const errorMessage = ref('')
const actorChartRef = ref(null)
const metricChartRef = ref(null)

let actorChart = null
let metricChart = null

const actorSummary = ref({
  totalActorNum: 0,
  totalUseCaseNum: 0,
  useCaseActors: [],
})

const actorCategories = ref({
  simple: 0,
  average: 0,
  complex: 0,
})

const useCaseCategories = ref({
  simple: 0,
  average: 0,
  complex: 0,
})

const tcfFactors = ref([
  { key: 'T1', label: '分布式系统', weight: 2, value: 0 },
  { key: 'T2', label: '响应或吞吐量性能', weight: 1, value: 0 },
  { key: 'T3', label: '终端用户效率', weight: 1, value: 0 },
  { key: 'T4', label: '复杂内部处理', weight: 1, value: 0 },
  { key: 'T5', label: '代码可重用', weight: 1, value: 0 },
  { key: 'T6', label: '易安装', weight: 0.5, value: 0 },
  { key: 'T7', label: '易使用', weight: 0.5, value: 0 },
  { key: 'T8', label: '可移植', weight: 2, value: 0 },
  { key: 'T9', label: '易变更', weight: 1, value: 0 },
  { key: 'T10', label: '并发性', weight: 1, value: 0 },
  { key: 'T11', label: '特殊安全要求', weight: 1, value: 0 },
  { key: 'T12', label: '提供第三方接口', weight: 1, value: 0 },
  { key: 'T13', label: '需要特别用户培训', weight: 1, value: 0 },
])

const efFactors = ref([
  { key: 'E1', label: '熟悉 UML 程度', weight: 1.5, value: 0 },
  { key: 'E2', label: '开发应用经验', weight: 0.5, value: 0 },
  { key: 'E3', label: '面向对象经验', weight: 1, value: 0 },
  { key: 'E4', label: '主分析师能力', weight: 0.5, value: 0 },
  { key: 'E5', label: '激励机制', weight: 1, value: 0 },
  { key: 'E6', label: '需求稳定度', weight: 2, value: 0 },
  { key: 'E7', label: '兼职人员', weight: -1, value: 0 },
  { key: 'E8', label: '复杂编程语言', weight: -1, value: 0 },
])

const actorRows = computed(() =>
  actorSummary.value.useCaseActors.map((item) => ({
    actorName: item.actorName || '-',
    useCases: (item.useCaseNameList || []).join('、') || '-',
    useCaseCount: item.useCaseNameList?.length || 0,
  })),
)

const uniqueUseCases = computed(() => {
  const names = new Set()
  actorSummary.value.useCaseActors.forEach((item) => {
    ;(item.useCaseNameList || []).forEach((name) => names.add(name))
  })
  return Array.from(names)
})

const diagramHeight = computed(() => {
  const actorBlock = Math.max(actorSummary.value.useCaseActors.length, 1) * 78
  const useCaseBlock = Math.max(uniqueUseCases.value.length, 1) * 72
  return Math.min(560, Math.max(260, actorBlock, useCaseBlock) + 28)
})

const actorNodes = computed(() => {
  const total = actorSummary.value.useCaseActors.length || 1
  const topPadding = 42
  const availableHeight = diagramHeight.value - topPadding * 2

  return actorSummary.value.useCaseActors.map((item, index) => ({
    id: `actor-${index}`,
    name: item.actorName || 'Actor',
    x: 120,
    y: topPadding + ((index + 0.5) * availableHeight) / total,
  }))
})

const useCaseNodes = computed(() => {
  const total = uniqueUseCases.value.length || 1
  const topPadding = 36
  const availableHeight = diagramHeight.value - topPadding * 2

  return uniqueUseCases.value.map((name, index) => ({
    id: `use-case-${index}`,
    name,
    x: 492,
    y: topPadding + ((index + 0.5) * availableHeight) / total,
  }))
})

const useCaseNodeMap = computed(() => {
  const map = new Map()
  useCaseNodes.value.forEach((node) => {
    map.set(node.name, node)
  })
  return map
})

const diagramLinks = computed(() => {
  const links = []
  actorSummary.value.useCaseActors.forEach((actor, actorIndex) => {
    const actorNode = actorNodes.value[actorIndex]
    ;(actor.useCaseNameList || []).forEach((useCaseName) => {
      const useCaseNode = useCaseNodeMap.value.get(useCaseName)
      if (actorNode && useCaseNode) {
        links.push({
          key: `${actorNode.name}-${useCaseName}`,
          x1: actorNode.x + 26,
          y1: actorNode.y,
          x2: useCaseNode.x - 90,
          y2: useCaseNode.y,
        })
      }
    })
  })
  return links
})

const UAW = computed(
  () =>
    actorCategories.value.simple * 1 +
    actorCategories.value.average * 2 +
    actorCategories.value.complex * 3,
)

const UUC = computed(
  () =>
    useCaseCategories.value.simple * 5 +
    useCaseCategories.value.average * 10 +
    useCaseCategories.value.complex * 15,
)

const UUCP = computed(() => UAW.value + UUC.value)

const TFactor = computed(() =>
  tcfFactors.value.reduce((sum, item) => sum + item.weight * Number(item.value || 0), 0),
)

const TCF = computed(() => Number((0.6 + 0.01 * TFactor.value).toFixed(3)))

const EFactor = computed(() =>
  efFactors.value.reduce((sum, item) => sum + item.weight * Number(item.value || 0), 0),
)

const EF = computed(() => Number((1.4 + -0.03 * EFactor.value).toFixed(3)))

const UPC = computed(() => Number((UUCP.value * TCF.value * EF.value).toFixed(3)))

const processSteps = [
  '1. 计算未调整前的角色权重 UAW',
  '2. 计算未调整前的用例权重 UUC',
  '3. 计算未调整前的用例点 UUCP = UAW + UUC',
  '4. 计算技术复杂度因子 TCF = 0.6 + (0.01 × TFactor)',
  '5. 计算环境因子 EF = 1.4 + (-0.03 × EFactor)',
  '6. 计算调整后的用例点 UPC = UUCP × TCF × EF',
]

function disposeCharts() {
  if (actorChart) {
    actorChart.dispose()
    actorChart = null
  }
  if (metricChart) {
    metricChart.dispose()
    metricChart = null
  }
}

function resizeCharts() {
  actorChart?.resize()
  metricChart?.resize()
}

function renderCharts() {
  if (!actorRows.value.length || !actorChartRef.value || !metricChartRef.value) return

  if (!actorChart) {
    actorChart = echarts.init(actorChartRef.value)
  }
  if (!metricChart) {
    metricChart = echarts.init(metricChartRef.value)
  }

  actorChart.setOption({
    color: ['#4f8cff'],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    grid: {
      left: 52,
      right: 18,
      top: 24,
      bottom: 42,
    },
    xAxis: {
      type: 'category',
      data: actorRows.value.map((item) => item.actorName),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#d8e3f3' } },
      axisLabel: {
        color: '#5f6f89',
        interval: 0,
      },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#e8eef8', type: 'dashed' } },
      axisLabel: { color: '#7a8aa3' },
    },
    series: [
      {
        name: '关联用例数',
        type: 'bar',
        barWidth: 28,
        data: actorRows.value.map((item) => item.useCaseCount),
        itemStyle: {
          borderRadius: [10, 10, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#6ea8ff' },
            { offset: 1, color: '#3b82f6' },
          ]),
        },
      },
    ],
  })

  metricChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    grid: {
      left: 58,
      right: 18,
      top: 24,
      bottom: 26,
    },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#e8eef8', type: 'dashed' } },
      axisLabel: { color: '#7a8aa3' },
    },
    yAxis: {
      type: 'category',
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: '#5f6f89' },
      data: ['UAW', 'UUC', 'TCF', 'EF', 'UPC'],
    },
    series: [
      {
        type: 'bar',
        data: [
          { value: UAW.value, itemStyle: { color: '#5b8ff9' } },
          { value: UUC.value, itemStyle: { color: '#61d9a4' } },
          { value: TCF.value, itemStyle: { color: '#f6bd16' } },
          { value: EF.value, itemStyle: { color: '#9270ca' } },
          { value: UPC.value, itemStyle: { color: '#f6903d' } },
        ],
        barWidth: 18,
        showBackground: true,
        backgroundStyle: {
          color: '#f3f7fd',
          borderRadius: 10,
        },
        label: {
          show: true,
          position: 'right',
          color: '#30415f',
        },
        itemStyle: {
          borderRadius: [0, 10, 10, 0],
        },
      },
    ],
  })
}

function normalizeScore(item) {
  const value = Number(item.value)
  if (Number.isNaN(value)) {
    item.value = 0
    return
  }
  item.value = Math.min(5, Math.max(0, value))
}

async function analyzeUseCaseFile(file) {
  if (!file) return

  selectedFile.value = file
  isAnalyzing.value = true
  errorMessage.value = ''
  actorSummary.value = {
    totalActorNum: 0,
    totalUseCaseNum: 0,
    useCaseActors: [],
  }

  try {
    const formData = new FormData()
    formData.append('oomFile', file)

    const response = await axios.post('http://localhost:8080/api/UseCase/useCase', formData)
    const data = response.data?.data || {}

    actorSummary.value = {
      totalActorNum: data.totalActorNum ?? 0,
      totalUseCaseNum: data.totalUseCaseNum ?? 0,
      useCaseActors: data.useCaseActors ?? [],
    }
  } catch (error) {
    actorSummary.value = {
      totalActorNum: 0,
      totalUseCaseNum: 0,
      useCaseActors: [],
    }
    errorMessage.value = '请确认后端已启动，且上传的是可解析的 .oom 用例图文件。'
  } finally {
    isAnalyzing.value = false
  }
}

function handleFileChange(event) {
  const file = event.target.files?.[0]
  analyzeUseCaseFile(file)
}

watch(
  [
    actorRows,
    () => UAW.value,
    () => UUC.value,
    () => TCF.value,
    () => EF.value,
    () => UPC.value,
  ],
  async () => {
    if (!actorRows.value.length) {
      disposeCharts()
      return
    }

    await nextTick()
    renderCharts()
  },
  { deep: true },
)

window.addEventListener('resize', resizeCharts)

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  disposeCharts()
})
</script>

<template>
  <div class="use-case-page">
    <header class="page-toolbar">
      <div class="title-block">
        <h1 class="page-title">用例点辅助度量</h1>
        <p class="page-subtitle">按照标准用例点分析流程完成 UAW、UUC、UUCP、TCF、EF 与 UPC 计算。</p>
      </div>
    </header>

    <section class="hero-card card">
      <div class="hero-copy">
        <span class="hero-badge">Use-Case Point</span>
        <h2>上传用例图文件，完成用例点规模估算</h2>
      </div>

      <div class="hero-upload">
        <div class="section-header">
          <h2>上传用例图文件</h2>
          <span v-if="selectedFile" class="file-chip">{{ selectedFile.name }}</span>
        </div>
        <label class="upload-dropzone">
          <div class="upload-cloud">☁</div>
          <div class="upload-title">点击上传 .oom 用例图文件</div>
          <div class="upload-desc">上传后自动解析总角色数、总用例数以及角色与用例关系</div>
          <span class="upload-button">选择文件</span>
          <input class="file-input" type="file" accept=".oom,.xml" @change="handleFileChange" />
        </label>
        <p v-if="isAnalyzing" class="status-text">正在解析用例图，请稍候...</p>
        <p v-else-if="errorMessage" class="status-text error">{{ errorMessage }}</p>
      </div>
    </section>

    <section v-if="!actorRows.length" class="process-card card">
      <div class="section-header">
        <h2>用例点计数过程</h2>
      </div>
      <div class="process-list">
        <div v-for="step in processSteps" :key="step" class="process-item">{{ step }}</div>
      </div>
    </section>

    <section class="summary-grid">
      <div class="summary-card card">
        <span class="summary-label">总角色数</span>
        <strong class="summary-value">{{ actorSummary.totalActorNum }}</strong>
      </div>
      <div class="summary-card card">
        <span class="summary-label">总用例数</span>
        <strong class="summary-value">{{ actorSummary.totalUseCaseNum }}</strong>
      </div>
      <div class="summary-card card">
        <span class="summary-label">UUCP</span>
        <strong class="summary-value accent">{{ UUCP }}</strong>
      </div>
      <div class="summary-card card">
        <span class="summary-label">UPC</span>
        <strong class="summary-value accent">{{ UPC }}</strong>
      </div>
    </section>

    <section v-if="actorRows.length" class="card charts-card">
      <div class="section-header">
        <h2>度量可视化</h2>
      </div>
      <div class="charts-grid">
        <div class="chart-panel">
          <div class="chart-caption">角色关联用例分布</div>
          <div ref="actorChartRef" class="chart-box"></div>
        </div>
        <div class="chart-panel">
          <div class="chart-caption">用例点结果概览</div>
          <div ref="metricChartRef" class="chart-box"></div>
        </div>
      </div>
    </section>

    <section v-if="actorRows.length" class="card diagram-card">
      <div class="section-header">
        <h2>用例图可视化</h2>
      </div>
      <div class="diagram-wrap">
        <svg
          class="use-case-diagram"
          :viewBox="`0 0 760 ${diagramHeight}`"
          :style="{ height: `${diagramHeight}px` }"
          preserveAspectRatio="xMidYMid meet"
        >
          <rect x="224" y="18" width="446" :height="diagramHeight - 36" rx="20" class="system-boundary" />
          <text x="246" y="42" class="boundary-label">System</text>

          <line
            v-for="link in diagramLinks"
            :key="link.key"
            :x1="link.x1"
            :y1="link.y1"
            :x2="link.x2"
            :y2="link.y2"
            class="diagram-link"
          />

          <g v-for="actor in actorNodes" :key="actor.id" class="actor-node" :transform="`translate(${actor.x}, ${actor.y})`">
            <circle cx="0" cy="-24" r="11" class="actor-stroke" />
            <line x1="0" y1="-13" x2="0" y2="12" class="actor-stroke" />
            <line x1="-16" y1="-1" x2="16" y2="-1" class="actor-stroke" />
            <line x1="0" y1="12" x2="-14" y2="31" class="actor-stroke" />
            <line x1="0" y1="12" x2="14" y2="31" class="actor-stroke" />
            <text x="0" y="50" text-anchor="middle" class="actor-label">{{ actor.name }}</text>
          </g>

          <g v-for="node in useCaseNodes" :key="node.id" :transform="`translate(${node.x}, ${node.y})`">
            <ellipse cx="0" cy="0" rx="82" ry="28" class="use-case-oval" />
            <text x="0" y="-2" text-anchor="middle" class="use-case-label">
              <tspan x="0" dy="0">{{ node.name }}</tspan>
            </text>
          </g>
        </svg>
      </div>
    </section>

    <section class="content-grid">
      <div class="left-column">
        <div class="card">
          <div class="section-header">
            <h2>角色与用例解析结果</h2>
          </div>
          <div class="table-wrap">
            <table class="info-table actor-table">
              <thead>
                <tr>
                  <th>角色名</th>
                  <th>关联用例</th>
                  <th>用例数</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in actorRows" :key="`${row.actorName}-${row.useCases}`">
                  <td>{{ row.actorName }}</td>
                  <td>{{ row.useCases }}</td>
                  <td>{{ row.useCaseCount }}</td>
                </tr>
                <tr v-if="!actorRows.length">
                  <td colspan="3" class="empty-cell">上传用例图后，这里会展示角色与用例对应关系</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="section-header">
            <h2>未调整前角色权重 UAW</h2>
          </div>
          <div class="calc-grid three-col">
            <label class="calc-item">
              <span>简单角色 ×1</span>
              <input v-model.number="actorCategories.simple" type="number" min="0" />
            </label>
            <label class="calc-item">
              <span>普通角色 ×2</span>
              <input v-model.number="actorCategories.average" type="number" min="0" />
            </label>
            <label class="calc-item">
              <span>复杂角色 ×3</span>
              <input v-model.number="actorCategories.complex" type="number" min="0" />
            </label>
          </div>
          <div class="result-strip">
            UAW = {{ actorCategories.simple }} × 1 + {{ actorCategories.average }} × 2 + {{ actorCategories.complex }} × 3 = <strong>{{ UAW }}</strong>
          </div>
        </div>

        <div class="card">
          <div class="section-header">
            <h2>未调整前用例权重 UUC</h2>
          </div>
          <div class="calc-grid three-col">
            <label class="calc-item">
              <span>简单用例 ×5</span>
              <input v-model.number="useCaseCategories.simple" type="number" min="0" />
            </label>
            <label class="calc-item">
              <span>普通用例 ×10</span>
              <input v-model.number="useCaseCategories.average" type="number" min="0" />
            </label>
            <label class="calc-item">
              <span>复杂用例 ×15</span>
              <input v-model.number="useCaseCategories.complex" type="number" min="0" />
            </label>
          </div>
          <div class="result-strip">
            UUC = {{ useCaseCategories.simple }} × 5 + {{ useCaseCategories.average }} × 10 + {{ useCaseCategories.complex }} × 15 = <strong>{{ UUC }}</strong>
          </div>
        </div>
      </div>

      <div class="right-column">
        <div class="factor-panels">
        <div class="card factor-card">
          <div class="section-header">
            <h2>技术复杂度因子 TCF</h2>
          </div>
          <div class="factor-table">
            <div class="factor-header">
              <span>因子</span>
              <span>权重</span>
              <span>评分(0-5)</span>
            </div>
            <div v-for="item in tcfFactors" :key="item.key" class="factor-row">
              <div class="factor-name">
                <strong>{{ item.key }}</strong>
                <span>{{ item.label }}</span>
              </div>
              <div class="factor-weight">{{ item.weight }}</div>
              <input v-model.number="item.value" type="number" min="0" max="5" @change="normalizeScore(item)" />
            </div>
          </div>
          <div class="result-strip">
            TFactor = {{ TFactor }}，TCF = 0.6 + (0.01 × {{ TFactor }}) = <strong>{{ TCF }}</strong>
          </div>
        </div>

        <div class="card factor-card">
          <div class="section-header">
            <h2>环境因子 EF</h2>
          </div>
          <div class="factor-table">
            <div class="factor-header">
              <span>因子</span>
              <span>权重</span>
              <span>评分(0-5)</span>
            </div>
            <div v-for="item in efFactors" :key="item.key" class="factor-row">
              <div class="factor-name">
                <strong>{{ item.key }}</strong>
                <span>{{ item.label }}</span>
              </div>
              <div class="factor-weight">{{ item.weight }}</div>
              <input v-model.number="item.value" type="number" min="0" max="5" @change="normalizeScore(item)" />
            </div>
          </div>
          <div class="result-strip">
            EFactor = {{ EFactor }}，EF = 1.4 + (-0.03 × {{ EFactor }}) = <strong>{{ EF }}</strong>
          </div>
        </div>
        </div>

        <div class="card final-card">
          <div class="section-header">
            <h2>最终用例点结果</h2>
          </div>
          <div class="final-grid">
            <div class="final-item">
              <span>UUCP</span>
              <strong>{{ UUCP }}</strong>
            </div>
            <div class="final-item">
              <span>TCF</span>
              <strong>{{ TCF }}</strong>
            </div>
            <div class="final-item">
              <span>EF</span>
              <strong>{{ EF }}</strong>
            </div>
            <div class="final-item accent">
              <span>UPC</span>
              <strong>{{ UPC }}</strong>
            </div>
          </div>
          <div class="formula-box">UPC = UUCP × TCF × EF = {{ UUCP }} × {{ TCF }} × {{ EF }} = <strong>{{ UPC }}</strong></div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.use-case-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.page-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 18px 8px 4px;
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
}

.card {
  background: #ffffff;
  border: 1px solid #e6ecf5;
  border-radius: 18px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}

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
  max-width: 620px;
  color: #61728d;
  font-size: 15px;
  line-height: 1.9;
}

.hero-upload {
  padding: 24px;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  border: 1px solid #e7eef8;
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
  min-height: 280px;
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

.upload-cloud {
  font-size: 58px;
  line-height: 1;
  color: #9dbcf7;
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

.process-card {
  padding: 20px 24px;
}

.process-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.process-item {
  padding: 14px 16px;
  border-radius: 14px;
  background: #f8fbff;
  border: 1px solid #e0ebfb;
  color: #29426a;
  line-height: 1.7;
  font-size: 14px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.summary-card {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-label {
  color: #6b7a90;
  font-size: 14px;
}

.summary-value {
  font-size: 34px;
  line-height: 1;
  color: #1e293b;
  font-weight: 700;
}

.summary-value.accent {
  color: #3b82f6;
}

.charts-card {
  padding: 18px 20px;
}

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
    radial-gradient(circle at top right, rgba(79, 140, 255, 0.08), transparent 30%),
    linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
}

.chart-caption {
  margin-bottom: 10px;
  color: #314566;
  font-size: 15px;
  font-weight: 700;
}

.chart-box {
  width: 100%;
  height: 320px;
}

.diagram-card {
  padding: 16px 18px;
}

.diagram-wrap {
  overflow: auto;
  border: 1px solid #e6ecf5;
  border-radius: 16px;
  background:
    radial-gradient(circle at top right, rgba(79, 140, 255, 0.08), transparent 28%),
    linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
  max-height: 420px;
  padding: 6px;
}

.use-case-diagram {
  width: 100%;
  min-width: 760px;
  height: auto;
  display: block;
}

.system-boundary {
  fill: rgba(255, 255, 255, 0.9);
  stroke: #cfdcf2;
  stroke-width: 2;
  stroke-dasharray: 8 6;
}

.boundary-label {
  fill: #6b7a90;
  font-size: 13px;
  font-weight: 700;
}

.diagram-link {
  stroke: #88a6d9;
  stroke-width: 1.8;
}

.actor-stroke {
  stroke: #274472;
  stroke-width: 2.2;
  stroke-linecap: round;
  fill: none;
}

.actor-label {
  fill: #1e293b;
  font-size: 13px;
  font-weight: 600;
}

.use-case-oval {
  fill: #ffffff;
  stroke: #4f8cff;
  stroke-width: 2;
}

.use-case-label {
  fill: #21406b;
  font-size: 12px;
  font-weight: 600;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  align-items: start;
}

.left-column,
.right-column {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.left-column > .card,
.right-column > .card {
  padding: 18px 20px;
}

.factor-panels {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.factor-card {
  padding: 18px 20px;
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
  padding: 14px 16px;
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
  line-height: 1.65;
}

.info-table th:last-child,
.info-table td:last-child {
  border-right: 0;
}

.info-table tbody tr:last-child td {
  border-bottom: 0;
}

.actor-table td:last-child,
.actor-table th:last-child {
  text-align: center;
  width: 92px;
}

.empty-cell {
  text-align: center !important;
  color: #94a3b8 !important;
}

.calc-grid {
  display: grid;
  gap: 14px;
}

.calc-grid.three-col {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.calc-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border-radius: 14px;
  background: #f8fbff;
  border: 1px solid #e0ebfb;
}

.calc-item span {
  color: #42526b;
  font-size: 14px;
  font-weight: 600;
}

.calc-item input,
.factor-row input {
  height: 42px;
  border-radius: 10px;
  border: 1px solid #d5e0f0;
  padding: 0 12px;
  font-size: 15px;
  color: #1e293b;
  outline: none;
  background: #ffffff;
}

.calc-item input:focus,
.factor-row input:focus {
  border-color: #5ca3ff;
  box-shadow: 0 0 0 3px rgba(92, 163, 255, 0.12);
}

.result-strip,
.formula-box {
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: 12px;
  background: linear-gradient(180deg, #f8fbff 0%, #f2f7ff 100%);
  border: 1px solid #dce8fb;
  color: #35507d;
  font-size: 14px;
  line-height: 1.7;
}

.result-strip strong,
.formula-box strong {
  color: #2563eb;
  font-size: 18px;
}

.factor-table {
  border: 1px solid #e6ecf5;
  border-radius: 14px;
  overflow: hidden;
  max-height: 560px;
  overflow-y: auto;
}

.factor-header,
.factor-row {
  display: grid;
  grid-template-columns: 1.6fr 0.5fr 0.6fr;
  align-items: center;
}

.factor-header {
  background: #fbfcff;
  color: #475569;
  font-size: 13px;
  font-weight: 700;
}

.factor-header span,
.factor-row > div,
.factor-row input {
  padding: 12px 14px;
  border-right: 1px solid #e6ecf5;
  border-bottom: 1px solid #e6ecf5;
}

.factor-header span:last-child,
.factor-row > div:last-of-type,
.factor-row input:last-child {
  border-right: 0;
}

.factor-row:last-child > div,
.factor-row:last-child input {
  border-bottom: 0;
}

.factor-name {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #334155;
}

.factor-name strong {
  color: #2563eb;
  font-size: 13px;
}

.factor-name span {
  font-size: 14px;
  line-height: 1.55;
}

.factor-weight {
  text-align: center;
  font-weight: 700;
  color: #1e293b;
}

.factor-row input {
  border-radius: 0;
  border-top: 0;
  border-left: 0;
  border-bottom: 0;
  width: 100%;
  text-align: center;
  box-shadow: none;
}

.final-card {
  background:
    radial-gradient(circle at top right, rgba(79, 140, 255, 0.14), transparent 32%),
    linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.final-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.final-item {
  padding: 16px 14px;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid #e0ebfb;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.final-item span {
  color: #6b7a90;
  font-size: 13px;
}

.final-item strong {
  color: #1e293b;
  font-size: 24px;
  line-height: 1;
}

.final-item.accent {
  background: linear-gradient(180deg, #eef5ff 0%, #dfeeff 100%);
  border-color: #bcd7ff;
}

.final-item.accent strong {
  color: #2563eb;
}

@media (max-width: 1280px) {
  .hero-card,
  .content-grid,
  .process-list,
  .charts-grid {
    grid-template-columns: 1fr;
  }

  .factor-panels {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .summary-grid,
  .final-grid,
  .calc-grid.three-col {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .hero-card,
  .process-card,
  .left-column > .card,
  .right-column > .card {
    padding: 16px;
  }

  .summary-grid,
  .final-grid,
  .calc-grid.three-col {
    grid-template-columns: 1fr;
  }

  .factor-header,
  .factor-row {
    grid-template-columns: 1.2fr 0.5fr 0.6fr;
  }
}
</style>
