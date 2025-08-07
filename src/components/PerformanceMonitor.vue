<template>
  <el-card class="performance-monitor" v-if="showMonitor">
    <template #header>
      <div class="monitor-header">
        <span>性能监控</span>
        <el-button size="small" @click="refreshMetrics">
          <el-icon><Refresh /></el-icon>
        </el-button>
      </div>
    </template>
    
    <div class="metrics-grid">
      <div class="metric-item">
        <div class="metric-label">API调用次数</div>
        <div class="metric-value">{{ metrics.callCount }}</div>
      </div>
      
      <div class="metric-item">
        <div class="metric-label">平均响应时间</div>
        <div class="metric-value">{{ formatTime(metrics.averageTime) }}</div>
      </div>
      
      <div class="metric-item">
        <div class="metric-label">错误率</div>
        <div class="metric-value" :class="{ 'error': metrics.errorRate > 5 }">
          {{ metrics.errorRate.toFixed(2) }}%
        </div>
      </div>
      
      <div class="metric-item">
        <div class="metric-label">运行时间</div>
        <div class="metric-value">{{ formatUptime(metrics.uptime) }}</div>
      </div>
      
      <div class="metric-item">
        <div class="metric-label">缓存大小</div>
        <div class="metric-value">{{ formatBytes(appStatus.cacheSize) }}</div>
      </div>
      
      <div class="metric-item">
        <div class="metric-label">窗口数量</div>
        <div class="metric-value">{{ appStatus.windowCount }}</div>
      </div>
    </div>
    
    <el-divider />
    
    <div class="actions">
      <el-button size="small" @click="clearCache" :loading="clearing">
        清理缓存
      </el-button>
      <el-button size="small" @click="reloadWatcher" :loading="reloading">
        重载监控
      </el-button>
      <el-button size="small" @click="toggleMonitor">
        {{ showMonitor ? '隐藏' : '显示' }}
      </el-button>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'

interface PerformanceMetrics {
  callCount: number
  totalTime: number
  errors: number
  uptime: number
  averageTime: number
  errorRate: number
}

interface AppStatus {
  isInitialized: boolean
  hostsPath: string
  cacheSize: number
  windowCount: number
}

const showMonitor = ref(true)
const clearing = ref(false)
const reloading = ref(false)
const refreshInterval = ref<number | null>(null)

const metrics = ref<PerformanceMetrics>({
  callCount: 0,
  totalTime: 0,
  errors: 0,
  uptime: 0,
  averageTime: 0,
  errorRate: 0
})

const appStatus = ref<AppStatus>({
  isInitialized: false,
  hostsPath: '',
  cacheSize: 0,
  windowCount: 0
})

// 格式化时间
const formatTime = (ms: number): string => {
  if (ms < 1) return '< 1ms'
  if (ms < 1000) return `${ms.toFixed(1)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

// 格式化运行时间
const formatUptime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

// 格式化字节大小
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 刷新性能指标
const refreshMetrics = async () => {
  try {
    const newMetrics = window.electronAPI.getPerformanceMetrics()
    metrics.value = newMetrics
    
    const status = await window.electronAPI.getAppStatus()
    appStatus.value = status
  } catch (error) {
    console.error('Failed to refresh metrics:', error)
  }
}

// 清理缓存
const clearCache = async () => {
  clearing.value = true
  try {
    const result = await window.electronAPI.clearCache()
    if (result.success) {
      ElMessage.success('缓存已清理')
      await refreshMetrics()
    } else {
      ElMessage.error('清理缓存失败')
    }
  } catch (error) {
    ElMessage.error('清理缓存时发生错误')
  } finally {
    clearing.value = false
  }
}

// 重载文件监控
const reloadWatcher = async () => {
  reloading.value = true
  try {
    const result = await window.electronAPI.reloadFileWatcher()
    if (result.success) {
      ElMessage.success('文件监控已重载')
    } else {
      ElMessage.error('重载文件监控失败')
    }
  } catch (error) {
    ElMessage.error('重载文件监控时发生错误')
  } finally {
    reloading.value = false
  }
}

// 切换监控显示
const toggleMonitor = () => {
  showMonitor.value = !showMonitor.value
}

// 设置自动刷新
const setupAutoRefresh = () => {
  refreshInterval.value = window.setInterval(refreshMetrics, 5000) // 每5秒刷新一次
}

// 清理自动刷新
const cleanupAutoRefresh = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
    refreshInterval.value = null
  }
}

onMounted(() => {
  refreshMetrics()
  setupAutoRefresh()
})

onUnmounted(() => {
  cleanupAutoRefresh()
})
</script>

<style scoped>
.performance-monitor {
  margin-bottom: 20px;
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-bottom: 15px;
}

.metric-item {
  text-align: center;
  padding: 10px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background-color: #fafafa;
}

.metric-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 5px;
}

.metric-value {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.metric-value.error {
  color: #f56c6c;
}

.actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}
</style> 