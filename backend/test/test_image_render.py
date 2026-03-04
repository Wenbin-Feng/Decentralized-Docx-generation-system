"""
测试图片渲染功能
直接读取 Medical_reports.json 并渲染成 Word 文档，验证图片是否正确插入
"""
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.render_service import RenderService
from storage.local_storage import get_local_storage

# ── 配置 ──────────────────────────────────────────────────────
JSON_PATH = Path(__file__).resolve().parent.parent / "data" / "temp" / "Medical_reports.json"
TEMPLATE_ID = "Medical_reports"


def print_section(title: str):
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}")


def print_json(data: dict):
    print(json.dumps(data, ensure_ascii=False, indent=2))


async def test_image_render():
    """测试图片渲染功能"""
    print_section("图片渲染测试 🖼️")

    # ── Step 1: 读取测试 JSON ─────────────────────────────────
    print_section("Step 1: 读取测试 JSON")

    if not JSON_PATH.exists():
        print(f"❌ JSON 文件不存在: {JSON_PATH}")
        return False

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        json_data = json.load(f)

    print(f"✅ JSON 文件读取成功")
    print(f"\n📦 JSON 数据:")
    print_json(json_data)

    # ── Step 2: 验证图片字段 ──────────────────────────────────
    print_section("Step 2: 验证图片字段")

    if "chest_xray" not in json_data:
        print("❌ JSON 中缺少 chest_xray 字段")
        return False

    chest_xray = json_data["chest_xray"]
    print(f"📋 chest_xray 字段: {json.dumps(chest_xray, ensure_ascii=False, indent=2)}")

    # 检查是否有 type 和 image_path
    if "type" not in chest_xray or chest_xray["type"] != "image":
        print(f"⚠️  警告: chest_xray.type != 'image'，当前值: {chest_xray.get('type')}")
    else:
        print(f"✅ chest_xray.type = 'image'")

    if "image_path" not in chest_xray:
        print("❌ chest_xray 中缺少 image_path")
        return False

    image_path = Path(chest_xray["image_path"])
    print(f"📷 图片路径: {image_path}")

    if not image_path.exists():
        print(f"❌ 图片文件不存在: {image_path}")
        return False

    print(f"✅ 图片文件存在 ({image_path.stat().st_size / 1024:.1f} KB)")

    # ── Step 3: 初始化 RenderService ──────────────────────────
    print_section("Step 3: 初始化 RenderService")

    storage = get_local_storage()
    render_service = RenderService(storage)
    print("✅ RenderService 初始化成功")

    # ── Step 4: 渲染 Word 文档 ────────────────────────────────
    print_section("Step 4: 渲染 Word 文档")
    print("⏳ 正在渲染...")

    try:
        output_path = await render_service.render(json_data, TEMPLATE_ID)
        print(f"✅ 渲染成功!")
        print(f"📄 输出路径: {output_path}")
    except Exception as e:
        print(f"❌ 渲染失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

    # ── Step 5: 验证输出文件 ──────────────────────────────────
    print_section("Step 5: 验证输出文件")

    output_file = Path(output_path)

    if not output_file.exists():
        print(f"❌ 输出文件不存在: {output_path}")
        return False

    file_size = output_file.stat().st_size
    print(f"✅ 文件存在: {output_file.name}")
    print(f"📊 文件大小: {file_size / 1024:.1f} KB")

    # Word 文档包含图片时，文件会比较大（至少几十KB）
    # 如果文件太小，可能图片没有插入成功
    if file_size < 20 * 1024:  # 小于 20KB
        print(f"⚠️  警告: 文件大小异常小，图片可能未插入成功")
        print(f"   期望: > 20KB，实际: {file_size / 1024:.1f} KB")
    else:
        print(f"✅ 文件大小正常，图片可能已成功插入")

    # ── Step 6: 检查 Word 文档内容（使用 python-docx） ────────
    print_section("Step 6: 检查 Word 文档内容")

    try:
        from docx import Document

        doc = Document(output_path)

        # 统计段落和图片
        paragraph_count = len(doc.paragraphs)

        # 统计图片（检查所有关系中的图片）
        image_count = 0
        for rel in doc.part.rels.values():
            if "image" in rel.target_ref:
                image_count += 1

        print(f"📝 段落数: {paragraph_count}")
        print(f"🖼️  图片数: {image_count}")

        if image_count == 0:
            print(f"❌ Word 文档中没有图片！")
            print(f"   这说明图片渲染功能有问题")
            return False
        else:
            print(f"✅ Word 文档中包含 {image_count} 张图片")

    except Exception as e:
        print(f"⚠️  无法检查 Word 文档内容: {str(e)}")

    # ── 结果汇总 ──────────────────────────────────────────────
    print_section("测试结果")
    print(f"   JSON 读取:    ✅")
    print(f"   图片字段:    ✅")
    print(f"   图片文件:    ✅")
    print(f"   Word 渲染:    ✅")
    print(f"   文件验证:    ✅")
    print(f"   图片插入:    {'✅' if image_count > 0 else '❌'}")

    if image_count > 0:
        print("\n🎉 图片渲染测试通过！")
        print(f"📂 请打开文件验证: {output_path}")
        return True
    else:
        print("\n❌ 图片渲染测试失败！")
        print("   图片没有正确插入到 Word 文档中")
        return False


if __name__ == "__main__":
    success = asyncio.run(test_image_render())
    sys.exit(0 if success else 1)
