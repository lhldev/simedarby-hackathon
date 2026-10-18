from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Hackathon Starter"
    database_url: str = "postgresql+psycopg://user:password@localhost:5432/hackathon"


settings = Settings()
