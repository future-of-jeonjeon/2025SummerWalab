# HGU OJ Frontend

한국한국대학교 온라인 저지 시스템의 프론트엔드입니다. 코드당 스타일을 참고하여 제작되었습니다.

## 🎨 디자인 특징

- **색상 팔레트**: 
  - Primary Dark: `#154D71`
  - Primary Medium: `#1C6EA4` 
  - Primary Light: `#33A1E0`
  - Accent Yellow: `#FFF9AF`

- **반응형 디자인**: 모바일, 태블릿, 데스크톱 지원
- **다크 모드 지원**: 시스템 설정에 따른 자동 전환
- **접근성**: 키보드 네비게이션 및 스크린 리더 지원

## 🚀 기능

### 일반 사용자
- **문제집 조회**: 공개/비공개 문제집 탐색
- **문제 풀이**: 다양한 난이도의 알고리즘 문제
- **컨테스트 참여**: 실시간 코딩 대회 참가
- **제출 내역**: 개인 제출 기록 관리

### 관리자
- **문제 관리**: 문제 생성, 수정, 삭제
- **문제집 관리**: 문제집 생성 및 문제 구성
- **컨테스트 개최**: 대회 생성 및 관리

## 🛠 기술 스택

- **React 19**: 최신 React 기능 활용
- **TypeScript**: 타입 안전성 보장
- **Vite**: 빠른 개발 서버 및 빌드
- **React Router**: 클라이언트 사이드 라우팅
- **Axios**: HTTP 클라이언트
- **Lucide React**: 아이콘 라이브러리
- **CSS Variables**: 테마 시스템

## 📦 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
```bash
cp env.example .env
```

`.env` 파일을 편집하여 API URL을 설정하세요:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_OJ_API_BASE_URL=http://localhost:8001
```

### 3. 개발 서버 실행
```bash
npm run dev
```

### 4. 빌드
```bash
npm run build
```

## 🏗 프로젝트 구조

```
src/
├── components/          # 재사용 가능한 컴포넌트
│   └── common/         # 공통 컴포넌트
├── pages/              # 페이지 컴포넌트
│   ├── admin/          # 관리자 페이지
│   └── ...             # 일반 사용자 페이지
├── services/           # API 서비스
├── styles/             # 스타일 파일
└── App.tsx             # 메인 앱 컴포넌트
```

## 🔌 API 연동

### Micro Service Server
- 문제집 관리 API
- 사용자 인증 API

### OnlineJudge
- 문제 조회 및 제출 API
- 컨테스트 API
- 제출 내역 API

## 🎯 주요 컴포넌트

### 공통 컴포넌트
- `Button`: 다양한 스타일의 버튼
- `Card`: 카드 레이아웃
- `Input`: 폼 입력 필드
- `Header`: 네비게이션 헤더

### 페이지 컴포넌트
- `HomePage`: 메인 랜딩 페이지
- `ProblemListPage`: 문제 목록
- `ProblemDetailPage`: 문제 상세 및 제출
- `WorkbookListPage`: 문제집 목록
- `ContestListPage`: 컨테스트 목록
- `AdminProblemPage`: 문제 관리
- `AdminWorkbookPage`: 문제집 관리
- `AdminContestPage`: 컨테스트 관리

## 🎨 스타일 시스템

CSS Variables를 사용한 테마 시스템으로 일관된 디자인을 제공합니다:

```css
:root {
  --primary-dark: #154D71;
  --primary-medium: #1C6EA4;
  --primary-light: #33A1E0;
  --accent-yellow: #FFF9AF;
  /* ... */
}
```

## 🔐 인증 시스템

- JWT 토큰 기반 인증
- 자동 토큰 갱신
- 관리자 권한 확인
- 보호된 라우트

## 📱 반응형 디자인

- **모바일**: 320px 이상
- **태블릿**: 768px 이상  
- **데스크톱**: 1024px 이상

## 🚀 배포

### 개발 환경
```bash
npm run dev
```

### 프로덕션 빌드
```bash
npm run build
npm run preview
```

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 📞 지원

문제가 있으시면 이슈를 생성해 주세요.