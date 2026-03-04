import ollama
import asyncio
from concurrent.futures import ThreadPoolExecutor
from functools import partial 

class ReportGenerator:
    def __init__(self):
        self.prompt = "Describe this image for a professional report in English. Be factual and concise."
        # M3 Air 建议设为 1，保护内存
        self.executor = ThreadPoolExecutor(max_workers=1)

    async def generate(self, image_path: str):
        try:
            
            with open(image_path, 'rb') as f:
                img_data = f.read()

            loop = asyncio.get_running_loop()

            res = await loop.run_in_executor(
                self.executor,
                partial(ollama.generate, model='moondream', prompt=self.prompt, images=[img_data])
            )
            
            return res['response'] 
        except Exception as e:
            print(f"Error detail: {e}")
            raise e