from fastapi import FastAPI
from routers.template import router as template_router

app = FastAPI(
    title="docx render backend"
)

app.include_router(template_router, prefix="/api/v1")


