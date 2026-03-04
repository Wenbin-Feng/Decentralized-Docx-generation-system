import asyncio
import base64
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Dict, Optional

from openai import OpenAI

from config.settings import settings
from storage.base import StorageBase
from storage import get_storage

logger = logging.getLogger(__name__)


class GenreportsService:
    """
    胸片 / CT 影像报告生成服务
    输入：胸片图片（URL 或本地路径）
    输出：结构化的影像学报告（findings + diagnosis）
    """

    REPORT_PROMPT_PATH = Path("prompts/report_prompt.md")

    def __init__(self, storage: StorageBase):
        self.storage = storage
        self.model_provider = settings.MODEL_PROVIDER
        self.executor = ThreadPoolExecutor(max_workers=2)
        self._system_prompt: Optional[str] = None

    # ── public API ──────────────────────────────────────────────

    async def generate_from_img(self, image_url: str) -> Dict[str, Any]:
        """
        从胸片图片生成影像报告

        Args:
            image_url: 图片来源，支持以下格式：
                - HTTP(S) URL:  "https://example.com/xray.jpg"
                - 本地文件路径: "/path/to/xray.jpg"
                - Base64 Data URI: "data:image/jpeg;base64,..."

        Returns:
            {
                "status": "success" | "error",
                "findings": "图象所见 ...",
                "diagnosis": "诊断意见 ...",
                "raw_response": "原始 LLM 返回文本"
            }
        """
        try:
            # 1. 加载系统提示词（懒加载，只读一次）
            system_prompt = await self._load_prompt()

            # 2. 将图片统一转换为 data URI（Vision API 需要）
            image_data_uri = await self._resolve_image(image_url)

            # 3. 调用 Vision LLM
            logger.info("[REPORT] 开始生成影像报告 ...")
            loop = asyncio.get_event_loop()
            raw_response = await loop.run_in_executor(
                self.executor,
                self._call_vision_llm,
                system_prompt,
                image_data_uri,
            )
            logger.info(f"[REPORT] LLM 返回 {len(raw_response)} 字符")

            # 4. 解析结构化结果
            report = self._parse_report(raw_response)

            return {
                "status": "success",
                "findings": report.get("findings", ""),
                "diagnosis": report.get("diagnosis", ""),
                "raw_response": raw_response,
            }

        except Exception as e:
            logger.error(f"[REPORT] 生成报告失败: {e}", exc_info=True)
            return {
                "status": "error",
                "findings": "",
                "diagnosis": "",
                "raw_response": str(e),
            }

    # ── 内部方法 ──────────────────────────────────────────────

    async def _load_prompt(self) -> str:
        """懒加载系统提示词"""
        if self._system_prompt is None:
            self._system_prompt = await self.storage.read(self.REPORT_PROMPT_PATH)
            logger.info("[REPORT] 已加载报告生成提示词")
        return self._system_prompt

    async def _resolve_image(self, image_source: str) -> str:
        """
        将各种图片来源统一转换为 data URI 格式
        """
        # 已经是 data URI
        if image_source.startswith("data:"):
            return image_source

        # HTTP(S) URL - 直接使用，OpenAI Vision API 支持
        if image_source.startswith(("http://", "https://")):
            return image_source

        # 本地文件路径 - 读取并转为 base64
        file_path = Path(image_source)
        if file_path.exists():
            return self._file_to_data_uri(file_path)

        # 尝试从 storage 读取（如 S3 路径）
        try:
            url = await self.storage.get_url(image_source)
            if url:
                return url
        except Exception:
            pass

        raise ValueError(f"无法解析图片来源: {image_source}")

    @staticmethod
    def _file_to_data_uri(file_path: Path) -> str:
        """将本地文件转换为 base64 data URI"""
        suffix = file_path.suffix.lower()
        mime_map = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".bmp": "image/bmp",
            ".dicom": "application/dicom",
            ".dcm": "application/dicom",
        }
        mime_type = mime_map.get(suffix, "image/jpeg")

        with open(file_path, "rb") as f:
            img_bytes = f.read()

        b64 = base64.b64encode(img_bytes).decode("utf-8")
        return f"data:{mime_type};base64,{b64}"

    def _call_vision_llm(self, system_prompt: str, image_url: str) -> str:
        """调用 Vision LLM（同步，在线程池中运行）"""
        if self.model_provider == "openai":
            return self._call_openai_vision(system_prompt, image_url)
        if self.model_provider == "anthropic":
            return self._call_anthropic_vision(system_prompt, image_url)
        # 默认使用 anthropic
        return self._call_anthropic_vision(system_prompt, image_url)

    def _call_openai_vision(self, system_prompt: str, image_url: str) -> str:
        """通过 OpenAI API 调用 Vision 模型"""
        api_key = settings.OPENAI_API_KEY
        base_url = settings.OPENAI_BASE_URL
        model_id = settings.OPENAI_MODEL_ID

        if not api_key:
            raise ValueError("OPENAI_API_KEY 未设置")

        client_kwargs = {"api_key": api_key}
        if base_url:
            client_kwargs["base_url"] = base_url

        client = OpenAI(**client_kwargs)

        logger.info(f"[REPORT] 调用 OpenAI Vision, model={model_id}")

        response = client.chat.completions.create(
            model=model_id,
            max_tokens=4096,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "请仔细阅读这张胸部影像，并按照要求生成完整的影像学报告。",
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": image_url, "detail": "high"},
                        },
                    ],
                },
            ],
            temperature=0.3,
        )

        return response.choices[0].message.content

    def _call_anthropic_vision(self, system_prompt: str, image_url: str) -> str:
        """通过 Anthropic (LiteLLM Proxy) 调用 Vision 模型"""
        api_key = settings.ANTHROPIC_API_KEY
        base_url = settings.ANTHROPIC_BASE_URL
        model_id = settings.ANTHROPIC_MODEL_ID

        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY 未设置")

        # 使用 OpenAI 兼容客户端（LiteLLM Proxy）
        client = OpenAI(api_key=api_key, base_url=base_url)

        logger.info(f"[REPORT] 调用 Anthropic Vision, model={model_id}")

        response = client.chat.completions.create(
            model=model_id,
            max_tokens=4096,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "请仔细阅读这张胸部影像，并按照要求生成完整的影像学报告。",
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": image_url, "detail": "high"},
                        },
                    ],
                },
            ],
            temperature=0.3,
        )

        return response.choices[0].message.content

    def _parse_report(self, raw_response: str) -> Dict[str, Any]:
        """
        从 LLM 原始响应中提取 JSON 报告数据
        """
        text = raw_response.strip()

        # 去除 markdown 代码块
        if "```json" in text:
            start = text.find("```json") + 7
            end = text.find("```", start)
            if end != -1:
                text = text[start:end].strip()
        elif "```" in text:
            start = text.find("```") + 3
            end = text.find("```", start)
            if end != -1:
                text = text[start:end].strip()

        # 尝试直接解析
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # 尝试提取花括号内容
        first_brace = text.find("{")
        last_brace = text.rfind("}")
        if first_brace != -1 and last_brace != -1:
            try:
                return json.loads(text[first_brace : last_brace + 1])
            except json.JSONDecodeError:
                pass

        # 兜底：将整段文字作为 findings 返回
        logger.warning("[REPORT] 无法解析 JSON，将原始文本作为 findings 返回")
        return {
            "findings": text,
            "diagnosis": "（报告解析失败，请参考上方原始描述）",
        }


async def get_GenreportsService() -> GenreportsService:
    """FastAPI 依赖注入工厂函数"""
    return GenreportsService(await get_storage())