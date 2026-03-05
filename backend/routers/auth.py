"""
认证路由 - SIWE 登录流程
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import (
    NonceRequest,
    NonceResponse,
    VerifyRequest,
    AuthResponse,
    UserResponse,
    ErrorResponse,
    User,
    ProfileUpdateRequest,
    ProfileResponse,
)
from services import get_auth_service, get_jwt_service, AuthService, JWTService
from middleware.auth_middleware import get_current_user
from logger import logger

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── 1. 获取 Nonce ────────────────────────────────────────────
@router.post("/nonce", response_model=NonceResponse)
async def get_nonce(
    request: NonceRequest,
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    获取 Nonce（第一步）

    流程:
    1. 检查钱包地址是否存在 → 不存在则创建用户
    2. 生成新的 Nonce
    3. 构造 SIWE 标准消息
    4. 返回 Nonce 和消息
    """
    try:
        wallet_address = request.wallet_address.lower()

        # 获取或创建用户
        user, is_new = auth_service.get_or_create_user(db, wallet_address)

        # 生成 Nonce
        nonce = auth_service.set_nonce(db, user)

        # 构造 SIWE 消息
        siwe_message = auth_service.build_siwe_message(wallet_address, nonce)

        return NonceResponse(
            success=True,
            message="Nonce generated successfully",
            code=200,
            nonce=nonce,
            siwe_message=siwe_message,
        )

    except Exception as e:
        logger.error(f"获取 Nonce 失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate nonce: {str(e)}",
        )


# ── 2. 验证签名并登录 ──────────────────────────────────────
@router.post("/verify", response_model=AuthResponse)
async def verify_signature(
    request: VerifyRequest,
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service),
    jwt_service: JWTService = Depends(get_jwt_service),
):
    """
    验证签名并登录（第二步）

    流程:
    1. 验证 Nonce 是否存在且未过期
    2. 验证签名真实性（ecrecover）
    3. 生成 JWT Token
    4. 清除已使用的 Nonce
    5. 更新最后登录时间
    """
    try:
        wallet_address = request.wallet_address.lower()

        # 1. 查询用户
        user = db.query(User).filter(User.wallet_address == wallet_address).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found. Please request a nonce first.",
            )

        # 2. 验证 Nonce
        if not auth_service.verify_nonce(user, request.message):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired nonce. Please request a new one.",
            )

        # 3. 验证签名
        is_valid = auth_service.verify_signature(
            request.message, request.signature, wallet_address
        )

        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid signature. Authentication failed.",
            )

        # 4. 生成 JWT Token
        access_token = jwt_service.generate_token(user.id, user.wallet_address)

        # 5. 清除 Nonce（防止重放攻击）
        auth_service.clear_nonce(db, user)

        # 6. 更新最后登录时间
        auth_service.update_last_login(db, user)

        return AuthResponse(
            success=True,
            message="Authentication successful",
            code=200,
            access_token=access_token,
            token_type="Bearer",
            user=user.to_dict(),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"签名验证失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication failed: {str(e)}",
        )


# ── 3. 获取当前用户信息 ────────────────────────────────────
@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    获取当前登录用户信息（受保护路由）

    需要在 Header 中携带 JWT:
    Authorization: Bearer <token>
    """
    try:
        return UserResponse(
            success=True,
            message="User info retrieved successfully",
            code=200,
            user=current_user.to_dict(),
        )

    except Exception as e:
        logger.error(f"获取用户信息失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user info: {str(e)}",
        )


# ── 4. 更新用户资料 ────────────────────────────────────────
@router.put("/profile", response_model=ProfileResponse)
async def update_profile(
    profile_data: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    更新当前用户资料（受保护路由）

    可更新字段：
    - username: 姓名
    - gender: 性别（男/女/其他）
    - age: 年龄
    """
    try:
        # 更新用户信息
        if profile_data.username is not None:
            current_user.username = profile_data.username

        if profile_data.gender is not None:
            current_user.gender = profile_data.gender

        if profile_data.age is not None:
            current_user.age = profile_data.age

        db.commit()
        db.refresh(current_user)

        logger.info(f"用户 {current_user.wallet_address} 更新了资料")

        return ProfileResponse(
            success=True,
            message="Profile updated successfully",
            code=200,
            user=current_user.to_dict(),
        )

    except Exception as e:
        db.rollback()
        logger.error(f"更新用户资料失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {str(e)}",
        )
