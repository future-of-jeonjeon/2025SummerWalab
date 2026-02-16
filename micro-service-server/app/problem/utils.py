import hashlib
import json
import os
import re
import shutil
import string
import random
import uuid
import yaml
import markdown
import zipfile
from typing import List, Tuple, Dict, Any

from app.core.logger import logger
from app.core.settings import settings
from app.problem import exceptions as problem_exceptions

# 상수 정의
EXTENSION_TO_LANGUAGE = {
    ".py": "Python3",
    ".cpp": "C++",
    ".c": "C",
    ".java": "Java",
    ".go": "Go",
    ".js": "JavaScript"
}


class ProblemFileManager:
    """
    문제 파일(ZIP, MD, Testcase) 처리 전담 클래스
    """

    @staticmethod
    def parse_problem_md(content: str) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """problem.md 파일의 메타데이터와 본문을 파싱합니다."""
        # 메타데이터 분리 정규식
        match = re.match(r'^\s*\n(.*)', content, re.DOTALL)
        if not match:
            match = re.match(r'^\s*\n(.*)', content, re.DOTALL)
        if not match:
            match = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)', content, re.DOTALL)
        if not match:
            problem_exceptions.format_error("Metadata section missing")

        metadata_str = match.group(1)
        body = match.group(2).strip()

        try:
            metadata = yaml.safe_load(metadata_str)
        except yaml.YAMLError as e:
            problem_exceptions.format_error(f"Invalid YAML in metadata section: {str(e)}")

        # 섹션 분리 (Description, Input, Output 등)
        sections = {}
        parts = re.split(r'\n#{1,3}\s+([\w_]+)\s*\n', '\n' + body)
        for i in range(1, len(parts), 2):
            sections[parts[i].lower()] = parts[i + 1].strip()

        # 샘플 데이터 파싱
        if 'samples' in sections:
            sample_pattern = re.compile(
                r'###\s*input.*?\n(.*?)\n###\s*output.*?\n(.*?)(?=\n###\s*input|\Z)',
                re.DOTALL | re.IGNORECASE
            )

            def clean_sample(text):
                text = text.strip()
                text = re.sub(r'^```[a-zA-Z0-9]*\s*\n', '', text)
                text = re.sub(r'\n\s*```$', '', text)
                return text.strip()

            sections['samples'] = [
                {"input": clean_sample(m[0]), "output": clean_sample(m[1])}
                for m in sample_pattern.findall(sections['samples'] + '\n')
            ]

        # Markdown -> HTML 변환
        html_sections = ['description', 'input_description', 'output_description', 'hint']
        for section in html_sections:
            if section in sections:
                sections[section] = markdown.markdown(
                    sections[section],
                    extensions=['fenced_code', 'tables']
                )

        return metadata, sections

    @staticmethod
    def get_solution_file(file_list: List[str], problem_dir: str) -> str:
        """ZIP 파일 내에서 솔루션 파일을 찾습니다."""
        solution_files = [f for f in file_list if f.startswith(f"{problem_dir}solution.")]
        if not solution_files:
            problem_exceptions.missing_file_error(f"{problem_dir}solution.*")
        return solution_files[0]

    @staticmethod
    def get_language_from_ext(filename: str) -> str:
        """파일 확장자로 언어를 식별합니다."""
        ext = os.path.splitext(filename)[1].lower()
        if ext not in EXTENSION_TO_LANGUAGE:
            logger.error(f"Unsupported file extension: {ext} for file: {filename}")
            problem_exceptions.bad_zip_file()
        return EXTENSION_TO_LANGUAGE[ext]

    @staticmethod
    def extract_test_cases_data(zip_ref: zipfile.ZipFile, file_list: List[str], test_case_dir: str,
                                samples: List[dict]) -> List[dict]:
        """검증용 테스트 케이스 데이터를 메모리로 추출합니다."""
        test_cases = []
        # 샘플 추가
        for s in samples:
            test_cases.append({"input": s.get("input", ""), "output": s.get("output", "")})

        # 파일 기반 테스트케이스 추가
        input_files = sorted([f for f in file_list if f.startswith(test_case_dir) and f.endswith(".in")])
        for in_file in input_files:
            out_file = in_file.replace(".in", ".out")
            if out_file in file_list:
                test_cases.append({
                    "input": zip_ref.read(in_file).decode("utf-8"),
                    "output": zip_ref.read(out_file).decode("utf-8").strip()
                })
        return test_cases

    @staticmethod
    def save_test_cases_to_disk(zip_file: zipfile.ZipFile, test_case_dir_in_zip: str, spj: bool = False) -> Tuple[
        str, List[dict]]:
        """테스트 케이스를 물리 디스크에 저장하고 정보를 반환합니다."""
        name_list = zip_file.namelist()
        input_files = sorted([
            f for f in name_list
            if f.startswith(test_case_dir_in_zip) and f.endswith(".in")
        ])

        if not input_files:
            problem_exceptions.empty_zip_file()

        test_case_id = ProblemFileManager._rand_str()
        dest_path = os.path.join(settings.TEST_CASE_DATA_PATH, test_case_id)

        os.makedirs(dest_path, exist_ok=True)
        os.chmod(dest_path, 0o710)

        size_cache = {}
        md5_cache = {}
        valid_test_cases = []

        for in_path in input_files:
            out_path = in_path.replace(".in", ".out")
            if not spj and out_path not in name_list:
                continue

            in_name = os.path.basename(in_path)
            out_name = os.path.basename(out_path)

            in_content = zip_file.read(in_path).replace(b"\r\n", b"\n")
            with open(os.path.join(dest_path, in_name), "wb") as f:
                f.write(in_content)
            size_cache[in_name] = len(in_content)

            if not spj:
                out_content = zip_file.read(out_path).replace(b"\r\n", b"\n")
                with open(os.path.join(dest_path, out_name), "wb") as f:
                    f.write(out_content)
                size_cache[out_name] = len(out_content)
                md5_cache[out_name] = hashlib.md5(out_content.rstrip()).hexdigest()
                valid_test_cases.append((in_name, out_name))
            else:
                valid_test_cases.append((in_name, None))

        test_case_info = {"spj": spj, "test_cases": {}}
        info_list = []

        for index, (in_name, out_name) in enumerate(valid_test_cases):
            if spj:
                data = {"input_name": in_name, "input_size": size_cache[in_name]}
            else:
                data = {
                    "stripped_output_md5": md5_cache[out_name],
                    "input_size": size_cache[in_name],
                    "output_size": size_cache[out_name],
                    "input_name": in_name,
                    "output_name": out_name
                }
            info_list.append(data)
            test_case_info["test_cases"][str(index + 1)] = data

        with open(os.path.join(dest_path, "info"), "w", encoding="utf-8") as f:
            f.write(json.dumps(test_case_info, indent=4))

        return test_case_id, info_list

    @staticmethod
    def remove_test_case_dir(test_case_ids: List[str]):
        """실패 시 테스트 케이스 디렉토리 삭제"""
        if not test_case_ids:
            return
        logger.info(f"Cleaning up {len(test_case_ids)} test cases")
        for test_case_id in test_case_ids:
            try:
                target_dir = os.path.join(settings.TEST_CASE_DATA_PATH, test_case_id)
                if os.path.exists(target_dir):
                    shutil.rmtree(target_dir)
            except Exception as e:
                logger.error(f"Failed to remove test case directory {test_case_id}: {e}")

    @staticmethod
    def _rand_str(length=32):
        return "".join(random.choice(string.ascii_letters + string.digits) for _ in range(length))