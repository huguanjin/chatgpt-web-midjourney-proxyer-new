<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { feedbackApi, type FeedbackItem, type FeedbackStats } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

// 非管理员重定向
if (!authStore.isAdmin) {
  router.replace('/')
}

// ============ 状态 ============
const loading = ref(false)
const feedbacks = ref<FeedbackItem[]>([])
const stats = ref<FeedbackStats | null>(null)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const filterStatus = ref('')
const filterType = ref('')
const searchKeyword = ref('')

// 回复弹窗
const replyModal = ref(false)
const replyTarget = ref<FeedbackItem | null>(null)
const replyContent = ref('')
const replyStatus = ref('replied')
const replyLoading = ref(false)
const replyMsg = ref('')
const replyError = ref('')

// 展开详情
const expandedId = ref<string | null>(null)

// ============ 格式化 ============
const formatTime = (ts: number) => {
  if (!ts) return '-'
  return new Date(ts).toLocaleString('zh-CN')
}

const typeLabel: Record<string, string> = {
  bug: '🐛 Bug',
  feature: '💡 功能建议',
  question: '❓ 使用问题',
  other: '📌 其他',
}

const statusLabel: Record<string, string> = {
  open: '待处理',
  replied: '已回复',
  resolved: '已解决',
  closed: '已关闭',
}

const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)

// ============ 加载数据 ============
const loadStats = async () => {
  try {
    const res = await feedbackApi.getStats()
    stats.value = res.data.data
  } catch (e: any) {
    console.error('加载反馈统计失败:', e)
  }
}

const loadFeedbacks = async () => {
  loading.value = true
  try {
    const res = await feedbackApi.getAllFeedbacks({
      page: currentPage.value,
      limit: pageSize.value,
      status: filterStatus.value || undefined,
      type: filterType.value || undefined,
      keyword: searchKeyword.value || undefined,
    })
    feedbacks.value = res.data.data
    total.value = res.data.total
  } catch (e: any) {
    console.error('加载反馈列表失败:', e)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  loadFeedbacks()
}

const changePage = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  loadFeedbacks()
}

// ============ 展开详情 ============
const toggleExpand = (id: string) => {
  expandedId.value = expandedId.value === id ? null : id
}

// ============ 回复反馈 ============
const openReply = (item: FeedbackItem) => {
  replyTarget.value = item
  replyContent.value = item.adminReply || ''
  replyStatus.value = item.status === 'open' ? 'replied' : item.status
  replyMsg.value = ''
  replyError.value = ''
  replyModal.value = true
}

const closeReply = () => {
  replyModal.value = false
  replyTarget.value = null
}

const submitReply = async () => {
  if (!replyTarget.value) return
  if (!replyContent.value.trim()) {
    replyError.value = '请输入回复内容'
    return
  }
  replyLoading.value = true
  replyError.value = ''
  replyMsg.value = ''
  try {
    await feedbackApi.replyFeedback(replyTarget.value._id, {
      reply: replyContent.value.trim(),
      status: replyStatus.value,
    })
    replyMsg.value = '回复成功'
    await loadFeedbacks()
    await loadStats()
    // 2秒后自动关闭
    setTimeout(() => closeReply(), 1500)
  } catch (e: any) {
    replyError.value = e.response?.data?.message || '回复失败'
  } finally {
    replyLoading.value = false
  }
}

// ============ 快速更新状态 ============
const quickUpdateStatus = async (item: FeedbackItem, newStatus: string) => {
  try {
    await feedbackApi.updateStatus(item._id, newStatus)
    await loadFeedbacks()
    await loadStats()
  } catch (e: any) {
    console.error('更新状态失败:', e)
  }
}

// ============ 初始化 ============
onMounted(() => {
  loadStats()
  loadFeedbacks()
})
</script>

<template>
  <div class="admin-feedback">
    <div class="page-header">
      <h1>📮 反馈管理</h1>
      <router-link to="/admin" class="btn btn-secondary">← 返回用户管理</router-link>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards" v-if="stats">
      <div class="stat-card">
        <div class="stat-number">{{ stats.total }}</div>
        <div class="stat-label">总反馈数</div>
      </div>
      <div class="stat-card highlight">
        <div class="stat-number">{{ stats.byStatus?.open || 0 }}</div>
        <div class="stat-label">待处理</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ stats.byStatus?.replied || 0 }}</div>
        <div class="stat-label">已回复</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ stats.byStatus?.resolved || 0 }}</div>
        <div class="stat-label">已解决</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ stats.byType?.bug || 0 }}</div>
        <div class="stat-label">Bug 报告</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ stats.byType?.feature || 0 }}</div>
        <div class="stat-label">功能建议</div>
      </div>
    </div>

    <!-- 筛选 -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">📋 反馈列表</h2>
        <div class="card-header-actions">
          <input
            v-model="searchKeyword"
            placeholder="搜索标题/内容/用户..."
            class="search-input"
            @keyup.enter="handleSearch"
          />
          <select v-model="filterStatus" @change="handleSearch" class="filter-select">
            <option value="">全部状态</option>
            <option value="open">待处理</option>
            <option value="replied">已回复</option>
            <option value="resolved">已解决</option>
            <option value="closed">已关闭</option>
          </select>
          <select v-model="filterType" @change="handleSearch" class="filter-select">
            <option value="">全部类型</option>
            <option value="bug">Bug</option>
            <option value="feature">功能建议</option>
            <option value="question">使用问题</option>
            <option value="other">其他</option>
          </select>
          <button class="btn btn-secondary" @click="loadFeedbacks" :disabled="loading">
            {{ loading ? '加载中...' : '刷新' }}
          </button>
        </div>
      </div>

      <!-- 列表 -->
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="feedbacks.length === 0" class="empty">暂无反馈数据</div>

      <div v-else class="feedback-list">
        <div
          v-for="item in feedbacks"
          :key="item._id"
          class="feedback-item"
          :class="{ expanded: expandedId === item._id }"
        >
          <div class="feedback-header" @click="toggleExpand(item._id)">
            <div class="feedback-title-row">
              <span class="type-badge" :class="item.type">{{ typeLabel[item.type] || item.type }}</span>
              <span class="feedback-title">{{ item.title }}</span>
              <span class="status-badge" :class="item.status">{{ statusLabel[item.status] || item.status }}</span>
            </div>
            <div class="feedback-meta">
              <span class="meta-user">👤 {{ item.username }}</span>
              <span>{{ formatTime(item.createdAt) }}</span>
              <span class="expand-arrow">{{ expandedId === item._id ? '▲' : '▼' }}</span>
            </div>
          </div>

          <div v-if="expandedId === item._id" class="feedback-detail">
            <div class="detail-section">
              <div class="detail-label">问题描述</div>
              <div class="detail-content">{{ item.content }}</div>
            </div>

            <div v-if="item.adminReply" class="detail-section reply-section">
              <div class="detail-label">💬 管理员回复 ({{ item.repliedBy }})</div>
              <div class="detail-content reply-content">{{ item.adminReply }}</div>
              <div class="reply-time">回复时间：{{ formatTime(item.repliedAt!) }}</div>
            </div>

            <div class="detail-actions">
              <button class="btn btn-small" @click="openReply(item)">
                {{ item.adminReply ? '✏️ 编辑回复' : '💬 回复' }}
              </button>
              <button
                v-if="item.status !== 'resolved'"
                class="btn btn-small btn-resolve"
                @click="quickUpdateStatus(item, 'resolved')"
              >✅ 标记已解决</button>
              <button
                v-if="item.status !== 'closed'"
                class="btn btn-small btn-secondary"
                @click="quickUpdateStatus(item, 'closed')"
              >关闭</button>
              <button
                v-if="item.status === 'closed' || item.status === 'resolved'"
                class="btn btn-small btn-reopen"
                @click="quickUpdateStatus(item, 'open')"
              >🔄 重新打开</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination" v-if="totalPages > 1">
        <button class="btn btn-small" :disabled="currentPage <= 1" @click="changePage(currentPage - 1)">上一页</button>
        <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 页（共 {{ total }} 条）</span>
        <button class="btn btn-small" :disabled="currentPage >= totalPages" @click="changePage(currentPage + 1)">下一页</button>
      </div>
    </div>

    <!-- 回复弹窗 -->
    <div v-if="replyModal" class="modal-overlay" @click.self="closeReply">
      <div class="modal">
        <div class="modal-header">
          <h3>💬 回复反馈</h3>
          <button class="modal-close" @click="closeReply">&times;</button>
        </div>
        <div class="modal-body">
          <div class="reply-feedback-info">
            <span class="type-badge" :class="replyTarget?.type">{{ typeLabel[replyTarget?.type || 'other'] }}</span>
            <strong>{{ replyTarget?.title }}</strong>
            <span class="meta-user">— {{ replyTarget?.username }}</span>
          </div>
          <div class="reply-original">{{ replyTarget?.content }}</div>

          <div class="form-group">
            <label>回复内容</label>
            <textarea
              v-model="replyContent"
              class="form-textarea"
              placeholder="请输入解决方案或回复..."
              rows="4"
              maxlength="2000"
            ></textarea>
          </div>

          <div class="form-group">
            <label>更新状态</label>
            <select v-model="replyStatus" class="form-select">
              <option value="replied">已回复</option>
              <option value="resolved">已解决</option>
              <option value="closed">已关闭</option>
            </select>
          </div>

          <div v-if="replyError" class="msg msg-error">{{ replyError }}</div>
          <div v-if="replyMsg" class="msg msg-success">{{ replyMsg }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeReply">取消</button>
          <button class="btn" @click="submitReply" :disabled="replyLoading || !replyContent.trim()">
            {{ replyLoading ? '提交中...' : '提交回复' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-feedback {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0;
  font-size: 22px;
  color: #e0e0e0;
}

/* ============ 统计卡片 ============ */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  background: #1e1e2e;
  border: 1px solid #333;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.stat-card.highlight {
  border-color: #facc15;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: #a78bfa;
}

.stat-card.highlight .stat-number {
  color: #facc15;
}

.stat-label {
  font-size: 12px;
  color: #888;
  margin-top: 4px;
}

/* ============ 卡片 ============ */
.card {
  background: #1e1e2e;
  border: 1px solid #333;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}

.card-title {
  font-size: 18px;
  margin: 0;
  color: #e0e0e0;
}

.card-header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.search-input {
  background: #2a2a3e;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 6px 12px;
  color: #e0e0e0;
  font-size: 13px;
  width: 180px;
}

.search-input::placeholder {
  color: #666;
}

.filter-select {
  background: #2a2a3e;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 6px 10px;
  color: #e0e0e0;
  font-size: 13px;
}

/* ============ 反馈列表 ============ */
.feedback-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.feedback-item {
  background: #252536;
  border: 1px solid #333;
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.2s;
}

.feedback-item:hover {
  border-color: #444;
}

.feedback-item.expanded {
  border-color: #7c3aed55;
}

.feedback-header {
  padding: 12px 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.feedback-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.feedback-title {
  font-size: 14px;
  color: #e0e0e0;
  font-weight: 500;
  flex: 1;
}

.feedback-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #666;
}

.meta-user {
  color: #a78bfa;
}

.expand-arrow {
  color: #888;
  font-size: 10px;
  margin-left: auto;
}

/* ============ 徽章 ============ */
.type-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
}

.type-badge.bug {
  background: #7f1d1d33;
  color: #f87171;
}

.type-badge.feature {
  background: #854d0e33;
  color: #facc15;
}

.type-badge.question {
  background: #1e40af33;
  color: #60a5fa;
}

.type-badge.other {
  background: #374151;
  color: #9ca3af;
}

.status-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
}

.status-badge.open {
  background: #854d0e33;
  color: #facc15;
}

.status-badge.replied {
  background: #1e40af33;
  color: #60a5fa;
}

.status-badge.resolved {
  background: #065f4633;
  color: #4ade80;
}

.status-badge.closed {
  background: #374151;
  color: #9ca3af;
}

/* ============ 详情 ============ */
.feedback-detail {
  padding: 0 16px 16px;
  border-top: 1px solid #333;
}

.detail-section {
  margin-top: 12px;
}

.detail-label {
  font-size: 12px;
  color: #888;
  margin-bottom: 6px;
  font-weight: 600;
}

.detail-content {
  font-size: 14px;
  color: #ccc;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

.reply-section {
  background: #1e293b;
  border-radius: 8px;
  padding: 12px;
  border-left: 3px solid #7c3aed;
}

.reply-content {
  color: #e0e0e0;
}

.reply-time {
  font-size: 12px;
  color: #666;
  margin-top: 6px;
}

.detail-actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  flex-wrap: wrap;
}

/* ============ 按钮 ============ */
.btn {
  background: #7c3aed;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s;
  text-decoration: none;
}

.btn:hover:not(:disabled) {
  background: #6d28d9;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background: #4b5563;
}

.btn-small {
  padding: 4px 10px;
  font-size: 12px;
}

.btn-resolve {
  background: #065f46;
}

.btn-resolve:hover:not(:disabled) {
  background: #047857;
}

.btn-reopen {
  background: #b45309;
}

.btn-reopen:hover:not(:disabled) {
  background: #92400e;
}

/* ============ 弹窗 ============ */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #1e1e2e;
  border: 1px solid #444;
  border-radius: 12px;
  width: 560px;
  max-width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #333;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  color: #e0e0e0;
}

.modal-close {
  background: none;
  border: none;
  color: #888;
  font-size: 22px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.modal-close:hover {
  color: #e0e0e0;
}

.modal-body {
  padding: 20px;
}

.reply-feedback-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.reply-feedback-info strong {
  color: #e0e0e0;
  font-size: 14px;
}

.reply-original {
  font-size: 13px;
  color: #aaa;
  background: #252536;
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 16px;
  line-height: 1.5;
  white-space: pre-wrap;
  max-height: 120px;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  font-size: 13px;
  color: #888;
  margin-bottom: 6px;
}

.form-textarea,
.form-select {
  width: 100%;
  background: #2a2a3e;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 8px 12px;
  color: #e0e0e0;
  font-size: 14px;
  box-sizing: border-box;
  font-family: inherit;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: #7c3aed;
}

.msg {
  font-size: 13px;
  padding: 6px 10px;
  border-radius: 6px;
  margin-top: 8px;
}

.msg-error {
  background: #7f1d1d33;
  color: #f87171;
}

.msg-success {
  background: #065f4633;
  color: #4ade80;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid #333;
}

/* ============ 分页 ============ */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
}

.page-info {
  font-size: 13px;
  color: #888;
}

/* ============ 空状态 ============ */
.loading,
.empty {
  text-align: center;
  padding: 30px;
  color: #666;
  font-size: 14px;
}
</style>
