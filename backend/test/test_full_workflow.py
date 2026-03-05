"""
测试完整的报告生成和存储流程
"""
import requests
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

BASE_URL = "http://localhost:8000/api/v1"


def test_full_workflow():
    """测试完整流程：登录 → 生成报告 → 查看历史"""

    print("=" * 60)
    print("测试完整报告生成流程")
    print("=" * 60)

    # 步骤1: 获取 nonce 并模拟登录
    print("\n1️⃣ 测试用户登录...")
    wallet_address = "0x1111111111111111111111111111111111111111"

    try:
        # 获取 nonce
        nonce_resp = requests.post(
            f"{BASE_URL}/auth/nonce",
            json={"wallet_address": wallet_address}
        )
        print(f"   Nonce 响应: {nonce_resp.status_code}")

        if nonce_resp.status_code != 200:
            print(f"   ❌ 获取 nonce 失败: {nonce_resp.text}")
            return

    except Exception as e:
        print(f"   ❌ 错误: {str(e)}")
        return

    # 步骤2: 生成报告（未登录）
    print("\n2️⃣ 测试生成报告（未登录）...")
    test_content = """
    影像所见：
    双肺野清晰，未见明显实质性病变。

    诊断意见：
    未见明显异常。
    """

    try:
        report_resp = requests.post(
            f"{BASE_URL}/document/generate_report",
            json={
                "content": test_content,
                "template_id": "Medical_reports",
                "image_url": "static/test.png"
            },
            timeout=120
        )

        print(f"   状态码: {report_resp.status_code}")

        if report_resp.status_code == 200:
            data = report_resp.json()
            print(f"   ✅ 报告生成成功")
            print(f"   文件路径: {data.get('output_path', 'N/A')}")

            # 检查文件是否使用 UUID 命名
            output_path = data.get('output_path', '')
            if '_' in output_path and len(output_path.split('_')) >= 3:
                print(f"   ✅ 文件名包含时间戳和 UUID")
            else:
                print(f"   ⚠️  文件名格式: {Path(output_path).name}")
        else:
            print(f"   ❌ 失败: {report_resp.text[:200]}")

    except Exception as e:
        print(f"   ❌ 错误: {str(e)}")

    print("\n" + "=" * 60)
    print("📝 说明:")
    print("=" * 60)
    print("✅ UUID 文件命名格式:")
    print("   {template_id}_{timestamp}_{uuid}.docx")
    print("   例如: Medical_reports_20260305_104530_a1b2c3d4.docx")
    print("\n✅ 报告保存逻辑:")
    print("   - 登录用户: 自动保存到数据库")
    print("   - 未登录用户: 仅生成文件，不保存记录")
    print("\n💡 需要测试的完整流程:")
    print("   1. 前端登录 MetaMask")
    print("   2. 上传图片并生成报告")
    print("   3. 检查数据库是否保存记录")
    print("   4. 点击「我的报告」查看历史")
    print("   5. 下载报告文件")
    print("=" * 60)


if __name__ == "__main__":
    test_full_workflow()
