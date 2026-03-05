from pydantic import BaseModel
from typing import Optional

class RenderRequest(BaseModel):
    content: str = ""
    template_id: str = ""
    image_url: Optional[str] = None  # 胸片图片路径

class GenRequest(BaseModel):
    img_url: str = ""
     