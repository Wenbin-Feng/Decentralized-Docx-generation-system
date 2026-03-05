"""
JWT 服务 - 生成和验证 JWT Token
"""
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from config.settings import settings
from logger import logger


class JWTService:
    """JWT Token 生成和验证服务"""

    def __init__(self):
        self.secret_key = settings.JWT_SECRET_KEY
        self.algorithm = settings.JWT_ALGORITHM
        self.expiration_hours = settings.JWT_EXPIRATION_HOURS

        # 安全检查：密钥长度
        if len(self.secret_key) < 32:
            logger.warning(
                "JWT_SECRET_KEY 长度不足 32 字符，生产环境请使用更强的密钥！"
            )

    def generate_token(self, user_id: int, wallet_address: str) -> str:
        """
        生成 JWT Access Token

        Args:
            user_id: 用户数据库 ID
            wallet_address: 钱包地址

        Returns:
            str: JWT token
        """
        now = datetime.utcnow()
        expires_at = now + timedelta(hours=self.expiration_hours)

        payload = {
            "sub": wallet_address,  # Subject: 钱包地址
            "user_id": user_id,
            "exp": expires_at,  # Expiration time
            "iat": now,  # Issued at
            "type": "access_token",
        }

        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        logger.info(f"生成 JWT for user {user_id} (expires: {expires_at})")

        return token

    def decode_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        验证并解码 JWT Token

        Args:
            token: JWT token 字符串

        Returns:
            Optional[Dict]: 解码后的 payload，验证失败返回 None

        Raises:
            jwt.ExpiredSignatureError: Token 已过期
            jwt.InvalidTokenError: Token 无效
        """
        try:
            payload = jwt.decode(
                token, self.secret_key, algorithms=[self.algorithm]
            )

            # 验证 token 类型
            if payload.get("type") != "access_token":
                logger.warning(f"Invalid token type: {payload.get('type')}")
                return None

            return payload

        except jwt.ExpiredSignatureError:
            logger.warning("JWT token 已过期")
            raise

        except jwt.InvalidTokenError as e:
            logger.error(f"JWT token 验证失败: {str(e)}")
            raise

    def get_wallet_address(self, token: str) -> Optional[str]:
        """
        从 token 中提取钱包地址

        Args:
            token: JWT token

        Returns:
            Optional[str]: 钱包地址，失败返回 None
        """
        try:
            payload = self.decode_token(token)
            return payload.get("sub") if payload else None
        except Exception:
            return None

    def get_user_id(self, token: str) -> Optional[int]:
        """
        从 token 中提取用户 ID

        Args:
            token: JWT token

        Returns:
            Optional[int]: 用户 ID，失败返回 None
        """
        try:
            payload = self.decode_token(token)
            return payload.get("user_id") if payload else None
        except Exception:
            return None


# 单例模式
_jwt_service = None


def get_jwt_service() -> JWTService:
    """获取 JWT Service 单例"""
    global _jwt_service
    if _jwt_service is None:
        _jwt_service = JWTService()
    return _jwt_service
