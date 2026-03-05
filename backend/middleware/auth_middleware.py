"""
认证中间件 - JWT 验证
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import jwt

from database import get_db
from models.user import User
from services import get_jwt_service, JWTService
from logger import logger

# HTTP Bearer 认证（从 Header 中提取 Token）
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    jwt_service: JWTService = Depends(get_jwt_service),
) -> User:
    """
    获取当前登录用户（依赖注入）

    从 Authorization Header 中提取 JWT，验证后返回用户对象

    使用方式:
        @app.get("/protected")
        def protected_route(current_user: User = Depends(get_current_user)):
            # current_user 即为已认证的用户对象
            ...

    Args:
        credentials: HTTP Authorization credentials
        db: 数据库 Session
        jwt_service: JWT Service

    Returns:
        User: 当前用户对象

    Raises:
        HTTPException: 认证失败
    """
    token = credentials.credentials

    try:
        # 1. 解码 JWT
        payload = jwt_service.decode_token(token)

        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # 2. 提取用户信息
        wallet_address = payload.get("sub")
        user_id = payload.get("user_id")

        if not wallet_address or not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # 3. 查询用户
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # 4. 验证钱包地址是否匹配
        if user.wallet_address.lower() != wallet_address.lower():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Wallet address mismatch",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return user

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

    except jwt.InvalidTokenError as e:
        logger.error(f"Invalid JWT: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed",
        )
