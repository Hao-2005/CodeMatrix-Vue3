<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import axios from 'axios'
import * as echarts from 'echarts'

// ==================== TAB ====================
const activeTab = ref('UFP')

// ==================== UFP 数据 ====================
const ufpValues = ref({
  v1: 3, v2: 3, v3: 3,
  v4: 3, v5: 3, v6: 3,
  v7: 3, v8: 3, v9: 3,
  v10: 3, v11: 3, v12: 3,
  v13: 3, v14: 3, v15: 3,
})

const ufpRows = [
  { label: '外部输入（EI）', keys: ['v1','v2','v3'], weights: ['×3','×4','×6'] },
  { label: '外部输出（EO）', keys: ['v4','v5','v6'], weights: ['×4','×5','×7'] },
  { label: '外部查询（EQ）', keys: ['v7','v8','v9'], weights: ['×3','×4','×6'] },
  { label: '外部接口文件（ELF）', keys: ['v10','v11','v12'], weights: ['×5','×7','×10'] },
  { label: '内部逻辑文件（ILF）', keys: ['v13','v14','v15'], weights: ['×7','×10','×15'] },
]

// ==================== VAF 数据 ====================
const vafScores = ref({
  s1: 3, s2: 3, s3: 3, s4: 3, s5: 3, s6: 3, s7: 3,
  s8: 3, s9: 3, s10: 3, s11: 3, s12: 3, s13: 3, s14: 3,
})

const vafItems = [
  { key: 's1',  label: '数据通信', desc: '应用程序不仅仅只有一个前端程序，通过远程交互更新内部逻辑文件，而不是通过批处理程序' },
  { key: 's2',  label: '分布式数据处理', desc: '采取分布式数据存储，动态处理用户请求、服务请求' },
  { key: 's3',  label: '性能', desc: '性能复杂度需要考虑响应时间和吞吐量对应用的影响' },
  { key: 's4',  label: '高强度配置', desc: '考虑计算机资源的限制对应用程序开发的影响程度' },
  { key: 's5',  label: '交易速度', desc: '业务交易处理速度的需求，直接影响到了系统的设计、实施、安装和维护' },
  { key: 's6',  label: '在线数据输入', desc: '数据通过交互处理进入系统的程度' },
  { key: 's7',  label: '最终用户效率', desc: '应用程序中的人性化、易用性程度' },
  { key: 's8',  label: '在线更新', desc: '内部逻辑文件LF被在线更新的程度，如果代码考虑数据丢失保护就得4；如果应用程序具有自动化的数据修复能力就得5' },
  { key: 's9',  label: '复杂的处理', desc: '指业务处理逻辑的复杂程度对设计开发的影响' },
  { key: 's10', label: '可复用性', desc: '指应用在其他应用程序中利用的程度' },
  { key: 's11', label: '易安装性', desc: '在测试阶段提供、并测试验证安装部署计划、数据迁移工具等，确保手册、工具都是经过测试的' },
  { key: 's12', label: '易操作性', desc: '指应用对系统启动、数据备份、程序恢复的影响' },
  { key: 's13', label: '多场地', desc: '不同客户端设备环境具有的相似性和对应用的影响' },
  { key: 's14', label: '支持变更', desc: '指应用程序在业务逻辑处理和数据结构变更时的应对程度，体现可扩展性' },
]

// ==================== 结果 ====================
const UFP = ref(0)
const VAF = ref(1.0)
const FP = computed(() => parseFloat((UFP.value * VAF.value).toFixed(2)))

// ==================== ECharts 实例 ====================
const barChartRef = ref(null)
const pieChartRef = ref(null)
let barChart = null
let pieChart = null

const chartColors = ['#4a9eff', '#36c9a0', '#f5a623', '#e05c7a', '#9b72e8']

function getBarOption() {
  const categories = ufpRows.map(r => r.label.replace(/（.*?）/, ''))
  const lowData  = ufpRows.map(r => ufpValues.value[r.keys[0]])
  const midData  = ufpRows.map(r => ufpValues.value[r.keys[1]])
  const highData = ufpRows.map(r => ufpValues.value[r.keys[2]])

  return {
    animation: true,
    animationDuration: 700,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#1e2d4a',
      borderColor: '#3b6fd4',
      textStyle: { color: '#e8eef8', fontSize: 12 },
    },
    legend: {
      data: ['低', '平均', '高'],
      bottom: 0,
      textStyle: { color: '#8a94a6', fontSize: 11 },
      itemWidth: 10,
      itemHeight: 10,
    },
    grid: {
      left: 10,
      right: 10,
      top: 10,
      bottom: 36,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        color: '#8a94a6',
        fontSize: 10,
        interval: 0,
      },
      axisLine: { lineStyle: { color: '#e0e8f4' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: '#a0aec0', fontSize: 10 },
      splitLine: { lineStyle: { color: '#f0f4fa', type: 'dashed' } },
    },
    series: [
      {
        name: '低',
        type: 'bar',
        barGap: '10%',
        barCategoryGap: '30%',
        data: lowData.map((v, i) => ({ value: v, itemStyle: { color: chartColors[i], opacity: 0.45 } })),
      },
      {
        name: '平均',
        type: 'bar',
        data: midData.map((v, i) => ({ value: v, itemStyle: { color: chartColors[i], opacity: 0.72 } })),
      },
      {
        name: '高',
        type: 'bar',
        data: highData.map((v, i) => ({ value: v, itemStyle: { color: chartColors[i] } })),
      },
    ],
  }
}

function getPieOption() {
  const total = Object.values(vafScores.value).reduce((a, b) => a + Number(b), 0)
  const pieData = vafItems.map((item, i) => ({
    name: item.label,
    value: vafScores.value[item.key],
  }))

  return {
    animation: true,
    animationDuration: 800,
    animationEasing: 'cubicOut',
    color: [
      '#4a9eff','#36c9a0','#f5a623','#e05c7a','#9b72e8',
      '#f7c35f','#5bc4d1','#e88a36','#7dd67a','#d465c0',
      '#6ea8fe','#ff8c6b','#aad37a','#f97316'
    ],
    tooltip: {
      trigger: 'item',
      formatter: (params) => `${params.name}<br/>得分：${params.value}（${params.percent}%）`,
      backgroundColor: '#1e2d4a',
      borderColor: '#3b6fd4',
      textStyle: { color: '#e8eef8', fontSize: 12 },
    },
    title: {
      text: `总分\n${total}`,
      left: 'center',
      top: 'center',
      textStyle: {
        fontSize: 13,
        fontWeight: 700,
        color: '#1e2d4a',
        lineHeight: 20,
      },
    },
    series: [
      {
        name: 'VAF',
        type: 'pie',
        radius: ['42%', '72%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 12,
            fontWeight: 'bold',
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.2)',
          },
        },
        data: pieData,
      },
    ],
  }
}

function initBarChart() {
  if (!barChartRef.value) return
  if (barChart) barChart.dispose()
  barChart = echarts.init(barChartRef.value)
  barChart.setOption(getBarOption())
}

function initPieChart() {
  if (!pieChartRef.value) return
  if (pieChart) pieChart.dispose()
  pieChart = echarts.init(pieChartRef.value)
  pieChart.setOption(getPieOption())
}

function updateBarChart() {
  if (!barChart) return
  barChart.setOption(getBarOption())
}

function updatePieChart() {
  if (!pieChart) return
  pieChart.setOption(getPieOption())
}

// ==================== 编辑状态 ====================
const editingUfp = ref(null)
const editingVaf = ref(null)

function startEditUfp(key) { editingUfp.value = key }
function saveUfp(key) {
  editingUfp.value = null
  calcUFP()
  nextTick(updateBarChart)
}
function handleUfpBlur(key) { saveUfp(key) }

function startEditVaf(key) { editingVaf.value = key }
function saveVaf(key) {
  editingVaf.value = null
  calcVAF()
  nextTick(updatePieChart)
}
function handleVafBlur(key) { saveVaf(key) }

// ==================== API 调用 ====================
function calcUFP() {
  const v = ufpValues.value
  const params = [v.v1,v.v2,v.v3,v.v4,v.v5,v.v6,v.v7,v.v8,v.v9,v.v10,v.v11,v.v12,v.v13,v.v14,v.v15]
  let url = 'http://localhost:8080/api/fp/ufc?' + params.map(p => 's=' + p).join('&')
  axios.post(url).then(res => {
    UFP.value = res.data.data
  }).catch(() => {
    const weights = [3,4,6, 4,5,7, 3,4,6, 5,7,10, 7,10,15]
    UFP.value = params.reduce((sum, val, i) => sum + Number(val) * weights[i], 0)
  })
}

function calcVAF() {
  const s = vafScores.value
  const params = [s.s1,s.s2,s.s3,s.s4,s.s5,s.s6,s.s7,s.s8,s.s9,s.s10,s.s11,s.s12,s.s13,s.s14]
  let url = 'http://localhost:8080/api/fp/vaf?' + params.map(p => 's=' + p).join('&')
  axios.post(url).then(res => {
    VAF.value = res.data.data
  }).catch(() => {
    const total = params.reduce((a, b) => a + Number(b), 0)
    VAF.value = parseFloat((0.65 + 0.01 * total).toFixed(4))
  })
}

// ==================== Tab 切换时初始化图表 ====================
watch(activeTab, async (val) => {
  await nextTick()
  if (val === 'UFP') initBarChart()
  else initPieChart()
})

onMounted(async () => {
  calcUFP()
  calcVAF()
  await nextTick()
  initBarChart()
})

// ==================== tooltip ====================
const hoveredVaf = ref(null)
const tooltipStyle = ref({})
function showTooltip(key, event) {
  hoveredVaf.value = key
  tooltipStyle.value = {
    top: (event.clientY - 60) + 'px',
    left: (event.clientX + 12) + 'px',
  }
}
function hideTooltip() { hoveredVaf.value = null }
</script>

<template>
  <div class="fp-page">
    <div class="page-header">
      <h1 class="page-title">功能点度量</h1>
    </div>

    <div class="card top-card">
      <div class="card-hint">请在表格中输入对应的个数</div>

      <!-- Tab Switch -->
      <div class="tab-bar">
        <button class="tab-btn" :class="{ active: activeTab === 'UFP' }" @click="activeTab = 'UFP'">UFP</button>
        <button class="tab-btn" :class="{ active: activeTab === 'VAF' }" @click="activeTab = 'VAF'">VAF</button>
      </div>

      <div class="top-content">

        <!-- ===== UFP Tab ===== -->
        <template v-if="activeTab === 'UFP'">
          <div class="table-wrap">
            <table class="measure-table">
              <thead>
                <tr>
                  <th>功能单元类型</th>
                  <th>低</th>
                  <th>平均</th>
                  <th>高</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in ufpRows" :key="row.label">
                  <td class="row-label">{{ row.label }}</td>
                  <td v-for="(key, ci) in row.keys" :key="key" class="input-cell">
                    <div class="input-group">
                      <input
                        v-if="editingUfp === key"
                        v-model.number="ufpValues[key]"
                        type="number" min="0"
                        class="cell-input"
                        @blur="handleUfpBlur(key)"
                        @keyup.enter="saveUfp(key)"
                        autofocus
                      />
                      <span v-else class="cell-value" @click="startEditUfp(key)">{{ ufpValues[key] }}</span>
                      <span class="weight-tag">{{ row.weights[ci] }}</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- ECharts 柱形图 -->
          <div class="chart-wrap">
            <div class="chart-title">功能复杂度分布</div>
            <div ref="barChartRef" class="echarts-box"></div>
          </div>
        </template>

        <!-- ===== VAF Tab ===== -->
        <template v-else>
          <div class="table-wrap vaf-table-wrap">
            <table class="measure-table">
              <thead>
                <tr>
                  <th style="width:50px">序号</th>
                  <th>通用系统特征</th>
                  <th style="width:90px">得分</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in vafItems" :key="item.key">
                  <td class="center-cell">{{ idx + 1 }}</td>
                  <td class="vaf-label-cell" @mouseenter="showTooltip(item.key, $event)" @mouseleave="hideTooltip">
                    <span class="vaf-feature-label">{{ item.label }}</span>
                    <span class="info-icon">?</span>
                  </td>
                  <td class="input-cell center-cell">
                    <input
                      v-if="editingVaf === item.key"
                      v-model.number="vafScores[item.key]"
                      type="number" min="0" max="5"
                      class="cell-input"
                      @blur="handleVafBlur(item.key)"
                      @keyup.enter="saveVaf(item.key)"
                      autofocus
                    />
                    <span v-else class="cell-value" @click="startEditVaf(item.key)">{{ vafScores[item.key] }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- ECharts 饼图 -->
          <div class="chart-wrap">
            <div class="chart-title">各项占比分布</div>
            <div ref="pieChartRef" class="echarts-box"></div>
          </div>
        </template>

      </div>
    </div>

    <!-- 计算结果 -->
    <div class="card results-card">
      <div class="results-header">
        <span class="results-title">计算结果</span>
        <span class="results-icon">≡</span>
      </div>
      <div class="results-grid">
        <div class="result-item">
          <div class="result-label">UFP</div>
          <div class="result-value">{{ UFP }}</div>
        </div>
        <div class="result-divider"></div>
        <div class="result-item">
          <div class="result-label">VAF</div>
          <div class="result-value">{{ VAF }}</div>
        </div>
        <div class="result-divider"></div>
        <div class="result-item">
          <div class="result-label">FP</div>
          <div class="result-value highlight">{{ FP }}</div>
        </div>
      </div>
    </div>

    <!-- Tooltip -->
    <teleport to="body">
      <div v-if="hoveredVaf" class="vaf-tooltip" :style="tooltipStyle">
        <div class="tooltip-title">{{ vafItems.find(i => i.key === hoveredVaf)?.label }}</div>
        <div class="tooltip-desc">{{ vafItems.find(i => i.key === hoveredVaf)?.desc }}</div>
      </div>
    </teleport>
  </div>
</template>

<style scoped>
.fp-page 
{ 
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.page-header 
{ 
    margin-bottom: 24px; 
}

.page-title {
  font-size: 26px; font-weight: 700;
  color: #1e2d4a; letter-spacing: 1px;
}

.card {
  background: #fff; border-radius: 14px;
  box-shadow: 0 2px 16px rgba(30,45,74,0.07);
  padding: 24px 28px; margin-bottom: 22px;
  width: 100%;
}

.top-card
{
    height: 0;
    flex: 3;
    display: flex;
    flex-direction: column;
}

.results-card
{
    height: 0;
    flex: 1;
}

.card-hint 
{ 
    font-size: 13px; 
    color: #8a94a6; 
    margin-bottom: 16px; 
}

.tab-bar 
{ 
    display: flex; 
    gap: 8px; 
    margin-bottom: 20px; 
}

.tab-btn {
  padding: 7px 28px; border-radius: 8px;
  border: 1.5px solid #d8e3f0;
  background: #f5f8ff; color: #4a6fa5;
  font-size: 14px; font-weight: 600;
  cursor: pointer; transition: all 0.18s;
}
.tab-btn.active {
  background: linear-gradient(90deg, #3b6fd4, #4a9eff);
  color: #fff; border-color: transparent;
  box-shadow: 0 2px 8px rgba(74,158,255,0.3);
}
.tab-btn:hover:not(.active) { background: #e8f0ff; border-color: #b0c8f0; }

.top-content 
{ 
    height: 0;
    flex: 1;
    display: flex; 
    gap: 28px; 
    align-items: flex-start; 
}

.table-wrap 
{ 
    height: 100%;
    flex: 2; 
    min-width: 0; 
    overflow-x: auto; 
    display: flex;
    flex-direction: column;
}

.vaf-table-wrap 
{ 
    overflow-y: auto; 
}

.measure-table 
{ 
    height: 0;
    flex: 1;
    width: 100%; 
    border-collapse: collapse; 
    font-size: 13.5px; 
}

.measure-table th {
  background: #f5f8ff; color: #4a6fa5; font-weight: 600;
  padding: 10px 14px; text-align: center;
  border-bottom: 2px solid #dce9f8; white-space: nowrap;
}
.measure-table th:first-child { text-align: left; }
.measure-table td {
  padding: 9px 14px; border-bottom: 1px solid #f0f4fa;
  text-align: center; color: #2d3748;
}

.row-label { text-align: left !important; font-size: 13px; color: #4a5568; white-space: nowrap; }

.input-group { display: flex; align-items: center; justify-content: center; gap: 4px; }

.cell-value {
  display: inline-block; min-width: 36px; padding: 4px 8px;
  border-radius: 6px; cursor: pointer; font-weight: 500;
  color: #2d3748; background: #f7faff; border: 1px solid transparent;
  transition: all 0.15s;
}
.cell-value:hover { background: #e8f0ff; border-color: #b0c8f0; }

.cell-input {
  width: 52px; padding: 4px 6px;
  border: 1.5px solid #4a9eff; border-radius: 6px;
  text-align: center; font-size: 13px; outline: none;
  color: #1e2d4a; background: #f0f7ff;
}

.weight-tag { font-size: 11px; color: #4a9eff; font-weight: 600; white-space: nowrap; }
.center-cell { text-align: center !important; height: 46px;}

.vaf-label-cell {
  text-align: left; cursor: default;
  display: flex; align-items: center; gap: 6px; height: 46px;
}
.vaf-feature-label { font-size: 13px; color: #2d3748; }
.info-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; border-radius: 50%;
  background: #d8e8ff; color: #4a9eff;
  font-size: 10px; font-weight: 700; cursor: help; flex-shrink: 0;
}

/* ECharts 容器 */
.chart-wrap 
{ 
    flex-shrink: 0; 
    flex: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.chart-title 
{
    font-size: 13px; 
    font-weight: 600; 
    color: #4a6fa5;
    margin-bottom: 8px; 
    text-align: center;
}

.echarts-box 
{ 
    width: 100%; 
    height: 0;
    flex: 1; 
    display: flex;
}

.echarts-box div
{
    flex: 1 !important;
    height: 100% !important;
}

canvas
{
    width: 100% !important;
    height: 100% !important;
}

/* 计算结果 */
.results-card { padding: 20px 28px; }
.results-header { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; }
.results-title { font-size: 16px; font-weight: 700; color: #1e2d4a; }
.results-icon { color: #8a94a6; font-size: 18px; }

.results-grid { display: flex; align-items: center; justify-content: space-around; }
.result-item { text-align: center; flex: 1; }
.result-label { font-size: 14px; color: #8a94a6; margin-bottom: 6px; font-weight: 500; }
.result-value { font-size: 40px; font-weight: 700; color: #1e2d4a; letter-spacing: 1px; }
.result-value.highlight { color: #3b6fd4; }
.result-divider { width: 1px; height: 60px; background: #e8eef8; }

/* Tooltip */
.vaf-tooltip {
  position: fixed; z-index: 9999;
  background: #1e2d4a; color: #e8eef8;
  padding: 10px 14px; border-radius: 10px;
  max-width: 280px; font-size: 12.5px; line-height: 1.6;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2); pointer-events: none;
}
.tooltip-title { font-weight: 700; margin-bottom: 5px; color: #7ec8ff; }
.tooltip-desc { color: #c8d8f0; }
</style>