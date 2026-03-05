from .bucket import get_supabase_storage
from .local_storage import get_local_storage
from .base import StorageBase
from config.settings import settings
import asyncio

class StorageFactory:
    _lock = asyncio.Lock()
    _instance = None

    @classmethod
    async def get_storage(cls):
        if cls._instance is None:
            async with cls._lock:
                if cls._instance is None:
                    storage_type = getattr(settings, "STORAGE_TYPE", "local")
                    if storage_type.upper() == "S3":
                        cls._instance = await get_supabase_storage()
                    else:
                        cls._instance = get_local_storage()
        return cls._instance
                    
async def get_StorageFactory() -> StorageBase:
    return await StorageFactory.get_storage()   