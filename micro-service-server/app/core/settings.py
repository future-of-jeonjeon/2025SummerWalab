from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


    # Logging
    LOG_FILE_PATH: str = "app.log"
    LOG_LEVEL: str = "INFO"



    # DB
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "postgres"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    # Deploy / Service
    SERVICE_DOMAIN: str = "localhost"
    HGU_FRONT_VITE_API_URL: str = "http://localhost:5173"
    HGU_FRONT_VITE_MS_API_BASE: str = "http://localhost:8000"
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Judge
    JUDGE_SERVER_TOKEN: str = "token"

    # SSO & Auth
    SSO_INTROSPECT_URL: str = "http://localhost:8000/api/sso"
    TOKEN_COOKIE_NAME: str = "ms_token"
    LOCAL_TOKEN_TTL_SECONDS: int = 1800
    REDIS_SESSION_PREFIX: str = "session:"

    # Data Paths
    TEST_CASE_DATA_PATH: str = "/app/test_cases_data"

    # Autosave
    REDIS_CODE_SAVE_PREFIX: str = "code_save"
    CODE_SAVE_TTL_SECONDS: int = 86400


settings = Settings()