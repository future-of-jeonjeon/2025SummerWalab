## HGU-OJ Micro Service 

<img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white"/>
<img src="https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white"/>
<img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white"/>

### before dev
```bash 
$ python3 -m venv .venv
```

```bash 
$ source .venv/bin/activate
```


### 엔티티 수정시

```bash 
$ alembic revision --autogenerate           
```

### 🛠 DB Migration Strategy
- **Dev:** -  서버 켜질 때 자동 반영됨. 꼬이면 `python reset_db.py`로 초기화.
- **Collab:** - 마이그레이션 파일도 커밋 필수. 충돌 나면 `alembic merge heads`.
