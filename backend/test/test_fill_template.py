import asyncio
from storage import get_storage
from services.render_service import RenderService


async def test_fill_template():
    storage = await get_storage()
    render_service = RenderService(storage)
    template_id = "勤工助学"
    user_text = "张三，学好1234，2026年1月份干了40小时，在人工智能学院工作，工作内容是整理文件，指导老师是李教授,模版的所有字段必须填写。"
    res = await render_service.fill_template(user_text, template_id)
    print(res)


if __name__ == "__main__":
    asyncio.run(test_fill_template())
