from docxtpl import DocxTemplate, InlineImage
from docx.shared import Mm
from config.settings import settings
from pathlib import Path
import io
from storage import StorageBase
from logger import logger
from typing import Any

class WordHandler:
    _local_storage_path = settings.LOCAL_STORAGE_PATH

    def __init__(self):
        raise RuntimeError("直接使用，不用初始化")

    @classmethod
    async def fill_template(cls, template_path, data, output_path, storage: StorageBase) -> str:
        """
        填充word模版

        Args:
            template_path: word模版文件路径
            data: json数据
            output_path: 输出路径
        """
        doc = DocxTemplate(cls._local_storage_path / template_path)

        # 处理图片字段，将路径转换为 InlineImage 对象
        processed_data = cls._process_images(data, doc)

        doc.render(processed_data)

        buffer = io.BytesIO()
        doc.save(buffer)
        buffer.seek(0)

        await storage.write_file(output_path, buffer.getvalue())

        return str(await storage.get_url(output_path))

    @classmethod
    def _process_images(cls, data: Any, doc: DocxTemplate) -> Any:
        """
        递归处理JSON中的图片字段，将路径转换为InlineImage对象

        Args:
            data: JSON数据（dict, list 或其他类型）
            doc: DocxTemplate 实例，用于创建 InlineImage

        Returns:
            处理后的数据，图片路径已转换为InlineImage对象
        """
        if isinstance(data, dict):
            # 检测是否为图片对象（包含 type: "image"）
            if data.get("type") == "image" and "image_path" in data:
                image_path_str = data["image_path"]
                image_path = Path(image_path_str)

                # 检查图片文件是否存在
                if image_path.exists():
                    try:
                        # 创建 InlineImage 对象，替换 image_path 字段
                        inline_image = InlineImage(
                            doc,
                            str(image_path),
                            width=Mm(80)  # 设置图片宽度为80mm，可根据需要调整
                        )
                        logger.info(f"[WordHandler] Processed image: {image_path}")

                        # 返回一个新字典，将 image_path 替换为 InlineImage 对象
                        result = data.copy()
                        result["image_path"] = inline_image
                        return result
                    except Exception as e:
                        logger.error(f"[WordHandler] Failed to process image {image_path}: {str(e)}")
                        return data
                else:
                    logger.warning(f"[WordHandler] Image file not found: {image_path}")
                    return data

            # 递归处理字典的所有值
            result = {}
            for key, value in data.items():
                result[key] = cls._process_images(value, doc)
            return result

        elif isinstance(data, list):
            # 递归处理列表中的每个元素
            return [cls._process_images(item, doc) for item in data]

        else:
            # 其他类型直接返回
            return data

# if __name__ == "__main__":
#     try:
#         w = WordHandler()
#     except Exception as e:
#         print(e)
