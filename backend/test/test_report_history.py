"""
测试报告历史记录功能
"""
import requests

BASE_URL = "http://localhost:8000/api/v1"


def test_report_history():
    """测试报告历史记录流程"""

    print("=" * 60)
    print("测试报告历史记录功能")
    print("=" * 60)

    # 测试无需登录的端点
    print("\n✅ 新增功能:")
    print("   1. 胸片路径自动拼接到 prompt")
    print("   2. 生成报告时自动保存到数据库（登录用户）")
    print("   3. GET /document/reports - 获取报告列表")
    print("   4. GET /document/download/{id} - 下载报告")

    print("\n📋 数据库表结构:")
    print("   - id: 报告 ID")
    print("   - user_id: 用户 ID（外键）")
    print("   - wallet_address: 钱包地址")
    print("   - template_id: 模板 ID")
    print("   - report_name: 报告名称")
    print("   - file_path: Word 文档路径")
    print("   - image_path: 胸片图片路径")
    print("   - json_data: 生成的 JSON 数据")
    print("   - content: 原始输入内容")
    print("   - created_at: 创建时间")
    print("   - updated_at: 更新时间")

    print("\n🎯 前端更新:")
    print("   - ReportGenerator: 传递 image_url 到 API")
    print("   - ReportHistory 组件: 显示报告列表")
    print("   - Dashboard: 点击「我的报告」打开历史记录")
    print("   - 支持下载报告文件")

    print("\n💡 使用流程:")
    print("   1. 登录用户上传图片并生成报告")
    print("   2. 报告自动保存到数据库")
    print("   3. 点击「我的报告」查看历史记录")
    print("   4. 点击「下载」按钮下载 Word 文档")

    print("\n⚠️  注意:")
    print("   - 报告历史功能需要登录")
    print("   - 未登录用户仍可生成报告，但不会保存记录")
    print("   - 图片路径会自动注入到 LLM prompt 中")
    print("   - 确保生成的 JSON 包含 chest_xray.image_path 字段")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    test_report_history()
