# 2025 Summer Walab OJ project

[FrontEnd](/OnlineJudgeFE/)

[BackEnd](/OnlineJudge/)
  
### version information

Django - python3.12

Vue.js - node 16

### how to build and run

``` bash
docker compose up -d --build
```

or 


```bash
sudo ./deploy.sh deploy.tgz
```

### Git 규칙

#### 커밋 메시지

- **형식:** `type: description (#issue)`
- **타입:** feat, fix, docs, style, refactor, test, chore, build
- **설명**
  - feat → 새로운 기능 추가
  - fix → 버그 수정
  - docs → 문서 작업
  - style → 코드 스타일 변경
  - refactor → 리팩터링
  - test → 테스트 코드
  - chore → 빌드/설정/패키지 관리 등
  - build → 빌드 시스템 및 의존성 관련
- **예시:**  
  feat: 로그인 API 추가 (#12)  
  fix: 메인페이지 CSS 수정 (#15)

---

#### 브랜치

- **main:** 배포용
- **dev:** 통합 개발용
- **working:** 기능/수정 단위 작업용
- **네이밍 규칙:** `type/issue`
- **타입:** feat, hotfix, docs, style, refactor, test, chore, build
- **설명**
  - feat → 기능 개발
  - hotfix → 긴급 수정
  - docs → 문서 작업
  - style → 코드 스타일 변경
  - refactor → 리팩터링
  - test → 테스트 코드
  - chore → 빌드/설정/패키지 관리 등
  - build → 빌드 시스템 및 의존성 관련
- **예시:**  
  feat/#1  
  hotfix/#3
