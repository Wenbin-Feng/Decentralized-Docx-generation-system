import boto3
from config.settings import settings


class SupabaseStorage:
    def __init__(self):
        print("--- 正在初始化 S3 客户端  ---")
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT,
            aws_access_key_id=settings.S3_ACCESS_KEY_ID,
            aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
            region_name=settings.S3_REGION,
        )

    # 1. Create (上传)
    def upload(self, bucket: str, local_path: str, remote_key: str):
        self.client.upload_file(local_path, bucket, remote_key)
        return True

    # 2. Read (获取预览链接或直接下载)
    def get_url(self, bucket: str, remote_key: str):
        return self.client.generate_presigned_url(
            "get_object", Params={"Bucket": bucket, "Key": remote_key}, ExpiresIn=3600
        )

    def download(self, bucket: str, remote_key: str, local_path: str):
        self.client.download_file(bucket, remote_key, local_path)

    # 3. Update (其实 S3 的更新就是覆盖上传，只需再次调用 upload)

    # 4. Delete (删除)
    def delete(self, bucket: str, remote_key: str):
        self.client.delete_object(Bucket=bucket, Key=remote_key)

    # 5. List (查询/列表)
    def exists(self, bucket: str, remote_key: str):
        try:
            self.client.head_object(Bucket=bucket, Key=remote_key)
            return True
        except:
            return False


s3 = SupabaseStorage()
