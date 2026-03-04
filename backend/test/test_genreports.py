"""
测试 GenreportsService —— 用项目自带的胸片生成影像报告
"""
import asyncio
import sys
import json
from pathlib import Path

# 确保项目根目录在 sys.path 中
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.Genreports_service import GenreportsService
from storage import get_storage

# 项目自带的胸片
CHEST_XRAY_PATH = str(
    Path(__file__).resolve().parent.parent / "data" / "static" / "正胸.jpg"
)


async def test_genreports():
    print("=" * 60)
    print("  胸片报告生成测试")
    print("=" * 60)

    # 1. 检查图片是否存在
    img_path = Path(CHEST_XRAY_PATH)
    if not img_path.exists():
        print(f"❌ 测试图片不存在: {CHEST_XRAY_PATH}")
        return
    print(f"✅ 测试图片: {CHEST_XRAY_PATH}  ({img_path.stat().st_size / 1024:.1f} KB)")

    # 2. 初始化服务
    print("\n🔧 初始化 GenreportsService ...")
    storage = await get_storage()
    service = GenreportsService(storage)
    print("✅ 服务初始化完成")

    # 3. 生成报告
    print("\n📸 正在分析胸片并生成报告（可能需要 10-30 秒）...")
    result = await service.generate_from_img(CHEST_XRAY_PATH)

    # 4. 输出结果
    print("\n" + "=" * 60)
    if result["status"] == "success":
        print("✅ 报告生成成功！")
        print("-" * 60)
        print(f"📋 图象所见 (findings):\n{result['findings']}")
        print("-" * 60)
        print(f"🩺 诊断意见 (diagnosis):\n{result['diagnosis']}")
        print("-" * 60)
        print(f"\n📦 完整 JSON 输出:")
        print(json.dumps({
            "findings": result["findings"],
            "diagnosis": result["diagnosis"],
        }, ensure_ascii=False, indent=2))
    else:
        print("❌ 报告生成失败！")
        print(f"错误信息: {result['raw_response']}")

    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_genreports())
