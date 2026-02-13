from abc import ABC, abstractmethod
from typing import List, Union
from fastapi import UploadFile
class StorageBase(ABC):
    @abstractmethod
    async def upload(self, file: UploadFile, key: str):
        pass

    @abstractmethod
    async def write_file(self, key: str, content: Union[str, bytes]):
        pass

    @abstractmethod
    async def read(self, key: str) -> str:
        pass

    @abstractmethod
    async def delete(self, key: str):
        pass

    @abstractmethod
    async def exists(self, key: str) -> bool:
        pass

    @abstractmethod
    async def list(self) -> List[str]:
        pass

    @abstractmethod
    async def get_url(self, key: str) -> str:
        pass

    @abstractmethod
    async def close(self):
        pass
    