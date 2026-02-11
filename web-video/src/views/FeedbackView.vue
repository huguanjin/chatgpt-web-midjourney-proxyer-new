<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { feedbackApi, type FeedbackItem } from '@/api'

// ============ 状态 ============
const loading = ref(false)
const submitting = ref(false)
const feedbacks = ref<FeedbackItem[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

// 新建反馈表单
const showForm = ref(false)
const formTitle = ref('')
const formContent = ref('')
const formType = ref<'bug' | 'feature' | 'question' | 'other'>('bug')
const formError = ref('')
const formSuccess = ref('')

// 展开查看详情
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
const loadFeedbacks = async () => {
  loading.value = true
  try {
    const res = await feedbackApi.getMyFeedbacks({
      page: currentPage.value,
      limit: pageSize.value,
    })
    feedbacks.value = res.data.data
    total.value = res.data.total
  } catch (e: any) {
    console.error('加载反馈失败:', e)
  } finally {
    loading.value = false
  }
}

const changePage = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  loadFeedbacks()
}

// ============ 提交反馈 ============
const resetForm = () => {
  formTitle.value = ''
  formContent.value = ''
  formType.value = 'bug'
  formError.value = ''
  formSuccess.value = ''
}

const openForm = () => {
  resetForm()
  showForm.value = true
}

const submitFeedback = async () => {
  formError.value = ''
  formSuccess.value = ''

  if (!formTitle.value.trim()) {
    formError.value = '请输入反馈标题'
    return
  }
  if (!formContent.value.trim()) {
    formError.value = '请输入反馈内容'
    return
  }

  submitting.value = true
  try {
    await feedbackApi.create({
      title: formTitle.value.trim(),
      content: formContent.value.trim(),
      type: formType.value,
    })
    formSuccess.value = '反馈提交成功！'
    resetForm()
    showForm.value = false
    currentPage.value = 1
    await loadFeedbacks()
  } catch (e: any) {
    formError.value = e.response?.data?.message || '提交失败'
  } finally {
    submitting.value = false
  }
}

// ============ 展开详情 ============
const toggleExpand = (id: string) => {
  expandedId.value = expandedId.value === id ? null : id
}

// ============ 初始化 ============
onMounted(() => {
  loadFeedbacks()
})
</script>

<template>
  <div class="feedback-page">
    <div class="page-header">
      <h1>📮 问题反馈</h1>
      <button class="btn" @click="openForm">+ 提交反馈</button>
    </div>

    <!-- 提交反馈表单 -->
    <div v-if="showForm" class="card form-card">
      <h3>📝 提交新反馈</h3>
      <div class="form-group">
        <label>类型</label>
        <select v-model="formType" class="form-select">
          <option value="bug">🐛 Bug / 故障</option>
          <option value="feature">💡 功能建议</option>
          <option value="question">❓ 使用问题</option>
          <option value="other">📌 其他</option>
        </select>
      </div>
      <div class="form-group">
        <label>标题</label>
        <input
          v-model="formTitle"
          class="form-input"
          placeholder="简要描述您遇到的问题"
          maxlength="100"
        />
      </div>
      <div class="form-group">
        <label>详细描述</label>
        <textarea
          v-model="formContent"
          class="form-textarea"
          placeholder="请详细描述问题发生的场景、操作步骤、期望结果等..."
          rows="5"
          maxlength="2000"
        ></textarea>
        <div class="char-count">{{ formContent.length }} / 2000</div>
      </div>
      <div v-if="formError" class="msg msg-error">{{ formError }}</div>
      <div v-if="formSuccess" class="msg msg-success">{{ formSuccess }}</div>
      <div class="form-actions">
        <button class="btn btn-secondary" @click="showForm = false">取消</button>
        <button class="btn" @click="submitFeedback" :disabled="submitting">
          {{ submitting ? '提交中...' : '提交反馈' }}
        </button>
      </div>
    </div>

    <!-- 反馈列表 -->
    <div class="card">
      <h3>📋 我的反馈 <span class="total-badge">{{ total }}</span></h3>

      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="feedbacks.length === 0" class="empty">
        暂无反馈记录，点击上方按钮提交您的第一条反馈
      </div>

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
              <div class="detail-label">💬 管理员回复</div>
              <div class="detail-content reply-content">{{ item.adminReply }}</div>
              <div class="reply-time">回复时间：{{ formatTime(item.repliedAt!) }}</div>
            </div>
            <div v-else class="detail-section">
              <div class="waiting-reply">⏳ 等待管理员处理...</div>
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
  </div>
</template>

<style scoped>
.feedback-page {
  padding: 20px;
  max-width: 900px;
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

/* ============ 卡片 ============ */
.card {
  background: #1e1e2e;
  border: 1px solid #333;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.card h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #e0e0e0;
}

.total-badge {
  background: #7c3aed33;
  color: #a78bfa;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 13px;
  margin-left: 6px;
}

/* ============ 表单 ============ */
.form-card {
  border-color: #7c3aed44;
}

.form-group {
  margin-bottom: 14px;
}

.form-group label {
  display: block;
  font-size: 13px;
  color: #888;
  margin-bottom: 6px;
}

.form-input,
.form-select,
.form-textarea {
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

.form-input::placeholder,
.form-textarea::placeholder {
  color: #666;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #7c3aed;
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.char-count {
  text-align: right;
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 12px;
}

/* ============ 消息 ============ */
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
  justify-content: space-between;
  font-size: 12px;
  color: #666;
}

.expand-arrow {
  color: #888;
  font-size: 10px;
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

.waiting-reply {
  font-size: 13px;
  color: #888;
  padding: 8px 0;
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
