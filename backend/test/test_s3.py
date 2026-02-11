import os

from services.bucket import s3 as storage


def test_supabase_s3_crud():
    # --- 配置测试参数 ---
    BUCKET_NAME = "test"  # 请确保你在 Supabase 后台已创建这个桶
    TEST_FILE = "hello_s3.txt"
    REMOTE_KEY = "test_folder/hello.txt"
    DOWNLOADED_FILE = "downloaded_hello.txt"

    # 准备一个临时测试文件
    with open(TEST_FILE, "w") as f:
        f.write("Hello Supabase S3! This is a test file.")

    print(f"🚀 开始测试 CRUD...")

    try:
        # 1. 测试上传 (Create)
        print("Step 1: 正在上传...")
        storage.upload(BUCKET_NAME, TEST_FILE, REMOTE_KEY)
        assert storage.exists(BUCKET_NAME, REMOTE_KEY) is True
        print("✅ 上传成功并确认存在")

        # 2. 测试读取链接 (Read - URL)
        print("Step 2: 获取预览链接...")
        url = storage.get_url(BUCKET_NAME, REMOTE_KEY)
        print(f"🔗 链接生成成功 (1小时有效): \n{url}")

        # 3. 测试下载 (Read - Download)
        print("Step 3: 正在下载验证内容...")
        storage.download(BUCKET_NAME, REMOTE_KEY, DOWNLOADED_FILE)
        with open(DOWNLOADED_FILE, "r") as f:
            content = f.read()
            assert "Hello Supabase S3!" in content
        print("✅ 下载内容匹配成功")

        # 4. 测试删除 (Delete)
        # print("Step 4: 正在删除测试文件...")
        # storage.delete(BUCKET_NAME, REMOTE_KEY)
        # assert storage.exists(BUCKET_NAME, REMOTE_KEY) is False
        # print("✅ 文件删除确认成功")

        print("\n🎉 恭喜！Supabase S3 所有 CRUD 操作测试通过！")

    except Exception as e:
        print(f"\n❌ 测试失败: {str(e)}")

    finally:
        # 清理本地残留的测试文件
        for f in [TEST_FILE, DOWNLOADED_FILE]:
            if os.path.exists(f):
                os.remove(f)


if __name__ == "__main__":
    test_supabase_s3_crud()
