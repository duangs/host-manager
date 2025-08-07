#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 读取 package.json 中的 engines 配置
function getRequiredVersions() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return packageJson.engines || {};
}

// 解析版本号
function parseVersion(version) {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}`);
  }
  return {
    major: parseInt(match[1]),
    minor: parseInt(match[2]),
    patch: parseInt(match[3])
  };
}

// 比较版本号
function compareVersions(actual, required) {
  const actualVersion = parseVersion(actual);
  const requiredVersion = parseVersion(required);
  
  if (actualVersion.major > requiredVersion.major) return 1;
  if (actualVersion.major < requiredVersion.major) return -1;
  
  if (actualVersion.minor > requiredVersion.minor) return 1;
  if (actualVersion.minor < requiredVersion.minor) return -1;
  
  if (actualVersion.patch > requiredVersion.patch) return 1;
  if (actualVersion.patch < requiredVersion.patch) return -1;
  
  return 0;
}

// 检查版本是否满足要求
function checkVersion(actual, required) {
  if (!required) return true;
  
  const operator = required.match(/^([<>=]+)/)?.[1] || '>=';
  const version = required.replace(/^[<>=]+/, '');
  
  const comparison = compareVersions(actual, version);
  
  switch (operator) {
    case '>=':
      return comparison >= 0;
    case '>':
      return comparison > 0;
    case '<=':
      return comparison <= 0;
    case '<':
      return comparison < 0;
    case '=':
    case '==':
      return comparison === 0;
    default:
      return false;
  }
}

// 获取当前版本
function getCurrentVersions() {
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    return { node: nodeVersion, npm: npmVersion };
  } catch (error) {
    console.error('Error getting current versions:', error.message);
    process.exit(1);
  }
}

// 主函数
function main() {
  console.log('🔍 检查 Node.js 和 npm 版本...\n');
  
  const required = getRequiredVersions();
  const current = getCurrentVersions();
  
  console.log('📋 版本要求:');
  console.log(`   Node.js: ${required.node || '未指定'}`);
  console.log(`   npm: ${required.npm || '未指定'}`);
  console.log('');
  
  console.log('📊 当前版本:');
  console.log(`   Node.js: ${current.node}`);
  console.log(`   npm: ${current.npm}`);
  console.log('');
  
  let allPassed = true;
  
  // 检查 Node.js 版本
  if (required.node) {
    const nodePassed = checkVersion(current.node, required.node);
    console.log(`✅ Node.js 版本检查: ${nodePassed ? '通过' : '失败'}`);
    if (!nodePassed) {
      console.log(`   ❌ 需要 ${required.node}，当前 ${current.node}`);
      allPassed = false;
    }
  }
  
  // 检查 npm 版本
  if (required.npm) {
    const npmPassed = checkVersion(current.npm, required.npm);
    console.log(`✅ npm 版本检查: ${npmPassed ? '通过' : '失败'}`);
    if (!npmPassed) {
      console.log(`   ❌ 需要 ${required.npm}，当前 ${current.npm}`);
      allPassed = false;
    }
  }
  
  console.log('');
  
  if (allPassed) {
    console.log('🎉 所有版本检查通过！可以继续安装和运行项目。');
    process.exit(0);
  } else {
    console.log('❌ 版本检查失败！请升级到要求的版本。');
    console.log('');
    console.log('💡 升级建议:');
    console.log('   1. 使用 nvm 安装新版本:');
    console.log('      nvm install 18');
    console.log('      nvm use 18');
    console.log('');
    console.log('   2. 或从官网下载: https://nodejs.org/');
    console.log('');
    console.log('   3. 升级后清理缓存:');
    console.log('      npm cache clean --force');
    console.log('      rm -rf node_modules package-lock.json');
    console.log('      npm install');
    process.exit(1);
  }
}

// 运行检查
if (require.main === module) {
  main();
}

module.exports = {
  checkVersion,
  parseVersion,
  compareVersions,
  getCurrentVersions,
  getRequiredVersions
}; 