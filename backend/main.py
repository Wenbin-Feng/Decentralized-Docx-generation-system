from fastapi import FastAPI
from contextlib import asynccontextmanager
from routers.template import router as document_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="Medical Report Generation Backend",
    lifespan=lifespan,
)

app.include_router(document_router, prefix="/api/v1")
