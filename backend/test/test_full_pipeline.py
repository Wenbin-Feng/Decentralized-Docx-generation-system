"""
全流程集成测试：胸片 → 影像描述 → 结构化 JSON → Word 渲染
模拟前端三步调用：upload → generate_caption → generate_report

使用本地存储，避免 S3 服务不可用时测试失败
"""
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.Genreports_service import GenreportsService
from services.render_service import RenderService
from storage.local_storage import get_local_storage

# ── 配置 ──────────────────────────────────────────────────────
CHEST_XRAY_PATH = str(
    Path(__file__).resolve().parent.parent / "data" / "static" / "正胸.jpg"
)
TEMPLATE_ID = "Medical_reports"


def print_section(title: str):
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}")


def print_json(data: dict):
    print(json.dumps(data, ensure_ascii=False, indent=2))


async def test_full_pipeline():
    # ── 0. 准备 ──────────────────────────────────────────────
    print_section("全流程集成测试 🚀")

    img_path = Path(CHEST_XRAY_PATH)
    if not img_path.exists():
        print(f"❌ 测试图片不存在: {CHEST_XRAY_PATH}")
        return False
    print(f"📷 测试图片: {img_path.name}  ({img_path.stat().st_size / 1024:.1f} KB)")

    # 强制使用本地存储，避免 S3 问题
    storage = get_local_storage()
    gen_service = GenreportsService(storage)
    render_service = RenderService(storage)

    # ── Step 1: 模拟上传（图片已在 static 下，跳过上传） ───────
    print_section("Step 1: 上传图片 (跳过，使用本地文件)")
    image_url = CHEST_XRAY_PATH
    print(f"✅ 图片路径: {image_url}")

    # ── Step 2: 生成影像描述 (generate_caption) ───────────────
    print_section("Step 2: 生成影像描述 (Vision LLM)")
    print("⏳ 正在分析胸片... (预计 10-30 秒)")

    caption_result = await gen_service.generate_from_img(image_url)

    if caption_result["status"] != "success":
        print(f"❌ 影像描述生成失败: {caption_result['raw_response']}")
        return False

    findings = caption_result["findings"]
    diagnosis = caption_result["diagnosis"]

    print(f"✅ 生成成功!")
    print(f"\n📋 图象所见 (findings):")
    print(f"   {findings}")
    print(f"\n🩺 诊断意见 (diagnosis):")
    print(f"   {diagnosis}")

    # ── Step 3: 生成结构化 JSON + 渲染 Word (generate_report) ──
    print_section("Step 3: 生成结构化 JSON + 渲染 Word")

    # 拼接 content，传给 RenderService
    content = f"""
影像描述如下：
图象所见：{findings}
诊断意见：{diagnosis}
胸片图片路径：{image_url}
"""
    print(f"📝 传入 RenderService 的内容:")
    print(f"   {content.strip()}")
    print(f"\n⏳ 正在生成 JSON 并渲染 Word... (预计 10-20 秒)")

    render_result = await render_service.fill_template(content, TEMPLATE_ID)

    if render_result.get("status") != "success":
        print(f"❌ 报告生成失败: {render_result.get('msg', '未知错误')}")
        return False

    json_data = render_result.get("json_data", {})
    output_path = render_result.get("output_path", "")

    print(f"✅ 报告生成成功!")
    print(f"\n📦 生成的 JSON 数据:")
    print_json(json_data)

    print(f"\n📄 Word 文件路径: {output_path}")

    # ── 验证 JSON 字段完整性 ────────────────────────────────
    print_section("Step 4: 验证 JSON 字段完整性")

    required_fields = [
        "patient_info",
        "examination_date",
        "examination_site",
        "findings",
        "diagnosis",
        "chest_xray",
        "report_date",
        "doctor_name",
    ]

    all_pass = True
    for field in required_fields:
        if field in json_data:
            value = json_data[field]
            if isinstance(value, dict):
                print(f"  ✅ {field}: {json.dumps(value, ensure_ascii=False)}")
            else:
                display = str(value)[:60] + "..." if len(str(value)) > 60 else str(value)
                print(f"  ✅ {field}: {display}")
        else:
            print(f"  ❌ {field}: 缺失!")
            all_pass = False

    # 验证 patient_info 子字段
    if "patient_info" in json_data and isinstance(json_data["patient_info"], dict):
        pi = json_data["patient_info"]
        for sub_field in ["name", "gender", "age", "xray_id"]:
            if sub_field in pi:
                print(f"    ✅ patient_info.{sub_field}: {pi[sub_field]}")
            else:
                print(f"    ❌ patient_info.{sub_field}: 缺失!")
                all_pass = False

    # 验证 Word 文件是否存在
    word_exists = Path(output_path).exists() if output_path else False

    # ── 结果汇总 ──────────────────────────────────────────────
    print_section("测试结果")
    print(f"   影像描述:   ✅")
    print(f"   JSON 生成:  ✅")
    print(f"   字段完整性: {'✅' if all_pass else '⚠️  部分字段缺失'}")
    print(f"   Word 渲染:  {'✅' if word_exists else '⚠️  文件未找到'}")
    if word_exists:
        word_size = Path(output_path).stat().st_size / 1024
        print(f"   输出文件:   {output_path} ({word_size:.1f} KB)")

    if all_pass and word_exists:
        print("\n🎉 全流程测试通过！")
    else:
        print("\n⚠️  流程完成但有部分检查未通过")

    return all_pass and word_exists


if __name__ == "__main__":
    success = asyncio.run(test_full_pipeline())
    sys.exit(0 if success else 1)
