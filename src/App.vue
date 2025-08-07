<template>
    <el-container class="app-container">
      <el-header class="app-header">
        <div class="header-content">
          <h1 class="app-title">
            <el-icon><Monitor /></el-icon>
            Hosts Manager
          </h1>
          <div class="header-actions">
            <el-button type="primary" @click="loadHosts" :loading="loading">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
            <el-button type="success" @click="saveHosts" :loading="saving" :disabled="!hasChanges">
              <el-icon><Check /></el-icon>
              保存
            </el-button>
            <el-button @click="backupHosts">
              <el-icon><Download /></el-icon>
              备份
            </el-button>
          </div>
        </div>
      </el-header>

      <el-main class="app-main">
        <!-- 性能监控组件 -->
        <PerformanceMonitor />
        
        <el-row :gutter="20">
          <el-col :span="16">
            <el-card class="hosts-editor-card">
              <template #header>
                <div class="card-header">
                  <span>Hosts 文件内容</span>
                  <el-input v-model="searchKey" placeholder="搜索条目" style="width: 180px;"/>
                  <span>{{ hostsEntriesView.length }}/{{hostsEntries.length}} 条</span>
                  <div class="card-actions">
                    <el-button size="small" @click="addEntry" :icon="Plus">
                      添加条目
                    </el-button>
                    <el-button size="small" @click="clearAll" :icon="Delete">
                      清空
                    </el-button>
                  </div>
                </div>
              </template>
              
              <div class="hosts-content">
                <div v-if="hostsEntriesView.length === 0" class="empty-state">
                  <el-empty description="暂无hosts条目" />
                </div>
                <div v-else class="hosts-list">
                  <div
                    v-for="(entry, index) in hostsEntriesView"
                    :key="index"
                    class="hosts-entry"
                    :class="{ disabled: !entry.enabled }"
                  >
                    <div class="entry-content">
                      <el-checkbox v-model="entry.enabled" />
                      <div class="entry-text">
                        <span class="ip">{{ entry.ip }}</span>
                        <span class="hostname">{{ entry.hostname }}</span>
                        <span v-if="entry.comment" class="comment"># {{ entry.comment }}</span>
                      </div>
                    </div>
                    <div class="entry-actions">
                      <el-button :disabled="!entry.enabled" :icon="Edit" size="small" @click="editEntry(index)">
                      </el-button>
                      <el-button :disabled="!entry.enabled" :icon="Delete" size="small" type="danger" @click="removeEntry(index)">
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>

          <el-col :span="8">
            <el-card class="info-card">
              <template #header>
                <span>信息面板</span>
              </template>
              
              <div class="info-content">
                <el-descriptions :column="3" border direction="vertical">
                  <el-descriptions-item label="总条目数">
                    {{ hostsEntries.length }}
                  </el-descriptions-item>
                  <el-descriptions-item label="启用条目">
                    {{ enabledEntriesCount }}
                  </el-descriptions-item>
                  <el-descriptions-item label="禁用条目">
                    {{ disabledEntriesCount }}
                  </el-descriptions-item>
                  <el-descriptions-item label="文件路径">
                    {{ hostsPath }}
                  </el-descriptions-item>
                </el-descriptions>

                <el-divider />

                <div class="quick-actions">
                  <h4>快速操作</h4>
                  <el-button-group class="action-buttons">
                    <el-button size="small" @click="enableAll">全部启用</el-button>
                    <el-button size="small" @click="disableAll">全部禁用</el-button>
                  </el-button-group>
                </div>

                <el-divider />

                <div class="help-section">
                  <h4>使用说明</h4>
                  <ul class="help-list">
                    <li>点击"刷新"按钮读取当前hosts文件</li>
                    <li>勾选/取消勾选来启用/禁用条目</li>
                    <li>点击"保存"按钮将更改写入hosts文件</li>
                    <li>使用"备份"功能保存当前配置</li>
                  </ul>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-main>
    </el-container>

    <!-- 添加/编辑条目对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingIndex === -1 ? '添加条目' : '编辑条目'"
      width="500px"
    >
      <el-form :model="editingEntry" label-width="80px">
        <el-form-item label="IP地址">
          <el-input v-model="editingEntry.ip" placeholder="例如: 127.0.0.1" />
        </el-form-item>
        <el-form-item label="主机名">
          <el-input v-model="editingEntry.hostname" placeholder="例如: localhost" />
        </el-form-item>
        <el-form-item label="注释">
          <el-input v-model="editingEntry.comment" placeholder="可选注释" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="editingEntry.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveEntry">确定</el-button>
        </span>
      </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Monitor,
  Refresh,
  Check,
  Download,
  Plus,
  Delete,
  Edit
} from '@element-plus/icons-vue'
import PerformanceMonitor from './components/PerformanceMonitor.vue'

interface HostsEntry {
  ip: string
  hostname: string
  comment: string
  enabled: boolean
}

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingIndex = ref(-1)
const originalContent = ref('')
const hostsEntries = ref<HostsEntry[]>([])
const searchKey = ref('')
const editingEntry = ref<HostsEntry>({
  ip: '',
  hostname: '',
  comment: '',
  enabled: true
})

// 计算属性
const hasChanges = computed(() => {
  return originalContent.value !== generateHostsContent()
})

const enabledEntriesCount = computed(() => {
  return hostsEntries.value.filter(entry => entry.enabled).length
})

const disabledEntriesCount = computed(() => {
  return hostsEntries.value.filter(entry => !entry.enabled).length
})

const hostsEntriesView = computed(() => {
  const str = searchKey.value.trim().toLowerCase()
  return hostsEntries.value.filter(entry => {
    return entry.hostname.toLowerCase().includes(str)
    || entry.ip.toLowerCase().includes(str)
    || entry.comment.toLowerCase().includes(str)
  })
})

const hostsPath = computed(() => {
  const platform = navigator.platform
  if (platform.includes('Win')) {
    return 'C:\\Windows\\System32\\drivers\\etc\\hosts'
  } else {
    return '/etc/hosts'
  }
})

// 方法
const loadHosts = async () => {
  loading.value = true
  try {
    const result = await window.electronAPI.readHosts()
    if (result.success && result.data) {
      originalContent.value = result.data
      parseHostsContent(result.data)
      ElMessage.success('hosts文件加载成功')
    } else {
      ElMessage.error(`加载失败: ${result.error}`)
    }
  } catch (error) {
    ElMessage.error('加载hosts文件时发生错误')
  } finally {
    loading.value = false
  }
}

const saveHosts = async () => {
  saving.value = true
  try {
    const content = generateHostsContent()
    const result = await window.electronAPI.writeHosts(content)
    if (result.success) {
      originalContent.value = content
      ElMessage.success('hosts文件保存成功')
    } else {
      ElMessage.error(`保存失败: ${result.error}`)
    }
  } catch (error) {
    ElMessage.error('保存hosts文件时发生错误')
  } finally {
    saving.value = false
  }
}

const backupHosts = async () => {
  try {
    const result = await window.electronAPI.backupHosts()
    if (result.success) {
      ElMessage.success(`备份成功: ${result.path}`)
    } else {
      ElMessage.error(`备份失败: ${result.error}`)
    }
  } catch (error) {
    ElMessage.error('备份时发生错误')
  }
}

const parseHostsContent = (content: string) => {
  const lines = content.split('\n')
  const entries: HostsEntry[] = []
  
  lines.forEach(line => {
    const trimmedLine = line.trim()
    if (trimmedLine && (!trimmedLine.startsWith('#') || trimmedLine.startsWith('###'))) {
      const parts = trimmedLine.split(/\s+/)
      if (parts.length >= 2) {
        const enabled = parts[0] !== '###'
        if (!enabled) {
          parts.shift() // 移除 ###
        }
        const ip = parts[0]
        const hostname = parts[1]
        const comment = parts.slice(2).join(' ')
        entries.push({
          ip,
          hostname,
          comment: comment.startsWith('#') ? comment.substring(1).trim() : comment,
          enabled: enabled
        })
      }
    }
  })
  
  hostsEntries.value = entries
}

const generateHostsContent = (): string => {
  const lines: string[] = []
  
  hostsEntries.value.forEach(entry => {
      let line = `${entry.ip} ${entry.hostname}`
      if (!entry.enabled) {
        line = `### ${line}`
      }
        if (entry.comment) {
        line += ` # ${entry.comment}`
      }
      lines.push(line)
  })
  
  return lines.join('\n')
}

const addEntry = () => {
  editingIndex.value = -1
  editingEntry.value = {
    ip: '',
    hostname: '',
    comment: '',
    enabled: true
  }
  dialogVisible.value = true
}

const editEntry = (index: number) => {
  editingIndex.value = index
  editingEntry.value = { ...hostsEntries.value[index] }
  dialogVisible.value = true
}

const saveEntry = () => {
  if (!editingEntry.value.ip || !editingEntry.value.hostname) {
    ElMessage.warning('请填写IP地址和主机名')
    return
  }
  
  if (editingIndex.value === -1) {
    hostsEntries.value.push({ ...editingEntry.value })
  } else {
    hostsEntries.value[editingIndex.value] = { ...editingEntry.value }
  }
  
  dialogVisible.value = false
}

const removeEntry = async (index: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这个条目吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    hostsEntries.value.splice(index, 1)
    ElMessage.success('条目已删除')
  } catch {
    // 用户取消删除
  }
}

const enableAll = () => {
  hostsEntries.value.forEach(entry => entry.enabled = true)
  ElMessage.success('已启用所有条目')
}

const disableAll = () => {
  hostsEntries.value.forEach(entry => entry.enabled = false)
  ElMessage.success('已禁用所有条目')
}

const clearAll = async () => {
  try {
    await ElMessageBox.confirm('确定要清空所有条目吗？此操作不可恢复！', '确认清空', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    hostsEntries.value = []
    ElMessage.success('已清空所有条目')
  } catch {
    // 用户取消清空
  }
}

// 文件变化监听
let fileChangeUnsubscribe: (() => void) | null = null

// 生命周期
onMounted(() => {
  loadHosts()
  
  // 设置文件变化监听
  if (window.electronAPI.onHostsFileChanged) {
    fileChangeUnsubscribe = window.electronAPI.onHostsFileChanged((data) => {
      if (data.success && data.data) {
        originalContent.value = data.data
        parseHostsContent(data.data)
        ElMessage.info('检测到hosts文件变化，已自动刷新')
      }
    })
  }
})

onUnmounted(() => {
  if (fileChangeUnsubscribe) {
    fileChangeUnsubscribe()
  }
})
</script>

<style scoped>
.app-container {
  height: 100vh;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  padding: 0 20px;
}

.app-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.app-main {
  padding: 20px;
  background-color: #f5f7fa;
}

.hosts-editor-card {
  /* height: calc(100vh - 200px); */
}

.card-header {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 16px;
}

.card-actions {
  margin-left: auto;
  display: flex;
  gap: 10px;
}

.hosts-content {
  height: calc(100% - 60px);
  overflow-y: auto;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.hosts-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hosts-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background-color: white;
  transition: all 0.3s ease;
}

.hosts-entry:hover {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.hosts-entry.disabled {
  opacity: 0.6;
  background-color: #f5f5f5;
}

.entry-content {
  display: flex;
  align-items: center;
  gap: 15px;
  flex: 1;
}

.entry-text {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ip {
  font-weight: bold;
  color: #409eff;
  min-width: 100px;
}

.hostname {
  color: #303133;
  font-weight: 500;
}

.comment {
  color: #909399;
  font-style: italic;
}

.entry-actions {
  display: flex;
  gap: 5px;
}

.info-card {
  height: calc(100vh - 200px);
}

.info-content {
  height: calc(100% - 60px);
  overflow-y: auto;
}

.quick-actions {
  margin: 20px 0;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 20px;
  
  h4 {
    margin: 0;
  }
}

.action-buttons {
  /* margin-top: 10px; */
}

.help-section {
  margin: 20px 0;
}

.help-list {
  margin: 10px 0;
  padding-left: 20px;
  color: #606266;
}

.help-list li {
  margin: 5px 0;
  line-height: 1.5;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style> 