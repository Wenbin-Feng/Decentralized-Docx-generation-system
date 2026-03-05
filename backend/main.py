from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from routers.template import router as document_router
from routers.auth import router as auth_router
from database import init_db
from logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时初始化数据库
    logger.info("应用启动 - 初始化数据库...")
    init_db()
    logger.info("数据库初始化完成")

    yield

    # 关闭时清理资源
    logger.info("应用关闭")


app = FastAPI(
    title="Medical Report Generation Backend",
    description="基于 SIWE 的医疗报告生成系统",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS 配置 ────────────────────────────────────────────────
# 允许前端跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite 默认端口
        "http://localhost:3000",  # React 默认端口
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 路由注册 ─────────────────────────────────────────────────
app.include_router(auth_router, prefix="/api/v1")  # 认证路由
app.include_router(document_router, prefix="/api/v1")  # 文档路由


# ── 健康检查 ─────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    """健康检查接口"""
    return {"status": "ok", "message": "Medical Report Backend is running"}
