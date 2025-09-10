from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


def setup_cors(app: FastAPI):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", ], # 허용할 도메인
        # allow_origins=["*"],  # 허용할 도메인
        allow_credentials=True,  # 쿠키/세션 허용 여부
        allow_methods=["*"],  # GET, POST 등 허용할 메소드
        allow_headers=["*"],  # Authorization 같은 헤더 허용
    )
