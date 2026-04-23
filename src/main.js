import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createRouter, createWebHistory } from 'vue-router'
import HomePage from './components/HomePage.vue'
import FPMeasure from './components/FPMeasure.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/fp', component: FPMeasure },
    { path: '/class-diagram', component: { template: '<div class="page-placeholder"><h2>类图辅助度量</h2><p>页面建设中...</p></div>' } },
    { path: '/use-case', component: { template: '<div class="page-placeholder"><h2>用例点辅助度量</h2><p>页面建设中...</p></div>' } },
    { path: '/control-flow', component: { template: '<div class="page-placeholder"><h2>控制流图辅助度量</h2><p>页面建设中...</p></div>' } },
    { path: '/code-metric', component: { template: '<div class="page-placeholder"><h2>代码辅助度量</h2><p>页面建设中...</p></div>' } },
  ]
})

createApp(App).use(router).mount('#app')