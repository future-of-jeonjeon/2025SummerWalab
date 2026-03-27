# 2025 Summer Walab OJ 프로젝트
한동대학교(HGU) 온라인 저지 시스템입니다.

## 🏗 시스템 아키텍처

- **[OnlineJudge](/OnlineJudge/) (오픈소스 백엔드)**: 기존 Django 기반의 백엔드 서버 (Python 3.12). 코어 OJ 로직, 계정, 대회 및 문제 관리를 담당합니다.
- **[micro-service-server](/micro-service-server/) (마이크로서비스)**: SSO 검증, 코드 자동 저장, 재인덱싱 등 특화된 작업을 수행하기 위한 FastAPI 기반의 마이크로서비스입니다.
- **[hgu-oj-front](/hgu-oj-front/) (신규 프론트엔드)**: **React**, **TypeScript**, **Vite**, **Tailwind CSS**로 구축된 프론트엔드로, micro-service-server 와 오픈소스 백엔드를 동시에 사용합니다.

## 🛠 기술 스택

- **백엔드**: Django, FastAPI, PostgreSQL, Redis
- **프론트엔드**: React (Vite, Tailwind CSS), Vue.js (Legacy)
- **인프라**: Docker, Docker Compose

## 🚀 빌드 및 실행 방법

### 로컬 개발 환경

1.  `.env` 파일을 구성합니다 (`.env.sample` 참고).
2.  Docker Compose를 사용하여 시스템을 실행합니다:
    ```bash
    docker compose up -d --build
    ```

## 🤝 프로젝트 규칙

### Git 규칙

#### 커밋 메시지 형식
- **형식:** `type: description (#issue)`
- **타입:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `build`
- **예시:**  
  `feat: 로그인 API 추가 (#12)`  
  `fix: 메인페이지 CSS 수정 (#15)`

#### 브랜치 전략
- **main:** 배포용
- **dev:** 개발 통합 브랜치
- **작업 브랜치:** `type/issue` 형식 (예: `feat/#1`, `hotfix/#3`)
