import asyncio
from typing import List, Optional, override, Union
from contextlib import asynccontextmanager
import aioboto3
from botocore.exceptions import ClientError
from config.settings import settings
from .base import StorageBase
from botocore.config import Config
from fastapi import UploadFile
from pathlib import Path
import aiofiles

class SupabaseStorage(StorageBase):
    _instance = None  # 用于存储全局单例
    _lock = asyncio.Lock()

    def __init__(self):
        self._session = None
        self._init_lock = asyncio.Lock() # 防止初始化并发
        self.bucket = settings.BUCKET_NAME
        self.endpoint = settings.S3_ENDPOINT
        self.local_data_path = settings.LOCAL_STORAGE_PATH

    async def _get_session(self):
        if self._session is None:
            async with self._init_lock:
                if self._session is None:
                    self._session = aioboto3.Session(
                        aws_access_key_id=settings.S3_ACCESS_KEY_ID,
                        aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
                        region_name=settings.S3_REGION,
                    )
        return self._session

    @asynccontextmanager
    async def _get_client(self):
        session = await self._get_session()
        s3_config = Config(
            signature_version="s3v4",
            retries={
                "max_attempts": 3,
                },
            connect_timeout=10,
            read_timeout=30,
        )
        async with session.client("s3", endpoint_url=self.endpoint, config=s3_config) as client:
            yield client

    @override
    async def upload(self, file: UploadFile, key: str):
        async with self._get_client() as client:
            await client.put_object(Bucket=self.bucket, Key=str(key), Body=file.file)

    @override
    async def write_file(self, key: str, content: Union[str, bytes]):
        async with self._get_client() as client:
            data = content.encode("utf-8") if isinstance(content, str) else content
            await client.put_object(Bucket=self.bucket, Key=str(key), Body=data)
        return True

    def get_local_fullpath(self, key: str) -> str:
        return self.local_data_path / key
            
    @override
    async def read(self, key: str) -> str:
        #优先读本地，本地没有再握手
        local_path = self.get_local_fullpath(key)
        if local_path.exists():
            async with aiofiles.open(local_path, "r", encoding="utf-8") as f:
                return await f.read()
        async with self._get_client() as client:
            resp = await client.get_object(Bucket=self.bucket, Key=str(key))
            data = await resp["Body"].read()
            return data.decode("utf-8")


    @override
    async def delete(self, key: str):
        async with self._get_client() as client:
            await client.delete_object(Bucket=self.bucket, Key=str(key))
        
    @override
    async def get_url(self, key: str) -> str:
        async with self._get_client() as client:
            return await client.generate_presigned_url("get_object", Params={"Bucket": self.bucket, "Key": str(key)}, ExpiresIn=3600)

    @override
    async def exists(self, key: str) -> bool:
        try:
            async with self._get_client() as client:
                await client.head_object(Bucket=self.bucket, Key=str(key))
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                return False
            raise  # 其他错误（如 403 权限问题）

    @override
    async def list(self) -> List[str]:
        async with self._get_client() as client:
            resp = await client.list_objects_v2(Bucket=self.bucket)
            # 安全取值，防止空桶报错
            return [obj["Key"] for obj in resp.get("Contents", [])]

    @override
    async def close(self):
        async with SupabaseStorage._lock:
            self._session = None
            SupabaseStorage._instance = None

async def get_supabase_storage() -> SupabaseStorage:
    if SupabaseStorage._instance is None:
        async with SupabaseStorage._lock:
            if SupabaseStorage._instance is None:
                SupabaseStorage._instance = SupabaseStorage()
    return SupabaseStorage._instance