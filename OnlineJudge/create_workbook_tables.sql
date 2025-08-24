-- workbook 앱을 위한 테이블 생성 SQL 스크립트

-- 기존 workbook 테이블이 이미 존재하므로 컬럼만 추가/수정
-- 필요한 컬럼이 이미 존재하는지 확인하고 없으면 추가

-- workbook 테이블에 is_public 컬럼 추가 (없는 경우)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workbook' AND column_name = 'is_public') THEN
        ALTER TABLE workbook ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

-- workbook_problem 테이블이 이미 존재하는지 확인
-- 기존 테이블 구조 확인
\d workbook_problem;

-- workbook_problem 테이블이 없다면 생성
CREATE TABLE IF NOT EXISTS workbook_problem (
    id SERIAL PRIMARY KEY,
    workbook_id INTEGER NOT NULL,
    problem_id INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    added_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT workbook_problem_workbook_fk FOREIGN KEY (workbook_id) REFERENCES workbook(id) ON DELETE CASCADE,
    CONSTRAINT workbook_problem_problem_fk FOREIGN KEY (problem_id) REFERENCES problem(id) ON DELETE CASCADE,
    CONSTRAINT workbook_problem_unique UNIQUE (workbook_id, problem_id)
);

-- 인덱스 생성 (이미 존재하는 경우 무시)
CREATE INDEX IF NOT EXISTS idx_workbook_problem_workbook ON workbook_problem(workbook_id);
CREATE INDEX IF NOT EXISTS idx_workbook_problem_problem ON workbook_problem(problem_id);
CREATE INDEX IF NOT EXISTS idx_workbook_problem_order ON workbook_problem("order");

-- 코멘트 추가
COMMENT ON TABLE workbook IS '문제집 정보를 저장하는 테이블';
COMMENT ON TABLE workbook_problem IS '문제집에 포함된 문제들을 저장하는 테이블';
COMMENT ON COLUMN workbook.title IS '문제집 제목';
COMMENT ON COLUMN workbook.description IS '문제집 설명';
COMMENT ON COLUMN workbook.created_by_id IS '문제집 생성자 ID';
COMMENT ON COLUMN workbook.created_at IS '생성 시간';
COMMENT ON COLUMN workbook.updated_at IS '수정 시간';
COMMENT ON COLUMN workbook.is_public IS '공개 여부';
COMMENT ON COLUMN workbook_problem.workbook_id IS '문제집 ID';
COMMENT ON COLUMN workbook_problem.problem_id IS '문제 ID';
COMMENT ON COLUMN workbook_problem."order" IS '문제 순서';
COMMENT ON COLUMN workbook_problem.added_time IS '추가 시간';
