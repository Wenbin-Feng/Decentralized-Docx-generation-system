import os
import aiofiles
from .base import StorageBase
from typing import List, override
from config.settings import settings
from fastapi import UploadFile
class DiskStorage(StorageBase):
    def __init__(self, base_path: str = "./storage_data"):
        self.base_path = os.path.abspath(str(base_path))
        os.makedirs(self.base_path, exist_ok=True)
    
    def _get_full_path(self, key: str) -> str:
        return os.path.join(self.base_path, str(key).lstrip("/"))
        
    @override
    async def upload(self, file: UploadFile, key: str):
        full_path = self._get_full_path(key)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        async with aiofiles.open(full_path, "wb") as f:
            await f.write(file.read())

    @override
    async def write_file(self, key: str, content: str):
        full_path = self._get_full_path(key)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        async with aiofiles.open(full_path, "w", encoding="utf-8") as f:
            await f.write(content)

    @override
    async def delete(self, key: str):
        full_path = self._get_full_path(key)
        if os.path.exists(full_path):
            os.remove(full_path)    

    @override
    async def read(self, key: str) -> str:
        full_path = self._get_full_path(key)
        async with aiofiles.open(full_path, "r", encoding="utf-8") as f:
            return await f.read()

    @override
    async def exists(self, key: str) -> bool:
        return os.path.exists(self._get_full_path(key))

    @override
    async def get_url(self, key: str) -> str:
        return self._get_full_path(key)

    @override
    async def list(self) -> List[str]:
        
        target_dir = self._get_full_path("templates")
        if os.path.exists(target_dir):
            return os.listdir(target_dir)
        return []

_local_instance = None

def get_local_storage() -> DiskStorage:
    global _local_instance
    if _local_instance is None:
        path = getattr(settings, "LOCAL_STORAGE_PATH", "./data")
        _local_instance = DiskStorage(base_path=str(path))
    return _local_instance