from docxtpl import DocxTemplate
from config.settings import settings
from pathlib import Path
class WordHandler:
    _local_storage_path = settings.LOCAL_STORAGE_PATH
   
    def __init__(self):
        raise RuntimeError("直接使用，不用初始化")

    @classmethod
    def fill_template(cls, template_path, data, output_path) -> str:
        """
        填充word模版

        Args:
            template_path: word模版文件路径
            data: json数据
            output_path: 输出路径
        """
        doc = DocxTemplate(cls._local_storage_path / template_path)
        doc.render(data)
        output_path = cls._local_storage_path / output_path
        output_path.parent.mkdir(parents=True, exist_ok=True)
        doc.save(output_path)
        return str(output_path)

# if __name__ == "__main__":
#     try:
#         w = WordHandler()
#     except Exception as e:
#         print(e)
