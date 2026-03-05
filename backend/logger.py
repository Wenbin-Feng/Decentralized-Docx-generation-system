"""
日志配置
使用 loguru 库提供结构化日志
"""
import sys
from loguru import logger
from config.settings import settings

# 移除默认的 logger
logger.remove()

# 添加控制台输出
logger.add(
    sys.stderr,
    format="<green>[{time:DD/MMM/YYYY HH:mm:ss}]</green> <level>{level: <8}</level> - <level>{message}</level>",
    level="DEBUG" if settings.debug else "INFO",
    colorize=True,
)

# 添加文件输出（可选）
if not settings.debug:
    logger.add(
        "logs/app_{time:YYYY-MM-DD}.log",
        rotation="00:00",  # 每天 00:00 轮换
        retention="30 days",  # 保留 30 天
        level="INFO",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {message}",
    )

__all__ = ["logger"]
