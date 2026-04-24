import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createRouter, createWebHistory } from 'vue-router'
import HomePage from './components/HomePage.vue'
import FPMeasure from './components/FPMeasure.vue'
import CodeMetricPage from './components/CodeMetricPage.vue'
import UseCaseMeasurePage from './components/UseCaseMeasurePage.vue'
import CKMeasurePage from './components/CKMeasurePage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/fp', component: FPMeasure },
    { path: '/class-diagram', component: CKMeasurePage },
    { path: '/use-case', component: UseCaseMeasurePage },
    { path: '/control-flow', component: { template: '<div class="page-placeholder"><h2>控制流图辅助度量</h2><p>页面建设中...</p></div>' } },
    { path: '/code-metric', component: CodeMetricPage },
  ]
})

createApp(App).use(router).mount('#app')
