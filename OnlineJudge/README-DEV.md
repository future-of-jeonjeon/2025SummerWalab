# 개발 환경 설정 가이드

## 방법 1: Docker 사용 (권장)

### 개발용 Docker 실행
```bash
# 개발용 docker-compose 실행
docker-compose -f docker-compose.dev.yml up -d

# 마이그레이션 실행
docker exec onlinejudge-oj-backend-1 python manage.py makemigrations
docker exec onlinejudge-oj-backend-1 python manage.py migrate
```

### 코드 변경사항 적용
- 소스 코드 변경 시 자동으로 반영됨 (볼륨 마운트)
- Django 서버 재시작 필요할 수 있음

## 방법 2: 로컬 개발

### 환경 설정
```bash
# Python 가상환경 생성
python -m venv venv
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate  # Windows

# 의존성 설치
pip install -r requirements.txt

# 환경변수 설정
export POSTGRES_DB=onlinejudge
export POSTGRES_USER=onlinejudge
export POSTGRES_PASSWORD=onlinejudge
```

### 데이터베이스 설정
- PostgreSQL 10 필요
- Redis 4.0 필요
- 또는 Docker로 DB만 실행: `docker-compose up oj-postgres oj-redis`

### 서버 실행
```bash
python manage.py runserver
```

## 협업 시 주의사항

1. **모든 코드 변경사항을 Git에 커밋**
2. **설정 파일도 포함** (docker-compose.dev.yml 등)
3. **README 업데이트** (새로운 설정이나 의존성)
4. **팀원들과 동일한 환경 사용**

## 새로운 기능 추가 시

1. **모델 수정**: `models.py` 파일 수정
2. **마이그레이션 생성**: `python manage.py makemigrations`
3. **마이그레이션 적용**: `python manage.py migrate`
4. **Git 커밋**: 모든 변경사항 커밋
5. **팀원들에게 알림**: 새로운 의존성이나 설정 변경사항 