"""
测试真实文件上传
"""
import requests
from pathlib import Path

BASE_URL = "http://localhost:8000/api/v1"


def test_upload():
    """测试文件上传"""
    print("=" * 60)
    print("测试文件上传功能")
    print("=" * 60)

    # 查找测试图片
    test_images = [
        "data/test_folder/test.png",
        "data/static/test.png",
    ]

    test_file = None
    for img in test_images:
        if Path(img).exists():
            test_file = img
            break

    if not test_file:
        print("❌ 找不到测试图片文件")
        print("请确保以下路径之一存在:")
        for img in test_images:
            print(f"   - {img}")
        return

    print(f"\n📁 使用测试文件: {test_file}")
    print(f"   文件大小: {Path(test_file).stat().st_size} 字节")

    # 上传文件
    print(f"\n🚀 上传到: POST {BASE_URL}/document/upload")
    try:
        with open(test_file, "rb") as f:
            files = {"file": (Path(test_file).name, f, "image/png")}
            response = requests.post(
                f"{BASE_URL}/document/upload",
                files=files,
                timeout=30
            )

        print(f"   状态码: {response.status_code}")
        data = response.json()

        if data.get("success"):
            print(f"   ✅ 上传成功")
            print(f"   存储路径: {data.get('message')}")

            # 检查文件是否存在
            uploaded_path = Path(data.get('message'))
            if uploaded_path.exists():
                size = uploaded_path.stat().st_size
                print(f"   文件大小: {size} 字节")
                if size > 0:
                    print(f"   ✅ 文件内容正常")
                else:
                    print(f"   ❌ 文件为空！")
            else:
                print(f"   ❌ 文件不存在: {uploaded_path}")
        else:
            print(f"   ❌ 上传失败: {data.get('message')}")

    except Exception as e:
        print(f"   ❌ 错误: {str(e)}")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    test_upload()
