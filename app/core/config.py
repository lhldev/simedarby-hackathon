from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Sime Darby Hackathon"
    database_url: str = (
        "postgresql+psycopg://user:password@localhost:5432/simedarby_hackathon"
    )
    grafilab_key: str = ""
    grafilab_base_url: str = "https://llm.grafilab.ai/v1/chat/completions"
    grafilab_model: str = "tencent/hy3"


settings = Settings()
