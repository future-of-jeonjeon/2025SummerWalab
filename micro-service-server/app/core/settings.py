from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


    # Logging
    LOG_FILE_PATH: str
    LOG_LEVEL: str



    # DB
    DB_HOST: str
    DB_PORT: int
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str

    # Redis
    REDIS_HOST: str
    REDIS_PORT: int

    # Deploy / Service
    SERVICE_DOMAIN: str
    HGU_FRONT_VITE_API_URL: str
    HGU_FRONT_VITE_MS_API_BASE: str
    BACKEND_CORS_ORIGINS: list[str] = ["*"]

    # Judge
    JUDGE_SERVER_TOKEN: str

    # SSO & Auth
    SSO_INTROSPECT_URL: str
    TOKEN_COOKIE_NAME: str = "ms_token"
    LOCAL_TOKEN_TTL_SECONDS: int = 1800
    REDIS_SESSION_PREFIX: str = "session:"

    # Data Paths
    TEST_CASE_DATA_PATH: str = "/app/test_cases_data"

    # Autosave
    REDIS_CODE_SAVE_PREFIX: str = "code_save"
    CODE_SAVE_TTL_SECONDS: int = 86400


settings = Settings()