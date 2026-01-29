import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface VideoTask {
  id: string
  model: string
  prompt: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  video_url?: string
  thumbnail_url?: string
  created_at: number
  platform: 'sora' | 'veo'
}

export interface Character {
  id: string
  username: string
  permalink: string
  profile_picture_url: string
  created_at: string
}

export const useVideoStore = defineStore('video', () => {
  const tasks = ref<VideoTask[]>([])
  const characters = ref<Character[]>([])

  // 从 localStorage 加载
  const loadFromStorage = () => {
    const savedTasks = localStorage.getItem('video_tasks')
    const savedCharacters = localStorage.getItem('sora_characters')

    if (savedTasks) {
      try {
        tasks.value = JSON.parse(savedTasks)
      }
      catch (e) {
        tasks.value = []
      }
    }

    if (savedCharacters) {
      try {
        characters.value = JSON.parse(savedCharacters)
      }
      catch (e) {
        characters.value = []
      }
    }
  }

  // 保存到 localStorage
  const saveToStorage = () => {
    localStorage.setItem('video_tasks', JSON.stringify(tasks.value))
    localStorage.setItem('sora_characters', JSON.stringify(characters.value))
  }

  // 添加任务
  const addTask = (task: VideoTask) => {
    tasks.value.unshift(task)
    saveToStorage()
  }

  // 更新任务
  const updateTask = (id: string, updates: Partial<VideoTask>) => {
    const index = tasks.value.findIndex(t => t.id === id)
    if (index !== -1) {
      tasks.value[index] = { ...tasks.value[index], ...updates }
      saveToStorage()
    }
  }

  // 删除任务
  const deleteTask = (id: string) => {
    tasks.value = tasks.value.filter(t => t.id !== id)
    saveToStorage()
  }

  // 添加角色
  const addCharacter = (character: Character) => {
    characters.value.unshift(character)
    saveToStorage()
  }

  // 删除角色
  const deleteCharacter = (id: string) => {
    characters.value = characters.value.filter(c => c.id !== id)
    saveToStorage()
  }

  // 初始化时加载
  loadFromStorage()

  return {
    tasks,
    characters,
    addTask,
    updateTask,
    deleteTask,
    addCharacter,
    deleteCharacter,
    loadFromStorage,
  }
})
