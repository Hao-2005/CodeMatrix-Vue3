<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

const navItems = [
  { label: '主页', path: '/', icon: new URL('/src/assets/home.png', import.meta.url).href, iconType: 'img' },
  { label: '功能点度量', path: '/fp', icon: new URL('/src/assets/function.png', import.meta.url).href, iconType: 'img' },
  { label: '类图辅助度量', path: '/class-diagram', icon: new URL('/src/assets/UML.png', import.meta.url).href, iconType: 'img' },
  { label: '用例点辅助度量', path: '/use-case', icon: new URL('/src/assets/case.png', import.meta.url).href, iconType: 'img' },
  //{ label: '控制流图辅助度量', path: '/control-flow', icon: '↗' },
  { label: '代码辅助度量', path: '/code-metric', icon: new URL('/src/assets/code.png', import.meta.url).href, iconType: 'img' },
]
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-logo">
      <div class="logo-icon">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="12" stroke="#4a9eff" stroke-width="2.5" fill="none"/>
          <path d="M8 14 L12 10 L16 14 L20 10" stroke="#4a9eff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      </div>
      <span class="logo-text">软件度量系统</span>
    </div>

    <nav class="nav-menu">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: route.path === item.path }"
      >
        <span class="nav-icon">
          <img v-if="item.iconType === 'img'" :src="item.icon" alt="" />
          <template v-else>{{ item.icon }}</template>
        </span>
        <span class="nav-label">{{ item.label }}</span>
      </router-link>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 220px;
  min-height: 100vh;
  background: linear-gradient(180deg, #1e2d4a 0%, #243352 100%);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  padding: 0;
  box-shadow: 2px 0 12px rgba(0,0,0,0.12);
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 22px 20px 22px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
}

.logo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text {
  color: #e8eef8;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.nav-menu {
  display: flex;
  flex-direction: column;
  padding: 12px 0;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 20px;
  color: #a0aec0;
  text-decoration: none;
  font-size: 13.5px;
  border-radius: 0;
  transition: background 0.15s, color 0.15s;
  position: relative;
}

.nav-item:hover {
  background: rgba(74, 158, 255, 0.1);
  color: #c8d8f0;
}

.nav-item.active {
  background: linear-gradient(90deg, #3b6fd4 0%, #4a9eff 100%);
  color: #ffffff;
  font-weight: 600;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #7ec8ff;
  border-radius: 0 2px 2px 0;
}

.nav-icon {
  font-size: 15px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.nav-icon img {
  width: 1.2em;
  height: 1.2em;
  object-fit: contain;
  vertical-align: middle;
}

.nav-label {
  white-space: nowrap;
}
</style>