from fastapi import FastAPI
from contextlib import asynccontextmanager
from routers.template import router as template_router
from services import get_RenderService

@asynccontextmanager
async def lifespan(app: FastAPI):
    service_instance = get_RenderService()
    app.state.render_service = service_instance
    yield

    await service_instance.close()

app = FastAPI(
    title="docx render backend",
    lifespan=lifespan
)

app.include_router(template_router, prefix="/api/v1")


