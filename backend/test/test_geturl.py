from storage import get_storage
from config import settings
import asyncio

async def test_get_url():
    settings.STORAGE_TYPE = "s3"
    key = "output/generation.docx"
    storage = await get_storage()
    url = await storage.get_url(key)
    print(url)

if __name__ == "__main__":
    asyncio.run(test_get_url())
