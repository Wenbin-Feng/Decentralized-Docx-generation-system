#!/usr/bin/env python3
"""
快速检查系统状态
"""
import sqlite3
import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))


def check_database():
    """检查数据库状态"""
    print("=" * 60)
    print("📊 数据库状态检查")
    print("=" * 60)

    db_path = "medical_reports.db"
    if not os.path.exists(db_path):
        print("❌ 数据库文件不存在")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 检查 users 表
    cursor.execute("SELECT COUNT(*) FROM users")
    user_count = cursor.fetchone()[0]
    print(f"\n👥 用户数量: {user_count}")

    if user_count > 0:
        cursor.execute("SELECT id, wallet_address, username, created_at FROM users LIMIT 5")
        users = cursor.fetchall()
        print("\n最近的用户:")
        for user in users:
            print(f"   ID: {user[0]}, 地址: {user[1][:10]}..., 姓名: {user[2] or '未设置'}")

    # 检查 reports 表
    cursor.execute("SELECT COUNT(*) FROM reports")
    report_count = cursor.fetchone()[0]
    print(f"\n📋 报告数量: {report_count}")

    if report_count > 0:
        cursor.execute("""
            SELECT id, wallet_address, template_id, file_path, created_at
            FROM reports
            ORDER BY created_at DESC
            LIMIT 5
        """)
        reports = cursor.fetchall()
        print("\n最近的报告:")
        for report in reports:
            filename = Path(report[3]).name
            print(f"   ID: {report[0]}, 地址: {report[1][:10]}..., 文件: {filename}")
    else:
        print("\n   ⚠️  数据库中没有报告记录")
        print("   可能原因:")
        print("   1. 用户没有登录")
        print("   2. 报告生成失败")
        print("   3. 需要在前端完成 MetaMask 登录后再生成报告")

    conn.close()


def check_files():
    """检查生成的文件"""
    print("\n" + "=" * 60)
    print("📁 文件状态检查")
    print("=" * 60)

    output_dir = Path("data/output")
    if not output_dir.exists():
        print("❌ output 目录不存在")
        return

    # 查找所有 Medical_reports 文件
    files = list(output_dir.glob("Medical_reports*.docx"))

    if not files:
        print("\n   ⚠️  没有找到生成的报告文件")
        return

    print(f"\n📄 找到 {len(files)} 个报告文件:")

    # 按修改时间排序
    files.sort(key=lambda x: x.stat().st_mtime, reverse=True)

    for i, file in enumerate(files[:10]):  # 只显示最近的 10 个
        stat = file.stat()
        size_kb = stat.st_size / 1024
        from datetime import datetime
        mtime = datetime.fromtimestamp(stat.st_mtime)

        # 检查是否使用 UUID 命名
        name = file.name
        has_uuid = len(name.split('_')) >= 3

        status = "✅" if has_uuid else "⚠️ "
        print(f"\n   {i+1}. {status} {name}")
        print(f"      大小: {size_kb:.1f} KB")
        print(f"      时间: {mtime.strftime('%Y-%m-%d %H:%M:%S')}")

        if not has_uuid:
            print(f"      提示: 旧格式文件，建议删除")


def check_services():
    """检查服务状态"""
    print("\n" + "=" * 60)
    print("🚀 服务状态检查")
    print("=" * 60)

    import requests

    # 检查后端
    try:
        resp = requests.get("http://localhost:8000/docs", timeout=2)
        if resp.status_code == 200:
            print("\n✅ 后端运行正常 (http://localhost:8000)")
        else:
            print(f"\n⚠️  后端响应异常: {resp.status_code}")
    except:
        print("\n❌ 后端未运行")
        print("   请运行: uvicorn main:app --reload --host 0.0.0.0 --port 8000")

    # 检查前端
    try:
        resp = requests.get("http://localhost:5173", timeout=2)
        if resp.status_code == 200:
            print("✅ 前端运行正常 (http://localhost:5173)")
        else:
            print(f"⚠️  前端响应异常: {resp.status_code}")
    except:
        print("❌ 前端未运行")
        print("   请运行: npm run dev")


if __name__ == "__main__":
    os.chdir(Path(__file__).parent.parent)  # 切换到 backend 目录

    check_services()
    check_database()
    check_files()

    print("\n" + "=" * 60)
    print("💡 建议")
    print("=" * 60)
    print("\n如果报告历史为空：")
    print("1. 确保在前端完成 MetaMask 登录")
    print("2. 刷新页面，重新登录")
    print("3. 生成新报告")
    print("4. 点击「我的报告」查看历史")
    print("\n如果文件没有 UUID：")
    print("1. 删除旧文件: rm data/output/Medical_reports_generation.docx")
    print("2. 重启后端服务")
    print("3. 生成新报告")
    print("=" * 60 + "\n")
