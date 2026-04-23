<script setup>
</script>

<template>
  <div class="home-page">
    <div class="page-header">
      <h1 class="page-title">主页</h1>
    </div>
    <div class="home-welcome">
      <div class="welcome-card">
        <div class="welcome-icon">📊</div>
        <h2>欢迎使用软件度量系统</h2>
        <p>本平台提供功能点度量、类图辅助度量、用例点辅助度量、控制流图辅助度量以及代码辅助度量等功能，帮助您全面评估软件规模与质量。</p>
        <div class="feature-cards">
          <div class="feature-card">
            <span class="feature-icon">⊞</span>
            <span>功能点度量</span>
          </div>
          <div class="feature-card">
            <span class="feature-icon">🖥</span>
            <span>类图辅助度量</span>
          </div>
          <div class="feature-card">
            <span class="feature-icon">📋</span>
            <span>用例点辅助度量</span>
          </div>
          <div class="feature-card">
            <span class="feature-icon">↗</span>
            <span>控制流图辅助度量</span>
          </div>
          <div class="feature-card">
            <span class="feature-icon">&lt;/&gt;</span>
            <span>代码辅助度量</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  max-width: 1100px;
}

.page-header {
  margin-bottom: 28px;
}

.page-title {
  font-size: 26px;
  font-weight: 700;
  color: #1e2d4a;
  letter-spacing: 0.5px;
}

.home-welcome {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 20px;
}

.welcome-card {
  background: #fff;
  border-radius: 16px;
  padding: 48px 56px;
  box-shadow: 0 4px 24px rgba(30, 45, 74, 0.08);
  text-align: center;
  max-width: 680px;
  width: 100%;
}

.welcome-icon {
  font-size: 52px;
  margin-bottom: 20px;
}

.welcome-card h2 {
  font-size: 22px;
  font-weight: 700;
  color: #1e2d4a;
  margin-bottom: 14px;
}

.welcome-card p {
  color: #718096;
  font-size: 14.5px;
  line-height: 1.8;
  margin-bottom: 32px;
}

.feature-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}

.feature-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: #f0f5ff;
  border-radius: 8px;
  color: #3b6fd4;
  font-size: 13px;
  font-weight: 500;
}

.feature-icon {
  font-size: 16px;
}
</style>