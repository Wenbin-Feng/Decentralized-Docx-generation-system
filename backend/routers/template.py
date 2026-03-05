import asyncio
import json
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from typing import Optional

from services import get_RenderService, get_GenreportsService
from models import (
    RenderRequest,
    GenRequest,
    ResponseBase,
    RenderResponse,
    CaptionResponse,
    ReportResponse,
    User,
    Report,
)
from storage import get_storage
from middleware.auth_middleware import get_current_user
from database import get_db

router = APIRouter(prefix="/document")


# ── 1. 上传图片 ──────────────────────────────────────────────
@router.post("/upload", response_model=ResponseBase)
async def upload(file: UploadFile = File(...), storage=Depends(get_storage)):
    """
    上传 CT / 胸片图片到 static/ 目录
    返回图片存储路径，供后续接口使用
    """
    try:
        key = "static/" + file.filename
        await storage.upload(file, key)
        return ResponseBase(success=True, message=key, code=200)
    except Exception as e:
        return ResponseBase(success=False, message=str(e), code=500)


# ── 2. 从图片生成影像描述 ─────────────────────────────────────
@router.post("/generate_caption", response_model=CaptionResponse)
async def generate_caption(
    request_data: GenRequest,
    gen_service=Depends(get_GenreportsService),
):
    """
    输入: 图片路径 (img_url)
    输出: findings (图象所见) + diagnosis (诊断意见)
    前端可展示给用户查看/编辑后，再调用 generate_report 渲染 Word
    """
    try:
        res = await gen_service.generate_from_img(request_data.img_url)
        if res["status"] == "success":
            return CaptionResponse(
                success=True,
                message="报告描述生成成功",
                code=200,
                findings=res["findings"],
                diagnosis=res["diagnosis"],
            )
        return CaptionResponse(
            success=False,
            message=res.get("raw_response", "报告生成失败"),
            code=500,
        )
    except Exception as e:
        return CaptionResponse(success=False, message=str(e), code=500)


# ── 辅助函数：获取可选用户（不强制登录）────────────────────────
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

security_optional = HTTPBearer(auto_error=False)

async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """可选的用户认证（不强制登录，登录用户享受更多功能）"""
    from logger import logger

    if credentials is None:
        logger.info("[AUTH] 未提供认证凭据（credentials is None）")
        return None
    try:
        user = get_current_user(credentials, db)
        logger.info(f"[AUTH] 用户认证成功: {user.wallet_address}")
        return user
    except Exception as e:
        logger.warning(f"[AUTH] 用户认证失败: {str(e)}")
        return None


# ── 3. 从描述生成完整 JSON + 渲染 Word（必须登录）────────────────────────
@router.post("/generate_report", response_model=ReportResponse)
async def generate_report(
    request_data: RenderRequest,
    render_service=Depends(get_RenderService),
    current_user: User = Depends(get_current_user),  # 必须登录
    db: Session = Depends(get_db),
):
    """
    输入: content (findings + diagnosis 文本), template_id (如 "Medical_reports")
    流程: 文本 → LLM 生成结构化 JSON → 渲染 Word 文档
    输出: json_data + output_path

    ⚠️ 此接口必须登录才能使用
    会自动使用用户资料填充报告，并保存到历史记录
    """
    try:
        from logger import logger
        logger.info(f"[REPORT] 用户 {current_user.wallet_address} 开始生成报告")

        # 提取用户资料
        user_profile = {
            "username": current_user.username,
            "gender": current_user.gender,
            "age": current_user.age,
        }

        res = await render_service.fill_template(
            request_data.content, request_data.template_id, user_profile, request_data.image_url
        )
        if res.get("status") == "success":
            # 保存报告记录到数据库
            logger.info(f"[REPORT] 保存报告记录到数据库，用户: {current_user.wallet_address}")
            report = Report(
                user_id=current_user.id,
                wallet_address=current_user.wallet_address,
                template_id=request_data.template_id,
                file_path=res.get("output_path", ""),
                image_path=request_data.image_url,
                json_data=json.dumps(res.get("json_data"), ensure_ascii=False),
                content=request_data.content,
            )
            db.add(report)
            db.commit()
            db.refresh(report)
            logger.info(f"[REPORT] 报告记录已保存，ID: {report.id}")

        return ReportResponse(
            success=True,
            message="报告生成成功",
            code=200,
            json_data=res.get("json_data"),
            output_path=res.get("output_path", ""),
        )
    except Exception as e:
        logger.error(f"[REPORT] 生成报告失败: {str(e)}")
        db.rollback()
        return ReportResponse(success=False, message=str(e), code=500)


# ── 4. 模板渲染（原有接口，保留兼容） ────────────────────────
@router.post("/render", response_model=RenderResponse)
async def render_ppt(
    request_data: RenderRequest,
    render_service=Depends(get_RenderService),
):
    try:
        res = await render_service.fill_template(
            request_data.content, request_data.template_id
        )
        if res.get("status") == "success":
            return RenderResponse(
                success=True,
                message=res.get("msg", "Document generated successfully"),
                code=200,
                output_path=res.get("output_path", ""),
            )
        return RenderResponse(
            success=False,
            message=res.get("msg", "Document generated failed"),
            code=500,
        )
    except Exception as e:
        return RenderResponse(success=False, message=str(e), code=500)


# ── 5. 获取用户报告列表 ────────────────────────────────────────
@router.get("/reports")
async def get_user_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    获取当前用户的所有报告记录（按时间倒序）
    """
    try:
        reports = (
            db.query(Report)
            .filter(Report.user_id == current_user.id)
            .order_by(Report.created_at.desc())
            .all()
        )

        return {
            "success": True,
            "message": "获取报告列表成功",
            "code": 200,
            "reports": [report.to_dict() for report in reports],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 6. 获取单个报告详情 ────────────────────────────────────────
@router.get("/reports/{report_id}")
async def get_report_detail(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    获取指定报告的详细信息
    """
    try:
        report = (
            db.query(Report)
            .filter(Report.id == report_id, Report.user_id == current_user.id)
            .first()
        )

        if not report:
            raise HTTPException(status_code=404, detail="报告不存在")

        return {
            "success": True,
            "message": "获取报告详情成功",
            "code": 200,
            "report": report.to_dict(),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 7. 下载报告文件 ────────────────────────────────────────────
@router.get("/download/{report_id}")
async def download_report(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    下载指定报告的 Word 文档
    """
    try:
        report = (
            db.query(Report)
            .filter(Report.id == report_id, Report.user_id == current_user.id)
            .first()
        )

        if not report:
            raise HTTPException(status_code=404, detail="报告不存在")

        from pathlib import Path
        file_path = Path(report.file_path)

        if not file_path.exists():
            raise HTTPException(status_code=404, detail="报告文件不存在")

        # 返回文件供下载
        return FileResponse(
            path=str(file_path),
            filename=f"{report.report_name or f'report_{report_id}'}.docx",
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))