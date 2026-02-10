import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('auth_token'))
  const userId = ref<string | null>(localStorage.getItem('auth_userId'))
  const username = ref<string | null>(localStorage.getItem('auth_username'))
  const role = ref<string | null>(localStorage.getItem('auth_role'))

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => role.value === 'admin')

  /**
   * 登录
   */
  const login = async (user: string, password: string) => {
    const response = await authApi.login(user, password)
    const data = response.data.data

    token.value = data.token
    userId.value = data.userId
    username.value = data.username
    role.value = data.role

    localStorage.setItem('auth_token', data.token)
    localStorage.setItem('auth_userId', data.userId)
    localStorage.setItem('auth_username', data.username)
    localStorage.setItem('auth_role', data.role)
  }

  /**
   * 注册（注册成功后自动登录）
   */
  const register = async (user: string, password: string) => {
    const response = await authApi.register(user, password)
    const data = response.data.data

    token.value = data.token
    userId.value = data.userId
    username.value = data.username
    role.value = data.role

    localStorage.setItem('auth_token', data.token)
    localStorage.setItem('auth_userId', data.userId)
    localStorage.setItem('auth_username', data.username)
    localStorage.setItem('auth_role', data.role)
  }

  /**
   * 退出登录
   */
  const logout = () => {
    token.value = null
    userId.value = null
    username.value = null
    role.value = null

    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_userId')
    localStorage.removeItem('auth_username')
    localStorage.removeItem('auth_role')
  }

  /**
   * 验证 token 是否有效
   */
  const verifyToken = async (): Promise<boolean> => {
    if (!token.value) return false

    try {
      await authApi.verify()
      return true
    } catch {
      logout()
      return false
    }
  }

  /**
   * 修改密码
   */
  const changePassword = async (oldPassword: string, newPassword: string) => {
    await authApi.changePassword(oldPassword, newPassword)
  }

  return {
    token,
    userId,
    username,
    role,
    isLoggedIn,
    isAdmin,
    login,
    register,
    logout,
    verifyToken,
    changePassword,
  }
})
