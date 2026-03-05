"""
认证服务 - SIWE 签名验证、Nonce 生成
"""
import uuid
from datetime import datetime, timedelta
from typing import Optional, Tuple

from eth_account import Account
from eth_account.messages import encode_defunct
from sqlalchemy.orm import Session

from config.settings import settings
from logger import logger
from models.user import User


class AuthService:
    """认证服务"""

    def __init__(self):
        self.nonce_expiration = settings.NONCE_EXPIRATION_MINUTES
        self.siwe_domain = settings.SIWE_DOMAIN
        self.siwe_uri = settings.SIWE_URI

    def generate_nonce(self) -> str:
        """
        生成随机 Nonce

        Returns:
            str: UUID4 格式的 Nonce
        """
        return str(uuid.uuid4())

    def build_siwe_message(
        self, wallet_address: str, nonce: str, issued_at: Optional[datetime] = None
    ) -> str:
        """
        构造符合 EIP-4361 (SIWE) 标准的签名消息

        Args:
            wallet_address: 钱包地址
            nonce: 随机数
            issued_at: 签发时间（默认当前时间）

        Returns:
            str: 完整的 SIWE 消息
        """
        if issued_at is None:
            issued_at = datetime.utcnow()

        # EIP-4361 标准消息格式
        message = f"""{self.siwe_domain} wants you to sign in with your Ethereum account:
{wallet_address}

登录到医疗报告生成系统

URI: {self.siwe_uri}
Version: 1
Chain ID: 31337
Nonce: {nonce}
Issued At: {issued_at.strftime('%Y-%m-%dT%H:%M:%SZ')}"""

        return message

    def verify_signature(
        self, message: str, signature: str, expected_address: str
    ) -> bool:
        """
        验证以太坊签名

        Args:
            message: 原始消息
            signature: 签名（0x开头的hex字符串）
            expected_address: 预期的钱包地址

        Returns:
            bool: 签名是否有效
        """
        try:
            # 1. 将消息编码为以太坊消息格式
            message_hash = encode_defunct(text=message)

            # 2. 从签名中恢复地址
            recovered_address = Account.recover_message(
                message_hash, signature=signature
            )

            # 3. 对比地址（不区分大小写）
            is_valid = recovered_address.lower() == expected_address.lower()

            if is_valid:
                logger.info(f"签名验证成功: {expected_address}")
            else:
                logger.warning(
                    f"签名验证失败: expected={expected_address}, recovered={recovered_address}"
                )

            return is_valid

        except Exception as e:
            logger.error(f"签名验证异常: {str(e)}")
            return False

    def get_or_create_user(
        self, db: Session, wallet_address: str
    ) -> Tuple[User, bool]:
        """
        获取或创建用户

        Args:
            db: 数据库 Session
            wallet_address: 钱包地址

        Returns:
            Tuple[User, bool]: (用户对象, 是否新创建)
        """
        # 标准化钱包地址（小写）
        wallet_address = wallet_address.lower()

        # 查询用户
        user = db.query(User).filter(User.wallet_address == wallet_address).first()

        if user:
            logger.info(f"找到已有用户: {wallet_address}")
            return user, False

        # 创建新用户
        user = User(wallet_address=wallet_address)
        db.add(user)
        db.commit()
        db.refresh(user)

        logger.info(f"创建新用户: {wallet_address} (ID: {user.id})")
        return user, True

    def set_nonce(self, db: Session, user: User) -> str:
        """
        为用户设置新的 Nonce

        Args:
            db: 数据库 Session
            user: 用户对象

        Returns:
            str: 新生成的 Nonce
        """
        nonce = self.generate_nonce()
        expires_at = datetime.utcnow() + timedelta(minutes=self.nonce_expiration)

        user.nonce = nonce
        user.nonce_expires_at = expires_at

        db.commit()
        db.refresh(user)

        logger.info(f"为用户 {user.wallet_address} 生成 Nonce (过期: {expires_at})")
        return nonce

    def verify_nonce(self, user: User, message: str) -> bool:
        """
        验证 Nonce 是否有效

        Args:
            user: 用户对象
            message: 签名消息（包含 Nonce）

        Returns:
            bool: Nonce 是否有效
        """
        # 检查 Nonce 是否存在
        if not user.nonce:
            logger.warning(f"用户 {user.wallet_address} 没有有效的 Nonce")
            return False

        # 检查 Nonce 是否过期
        if user.nonce_expires_at and user.nonce_expires_at < datetime.utcnow():
            logger.warning(f"用户 {user.wallet_address} 的 Nonce 已过期")
            return False

        # 检查消息中是否包含正确的 Nonce
        if user.nonce not in message:
            logger.warning(f"消息中的 Nonce 不匹配")
            return False

        return True

    def clear_nonce(self, db: Session, user: User):
        """
        清除用户的 Nonce（防止重放攻击）

        Args:
            db: 数据库 Session
            user: 用户对象
        """
        user.nonce = None
        user.nonce_expires_at = None
        db.commit()

        logger.info(f"清除用户 {user.wallet_address} 的 Nonce")

    def update_last_login(self, db: Session, user: User):
        """
        更新用户最后登录时间

        Args:
            db: 数据库 Session
            user: 用户对象
        """
        user.last_login = datetime.utcnow()
        db.commit()


# 单例模式
_auth_service = None


def get_auth_service() -> AuthService:
    """获取 Auth Service 单例"""
    global _auth_service
    if _auth_service is None:
        _auth_service = AuthService()
    return _auth_service
