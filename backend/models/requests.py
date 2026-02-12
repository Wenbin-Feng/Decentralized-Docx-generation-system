from pydantic import BaseModel

class RenderRequest(BaseModel):
    content: str = ""
    template_id: str = ""