from utils import ai_chat
from concurrent.futures import ThreadPoolExecutor
import asyncio
from config.settings import settings
from openai import OpenAI
from logger import logger

class RenderService:
    """
    word渲染服务,包括了json数据生成和模版渲染
    """
    def __init__(self):
        self.model_provider = settings.MODEL_PROVIDER
        self.executor = ThreadPoolExecutor(max_workers=4)

    async def generate_data_from_text(self, user_text: str, template_id: str) -> str:
        pass    
    

    def render(self, json_path: str, template_path: str, output_path: str) -> str:
        pass

    def call_llm(self, system_prompt: str, user_prompt: str) -> str:
        if self.model_provider == "openai":
            return self.call_openai(system_prompt, user_prompt)
        if self.model_provider == "anthropic":
            return self.call_anthropic(system_prompt, user_prompt)
        return ai_chat.chat(system_prompt, user_prompt)

    def call_openai(self, system_prompt: str, user_prompt: str) -> str:
        api_key = settings.OPENAI_API_KEY
        base_url = settings.OPENAI_BASE_URL
        model_id = settings.OPENAI_MODEL_ID

        if not api_key:
            raise ValueError("OPENAI_API_KEY not set")

        # Create client
        client_kwargs = {"api_key": api_key}
        if base_url:
            client_kwargs["base_url"] = base_url

        client = OpenAI(**client_kwargs)

        logger.info(f"[GENERATION] Calling OpenAI API with model: {model_id}")

        # Make API call with proper system message
        completion = client.chat.completions.create(
            model=model_id,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7
        )

        response_text = completion.choices[0].message.content
        logger.info(f"[GENERATION] Received response: {len(response_text)} characters")

        return response_text

    def call_anthropic(self, system_prompt: str, user_prompt: str) -> str:
        api_key = settings.ANTHROPIC_API_KEY
        base_url = settings.ANTHROPIC_BASE_URL
        model_id = settings.ANTHROPIC_MODEL_ID

        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not set")

        # Use OpenAI client for LiteLLM Proxy
        client = OpenAI(api_key=api_key, base_url=base_url)

        logger.info(f"[GENERATION] Calling Anthropic API with model: {model_id}")

        response = client.chat.completions.create(
            model=model_id,
            max_tokens=8192,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7
        )

        response_text = response.choices[0].message.content
        logger.info(f"[GENERATION] Received response: {len(response_text)} characters")

        return response_text


    def _extract_json_from_response(self, response_text: str) -> Dict[str, Any]:
        """
        Extract JSON from LLM response (handles markdown code blocks)

        Args:
            response_text: Raw LLM response

        Returns:
            Parsed JSON dict

        Raises:
            ValueError: If JSON cannot be extracted or parsed
        """
        # Remove markdown code blocks if present
        text = response_text.strip()

        # Try to find JSON in markdown code blocks
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

        # Try to parse JSON
        try:
            data = json.loads(text)
            return data
        except json.JSONDecodeError as e:
            # Try to find the first { and last }
            first_brace = text.find("{")
            last_brace = text.rfind("}")

            if first_brace != -1 and last_brace != -1:
                json_text = text[first_brace:last_brace + 1]
                try:
                    data = json.loads(json_text)
                    return data
                except json.JSONDecodeError:
                    pass

            logger.error(f"[GENERATION] Failed to parse JSON from response: {text[:500]}...")
            raise ValueError(f"Failed to parse JSON from LLM response: {str(e)}")