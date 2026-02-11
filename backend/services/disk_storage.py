# 本地文件存储服务


class DiskStorage:

    @staticmethod
    def read_file(file_path: str) -> str:
        with open(file_path, "r") as f:
            return f.read()

    @staticmethod
    def write_file(file_path: str, content: str):
        with open(file_path, "w") as f:
            f.write(content)
