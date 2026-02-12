import asyncio
from fastapi import APIRouter, Depends

from services import get_RenderService
from models import RenderRequest, RenderResponse

router = APIRouter(prefix = "/ppt")


@router.post("/render",response_model=RenderResponse)
async def render_ppt(
    request_data: RenderRequest,
    RenderService = Depends(get_RenderService)
):
    try:
        res = await RenderService.fill_template(request_data.content, request_data.template_id)
        if res.get("status") == "success":
            return RenderResponse(success=True, message=res.get("msg","Document generated successfully"), code=200, output_path=res.get("output_path"))
        return RenderResponse(success=False, message=res.get("msg","Document generated failed"), code=500)
    except Exception as e:
        return RenderResponse(success=False, message=str(e), code=500)