from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Sime Darby Hackathon"
    database_url: str = (
        "postgresql+psycopg://user:password@localhost:5432/simedarby_hackathon"
    )


settings = Settings()
