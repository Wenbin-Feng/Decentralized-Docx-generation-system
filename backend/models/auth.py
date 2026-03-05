"""
认证相关的 Pydantic 模型（Request/Response）
"""
from pydantic import BaseModel, Field
from typing import Optional


# ── Request Models ────────────────────────────────────────────


class NonceRequest(BaseModel):
    """获取 Nonce 请求"""
    wallet_address: str = Field(..., description="钱包地址", min_length=42, max_length=42)


class VerifyRequest(BaseModel):
    """验证签名请求"""
    wallet_address: str = Field(..., description="钱包地址")
    signature: str = Field(..., description="签名（0x开头的hex字符串）")
    message: str = Field(..., description="原始签名消息")


# ── Response Models ───────────────────────────────────────────


class NonceResponse(BaseModel):
    """获取 Nonce 响应"""
    success: bool = True
    message: str = "Nonce generated successfully"
    code: int = 200
    nonce: str = Field(..., description="随机 Nonce")
    siwe_message: str = Field(..., description="完整的 SIWE 签名消息")


class AuthResponse(BaseModel):
    """登录响应"""
    success: bool = True
    message: str = "Authentication successful"
    code: int = 200
    access_token: str = Field(..., description="JWT access token")
    token_type: str = "Bearer"
    user: dict = Field(..., description="用户信息")


class UserResponse(BaseModel):
    """用户信息响应"""
    success: bool = True
    message: str = "User info retrieved successfully"
    code: int = 200
    user: dict = Field(..., description="用户信息")


class ErrorResponse(BaseModel):
    """错误响应"""
    success: bool = False
    message: str = Field(..., description="错误信息")
    code: int = Field(..., description="HTTP 状态码")
    detail: Optional[str] = Field(None, description="详细错误信息")
