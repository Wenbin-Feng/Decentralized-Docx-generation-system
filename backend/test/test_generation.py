import asyncio

from services.render_service import RenderService


async def test_generation():
    render_service = RenderService()
    template_id = "勤工助学"
    user_text = "张三，学好1234，2026年1月份干了40小时，在人工智能学院工作，工作内容是整理文件，指导老师是李教授"
    data = await render_service.generate_data_from_text(user_text, template_id)
    if data.get("status") == "success":
        print(data.get("message"))
    else:
        print(data)


if __name__ == "__main__":
    asyncio.run(test_generation())
