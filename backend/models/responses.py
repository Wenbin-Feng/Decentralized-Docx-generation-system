from pydantic import BaseModel

class ResponseBase(BaseModel):
    success: bool = True
    message: str = "Success"
    code: int = 200

class RenderResponse(ResponseBase):
    output_path: str = ""   