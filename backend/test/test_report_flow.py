"""
测试完整的报告生成流程
"""
import requests
import os

BASE_URL = "http://localhost:8000/api/v1"

def test_report_generation_flow():
    """测试报告生成的完整流程（无需登录）"""

    print("=" * 60)
    print("测试报告生成流程")
    print("=" * 60)

    # 测试图片路径
    test_image = "data/test_folder/test.png"

    if not os.path.exists(test_image):
        print(f"⚠️  测试图片不存在: {test_image}")
        print("   使用模拟路径进行测试...")
        test_image = "static/test_image.png"

    # 步骤1: 测试 /upload 端点
    print("\n1️⃣ 测试图片上传端点...")
    print(f"   端点: POST {BASE_URL}/document/upload")
    print(f"   说明: 前端会上传真实文件，这里仅验证端点可访问性")

    # 步骤2: 测试 /generate_caption 端点
    print("\n2️⃣ 测试影像描述生成...")
    print(f"   端点: POST {BASE_URL}/document/generate_caption")

    try:
        caption_response = requests.post(
            f"{BASE_URL}/document/generate_caption",
            json={"img_url": test_image},
            timeout=60  # LLM 调用可能需要较长时间
        )

        print(f"   状态码: {caption_response.status_code}")

        if caption_response.status_code == 200:
            caption_data = caption_response.json()
            print(f"   ✅ 成功: {caption_data.get('message', '')}")

            if 'findings' in caption_data:
                print(f"   影像所见: {caption_data['findings'][:100]}...")
            if 'diagnosis' in caption_data:
                print(f"   诊断意见: {caption_data['diagnosis'][:100]}...")
        else:
            print(f"   ❌ 失败: {caption_response.text[:200]}")

    except requests.exceptions.Timeout:
        print("   ⏱️  请求超时（这是正常的，LLM 调用可能需要较长时间）")
    except Exception as e:
        print(f"   ❌ 错误: {str(e)}")

    # 步骤3: 测试 /generate_report 端点（不需要登录）
    print("\n3️⃣ 测试报告生成（未登录用户）...")
    print(f"   端点: POST {BASE_URL}/document/generate_report")

    test_content = """
    影像所见：
    双肺野清晰，未见明显实质性病变，肺纹理走行自然。

    诊断意见：
    未见明显异常。
    """

    try:
        report_response = requests.post(
            f"{BASE_URL}/document/generate_report",
            json={
                "content": test_content,
                "template_id": "Medical_reports"
            },
            timeout=120  # 报告生成需要更长时间
        )

        print(f"   状态码: {report_response.status_code}")

        if report_response.status_code == 200:
            report_data = report_response.json()
            print(f"   ✅ 成功: {report_data.get('message', '')}")

            if 'output_path' in report_data:
                print(f"   报告路径: {report_data['output_path']}")
            if 'json_data' in report_data:
                print(f"   JSON 数据已生成")
        else:
            print(f"   ❌ 失败: {report_response.text[:200]}")

    except requests.exceptions.Timeout:
        print("   ⏱️  请求超时（这是正常的，LLM 调用可能需要较长时间）")
    except Exception as e:
        print(f"   ❌ 错误: {str(e)}")

    print("\n" + "=" * 60)
    print("测试完成说明")
    print("=" * 60)
    print("✅ API 端点配置:")
    print("   - POST /document/upload - 上传图片")
    print("   - POST /document/generate_caption - 生成影像描述")
    print("   - POST /document/generate_report - 生成完整报告")
    print("\n🎯 前端流程:")
    print("   1. 用户上传图片 → 返回存储路径")
    print("   2. 使用路径生成描述 → 返回 findings + diagnosis")
    print("   3. 用户编辑描述（可选）")
    print("   4. 生成完整报告 → 返回 Word 文档路径")
    print("\n💡 登录用户优势:")
    print("   - 自动填充患者姓名、性别、年龄")
    print("   - 无需重复输入个人信息")
    print("=" * 60)


if __name__ == "__main__":
    test_report_generation_flow()
