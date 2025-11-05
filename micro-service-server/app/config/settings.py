from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_title: str = "HGU-OJ Micro Service"
    app_desc: str = "micro service for HGU-OJ system."
    app_version: str = "0.1.0"
    docs_url: str | None = "/docs"       # None이면 Swagger UI 비활성화
    redoc_url: str | None = None         # 필요 시 "/redoc"
    openapi_url: str = "/openapi.json"   # 필요 시 경로 변경

    @property
    def fastapi_kwargs(self) -> dict:
        return dict(
            title=self.app_title,
            description=self.app_desc,
            version=self.app_version,
            docs_url=self.docs_url,
            redoc_url=self.redoc_url,
            openapi_url=self.openapi_url,
        )

settings = Settings()