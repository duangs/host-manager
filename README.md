# Hosts Manager

一个基于 Electron 和 Vue3 的 hosts 文件管理工具，提供直观的图形界面来管理系统的 hosts 文件。

## 功能特性

- 🖥️ **跨平台支持** - 支持 Windows、macOS 和 Linux
- 📝 **可视化编辑** - 直观的界面来查看和编辑 hosts 条目
- ✅ **启用/禁用** - 快速启用或禁用单个 hosts 条目
- 🔄 **实时同步** - 自动检测文件变化并同步显示
- 💾 **备份恢复** - 一键备份当前 hosts 配置
- 🎨 **现代界面** - 基于 Element Plus 的美观界面
- 🔒 **安全操作** - 安全的文件读写操作

## 技术栈

- **前端框架**: Vue 3 + TypeScript
- **UI 组件库**: Element Plus
- **桌面应用**: Electron
- **构建工具**: Vite
- **包管理**: npm

## 系统要求

- **Node.js**: >= 18.0.0 (推荐 18.x LTS 或 20.x LTS)
- **npm**: >= 8.0.0
- **操作系统**: Windows 10+, macOS 10.15+, Ubuntu 18.04+

## 安装和运行

### 开发环境

1. 检查 Node.js 版本
```bash
node --version  # 确保版本 >= 18.0.0
npm --version   # 确保版本 >= 8.0.0
```

2. 克隆项目
```bash
git clone <repository-url>
cd hosts-manage
```

3. 安装依赖
```bash
npm install
```

3. 启动开发服务器
```bash
npm run electron-dev
```

### 生产构建

1. 构建应用
```bash
npm run dist
```

2. 构建后的文件位于 `release` 目录

## 使用说明

### 基本操作

1. **查看 hosts 文件**
   - 启动应用后会自动加载当前系统的 hosts 文件
   - 点击"刷新"按钮重新读取文件

2. **编辑 hosts 条目**
   - 点击"添加条目"按钮添加新的 hosts 条目
   - 点击条目右侧的编辑按钮修改现有条目
   - 勾选/取消勾选来启用/禁用条目

3. **保存更改**
   - 修改完成后点击"保存"按钮将更改写入 hosts 文件
   - 系统会提示保存成功或失败

4. **备份配置**
   - 点击"备份"按钮创建当前配置的备份文件
   - 备份文件保存在文档目录中

### 高级功能

- **批量操作**: 使用"全部启用"或"全部禁用"按钮进行批量操作
- **清空配置**: 使用"清空"按钮删除所有 hosts 条目
- **信息面板**: 右侧面板显示当前配置的统计信息

## 注意事项

⚠️ **重要提醒**:
- 修改 hosts 文件需要管理员权限
- 建议在修改前先备份原始配置
- 某些系统可能需要以管理员身份运行应用

## 开发说明

### 项目结构

```
hosts-manage/
├── electron/          # Electron 主进程和预加载脚本
│   ├── main.ts       # 主进程入口
│   └── preload.ts    # 预加载脚本
├── src/              # Vue 前端代码
│   ├── App.vue       # 主应用组件
│   ├── main.ts       # Vue 应用入口
│   └── vite-env.d.ts # 类型声明
├── index.html        # HTML 入口文件
├── package.json      # 项目配置
├── vite.config.ts    # Vite 配置
└── tsconfig.json     # TypeScript 配置
```

### 开发命令

- `npm run dev` - 启动 Vite 开发服务器
- `npm run electron-dev` - 启动 Electron 开发模式
- `npm run build` - 构建 Vue 应用
- `npm run dist` - 构建完整的桌面应用

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！ 