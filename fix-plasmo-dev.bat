@echo off
echo 正在修复 Plasmo 开发环境问题...

REM 关闭任何正在运行的 Node.js 进程
echo 关闭 Node.js 进程...
taskkill /f /im node.exe >nul 2>&1

REM 删除 build 目录
echo 清理构建目录...
if exist "build" (
    rmdir /s /q "build"
    echo build 目录已删除
)

REM 删除 node_modules 目录
echo 清理 node_modules 目录...
if exist "node_modules" (
    rmdir /s /q "node_modules"
    echo node_modules 目录已删除
)

REM 重新安装依赖
echo 重新安装依赖...
npm install

REM 启动开发服务器
echo 启动 Plasmo 开发服务器...
npx plasmo dev

pause