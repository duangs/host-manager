import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { readFile, writeFile, access } from 'fs/promises'
import { constants, watch } from 'fs'
import { platform } from 'os'

let mainWindow: BrowserWindow | null = null
let hostsPath: string = ''
let hostsContentCache: string = ''
let fileWatcher: any = null
let isInitialized = false

// 性能优化配置
const PERFORMANCE_CONFIG = {
  // 缓存过期时间（毫秒）
  CACHE_EXPIRE_TIME: 5000,
  // 文件监控轮询间隔（毫秒）
  WATCH_INTERVAL: 1000,
  // 最大文件大小（字节）
  MAX_FILE_SIZE: 1024 * 1024, // 1MB
  // 重试次数
  MAX_RETRIES: 3,
  // 重试延迟（毫秒）
  RETRY_DELAY: 1000
}

// 获取hosts文件路径（缓存版本）
function getHostsPath(): string {
  if (!hostsPath) {
    const os = platform()
    if (os === 'win32') {
      hostsPath = 'C:\\Windows\\System32\\drivers\\etc\\hosts'
    } else if (os === 'darwin') {
      hostsPath = '/etc/hosts'
    } else {
      hostsPath = '/etc/hosts'
    }
  }
  return hostsPath
}

// 延迟函数
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 带重试的文件读取
async function readFileWithRetry(path: string, encoding: BufferEncoding = 'utf-8', retries: number = PERFORMANCE_CONFIG.MAX_RETRIES): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const content = await readFile(path, { encoding })
      return content
    } catch (error) {
      if (i === retries - 1) throw error
      await delay(PERFORMANCE_CONFIG.RETRY_DELAY * (i + 1))
    }
  }
  throw new Error('Max retries exceeded')
}

// 带重试的文件写入
async function writeFileWithRetry(path: string, content: string, encoding: BufferEncoding = 'utf-8', retries: number = PERFORMANCE_CONFIG.MAX_RETRIES): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await writeFile(path, content, { encoding })
      return
    } catch (error) {
      if (i === retries - 1) throw error
      await delay(PERFORMANCE_CONFIG.RETRY_DELAY * (i + 1))
    }
  }
  throw new Error('Max retries exceeded')
}

// 验证文件大小
async function validateFileSize(path: string): Promise<boolean> {
  try {
    const stats = await import('fs/promises').then(fs => fs.stat(path))
    return stats.size <= PERFORMANCE_CONFIG.MAX_FILE_SIZE
  } catch {
    return false
  }
}

// 设置文件监控
function setupFileWatcher() {
  if (fileWatcher) {
    fileWatcher.close()
  }

  try {
    fileWatcher = watch(getHostsPath(), { persistent: false })
    fileWatcher.on('change', async (eventType: string) => {
      if (eventType === 'change' && mainWindow && !mainWindow.isDestroyed()) {
        // 延迟读取以避免文件被占用
        setTimeout(async () => {
          try {
            const newContent = await readFileWithRetry(getHostsPath())
            if (newContent !== hostsContentCache) {
              hostsContentCache = newContent
              mainWindow?.webContents.send('hosts-file-changed', { success: true, data: newContent })
            }
          } catch (error) {
            console.error('File watcher error:', error)
          }
        }, 500)
      }
    })
  } catch (error) {
    console.warn('File watcher setup failed:', error)
  }
}

// 创建主窗口（优化版本）
function createWindow() {
  // 优化窗口创建配置
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
      // 性能优化配置
      webSecurity: true,
      allowRunningInsecureContent: false,
      // 启用硬件加速
      webgl: true,
      // 优化内存使用
      backgroundThrottling: false
    },
    icon: join(__dirname, '../src/assets/icon.png'),
    titleBarStyle: 'default',
    show: false,
    // 性能优化
    backgroundColor: '#ffffff'
  })

  // 开发环境加载本地服务器
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  // 优化窗口显示
  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
      // 设置文件监控
      setupFileWatcher()
      isInitialized = true
    }
  })

  mainWindow.on('closed', () => {
    if (fileWatcher) {
      fileWatcher.close()
      fileWatcher = null
    }
    mainWindow = null
    isInitialized = false
  })

  // 内存优化：处理页面崩溃
  mainWindow.webContents.on('render-process-gone', (_event: Electron.Event, details: Electron.RenderProcessGoneDetails) => {
    console.error('Renderer process gone:', details)
    if (details.reason !== 'killed' && mainWindow) {
      mainWindow.reload()
    }
  })

  // 内存优化：处理未响应
  mainWindow.webContents.on('unresponsive', () => {
    console.warn('Renderer process became unresponsive')
  })

  // 内存优化：处理响应
  mainWindow.webContents.on('responsive', () => {
    console.log('Renderer process became responsive')
  })
}

// 应用准备就绪时创建窗口
app.whenReady().then(() => {
  // 性能优化：设置应用级别的优化
  app.commandLine.appendSwitch('--enable-features', 'VaapiVideoDecoder')
  app.commandLine.appendSwitch('--ignore-gpu-blacklist')
  app.commandLine.appendSwitch('--enable-gpu-rasterization')
  app.commandLine.appendSwitch('--enable-zero-copy')
  app.commandLine.appendSwitch('--disable-background-timer-throttling')
  app.commandLine.appendSwitch('--disable-renderer-backgrounding')
  app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows')

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 内存优化：处理应用即将退出
app.on('before-quit', () => {
  if (fileWatcher) {
    fileWatcher.close()
    fileWatcher = null
  }
  hostsContentCache = ''
  isInitialized = false
})

// 内存优化：处理内存警告
app.on('render-process-gone', (_event, _webContents, details) => {
  console.error('Render process gone:', details)
})

// 优化的IPC处理器
ipcMain.handle('read-hosts', async () => {
  try {
    const path = getHostsPath()
    
    // 检查文件大小
    if (!(await validateFileSize(path))) {
      return { 
        success: false, 
        error: '文件过大，可能不是有效的hosts文件' 
      }
    }

    // 使用缓存（如果可用且未过期）
    if (hostsContentCache && isInitialized) {
      return { success: true, data: hostsContentCache, cached: true }
    }

    // 读取文件
    await access(path, constants.R_OK)
    const content = await readFileWithRetry(path)
    
    // 更新缓存
    hostsContentCache = content
    
    return { success: true, data: content, cached: false }
  } catch (error) {
    console.error('Read hosts error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
})

ipcMain.handle('write-hosts', async (_event: Electron.IpcMainInvokeEvent, content: string) => {
  try {
    const path = getHostsPath()
    
    // 验证内容
    if (!content || content.length > PERFORMANCE_CONFIG.MAX_FILE_SIZE) {
      return { 
        success: false, 
        error: '内容无效或过大' 
      }
    }

    // 写入文件
    await writeFileWithRetry(path, content)
    
    // 更新缓存
    hostsContentCache = content
    
    return { success: true }
  } catch (error) {
    console.error('Write hosts error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
})

ipcMain.handle('backup-hosts', async () => {
  try {
    const path = getHostsPath()
    const content = await readFileWithRetry(path)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = join(app.getPath('documents'), `hosts-backup-${timestamp}.txt`)
    
    await writeFileWithRetry(backupPath, content)
    return { success: true, path: backupPath }
  } catch (error) {
    console.error('Backup hosts error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
})

ipcMain.handle('select-file', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    return result
  } catch (error) {
    console.error('Select file error:', error)
    return { canceled: true, filePaths: [] }
  }
})

ipcMain.handle('show-error', async (_event: Electron.IpcMainInvokeEvent, title: string, content: string) => {
  try {
    await dialog.showErrorBox(title, content)
  } catch (error) {
    console.error('Show error dialog error:', error)
  }
})

ipcMain.handle('open-external', async (_event: Electron.IpcMainInvokeEvent, url: string) => {
  try {
    await shell.openExternal(url)
  } catch (error) {
    console.error('Open external error:', error)
  }
})

// 新增：获取应用状态
ipcMain.handle('get-app-status', () => {
  return {
    isInitialized,
    hostsPath: getHostsPath(),
    cacheSize: hostsContentCache.length,
    windowCount: BrowserWindow.getAllWindows().length
  }
})

// 新增：清理缓存
ipcMain.handle('clear-cache', () => {
  hostsContentCache = ''
  return { success: true }
})

// 新增：重新加载文件监控
ipcMain.handle('reload-file-watcher', () => {
  setupFileWatcher()
  return { success: true }
}) 