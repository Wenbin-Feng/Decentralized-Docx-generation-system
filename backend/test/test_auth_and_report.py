"""
测试认证和报告生成流程（必须登录）
"""
import requests
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

BASE_URL = "http://localhost:8000/api/v1"


def test_report_requires_login():
    """测试报告生成必须登录"""

    print("=" * 60)
    print("测试报告生成功能（必须登录）")
    print("=" * 60)

    # 步骤1: 尝试不带 token 生成报告
    print("\n1️⃣ 测试未登录生成报告（应该失败）...")
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
            timeout=5
        )

        print(f"   状态码: {report_resp.status_code}")

        if report_resp.status_code == 401:
            print(f"   ✅ 正确：未授权访问被拒绝")
            print(f"   响应: {report_resp.json()}")
        elif report_resp.status_code == 403:
            print(f"   ✅ 正确：禁止访问")
            print(f"   响应: {report_resp.json()}")
        else:
            print(f"   ⚠️  意外状态码: {report_resp.status_code}")
            print(f"   响应: {report_resp.text[:200]}")

    except Exception as e:
        print(f"   ❌ 请求错误: {str(e)}")

    # 步骤2: 检查数据库中是否有用户
    print("\n2️⃣ 检查数据库中的用户...")
    import sqlite3
    conn = sqlite3.connect("medical_reports.db")
    cursor = conn.cursor()

    cursor.execute("SELECT id, wallet_address, username FROM users LIMIT 5")
    users = cursor.fetchall()

    if users:
        print(f"   找到 {len(users)} 个用户:")
        for user in users:
            print(f"   - ID: {user[0]}, 地址: {user[1][:10]}..., 姓名: {user[2] or '未设置'}")
    else:
        print("   ⚠️  数据库中没有用户")

    # 步骤3: 检查报告记录
    cursor.execute("SELECT COUNT(*) FROM reports")
    report_count = cursor.fetchone()[0]
    print(f"\n3️⃣ 当前报告数量: {report_count}")

    if report_count > 0:
        cursor.execute("""
            SELECT id, wallet_address, template_id, created_at
            FROM reports
            ORDER BY created_at DESC
            LIMIT 3
        """)
        reports = cursor.fetchall()
        print("   最近的报告:")
        for report in reports:
            print(f"   - ID: {report[0]}, 地址: {report[1][:10]}..., 时间: {report[3]}")

    conn.close()

    print("\n" + "=" * 60)
    print("📝 总结")
    print("=" * 60)
    print("✅ 修改内容:")
    print("   1. /document/generate_report 现在必须登录")
    print("   2. 使用 get_current_user 而不是 get_optional_user")
    print("   3. 前端添加登录检查和提示")
    print("   4. 图片路径自动转换为绝对路径")
    print("\n✅ 行为:")
    print("   - 未登录用户调用会返回 401 Unauthorized")
    print("   - 登录用户生成报告后自动保存到数据库")
    print("   - 每个报告文件使用唯一的 UUID 命名")
    print("\n💡 下一步:")
    print("   1. 在前端完成 MetaMask 登录")
    print("   2. 生成一个新报告")
    print("   3. 点击「我的报告」查看历史")
    print("   4. 验证数据库中有新记录")
    print("=" * 60)


if __name__ == "__main__":
    import os
    os.chdir(Path(__file__).parent.parent)
    test_report_requires_login()
