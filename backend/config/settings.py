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
    REPORT_PROMPT_PREFIX: Path = "prompts/report_prompt.md"

    # Database Configuration
    DATABASE_TYPE: str = "sqlite"  # sqlite or postgresql
    DATABASE_URL: str = ""  # For PostgreSQL: postgresql://user:pass@localhost:5432/dbname
    SQLITE_FILE: str = "medical_reports.db"  # SQLite 文件名（相对于项目根目录）

    # JWT Configuration
    JWT_SECRET_KEY: str = "your-secret-key-change-this-in-production-min-32-characters"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24

    # Auth Configuration
    NONCE_EXPIRATION_MINUTES: int = 5
    SIWE_DOMAIN: str = "localhost:5173"  # 前端域名
    SIWE_URI: str = "http://localhost:5173"

    debug: bool = True
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
