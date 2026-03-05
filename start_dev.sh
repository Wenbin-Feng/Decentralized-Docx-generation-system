#!/bin/bash

# 开发环境一键启动脚本（使用 uv）

echo "🚀 启动医疗报告生成系统（开发环境）"
echo "=========================================="

# 检查依赖
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ 未找到 $1，请先安装"
        exit 1
    fi
}

echo "📦 检查依赖..."
check_command uv
check_command npm
echo "✅ 依赖检查通过"

# 启动后端
echo ""
echo "🔧 启动后端服务..."
cd backend

# 安装依赖（使用 requirements.txt）
echo "📦 安装 Python 依赖..."
uv pip install -r requirements.txt

# 检查 .env
if [ ! -f ".env" ]; then
    echo "⚠️  未找到 .env 文件，从示例复制..."
    cp .env.example .env
    echo "⚙️  请编辑 backend/.env 配置必要的环境变量"
fi

# 启动后端（后台，使用 uv run）
echo "🚀 启动 FastAPI 服务器 (http://localhost:8000)..."
nohup uv run uvicorn main:app --reload --port 8000 > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ 后端进程 PID: $BACKEND_PID"

cd ..

# 启动前端
echo ""
echo "🎨 启动前端服务..."
cd frontend

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装 Node 依赖..."
    npm install
fi

# 检查 .env
if [ ! -f ".env" ]; then
    echo "⚠️  未找到 .env 文件，从示例复制..."
    cp .env.example .env
fi

# 启动前端（后台）
echo "🚀 启动 Vite 开发服务器 (http://localhost:5173)..."
nohup npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ 前端进程 PID: $FRONTEND_PID"

cd ..

# 保存 PID
mkdir -p logs
echo $BACKEND_PID > logs/backend.pid
echo $FRONTEND_PID > logs/frontend.pid

echo ""
echo "=========================================="
echo "✅ 服务启动完成！"
echo ""
echo "📡 后端 API:  http://localhost:8000"
echo "📡 API 文档:  http://localhost:8000/docs"
echo "🎨 前端界面: http://localhost:5173"
echo ""
echo "📝 日志文件:"
echo "   - 后端: logs/backend.log"
echo "   - 前端: logs/frontend.log"
echo ""
echo "🛑 停止服务: ./stop_dev.sh"
echo "=========================================="
