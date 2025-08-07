# Online Judge System

## 📋 프로젝트 개요
Docker 기반의 온라인 저지 시스템으로, Django 백엔드와 Vue.js 프론트엔드로 구성되어 있습니다.

## 🚀 주요 기능

### 1. 문제집(Workbook) 기능
- **문제집 생성/관리**: 관리자 페이지에서 문제집을 생성하고 관리할 수 있습니다.
- **문제집별 문제 보기**: 문제집을 선택하여 해당 문제집에 포함된 문제들만 볼 수 있습니다.
- **문제 생성 시 문제집 선택**: 새로운 문제를 생성할 때 문제집을 선택할 수 있습니다.

### 2. 문제 정렬 기능 ✨ (신규 추가)
**모든 문제** 페이지에서 다양한 기준으로 문제를 정렬할 수 있습니다.

#### 정렬 옵션:
- **번호순서 (By ID)**: 문제 ID 순서대로 정렬 (기본값)
- **난이도 (By Difficulty)**: 문제 난이도 순서대로 정렬
- **정답횟수 (By Accepted)**: 정답 횟수 내림차순으로 정렬

#### 구현 세부사항:
- **프론트엔드**: `OnlineJudgeFE/src/pages/oj/views/problem/ProblemList.vue`
  - 정렬 드롭다운 메뉴 추가
  - `getSortDisplayText()` 메서드로 언어별 정렬 텍스트 표시
  - `filterBySort()` 메서드로 정렬 처리

- **백엔드**: `OnlineJudge/problem/views/oj.py`
  - `sort` 파라미터 처리
  - 각 정렬 옵션에 따른 `order_by` 쿼리 구현

#### 언어 지원:
- **한국어**: "번호순서", "난이도", "정답횟수"
- **영어**: "By ID", "By Difficulty", "By Accepted"

### 3. 다국어 지원 기능 ✨ (신규 추가)
헤더에서 언어를 변경할 수 있는 기능을 추가했습니다.

#### 지원 언어:
- **한국어 (ko-KR)**: 모든 텍스트가 한국어로 표시
- **영어 (en-US)**: 모든 텍스트가 영어로 표시

#### 구현 세부사항:
- **언어 메뉴**: 우측 상단 헤더에 "언어" 드롭다운 메뉴
- **즉시 변경**: 언어 선택 시 모든 텍스트가 즉시 변경
- **설정 유지**: localStorage에 언어 설정 저장, 페이지 새로고침 후에도 유지

#### 언어 파일 위치:
- **한국어**: `OnlineJudgeFE/src/i18n/oj/ko-KR.js`
- **영어**: `OnlineJudgeFE/src/i18n/oj/en-US.js`

#### 추가된 언어 키:
```javascript
// 정렬 관련
Sort: '정렬' / 'Sort'
By_ID: '번호순서' / 'By ID'
By_Difficulty: '난이도' / 'By Difficulty'
By_Accepted: '정답횟수' / 'By Accepted'

// 언어 변경 관련
Language: '언어' / 'Language'
Korean: '한국어' / '한국어'
English: 'English' / 'English'

// 문제집 관련
All_Problems: '모든 문제' / 'All Problems'
Workbooks: '문제집' / 'Workbooks'
```

## 🛠️ 기술 스택

### Backend
- **Django 3.2.25**: Python 웹 프레임워크
- **PostgreSQL**: 메인 데이터베이스
- **Redis**: 캐싱 및 세션 저장소
- **Docker**: 컨테이너화

### Frontend
- **Vue.js 2.x**: JavaScript 프레임워크
- **iView UI**: UI 컴포넌트 라이브러리
- **Vue Router**: 클라이언트 사이드 라우팅
- **Vuex**: 상태 관리
- **i18n**: 다국어 지원

## 📁 프로젝트 구조

```
2025SummerWalab/
├── OnlineJudge/          # Django 백엔드
│   ├── problem/         # 문제 관련 모델/뷰
│   ├── workbook/        # 문제집 관련 모델/뷰 (신규)
│   ├── account/         # 사용자 인증
│   └── oj/             # 메인 설정
├── OnlineJudgeFE/       # Vue.js 프론트엔드
│   ├── src/pages/oj/   # 사용자 페이지
│   ├── src/pages/admin/ # 관리자 페이지
│   └── src/i18n/       # 다국어 파일
└── data/               # 데이터베이스 파일
```

## 🚀 실행 방법

### 1. Docker Compose로 전체 시스템 실행
```bash
cd OnlineJudge
docker-compose up -d
```

### 2. 개별 서비스 실행
```bash
# 백엔드만 실행
docker-compose up oj-backend

# 프론트엔드만 실행
docker run -d --name oj-frontend -p 8080:80 -e TARGET=http://localhost:3000 oj-frontend
```

## 🌐 접속 정보

- **프론트엔드**: http://localhost:8080
- **관리자 페이지**: http://localhost:8080/admin
- **API 서버**: http://localhost:3000
- **PostgreSQL**: localhost:5432 (DataGrip 접속용)

## 📊 데이터베이스 정보

- **Host**: localhost
- **Port**: 5432
- **Database**: onlinejudge
- **Username**: onlinejudge
- **Password**: onlinejudge

## 🔧 개발 환경 설정

### 로컬 개발
```bash
# 백엔드 마이그레이션
docker exec onlinejudge-oj-backend-1 python manage.py makemigrations
docker exec onlinejudge-oj-backend-1 python manage.py migrate

# 프론트엔드 재시작
docker restart oj-frontend
```

## 📝 주요 변경사항

### 2025-08-06
- ✅ 문제집(Workbook) 기능 구현
- ✅ 문제 정렬 기능 추가 (번호순서, 난이도, 정답횟수)
- ✅ 다국어 지원 기능 추가 (한국어/영어)
- ✅ 언어 변경 UI 구현
- ✅ 정렬 옵션 언어별 번역 추가

## 🤝 기여 방법

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

