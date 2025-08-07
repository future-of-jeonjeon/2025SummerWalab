# 2025 Summer Walab OJ project

[FrontEnd](/OnlineJudgeFE/)

[BackEnd](/OnlineJudge/)

[Spring MircoService](/test-project-oj/)


### version information

Django - python3.12

Vue.js - node 16

Spring boot - java 17

### how to build and run

#### 1. 환경변수 설정

Google OAuth를 사용하기 위해 환경변수를 설정해야 합니다. 프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# Google OAuth Configuration
VUE_APP_GOOGLE_CLIENT_ID=your_google_client_id_here
VUE_APP_GOOGLE_CLIENT_SECRET=your_google_client_secret_here
VUE_APP_GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/callback
```

#### 2. Docker Compose 실행

``` bash
docker compose up -d --build
```

