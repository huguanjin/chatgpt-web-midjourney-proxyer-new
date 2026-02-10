<template>
  <div class="app">
    <header v-if="showHeader" class="header">
      <div class="header-content">
        <div class="logo">🎬 AI 创作中心</div>
        <nav class="nav">
          <router-link to="/" class="nav-link">视频生成</router-link>
          <router-link to="/image" class="nav-link">图片创作</router-link>
          <router-link to="/tasks" class="nav-link">任务列表</router-link>
          <router-link to="/characters" class="nav-link">角色管理</router-link>
          <router-link to="/query" class="nav-link">任务查询</router-link>
          <router-link to="/config" class="nav-link">⚙️ 配置</router-link>
        </nav>
        <div class="user-area">
          <!-- 用户头像按钮 -->
          <div class="avatar-wrapper" @click.stop="showUserPanel = !showUserPanel">
            <div class="avatar">{{ avatarChar }}</div>
            <span class="avatar-name">{{ authStore.username }}</span>
            <span class="avatar-arrow" :class="{ open: showUserPanel }">▾</span>
          </div>

          <!-- 用户信息面板 -->
          <div v-if="showUserPanel" class="user-panel" @click.stop>
            <!-- 用户信息 -->
            <div class="panel-section user-info-section">
              <div class="panel-avatar">{{ avatarChar }}</div>
              <div class="panel-user-details">
                <div class="panel-username">{{ authStore.username }}</div>
                <div class="panel-role">{{ authStore.isAdmin ? '管理员' : '普通用户' }}</div>
              </div>
            </div>
            <div class="panel-divider"></div>
            <div class="panel-section">
              <div class="panel-label">用户 ID</div>
              <div class="panel-value panel-id" @click="copyUserId">
                {{ authStore.userId }}
                <span class="copy-icon">{{ copySuccess ? '✅' : '📋' }}</span>
              </div>
            </div>
            <div class="panel-divider"></div>

            <!-- 修改密码区域 -->
            <div class="panel-section">
              <button v-if="!showPwdForm" class="panel-btn change-pwd-btn" @click="showPwdForm = true">
                🔑 修改密码
              </button>
              <div v-else class="pwd-form">
                <div class="pwd-field">
                  <input v-model="oldPassword" type="password" placeholder="当前密码" class="pwd-input" />
                </div>
                <div class="pwd-field">
                  <input v-model="newPassword" type="password" placeholder="新密码（至少6位）" class="pwd-input" />
                </div>
                <div class="pwd-field">
                  <input v-model="confirmNewPassword" type="password" placeholder="确认新密码" class="pwd-input" />
                </div>
                <div v-if="pwdError" class="pwd-error">❌ {{ pwdError }}</div>
                <div v-if="pwdSuccess" class="pwd-success">✅ {{ pwdSuccess }}</div>
                <div class="pwd-actions">
                  <button class="panel-btn cancel-btn" @click="resetPwdForm">取消</button>
                  <button class="panel-btn confirm-btn" :disabled="pwdLoading" @click="handleChangePassword">
                    {{ pwdLoading ? '提交中...' : '确认修改' }}
                  </button>
                </div>
              </div>
            </div>
            <div class="panel-divider"></div>

            <!-- 退出登录 -->
            <div class="panel-section">
              <button class="panel-btn logout-panel-btn" @click="handleLogout">🚪 退出登录</button>
            </div>
          </div>
        </div>
      </div>
    </header>
    <main class="container">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const showHeader = computed(() => route.name !== 'login')
const avatarChar = computed(() => (authStore.username || '?').charAt(0).toUpperCase())

// 面板状态
const showUserPanel = ref(false)
const copySuccess = ref(false)

// 修改密码
const showPwdForm = ref(false)
const oldPassword = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')
const pwdError = ref('')
const pwdSuccess = ref('')
const pwdLoading = ref(false)

const resetPwdForm = () => {
  showPwdForm.value = false
  oldPassword.value = ''
  newPassword.value = ''
  confirmNewPassword.value = ''
  pwdError.value = ''
  pwdSuccess.value = ''
}

const copyUserId = async () => {
  if (!authStore.userId) return
  try {
    await navigator.clipboard.writeText(authStore.userId)
    copySuccess.value = true
    setTimeout(() => { copySuccess.value = false }, 1500)
  } catch {}
}

const handleChangePassword = async () => {
  pwdError.value = ''
  pwdSuccess.value = ''

  if (!oldPassword.value) { pwdError.value = '请输入当前密码'; return }
  if (!newPassword.value || newPassword.value.length < 6) { pwdError.value = '新密码至少 6 个字符'; return }
  if (newPassword.value !== confirmNewPassword.value) { pwdError.value = '两次输入的新密码不一致'; return }

  pwdLoading.value = true
  try {
    await authStore.changePassword(oldPassword.value, newPassword.value)
    pwdSuccess.value = '密码修改成功，即将重新登录...'
    setTimeout(() => {
      authStore.logout()
      router.push('/login')
    }, 1500)
  } catch (err: any) {
    pwdError.value = err.response?.data?.message || err.message || '修改失败'
  } finally {
    pwdLoading.value = false
  }
}

const handleLogout = () => {
  showUserPanel.value = false
  authStore.logout()
  router.push('/login')
}

// 点击页面其他区域关闭面板
const closePanel = () => { showUserPanel.value = false; resetPwdForm() }
onMounted(() => document.addEventListener('click', closePanel))
onUnmounted(() => document.removeEventListener('click', closePanel))
</script>

<style scoped>
/* ===== 用户区域 ===== */
.user-area {
  position: relative;
  margin-left: auto;
}

.avatar-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 8px;
  transition: background 0.2s;
}
.avatar-wrapper:hover {
  background: rgba(255, 255, 255, 0.1);
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.avatar-name {
  color: #ddd;
  font-size: 14px;
  white-space: nowrap;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.avatar-arrow {
  color: #999;
  font-size: 12px;
  transition: transform 0.2s;
}
.avatar-arrow.open {
  transform: rotate(180deg);
}

/* ===== 用户面板 ===== */
.user-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 300px;
  background: #1e1e2e;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  overflow: hidden;
}

.panel-section {
  padding: 14px 16px;
}

.panel-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
}

/* 用户信息头部 */
.user-info-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.panel-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  flex-shrink: 0;
}

.panel-user-details {
  flex: 1;
  min-width: 0;
}

.panel-username {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-role {
  color: #888;
  font-size: 12px;
  margin-top: 2px;
}

/* 用户 ID */
.panel-label {
  color: #888;
  font-size: 12px;
  margin-bottom: 4px;
}

.panel-value {
  color: #ccc;
  font-size: 13px;
  word-break: break-all;
}

.panel-id {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  font-family: monospace;
  font-size: 12px;
  transition: background 0.2s;
}
.panel-id:hover {
  background: rgba(255, 255, 255, 0.1);
}

.copy-icon {
  font-size: 14px;
  margin-left: auto;
  flex-shrink: 0;
}

/* 按钮 */
.panel-btn {
  width: 100%;
  padding: 8px 0;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  text-align: center;
}

.change-pwd-btn {
  background: rgba(102, 126, 234, 0.15);
  color: #8fa4f4;
}
.change-pwd-btn:hover {
  background: rgba(102, 126, 234, 0.25);
}

.logout-panel-btn {
  background: rgba(255, 80, 80, 0.1);
  color: #f87171;
}
.logout-panel-btn:hover {
  background: rgba(255, 80, 80, 0.2);
}

/* 修改密码表单 */
.pwd-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pwd-field {}

.pwd-input {
  width: 100%;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  color: #ddd;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.pwd-input:focus {
  border-color: rgba(102, 126, 234, 0.6);
}
.pwd-input::placeholder {
  color: #666;
}

.pwd-error {
  color: #f87171;
  font-size: 12px;
}

.pwd-success {
  color: #4ade80;
  font-size: 12px;
}

.pwd-actions {
  display: flex;
  gap: 8px;
}

.cancel-btn {
  flex: 1;
  background: rgba(255, 255, 255, 0.08);
  color: #aaa;
}
.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.14);
}

.confirm-btn {
  flex: 1;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
}
.confirm-btn:hover {
  opacity: 0.9;
}
.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
