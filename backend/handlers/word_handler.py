from docxtpl import DocxTemplate


class WordHandler:
    def __init__(self):
        raise RuntimeError("直接使用，不用初始化")

    @staticmethod
    def fill_template(template_path, data, output_path) -> None:
        """
        填充word模版

        Args:
            template_path: word模版文件路径
            data: json数据
            output_path: 输出路径
        """
        doc = DocxTemplate(template_path)
        doc.render(data)
        doc.save(output_path)


# if __name__ == "__main__":
#     try:
#         w = WordHandler()
#     except Exception as e:
#         print(e)
