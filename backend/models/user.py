"""
用户数据模型
"""
from sqlalchemy import Column, Integer, String, DateTime, func
from database.db import Base


class User(Base):
    """
    用户表 - 使用钱包地址作为唯一标识
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # 钱包地址（唯一标识）
    wallet_address = Column(String(42), unique=True, index=True, nullable=False)

    # Nonce（用于签名验证，一次性使用）
    nonce = Column(String(64), nullable=True)
    nonce_expires_at = Column(DateTime, nullable=True)

    # 用户信息（可选，业务需要时填写）
    username = Column(String(100), nullable=True)  # 姓名
    gender = Column(String(10), nullable=True)  # 性别
    age = Column(Integer, nullable=True)  # 年龄
    email = Column(String(255), nullable=True)

    # 时间戳
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    last_login = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<User(id={self.id}, wallet_address={self.wallet_address})>"

    def to_dict(self):
        """转换为字典（用于 API 响应）"""
        return {
            "id": self.id,
            "wallet_address": self.wallet_address,
            "username": self.username,
            "gender": self.gender,
            "age": self.age,
            "email": self.email,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
        }
