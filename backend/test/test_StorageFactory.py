from storage import get_storage,StorageFactory
from config.settings import settings

async def test_storage(storage):
    await storage.upload("test_folder/test1.txt", "Casey fat is stupid!!")
    print(await storage.read("test_folder/test1.txt"))
    print(await storage.exists("test_folder/test1.txt"))
    print(await storage.list())
    print(await storage.get_url("test_folder/test1.txt"))
    #await storage.delete("test_folder/test1.txt")

async def test_storage_factory():
    settings.STORAGE_TYPE = "s3"
    s3_storage = await get_storage()
    print(s3_storage)
    StorageFactory._instance = None
    await test_storage(s3_storage)

    settings.STORAGE_TYPE = "local"
    local_storage = await get_storage()
    print(local_storage)
    await test_storage(local_storage)
    
    

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_storage_factory())