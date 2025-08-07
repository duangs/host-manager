// 性能优化配置
export const PERFORMANCE_CONFIG = {
  // 缓存配置
  CACHE: {
    // 缓存过期时间（毫秒）
    EXPIRE_TIME: 5000,
    // 最大缓存大小（字节）
    MAX_SIZE: 1024 * 1024, // 1MB
    // 缓存清理间隔（毫秒）
    CLEANUP_INTERVAL: 30000
  },
  
  // 文件操作配置
  FILE: {
    // 最大文件大小（字节）
    MAX_SIZE: 1024 * 1024, // 1MB
    // 重试次数
    MAX_RETRIES: 3,
    // 重试延迟（毫秒）
    RETRY_DELAY: 1000,
    // 文件监控轮询间隔（毫秒）
    WATCH_INTERVAL: 1000
  },
  
  // 内存管理配置
  MEMORY: {
    // 内存清理间隔（毫秒）
    GC_INTERVAL: 30000,
    // 内存警告阈值（MB）
    WARNING_THRESHOLD: 512,
    // 内存清理阈值（MB）
    CLEANUP_THRESHOLD: 256
  },
  
  // 渲染进程配置
  RENDERER: {
    // 硬件加速
    HARDWARE_ACCELERATION: true,
    // 背景节流
    BACKGROUND_THROTTLING: false,
    // WebGL支持
    WEBGL: true,
    // 安全配置
    WEB_SECURITY: true,
    // 远程模块
    ENABLE_REMOTE_MODULE: false
  },
  
  // 应用级别配置
  APP: {
    // 启用GPU光栅化
    ENABLE_GPU_RASTERIZATION: true,
    // 启用零拷贝
    ENABLE_ZERO_COPY: true,
    // 忽略GPU黑名单
    IGNORE_GPU_BLACKLIST: true,
    // 禁用背景定时器节流
    DISABLE_BACKGROUND_TIMER_THROTTLING: true,
    // 禁用渲染器后台化
    DISABLE_RENDERER_BACKGROUNDING: true,
    // 禁用窗口后台化
    DISABLE_BACKGROUNDING_OCCLUDED_WINDOWS: true
  },
  
  // 监控配置
  MONITORING: {
    // 性能指标记录间隔（毫秒）
    METRICS_INTERVAL: 60000,
    // 慢调用阈值（毫秒）
    SLOW_CALL_THRESHOLD: 1000,
    // 错误率警告阈值（百分比）
    ERROR_RATE_WARNING: 5,
    // 启用详细日志
    ENABLE_DETAILED_LOGS: true
  }
}

// 获取当前平台的优化配置
export function getPlatformOptimizations() {
  const platform = process.platform
  
  const optimizations = {
    win32: {
      // Windows特定优化
      '--enable-features': 'VaapiVideoDecoder',
      '--ignore-gpu-blacklist': '',
      '--enable-gpu-rasterization': '',
      '--enable-zero-copy': '',
      '--disable-background-timer-throttling': '',
      '--disable-renderer-backgrounding': '',
      '--disable-backgrounding-occluded-windows': ''
    },
    darwin: {
      // macOS特定优化
      '--enable-features': 'VaapiVideoDecoder',
      '--ignore-gpu-blacklist': '',
      '--enable-gpu-rasterization': '',
      '--enable-zero-copy': '',
      '--disable-background-timer-throttling': '',
      '--disable-renderer-backgrounding': ''
    },
    linux: {
      // Linux特定优化
      '--enable-features': 'VaapiVideoDecoder',
      '--ignore-gpu-blacklist': '',
      '--enable-gpu-rasterization': '',
      '--enable-zero-copy': '',
      '--disable-background-timer-throttling': '',
      '--disable-renderer-backgrounding': ''
    }
  }
  
  return optimizations[platform as keyof typeof optimizations] || optimizations.linux
}

// 内存使用监控
export class MemoryMonitor {
  private static instance: MemoryMonitor
  private warningThreshold: number
  private cleanupThreshold: number
  
  private constructor() {
    this.warningThreshold = PERFORMANCE_CONFIG.MEMORY.WARNING_THRESHOLD
    this.cleanupThreshold = PERFORMANCE_CONFIG.MEMORY.CLEANUP_THRESHOLD
  }
  
  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor()
    }
    return MemoryMonitor.instance
  }
  
  // 获取当前内存使用情况
  getMemoryUsage(): { used: number; total: number; percentage: number } {
    const usage = process.memoryUsage()
    const used = Math.round(usage.heapUsed / 1024 / 1024)
    const total = Math.round(usage.heapTotal / 1024 / 1024)
    const percentage = Math.round((used / total) * 100)
    
    return { used, total, percentage }
  }
  
  // 检查是否需要内存清理
  shouldCleanup(): boolean {
    const { used } = this.getMemoryUsage()
    return used > this.cleanupThreshold
  }
  
  // 检查是否需要内存警告
  shouldWarn(): boolean {
    const { used } = this.getMemoryUsage()
    return used > this.warningThreshold
  }
  
  // 执行内存清理
  cleanup(): void {
    if (global.gc) {
      global.gc()
      console.log('Memory cleanup performed')
    }
  }
}

// 性能指标收集器
export class PerformanceCollector {
  private metrics: Map<string, number[]> = new Map()
  private startTime: number = Date.now()
  
  // 记录API调用时间
  recordAPICall(name: string, duration: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    this.metrics.get(name)!.push(duration)
    
    // 只保留最近100次调用
    const calls = this.metrics.get(name)!
    if (calls.length > 100) {
      calls.shift()
    }
  }
  
  // 获取API性能统计
  getAPIStats(name: string): { avg: number; min: number; max: number; count: number } {
    const calls = this.metrics.get(name) || []
    if (calls.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 }
    }
    
    const sum = calls.reduce((a, b) => a + b, 0)
    const avg = sum / calls.length
    const min = Math.min(...calls)
    const max = Math.max(...calls)
    
    return { avg, min, max, count: calls.length }
  }
  
  // 获取所有API统计
  getAllStats(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const stats: Record<string, { avg: number; min: number; max: number; count: number }> = {}
    
    for (const [name] of this.metrics) {
      stats[name] = this.getAPIStats(name)
    }
    
    return stats
  }
  
  // 获取运行时间
  getUptime(): number {
    return Date.now() - this.startTime
  }
  
  // 清理指标
  clear(): void {
    this.metrics.clear()
  }
} 