-- problem 테이블에서 workbook_id FK 제약조건과 컬럼 제거

-- 1. FK 제약조건 제거
ALTER TABLE problem DROP CONSTRAINT IF EXISTS problem_workbook_id_f2667288_fk_workbook_id;

-- 2. workbook_id 컬럼 제거
ALTER TABLE problem DROP COLUMN IF EXISTS workbook_id;

-- 3. workbook_id 인덱스 제거 (있다면)
DROP INDEX IF EXISTS problem_workbook_id_f2667288;

-- 4. 변경사항 확인
\d problem;
