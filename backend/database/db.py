"""
数据库工厂 - 支持 SQLite 和 PostgreSQL
根据配置自动切换数据库类型
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from config.settings import settings, Proj_root
from logger import logger

# 创建基类
Base = declarative_base()

# 根据配置选择数据库 URL
def get_database_url() -> str:
    """
    根据配置返回数据库连接 URL
    """
    if settings.DATABASE_TYPE == "postgresql":
        if not settings.DATABASE_URL:
            # 尝试使用 Supabase 配置
            if settings.SUPABASE_PROJ_URL and settings.SUPABASE_SECRET_KEY:
                logger.warning("使用 Supabase 数据库连接")
                # Supabase URL 格式: postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres
                # 这里需要从 SUPABASE_PROJ_URL 提取项目 ID
                # 简化处理：用户需要在 .env 中配置完整的 DATABASE_URL
                raise ValueError(
                    "PostgreSQL 模式需要配置 DATABASE_URL，"
                    "格式: postgresql://user:pass@host:port/dbname"
                )
            raise ValueError("DATABASE_TYPE=postgresql 但未配置 DATABASE_URL")
        return settings.DATABASE_URL

    elif settings.DATABASE_TYPE == "sqlite":
        # SQLite 数据库文件路径
        db_path = Proj_root / settings.SQLITE_FILE
        logger.info(f"使用 SQLite 数据库: {db_path}")
        return f"sqlite:///{db_path}"

    else:
        raise ValueError(f"不支持的数据库类型: {settings.DATABASE_TYPE}")


# 创建数据库引擎
DATABASE_URL = get_database_url()

# SQLite 需要额外配置
connect_args = {}
if settings.DATABASE_TYPE == "sqlite":
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,  # 连接池健康检查
    echo=settings.debug,  # debug 模式下打印 SQL
)

# 创建 Session 工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """
    初始化数据库（创建所有表）
    在应用启动时调用
    """
    logger.info("初始化数据库...")
    Base.metadata.create_all(bind=engine)
    logger.info("数据库初始化完成")


def get_db() -> Generator[Session, None, None]:
    """
    获取数据库 Session（依赖注入）

    使用方式:
        @app.get("/users")
        def get_users(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
