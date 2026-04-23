<script setup>
import { useRoute } from 'vue-router'
import SideNav from './components/SideNav.vue'

const route = useRoute()
</script>

<template>
  <div class="app-layout">
    <SideNav />
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  width: 100%;
}

.main-content {
  flex: 1;
  padding: 32px;
  overflow-y: auto;
  background: #f0f2f8;
  min-height: 100vh;
}
</style>