import { contextBridge, ipcRenderer } from 'electron'

// 性能监控
const performanceMetrics = {
  callCount: 0,
  totalTime: 0,
  errors: 0,
  startTime: Date.now()
}

// 带性能监控的API调用包装器
function createMonitoredAPI<T extends (...args: any[]) => Promise<any>>(
  apiCall: T,
  name: string
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const startTime = performance.now()
    performanceMetrics.callCount++
    
    try {
      const result = await apiCall(...args)
      const endTime = performance.now()
      performanceMetrics.totalTime += (endTime - startTime)
      
      // 记录慢调用
      if (endTime - startTime > 1000) {
        console.warn(`Slow API call detected: ${name} took ${endTime - startTime}ms`)
      }
      
      return result
    } catch (error) {
      performanceMetrics.errors++
      console.error(`API call failed: ${name}`, error)
      throw error
    }
  }) as T
}

// 暴露安全的API给渲染进程（优化版本）
contextBridge.exposeInMainWorld('electronAPI', {
  // 基础API
  readHosts: createMonitoredAPI(
    () => ipcRenderer.invoke('read-hosts'),
    'readHosts'
  ),
  
  writeHosts: createMonitoredAPI(
    (content: string) => ipcRenderer.invoke('write-hosts', content),
    'writeHosts'
  ),
  
  backupHosts: createMonitoredAPI(
    () => ipcRenderer.invoke('backup-hosts'),
    'backupHosts'
  ),
  
  selectFile: createMonitoredAPI(
    () => ipcRenderer.invoke('select-file'),
    'selectFile'
  ),
  
  showError: createMonitoredAPI(
    (title: string, content: string) => ipcRenderer.invoke('show-error', title, content),
    'showError'
  ),
  
  openExternal: createMonitoredAPI(
    (url: string) => ipcRenderer.invoke('open-external', url),
    'openExternal'
  ),
  
  // 新增：性能监控API
  getPerformanceMetrics: () => {
    const uptime = Date.now() - performanceMetrics.startTime
    return {
      ...performanceMetrics,
      uptime,
      averageTime: performanceMetrics.callCount > 0 
        ? performanceMetrics.totalTime / performanceMetrics.callCount 
        : 0,
      errorRate: performanceMetrics.callCount > 0 
        ? (performanceMetrics.errors / performanceMetrics.callCount) * 100 
        : 0
    }
  },
  
  // 新增：应用状态API
  getAppStatus: createMonitoredAPI(
    () => ipcRenderer.invoke('get-app-status'),
    'getAppStatus'
  ),
  
  // 新增：缓存管理API
  clearCache: createMonitoredAPI(
    () => ipcRenderer.invoke('clear-cache'),
    'clearCache'
  ),
  
  // 新增：文件监控API
  reloadFileWatcher: createMonitoredAPI(
    () => ipcRenderer.invoke('reload-file-watcher'),
    'reloadFileWatcher'
  ),
  
  // 新增：文件变化监听
  onHostsFileChanged: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data)
    ipcRenderer.on('hosts-file-changed', listener)
    
    // 返回清理函数
    return () => {
      ipcRenderer.removeListener('hosts-file-changed', listener)
    }
  }
})

// 声明全局类型
declare global {
  interface Window {
    electronAPI: {
      // 基础API
      readHosts: () => Promise<{ success: boolean; data?: string; error?: string; cached?: boolean }>
      writeHosts: (content: string) => Promise<{ success: boolean; error?: string }>
      backupHosts: () => Promise<{ success: boolean; path?: string; error?: string }>
      selectFile: () => Promise<{ canceled: boolean; filePaths: string[] }>
      showError: (title: string, content: string) => Promise<void>
      openExternal: (url: string) => Promise<void>
      
      // 性能监控API
      getPerformanceMetrics: () => {
        callCount: number
        totalTime: number
        errors: number
        uptime: number
        averageTime: number
        errorRate: number
      }
      
      // 应用状态API
      getAppStatus: () => Promise<{
        isInitialized: boolean
        hostsPath: string
        cacheSize: number
        windowCount: number
      }>
      
      // 缓存管理API
      clearCache: () => Promise<{ success: boolean }>
      
      // 文件监控API
      reloadFileWatcher: () => Promise<{ success: boolean }>
      
      // 文件变化监听
      onHostsFileChanged: (callback: (data: any) => void) => () => void
    }
  }
}

// 性能优化：定期清理内存
setInterval(() => {
  if (global.gc) {
    global.gc()
  }
}, 30000) // 每30秒清理一次

// 错误处理：捕获未处理的Promise拒绝
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
  event.preventDefault()
})

// 错误处理：捕获全局错误
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error)
})

// 性能监控：定期记录性能指标
setInterval(() => {
  const metrics = performanceMetrics
  if (metrics.callCount > 0) {
    console.log('Performance metrics:', {
      callCount: metrics.callCount,
      averageTime: metrics.totalTime / metrics.callCount,
      errorRate: (metrics.errors / metrics.callCount) * 100,
      uptime: Date.now() - metrics.startTime
    })
  }
}, 60000) // 每分钟记录一次 