from typing import Optional, Dict, Any
from pydantic import BaseModel


class ResponseBase(BaseModel):
    success: bool = True
    message: str = "Success"
    code: int = 200


class RenderResponse(ResponseBase):
    output_path: str = ""


class CaptionResponse(ResponseBase):
    """generate_caption 返回的影像描述"""
    findings: str = ""
    diagnosis: str = ""


class ReportResponse(ResponseBase):
    """generate_report 返回的完整报告结果"""
    findings: str = ""
    diagnosis: str = ""
    json_data: Optional[Dict[str, Any]] = None
    output_path: str = ""
