# Node.js 版本兼容性说明

## 支持的 Node.js 版本

### 最低要求
- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0

### 推荐版本
- **Node.js**: 18.x LTS 或 20.x LTS
- **npm**: 9.x 或 10.x

## 版本选择原因

### Node.js 18.x LTS (推荐)
- **长期支持**: 支持到 2025年4月
- **稳定性**: 经过充分测试，生产环境稳定
- **性能**: 包含 V8 引擎优化
- **兼容性**: 与所有依赖包兼容性良好

### Node.js 20.x LTS
- **最新特性**: 支持最新的 JavaScript 特性
- **性能提升**: 更好的内存管理和性能
- **长期支持**: 支持到 2026年4月
- **现代化**: 支持更多现代开发工具

## 依赖包版本要求

### 核心依赖
```json
{
  "electron": "^27.0.0",           // 需要 Node.js >= 18
  "vite": "^4.4.9",               // 需要 Node.js >= 18
  "typescript": "^5.2.2",         // 需要 Node.js >= 18
  "vue": "^3.3.4"                 // 需要 Node.js >= 16
}
```

### 开发依赖
```json
{
  "@vitejs/plugin-vue": "^4.4.0",  // 需要 Node.js >= 18
  "vue-tsc": "^1.8.8",            // 需要 Node.js >= 18
  "electron-builder": "^24.6.4"    // 需要 Node.js >= 18
}
```

## 版本检查

### 检查当前版本
```bash
# 检查 Node.js 版本
node --version

# 检查 npm 版本
npm --version

# 检查所有版本
npm version
```

### 版本不兼容时的处理
如果您的 Node.js 版本低于要求，请：

1. **升级 Node.js**
   ```bash
   # 使用 nvm 安装新版本
   nvm install 18
   nvm use 18
   
   # 或直接从官网下载安装
   # https://nodejs.org/
   ```

2. **清理缓存**
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

## 不同版本的特性支持

### Node.js 18.x
- ✅ ES2022 特性支持
- ✅ 顶层 await
- ✅ 原生 fetch API
- ✅ 更好的错误处理
- ✅ 性能优化

### Node.js 20.x
- ✅ 所有 18.x 特性
- ✅ 更新的 V8 引擎
- ✅ 更好的内存管理
- ✅ 更快的启动时间
- ✅ 实验性 Web Streams API

## 开发环境设置

### 使用 nvm (推荐)
```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 安装 Node.js 18
nvm install 18
nvm use 18

# 设置为默认版本
nvm alias default 18
```

### 使用 Docker
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

## 生产环境部署

### 服务器要求
- **Node.js**: 18.x LTS 或 20.x LTS
- **内存**: 至少 2GB RAM
- **存储**: 至少 1GB 可用空间
- **CPU**: 支持 SSE4.2 指令集

### 部署脚本示例
```bash
#!/bin/bash

# 检查 Node.js 版本
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Error: Node.js 18+ required, current version: $(node --version)"
    exit 1
fi

# 安装依赖
npm ci --only=production

# 构建应用
npm run build

# 启动应用
npm start
```

## 常见问题

### Q: 为什么需要 Node.js 18+？
A: 项目使用了现代 JavaScript 特性和依赖包，这些都需要 Node.js 18+ 的支持。

### Q: 可以使用 Node.js 16 吗？
A: 不推荐。虽然某些功能可能工作，但会遇到兼容性问题和不稳定情况。

### Q: 如何升级 Node.js？
A: 推荐使用 nvm 进行版本管理，可以轻松切换不同版本。

### Q: 升级后遇到问题怎么办？
A: 清理 node_modules 和 package-lock.json，重新安装依赖。

## 版本更新计划

### 短期计划 (3-6个月)
- 保持对 Node.js 18.x 的支持
- 测试 Node.js 20.x 兼容性
- 更新依赖包到最新稳定版本

### 长期计划 (6-12个月)
- 评估升级到 Node.js 20.x 作为最低要求
- 采用新的 JavaScript 特性
- 优化构建和部署流程

## 支持矩阵

| Node.js 版本 | 支持状态 | 测试状态 | 推荐度 |
|-------------|---------|---------|--------|
| 16.x        | ❌ 不支持 | ❌ 未测试 | ❌ 不推荐 |
| 18.x        | ✅ 支持 | ✅ 已测试 | ⭐⭐⭐⭐⭐ 强烈推荐 |
| 20.x        | ✅ 支持 | ✅ 已测试 | ⭐⭐⭐⭐ 推荐 |
| 21.x        | ⚠️ 实验性 | ⚠️ 部分测试 | ⚠️ 谨慎使用 |

## 联系支持

如果您在版本兼容性方面遇到问题，请：

1. 检查当前 Node.js 版本
2. 查看错误日志
3. 尝试清理缓存和重新安装
4. 提交 Issue 到项目仓库 