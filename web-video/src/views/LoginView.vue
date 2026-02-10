<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMsg = ref('')
const showPassword = ref(false)

const handleLogin = async () => {
  if (!username.value.trim()) {
    errorMsg.value = '请输入用户名'
    return
  }
  if (!password.value) {
    errorMsg.value = '请输入密码'
    return
  }

  isLoading.value = true
  errorMsg.value = ''

  try {
    await authStore.login(username.value.trim(), password.value)
    router.push('/')
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || err.message || '登录失败，请检查用户名和密码'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-container">
      <!-- Logo 区域 -->
      <div class="login-header">
        <div class="login-logo">🎬</div>
        <h1 class="login-title">AI 创作中心</h1>
        <p class="login-subtitle">Sora · VEO · Gemini · Grok</p>
      </div>

      <!-- 登录表单 -->
      <div class="login-card">
        <h2 class="login-card-title">用户登录</h2>

        <form @submit.prevent="handleLogin" class="login-form">
          <div class="login-field">
            <label class="login-label">用户名</label>
            <div class="login-input-wrapper">
              <span class="login-input-icon">👤</span>
              <input
                v-model="username"
                type="text"
                class="login-input"
                placeholder="请输入用户名"
                autocomplete="username"
                @keyup.enter="handleLogin"
              />
            </div>
          </div>

          <div class="login-field">
            <label class="login-label">密码</label>
            <div class="login-input-wrapper">
              <span class="login-input-icon">🔒</span>
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                class="login-input"
                placeholder="请输入密码"
                autocomplete="current-password"
                @keyup.enter="handleLogin"
              />
              <button
                type="button"
                class="login-toggle-pwd"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>

          <!-- 错误提示 -->
          <div v-if="errorMsg" class="login-error">
            ❌ {{ errorMsg }}
          </div>

          <button
            type="submit"
            class="login-btn"
            :disabled="isLoading"
          >
            <span v-if="isLoading" class="loading"></span>
            {{ isLoading ? '登录中...' : '登 录' }}
          </button>
        </form>
      </div>

      <p class="login-footer">AI Video & Image Generation Platform</p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
  padding: 20px;
}

.login-container {
  width: 100%;
  max-width: 420px;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-logo {
  font-size: 48px;
  margin-bottom: 12px;
  filter: drop-shadow(0 0 20px rgba(99, 102, 241, 0.4));
}

.login-title {
  font-size: 28px;
  font-weight: 700;
  color: #f1f5f9;
  margin-bottom: 8px;
}

.login-subtitle {
  font-size: 14px;
  color: #94a3b8;
  letter-spacing: 2px;
}

.login-card {
  background: rgba(30, 41, 59, 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.login-card-title {
  font-size: 18px;
  font-weight: 600;
  color: #f1f5f9;
  text-align: center;
  margin-bottom: 28px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.login-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.login-label {
  font-size: 13px;
  color: #94a3b8;
  font-weight: 500;
}

.login-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.login-input-icon {
  position: absolute;
  left: 14px;
  font-size: 14px;
  z-index: 1;
  pointer-events: none;
}

.login-input {
  width: 100%;
  padding: 14px 16px 14px 42px;
  background: rgba(51, 65, 85, 0.6);
  border: 1px solid rgba(71, 85, 105, 0.6);
  border-radius: 10px;
  color: #f1f5f9;
  font-size: 14px;
  transition: all 0.2s;
}

.login-input:focus {
  outline: none;
  border-color: #6366f1;
  background: rgba(51, 65, 85, 0.8);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.login-input::placeholder {
  color: #64748b;
}

.login-toggle-pwd {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 4px;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.login-toggle-pwd:hover {
  opacity: 1;
}

.login-error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
}

.login-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
}

.login-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #4f46e5, #4338ca);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.login-footer {
  text-align: center;
  color: #475569;
  font-size: 12px;
  margin-top: 24px;
}

@media (max-width: 480px) {
  .login-card {
    padding: 24px;
  }
  .login-title {
    font-size: 24px;
  }
}
</style>
