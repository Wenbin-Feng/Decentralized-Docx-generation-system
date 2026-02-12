from config import settings
from storage import get_storage
from fastapi import UploadFile
import asyncio

async def test_s3_upload():
    settings.STORAGE_TYPE = "s3"
    storage = await get_storage() 
    file_url = "/Users/wenbinfeng/Desktop/others/毕业设计/demo/backend/data/output/勤工助学_generation.docx"

    with open(file_url, "rb") as f:
        file = UploadFile(file=f)
        await storage.upload(file, "output/generation.docx")

if __name__ == "__main__":
    
    asyncio.run(test_s3_upload())