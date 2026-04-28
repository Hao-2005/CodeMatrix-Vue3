<script setup>
/**
 * UmlClassDiagram.vue
 * 解析 XMI/UML XML 文件内容，渲染可视化 UML 类图（纯 SVG，无外部依赖）
 *
 * Props:
 *   xmlContent: String  —— XML 文件的文本内容
 */

import { computed, ref } from 'vue'

const props = defineProps({
  xmlContent: {
    type: String,
    required: true,
  },
})

// ─── 1. XML 解析 ──────────────────────────────────────────────────────────────

const parseResult = computed(() => {
  if (!props.xmlContent?.trim()) return null
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(props.xmlContent, 'application/xml')
    const err = doc.querySelector('parsererror')
    if (err) return { error: 'XML 解析失败：' + err.textContent.slice(0, 120) }
    return buildModel(doc)
  } catch (e) {
    return { error: '解析异常：' + e.message }
  }
})

function buildModel(doc) {
  // 收集所有 packagedElement
  const elements = Array.from(doc.querySelectorAll('packagedElement'))

  // id → name 映射（用于解析类型引用）
  const idMap = {}
  elements.forEach(el => {
    const id = el.getAttribute('xmi:id')
    const name = el.getAttribute('name')
    if (id && name) idMap[id] = name
  })

  // 解析所有类
  const classes = []
  const classIdToIndex = {}

  elements.forEach(el => {
    const type = el.getAttribute('xmi:type')
    if (type !== 'uml:Class' && type !== 'uml:Interface') return

    const id = el.getAttribute('xmi:id')
    const name = el.getAttribute('name') || '(unnamed)'
    const isAbstract = el.getAttribute('isAbstract') === 'true'
    const isInterface = type === 'uml:Interface'

    // 属性
    const attributes = Array.from(el.querySelectorAll(':scope > ownedAttribute')).map(attr => ({
      name: attr.getAttribute('name') || '',
      visibility: attr.getAttribute('visibility') || 'package',
      type: resolveType(attr.getAttribute('type'), idMap),
    }))

    // 方法（只取非 return 方向的 ownedParameter 作为参数）
    const operations = Array.from(el.querySelectorAll(':scope > ownedOperation')).map(op => {
      const params = Array.from(op.querySelectorAll('ownedParameter'))
        .filter(p => p.getAttribute('direction') !== 'return')
        .map(p => {
          const typeName = resolveType(p.getAttribute('type'), idMap)
          return typeName ? `${p.getAttribute('name') || ''}: ${typeName}` : (p.getAttribute('name') || '')
        })
      const returnParam = Array.from(op.querySelectorAll('ownedParameter'))
        .find(p => p.getAttribute('direction') === 'return')
      const returnType = returnParam ? resolveType(returnParam.getAttribute('type'), idMap) : null

      return {
        name: op.getAttribute('name') || '',
        visibility: op.getAttribute('visibility') || 'package',
        params,
        returnType,
      }
    })

    // 继承
    const generalizations = Array.from(el.querySelectorAll(':scope > generalization')).map(g => ({
      general: g.getAttribute('general'),
    }))

    classIdToIndex[id] = classes.length
    classes.push({ id, name, isAbstract, isInterface, attributes, operations, generalizations })
  })

  // 解析 Association 关系
  const associations = []
  elements.forEach(el => {
    const type = el.getAttribute('xmi:type')
    if (type !== 'uml:Association') return

    const name = el.getAttribute('name') || ''
    const memberEnd = el.getAttribute('memberEnd')?.split(' ') || []
    const ends = Array.from(el.querySelectorAll(':scope > ownedEnd'))

    if (ends.length < 2) return

    const sourceTypeId = ends[0].getAttribute('type')
    const targetTypeId = ends[1].getAttribute('type')
    const aggregation = ends[1].getAttribute('aggregation')

    const sourceUpper = ends[0].querySelector('upperValue')?.getAttribute('value')
    const sourceLower = ends[0].querySelector('lowerValue')?.getAttribute('value') || '0'
    const targetUpper = ends[1].querySelector('upperValue')?.getAttribute('value')
    const targetLower = ends[1].querySelector('lowerValue')?.getAttribute('value') || '0'

    associations.push({
      name,
      sourceId: sourceTypeId,
      targetId: targetTypeId,
      aggregation: aggregation || 'none',
      sourceMultiplicity: formatMultiplicity(sourceLower, sourceUpper),
      targetMultiplicity: formatMultiplicity(targetLower, targetUpper),
    })
  })

  // 解析 Dependency 关系
  const dependencies = []
  elements.forEach(el => {
    const type = el.getAttribute('xmi:type')
    if (type !== 'uml:Dependency') return
    dependencies.push({
      name: el.getAttribute('name') || '',
      supplierId: el.getAttribute('supplier'),
      clientId: el.getAttribute('client'),
    })
  })

  // 生成继承关系列表
  const inheritances = []
  classes.forEach(cls => {
    cls.generalizations.forEach(g => {
      if (g.general) inheritances.push({ childId: cls.id, parentId: g.general })
    })
  })

  return { classes, associations, dependencies, inheritances, idMap }
}

function resolveType(typeId, idMap) {
  if (!typeId) return null
  return idMap[typeId] || typeId
}

function formatMultiplicity(lower, upper) {
  if (!lower && !upper) return ''
  if (upper === '*' || upper === '-1') return `${lower || '0'}...*`
  if (lower === upper) return lower || ''
  return `${lower || '0'}...${upper || ''}`
}

// ─── 2. 布局计算 ──────────────────────────────────────────────────────────────

const CARD_WIDTH = 220
const HEADER_H = 44
const ROW_H = 22
const SECTION_GAP = 8
const PADDING = 14
const H_GAP = 60
const V_GAP = 50

// 计算每个类卡片高度
function cardHeight(cls) {
  const attrRows = cls.attributes.length || 0
  const opRows = cls.operations.length || 0
  return HEADER_H + PADDING
    + (attrRows > 0 ? ROW_H * attrRows + SECTION_GAP : 0)
    + (opRows > 0 ? ROW_H * opRows + SECTION_GAP : 0)
    + PADDING
}

// 简单网格布局，优先考虑继承层次
const layout = computed(() => {
  const model = parseResult.value
  if (!model || model.error || !model.classes.length) return null

  const { classes, associations, dependencies, inheritances } = model

  // 构建父子关系图
  const childrenOf = {}
  const parentOf = {}
  inheritances.forEach(({ childId, parentId }) => {
    if (!childrenOf[parentId]) childrenOf[parentId] = []
    childrenOf[parentId].push(childId)
    parentOf[childId] = parentId
  })

  // 拓扑排序层级
  const levels = {}
  function assignLevel(id, level) {
    if (levels[id] !== undefined && levels[id] >= level) return
    levels[id] = level
    ;(childrenOf[id] || []).forEach(cid => assignLevel(cid, level + 1))
  }

  // 找根节点（没有父节点的类）
  classes.forEach(cls => {
    if (!parentOf[cls.id]) assignLevel(cls.id, 0)
  })

  // 将同层的类按列排
  const byLevel = {}
  classes.forEach(cls => {
    const lv = levels[cls.id] ?? 0
    if (!byLevel[lv]) byLevel[lv] = []
    byLevel[lv].push(cls)
  })

  const positions = {}
  let maxX = 0
  const levelKeys = Object.keys(byLevel).map(Number).sort((a, b) => a - b)

  // 先计算每层总宽度
  let curY = 40
  levelKeys.forEach(lv => {
    const row = byLevel[lv]
    const totalW = row.length * (CARD_WIDTH + H_GAP) - H_GAP
    let startX = 40
    const maxH = Math.max(...row.map(c => cardHeight(c)))

    row.forEach((cls, i) => {
      const x = startX + i * (CARD_WIDTH + H_GAP)
      positions[cls.id] = { x, y: curY, w: CARD_WIDTH, h: cardHeight(cls) }
      maxX = Math.max(maxX, x + CARD_WIDTH)
    })
    curY += maxH + V_GAP
  })

  const svgW = maxX + 60
  const svgH = curY + 20

  return { classes, associations, dependencies, inheritances, positions, svgW, svgH }
})

// ─── 3. 边线生成 ──────────────────────────────────────────────────────────────

function edgePath(sx, sy, tx, ty) {
  // 折线路径
  const mx = (sx + tx) / 2
  return `M${sx},${sy} C${mx},${sy} ${mx},${ty} ${tx},${ty}`
}

function getConnectPoints(pos, side = 'auto', targetPos = null) {
  const cx = pos.x + pos.w / 2
  const cy = pos.y + pos.h / 2

  if (side === 'bottom') return { x: cx, y: pos.y + pos.h }
  if (side === 'top') return { x: cx, y: pos.y }
  if (side === 'right') return { x: pos.x + pos.w, y: cy }
  if (side === 'left') return { x: pos.x, y: cy }

  // auto：根据目标位置选最近侧
  if (!targetPos) return { x: cx, y: pos.y }
  const tcx = targetPos.x + targetPos.w / 2
  const tcy = targetPos.y + targetPos.h / 2
  const dx = tcx - cx
  const dy = tcy - cy
  if (Math.abs(dy) > Math.abs(dx)) {
    return dy > 0
      ? { x: cx, y: pos.y + pos.h, side: 'bottom' }
      : { x: cx, y: pos.y, side: 'top' }
  } else {
    return dx > 0
      ? { x: pos.x + pos.w, y: cy, side: 'right' }
      : { x: pos.x, y: cy, side: 'left' }
  }
}

// ─── 4. 可见性符号 ─────────────────────────────────────────────────────────────

function visSymbol(vis) {
  switch (vis) {
    case 'public':    return '+'
    case 'private':   return '−'
    case 'protected': return '#'
    case 'package':   return '~'
    default:          return '~'
  }
}

function visColor(vis) {
  switch (vis) {
    case 'public':    return '#22c55e'
    case 'private':   return '#ef4444'
    case 'protected': return '#f59e0b'
    default:          return '#94a3b8'
  }
}

// ─── 5. 悬停提示 ──────────────────────────────────────────────────────────────

const hoveredClass = ref(null)
const tooltip = ref({ show: false, x: 0, y: 0, cls: null })

function onClassEnter(cls, event) {
  hoveredClass.value = cls.id
  tooltip.value = { show: true, x: event.offsetX + 14, y: event.offsetY + 14, cls }
}

function onClassLeave() {
  hoveredClass.value = null
  tooltip.value.show = false
}

// 截断文本
function truncate(str, max = 26) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

function opLabel(op) {
  const paramStr = op.params.join(', ')
  const ret = op.returnType ? `: ${op.returnType}` : ''
  return `${visSymbol(op.visibility)} ${op.name}(${paramStr})${ret}`
}
</script>

<template>
  <div class="uml-diagram-wrapper">

    <!-- 解析错误 -->
    <div v-if="parseResult?.error" class="uml-error">
      <span class="uml-error-icon">⚠️</span>
      <span>{{ parseResult.error }}</span>
    </div>

    <!-- 无内容 -->
    <div v-else-if="!layout" class="uml-empty">
      <span class="uml-empty-icon">📄</span>
      <p>暂无可解析的类结构</p>
    </div>

    <!-- 图例 -->
    <div v-else class="uml-legend">
      <span class="legend-item"><span class="dot green"></span>public (+)</span>
      <span class="legend-item"><span class="dot red"></span>private (−)</span>
      <span class="legend-item"><span class="dot yellow"></span>protected (#)</span>
      <span class="legend-item inherit-line">── ▷</span><span>继承</span>
      <span class="legend-item assoc-line">──→</span><span>关联</span>
      <span class="legend-item dep-line">- -→</span><span>依赖</span>
    </div>

    <!-- SVG 画布 -->
    <div v-if="layout" class="uml-svg-scroll">
      <svg
        :width="layout.svgW"
        :height="layout.svgH"
        xmlns="http://www.w3.org/2000/svg"
        class="uml-svg"
      >
        <defs>
          <!-- 继承箭头（空心三角） -->
          <marker id="inherit-arrow" markerWidth="10" markerHeight="10"
                  refX="9" refY="5" orient="auto">
            <path d="M0,0 L9,5 L0,10 Z" fill="white" stroke="#3b82f6" stroke-width="1.2"/>
          </marker>
          <!-- 关联箭头 -->
          <marker id="assoc-arrow" markerWidth="8" markerHeight="8"
                  refX="7" refY="4" orient="auto">
            <path d="M0,0 L7,4 L0,8" fill="none" stroke="#64748b" stroke-width="1.4"/>
          </marker>
          <!-- 依赖箭头 -->
          <marker id="dep-arrow" markerWidth="8" markerHeight="8"
                  refX="7" refY="4" orient="auto">
            <path d="M0,0 L7,4 L0,8" fill="none" stroke="#a78bfa" stroke-width="1.4"/>
          </marker>
          <!-- 菱形聚合 -->
          <marker id="agg-diamond" markerWidth="12" markerHeight="8"
                  refX="0" refY="4" orient="auto">
            <path d="M0,4 L5,0 L10,4 L5,8 Z" fill="white" stroke="#64748b" stroke-width="1.2"/>
          </marker>
          <!-- 阴影 -->
          <filter id="card-shadow" x="-8%" y="-8%" width="116%" height="116%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(59,130,246,0.10)"/>
          </filter>
          <filter id="card-shadow-hover" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="7" flood-color="rgba(59,130,246,0.22)"/>
          </filter>
        </defs>

        <!-- ── 继承关系线 ── -->
        <g class="edges-inherit">
          <template v-for="inh in layout.inheritances" :key="inh.childId + inh.parentId">
            <template v-if="layout.positions[inh.childId] && layout.positions[inh.parentId]">
              <line
                :x1="layout.positions[inh.childId].x + layout.positions[inh.childId].w / 2"
                :y1="layout.positions[inh.childId].y"
                :x2="layout.positions[inh.parentId].x + layout.positions[inh.parentId].w / 2"
                :y2="layout.positions[inh.parentId].y + layout.positions[inh.parentId].h"
                stroke="#3b82f6"
                stroke-width="1.8"
                fill="none"
                marker-end="url(#inherit-arrow)"
              />
            </template>
          </template>
        </g>

        <!-- ── 关联关系线 ── -->
        <g class="edges-assoc">
          <template v-for="(assoc, i) in layout.associations" :key="i">
            <template v-if="layout.positions[assoc.sourceId] && layout.positions[assoc.targetId]">
              <g>
                <line
                  :x1="layout.positions[assoc.sourceId].x + layout.positions[assoc.sourceId].w / 2"
                  :y1="layout.positions[assoc.sourceId].y + layout.positions[assoc.sourceId].h / 2"
                  :x2="layout.positions[assoc.targetId].x + layout.positions[assoc.targetId].w / 2"
                  :y2="layout.positions[assoc.targetId].y + layout.positions[assoc.targetId].h / 2"
                  :stroke="assoc.aggregation === 'shared' ? '#f59e0b' : '#64748b'"
                  stroke-width="1.5"
                  :marker-start="assoc.aggregation === 'shared' ? 'url(#agg-diamond)' : ''"
                  marker-end="url(#assoc-arrow)"
                />
                <!-- 多重性标签 -->
                <text
                  v-if="assoc.sourceMultiplicity"
                  :x="layout.positions[assoc.sourceId].x + layout.positions[assoc.sourceId].w / 2 + 6"
                  :y="layout.positions[assoc.sourceId].y + layout.positions[assoc.sourceId].h / 2 - 5"
                  font-size="11" fill="#64748b"
                >{{ assoc.sourceMultiplicity }}</text>
                <text
                  v-if="assoc.targetMultiplicity"
                  :x="layout.positions[assoc.targetId].x + layout.positions[assoc.targetId].w / 2 + 6"
                  :y="layout.positions[assoc.targetId].y + layout.positions[assoc.targetId].h / 2 - 5"
                  font-size="11" fill="#64748b"
                >{{ assoc.targetMultiplicity }}</text>
              </g>
            </template>
          </template>
        </g>

        <!-- ── 依赖关系线 ── -->
        <g class="edges-dep">
          <template v-for="(dep, i) in layout.dependencies" :key="i">
            <template v-if="layout.positions[dep.clientId] && layout.positions[dep.supplierId]">
              <line
                :x1="layout.positions[dep.clientId].x + layout.positions[dep.clientId].w / 2"
                :y1="layout.positions[dep.clientId].y + layout.positions[dep.clientId].h / 2"
                :x2="layout.positions[dep.supplierId].x + layout.positions[dep.supplierId].w / 2"
                :y2="layout.positions[dep.supplierId].y + layout.positions[dep.supplierId].h / 2"
                stroke="#a78bfa"
                stroke-width="1.4"
                stroke-dasharray="5,3"
                marker-end="url(#dep-arrow)"
              />
            </template>
          </template>
        </g>

        <!-- ── 类卡片 ── -->
        <g
          v-for="cls in layout.classes"
          :key="cls.id"
          class="uml-class-group"
          :transform="`translate(${layout.positions[cls.id].x}, ${layout.positions[cls.id].y})`"
          @mouseenter="onClassEnter(cls, $event)"
          @mouseleave="onClassLeave"
          style="cursor: pointer;"
        >
          <!-- 卡片背景 -->
          <rect
            :width="CARD_WIDTH"
            :height="layout.positions[cls.id].h"
            rx="10"
            ry="10"
            fill="white"
            :stroke="hoveredClass === cls.id ? '#3b82f6' : (cls.isAbstract ? '#a78bfa' : '#dbeafe')"
            :stroke-width="hoveredClass === cls.id ? 2 : 1.5"
            :filter="hoveredClass === cls.id ? 'url(#card-shadow-hover)' : 'url(#card-shadow)'"
          />

          <!-- 头部背景 -->
          <rect
            :width="CARD_WIDTH"
            :height="HEADER_H"
            rx="10" ry="10"
            :fill="cls.isAbstract ? 'url(#header-abstract)' : (cls.isInterface ? '#ecfdf5' : '#eff6ff')"
            :style="{
              fill: cls.isAbstract ? '#f3e8ff' : cls.isInterface ? '#ecfdf5' : '#eff6ff'
            }"
          />
          <!-- 修正头部下方圆角 -->
          <rect :width="CARD_WIDTH" :height="6" :y="HEADER_H - 6"
                :fill="cls.isAbstract ? '#f3e8ff' : cls.isInterface ? '#ecfdf5' : '#eff6ff'"/>

          <!-- 类型标记 «abstract» / «interface» -->
          <text
            v-if="cls.isAbstract || cls.isInterface"
            :x="CARD_WIDTH / 2"
            :y="13"
            text-anchor="middle"
            font-size="10"
            :fill="cls.isAbstract ? '#7c3aed' : '#059669'"
            font-style="italic"
          >«{{ cls.isAbstract ? 'abstract' : 'interface' }}»</text>

          <!-- 类名 -->
          <text
            :x="CARD_WIDTH / 2"
            :y="cls.isAbstract || cls.isInterface ? 30 : 26"
            text-anchor="middle"
            :font-size="cls.name.length > 16 ? 12 : 14"
            font-weight="700"
            :fill="cls.isAbstract ? '#6d28d9' : '#1e3a8a'"
            font-family="'JetBrains Mono', 'Fira Code', Consolas, monospace"
          >{{ cls.name }}</text>

          <!-- 分隔线1（属性区上方） -->
          <line
            :x1="0" :y1="HEADER_H"
            :x2="CARD_WIDTH" :y2="HEADER_H"
            stroke="#e2e8f0" stroke-width="1"
          />

          <!-- 属性列表 -->
          <template v-if="cls.attributes.length">
            <text
              :x="8" :y="HEADER_H + 15"
              font-size="10" fill="#94a3b8" font-weight="600"
            >属性</text>
            <g v-for="(attr, ai) in cls.attributes" :key="ai">
              <text
                :x="8"
                :y="HEADER_H + SECTION_GAP + 20 + ai * ROW_H"
                font-size="11"
                font-family="'JetBrains Mono', Consolas, monospace"
                :fill="visColor(attr.visibility)"
              >{{ visSymbol(attr.visibility) }}</text>
              <text
                :x="20"
                :y="HEADER_H + SECTION_GAP + 20 + ai * ROW_H"
                font-size="11"
                font-family="'JetBrains Mono', Consolas, monospace"
                fill="#334155"
              >{{ truncate(`${attr.name}${attr.type ? ': ' + attr.type : ''}`, 24) }}</text>
            </g>
            <!-- 分隔线2 -->
            <line
              :x1="0"
              :y1="HEADER_H + SECTION_GAP + 24 + cls.attributes.length * ROW_H"
              :x2="CARD_WIDTH"
              :y2="HEADER_H + SECTION_GAP + 24 + cls.attributes.length * ROW_H"
              stroke="#e2e8f0" stroke-width="1"
            />
          </template>

          <!-- 方法列表 -->
          <template v-if="cls.operations.length">
            <!-- 计算方法区起始Y -->
            <text
              :x="8"
              :y="HEADER_H + PADDING + (cls.attributes.length > 0 ? cls.attributes.length * ROW_H + SECTION_GAP + 14 : 0) + 2"
              font-size="10" fill="#94a3b8" font-weight="600"
            >方法</text>
            <g v-for="(op, oi) in cls.operations" :key="oi">
              <text
                :x="8"
                :y="HEADER_H + PADDING + (cls.attributes.length > 0 ? cls.attributes.length * ROW_H + SECTION_GAP + 14 : 0) + 18 + oi * ROW_H"
                font-size="11"
                font-family="'JetBrains Mono', Consolas, monospace"
                :fill="visColor(op.visibility)"
              >{{ visSymbol(op.visibility) }}</text>
              <text
                :x="20"
                :y="HEADER_H + PADDING + (cls.attributes.length > 0 ? cls.attributes.length * ROW_H + SECTION_GAP + 14 : 0) + 18 + oi * ROW_H"
                font-size="11"
                font-family="'JetBrains Mono', Consolas, monospace"
                fill="#334155"
              >{{ truncate(`${op.name}()${op.returnType ? ': ' + op.returnType : ''}`, 24) }}</text>
            </g>
          </template>
        </g>

        <!-- ── 悬停 Tooltip ── -->
        <g v-if="tooltip.show && tooltip.cls" class="uml-tooltip">
          <rect
            :x="tooltip.x - 6"
            :y="tooltip.y - 14"
            :width="260"
            :height="16 + (tooltip.cls.attributes.length + tooltip.cls.operations.length + 2) * 16 + 10"
            rx="8" fill="#1e293b" opacity="0.96"
          />
          <text :x="tooltip.x + 4" :y="tooltip.y" font-size="12" font-weight="700" fill="white">
            {{ tooltip.cls.name }}
            <tspan v-if="tooltip.cls.isAbstract" fill="#c4b5fd" font-style="italic"> «abstract»</tspan>
          </text>
          <g v-for="(attr, i) in tooltip.cls.attributes" :key="'ta' + i">
            <text
              :x="tooltip.x + 4"
              :y="tooltip.y + 18 + i * 16"
              font-size="11"
              font-family="monospace"
              :fill="visColor(attr.visibility)"
            >{{ visSymbol(attr.visibility) }}</text>
            <text
              :x="tooltip.x + 16"
              :y="tooltip.y + 18 + i * 16"
              font-size="11"
              font-family="monospace"
              fill="#cbd5e1"
            >{{ attr.name }}{{ attr.type ? ': ' + attr.type : '' }}</text>
          </g>
          <g v-for="(op, i) in tooltip.cls.operations" :key="'to' + i">
            <text
              :x="tooltip.x + 4"
              :y="tooltip.y + 18 + (tooltip.cls.attributes.length + i) * 16"
              font-size="11"
              font-family="monospace"
              :fill="visColor(op.visibility)"
            >{{ visSymbol(op.visibility) }}</text>
            <text
              :x="tooltip.x + 16"
              :y="tooltip.y + 18 + (tooltip.cls.attributes.length + i) * 16"
              font-size="11"
              font-family="monospace"
              fill="#bae6fd"
            >{{ op.name }}({{ op.params.join(', ') }}){{ op.returnType ? ': ' + op.returnType : '' }}</text>
          </g>
        </g>

      </svg>
    </div>

    <!-- 关系统计栏 -->
    <div v-if="layout" class="uml-stats">
      <span class="stat-chip">
        <span class="stat-num">{{ layout.classes.length }}</span> 个类
      </span>
      <span class="stat-chip">
        <span class="stat-num">{{ layout.inheritances.length }}</span> 条继承
      </span>
      <span class="stat-chip">
        <span class="stat-num">{{ layout.associations.length }}</span> 条关联
      </span>
      <span class="stat-chip">
        <span class="stat-num">{{ layout.dependencies.length }}</span> 条依赖
      </span>
    </div>

  </div>
</template>

<style scoped>
.uml-diagram-wrapper {
  display: flex;
  height: 0 !important;
  flex: 1;
  flex-direction: column;
  height: 100%;
  gap: 10px;
}

.uml-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 10px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  font-size: 13px;
}

.uml-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 10px;
  color: #94a3b8;
}
.uml-empty-icon { font-size: 40px; }
.uml-empty p { font-size: 14px; }

/* 图例 */
.uml-legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e6ecf5;
  font-size: 12px;
  color: #475569;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
}
.dot.green  { background: #22c55e; }
.dot.red    { background: #ef4444; }
.dot.yellow { background: #f59e0b; }

.inherit-line { color: #3b82f6; font-weight: 700; letter-spacing: 1px; }
.assoc-line   { color: #64748b; font-weight: 700; }
.dep-line     { color: #a78bfa; font-weight: 700; }

/* SVG 容器 */
.uml-svg-scroll {
  height: 100%;
  width: 100%;
  flex: 1;
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid #e6ecf5;
  background:
    radial-gradient(circle at 20% 20%, rgba(79,140,255,0.04), transparent 50%),
    #f9fbff;
}

.uml-svg {
  display: block;
}

/* 类卡片悬停 */
.uml-class-group {
  transition: filter 0.2s;
}

/* 统计条 */
.uml-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.stat-chip {
  padding: 4px 12px;
  border-radius: 999px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #3b5998;
  font-size: 12px;
  font-weight: 500;
}

.stat-num {
  font-weight: 700;
  color: #2563eb;
  font-size: 13px;
  margin-right: 2px;
}
</style>