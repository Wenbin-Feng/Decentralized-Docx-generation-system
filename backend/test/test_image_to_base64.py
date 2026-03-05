"""
测试图片转 base64 功能
"""
import asyncio
import sys
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.Genreports_service import GenreportsService
from storage import get_storage


async def test_image_conversion():
    """测试图片转换功能"""
    print("=" * 60)
    print("测试图片路径解析和 Base64 转换")
    print("=" * 60)

    storage = await get_storage()
    service = GenreportsService(storage)

    # 测试场景1: 相对路径（上传的图片）
    test_cases = [
        "static/正胸.jpg",
        "data/test_folder/test.png",
    ]

    for img_path in test_cases:
        print(f"\n📁 测试路径: {img_path}")
        try:
            data_uri = await service._resolve_image(img_path)

            if data_uri.startswith("data:"):
                print(f"   ✅ 成功转换为 base64")
                print(f"   格式: {data_uri[:50]}...")
                print(f"   长度: {len(data_uri)} 字符")
            else:
                print(f"   ⚠️  返回的不是 base64: {data_uri[:100]}")
        except Exception as e:
            print(f"   ❌ 错误: {str(e)}")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    asyncio.run(test_image_conversion())
