import asyncio
from fastapi import APIRouter, Depends, UploadFile, File

from services import get_RenderService, get_GenreportsService
from models import (
    RenderRequest,
    GenRequest,
    ResponseBase,
    RenderResponse,
    CaptionResponse,
    ReportResponse,
)
from storage import get_storage

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


# ── 3. 从描述生成完整 JSON + 渲染 Word ────────────────────────
@router.post("/generate_report", response_model=ReportResponse)
async def generate_report(
    request_data: RenderRequest,
    render_service=Depends(get_RenderService),
):
    """
    输入: content (findings + diagnosis 文本), template_id (如 "Medical_reports")
    流程: 文本 → LLM 生成结构化 JSON → 渲染 Word 文档
    输出: json_data + output_path
    """
    try:
        res = await render_service.fill_template(
            request_data.content, request_data.template_id
        )
        if res.get("status") == "success":
            return ReportResponse(
                success=True,
                message="报告生成成功",
                code=200,
                json_data=res.get("json_data"),
                output_path=res.get("output_path", ""),
            )
        return ReportResponse(
            success=False,
            message=res.get("msg", "报告生成失败"),
            code=500,
        )
    except Exception as e:
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