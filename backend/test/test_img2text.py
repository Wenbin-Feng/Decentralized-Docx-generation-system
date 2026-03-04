from MRG_model import ReportGenerator
import asyncio

async def test_img2text():
    rg = ReportGenerator()
    res = await rg.generate("/Users/wenbinfeng/Desktop/others/pic/微信图片_20251110150602_1_8.jpg")
    print(res)

if __name__ == "__main__":
    asyncio.run(test_img2text())