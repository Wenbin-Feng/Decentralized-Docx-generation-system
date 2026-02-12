from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

Proj_root = Path(__file__).resolve().parent.parent


class Config(BaseSettings):

    SUPABASE_PUBLIC_KEY: str
    SUPABASE_SECRET_KEY: str
    SUPABASE_PROJ_URL: str

    S3_ENDPOINT: str
    S3_REGION: str
    S3_ACCESS_KEY_ID: str
    S3_SECRET_ACCESS_KEY: str
    BUCKET_NAME: str  = "test"  # S3 bucket name
    STORAGE_TYPE: str = "local"

    MODEL_PROVIDER: str
    OPENAI_API_KEY: str
    OPENAI_BASE_URL: str
    OPENAI_MODEL_ID: str
    ANTHROPIC_API_KEY: str
    ANTHROPIC_BASE_URL: str
    ANTHROPIC_MODEL_ID: str

    # Local Storage
    LOCAL_STORAGE_PATH: Path = Proj_root / "data"
    TEMPLATE_PREFIX: Path = "templates"
    OUTPUT_PREFIX: Path = "output"
    PROMPT_PREFIX: Path = "prompts/prompt.md"
    

    model_config = SettingsConfigDict(
        env_file=Proj_root / ".env", env_file_encoding="utf-8"
    )


settings = Config()
# if __name__ == "__main__":
#     try:
#         settings = Config()
#         print(settings.S3_ENDPOINT)
#         print(settings.S3_ACCESS_KEY_ID)
#     except Exception as e:
#         print("loading failed")
