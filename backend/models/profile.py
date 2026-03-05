"""
用户资料相关的 Pydantic 模型
"""
from pydantic import BaseModel, Field
from typing import Optional


class ProfileUpdateRequest(BaseModel):
    """更新用户资料请求"""
    username: Optional[str] = Field(None, description="用户姓名", max_length=100)
    gender: Optional[str] = Field(None, description="性别", pattern="^(男|女|其他)$")
    age: Optional[int] = Field(None, description="年龄", ge=0, le=150)


class ProfileResponse(BaseModel):
    """用户资料响应"""
    success: bool = True
    message: str = "Profile updated successfully"
    code: int = 200
    user: dict = Field(..., description="更新后的用户信息")
