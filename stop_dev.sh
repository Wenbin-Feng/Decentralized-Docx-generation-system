#!/bin/bash

# 停止开发服务脚本

echo "🛑 停止医疗报告生成系统..."
echo "=========================================="

# 停止后端
if [ -f "logs/backend.pid" ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    echo "🔧 停止后端服务 (PID: $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null && echo "✅ 后端已停止" || echo "⚠️  后端进程未找到"
    rm logs/backend.pid
else
    echo "⚠️  未找到后端 PID 文件"
fi

# 停止前端
if [ -f "logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    echo "🎨 停止前端服务 (PID: $FRONTEND_PID)..."
    kill $FRONTEND_PID 2>/dev/null && echo "✅ 前端已停止" || echo "⚠️  前端进程未找到"
    rm logs/frontend.pid
else
    echo "⚠️  未找到前端 PID 文件"
fi

# 清理可能残留的进程
echo ""
echo "🧹 清理残留进程..."
pkill -f "uv run uvicorn" 2>/dev/null
pkill -f "uvicorn main:app" 2>/dev/null
pkill -f "vite" 2>/dev/null

echo ""
echo "=========================================="
echo "✅ 所有服务已停止"
echo "=========================================="
