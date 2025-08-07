# 베이스 이미지 (Node.js LTS 버전)
FROM node:16

# 작업 디렉토리 생성
WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치
RUN npm install

# 앱 소스 복사
COPY . .

# 환경변수 설정
ENV TARGET=http://oj-backend:8000
ENV PORT=3000

# 개발 서버 실행 명령
CMD ["npm", "run", "dev"]