import json
import os
import shutil  # 파일 복사용
import uuid  # 고유한 test_case_id 생성을 위함
import zipfile
from typing import List, Dict, Any


class ZIPJSONProblemParser:
    """
    ZIP 파일 내부에 있는 JSON 파일들과 테스트 케이스들을 파싱하고 저장하는 클래스.
    """

    def __init__(self, zip_file_path: str, destination_test_case_base_path: str):
        self.zip_file_path = zip_file_path
        self.destination_test_case_base_path = destination_test_case_base_path
        os.makedirs(self.destination_test_case_base_path, exist_ok=True)  # 기본 경로가 없으면 생성

    def parse(self) -> List[Dict[str, Any]]:
        """
        ZIP 파일 내의 각 문제 디렉토리에서 JSON 파일과 테스트 케이스를 파싱하고 저장합니다.
        """
        all_problems_data: List[Dict[str, Any]] = []

        try:
            with zipfile.ZipFile(self.zip_file_path, 'r') as zf:
                namelist = zf.namelist()  # ZIP 파일 내의 모든 파일 목록

                problem_dirs = {}  # { '1/': { 'json_file': '1/problem_a.json', 'test_case_dir_in_zip': '1/test_cases/' } }

                for name in namelist:
                    # macOS 메타데이터 파일 건너뛰기
                    if name.startswith('__MACOSX/') or '/._' in name:
                        continue

                    if name.endswith('.json'):
                        parent_dir = os.path.dirname(name)  # 예: '1' 또는 루트의 경우 ''
                        if parent_dir and not parent_dir.endswith('/'):  # 일관성을 위해 '/' 추가
                            parent_dir += '/'

                        if parent_dir not in problem_dirs:
                            problem_dirs[parent_dir] = {'json_file': None, 'test_case_dir_in_zip': None}
                        problem_dirs[parent_dir]['json_file'] = name
                    elif '/test_cases/' in name and not name.endswith('/'):  # test_cases 디렉토리 식별
                        parts = name.split('/test_cases/')
                        parent_dir = parts[0] + '/' if parts[0] else ''  # 문제 디렉토리 (예: '1/')

                        if parent_dir not in problem_dirs:
                            problem_dirs[parent_dir] = {'json_file': None, 'test_case_dir_in_zip': None}
                        problem_dirs[parent_dir][
                            'test_case_dir_in_zip'] = parent_dir + 'test_cases/'  # ZIP 내의 test_cases 기본 경로

                if not problem_dirs:
                    raise ValueError("ZIP 아카이브 내에 문제 정의 JSON 파일이 없습니다.")

                for p_dir, p_info in problem_dirs.items():
                    json_file_in_zip = p_info.get('json_file')
                    test_case_dir_in_zip = p_info.get('test_case_dir_in_zip')

                    if not json_file_in_zip:
                        print(f"경고: 디렉토리 '{p_dir}'에 JSON 문제 정의 파일이 없습니다. 건너뜁니다.")
                        continue

                    # 1. JSON 파일 파싱
                    with zf.open(json_file_in_zip) as json_file_obj:
                        raw_content = json_file_obj.read()
                        try:
                            json_content = raw_content.decode('utf-8')
                        except UnicodeDecodeError as e:
                            raise ValueError(f"파일 '{json_file_in_zip}'의 인코딩 문제: {e}")

                        try:
                            problem_data = json.loads(json_content)
                            if isinstance(problem_data, list):  # JSON이 리스트 형태면 첫 번째 문제만 가져옴
                                if problem_data:
                                    problem_data = problem_data[0]
                                else:
                                    print(f"경고: 파일 '{json_file_in_zip}'은(는) 빈 JSON 리스트입니다. 건너뜁니다.")
                                    continue
                            elif not isinstance(problem_data, dict):
                                print(f"경고: 파일 '{json_file_in_zip}'은(는) 유효한 JSON 객체 또는 리스트가 아닙니다. 건너뜁니다.")
                                continue
                        except json.JSONDecodeError as e:
                            raise ValueError(f"파일 '{json_file_in_zip}' 파싱 중 JSON 오류 발생: {e}")
                        except Exception as e:
                            raise ValueError(f"파일 '{json_file_in_zip}' 파싱 중 알 수 없는 오류 발생: {e}")

                    # 2. 테스트 케이스 저장
                    if test_case_dir_in_zip:
                        # 이 문제의 테스트 케이스를 위한 고유 ID 생성
                        unique_test_case_id = str(uuid.uuid4())
                        problem_data['test_case_id'] = unique_test_case_id  # 문제 데이터에 ID 업데이트

                        destination_path = os.path.join(self.destination_test_case_base_path, unique_test_case_id)
                        os.makedirs(destination_path, exist_ok=True)

                        # test_cases/ 디렉토리 내의 파일들만 추출
                        for member in namelist:
                            if member.startswith(test_case_dir_in_zip) and not member.endswith(
                                    '/'):  # test_cases 내의 파일인 경우
                                relative_path = os.path.relpath(member, test_case_dir_in_zip)
                                dest_file_path = os.path.join(destination_path, relative_path)
                                os.makedirs(os.path.dirname(dest_file_path), exist_ok=True)  # 하위 디렉토리 생성 보장

                                with zf.open(member) as source, open(dest_file_path, 'wb') as target:
                                    shutil.copyfileobj(source, target)

                        # --- 'info' JSON 파일 생성 ---
                        info_file_path = os.path.join(destination_path, "info")
                        test_case_info_for_file = {"spj": problem_data.get("spj", False), "test_cases": {}}

                        # problem_data['test_case_score']를 사용하여 'info' 파일의 'test_cases' 딕셔너리 재구성
                        if problem_data.get('test_case_score'):
                            for idx, tc_score_item in enumerate(problem_data['test_case_score']):
                                # 'info' 파일은 input_name, output_name, score를 기대합니다.
                                test_case_info_for_file["test_cases"][str(idx + 1)] = {
                                    "input_name": tc_score_item.get("input_name"),
                                    "output_name": tc_score_item.get("output_name"),
                                    "score": tc_score_item.get("score", 0)
                                }

                        with open(info_file_path, "w", encoding="utf-8") as f:
                            json.dump(test_case_info_for_file, f, indent=4)
                        # --- 'info' JSON 파일 생성 끝 ---

                    else:
                        # test_cases 디렉토리가 없으면 test_case_id를 None으로 설정
                        problem_data['test_case_id'] = None

                    all_problems_data.append(problem_data)

        except zipfile.BadZipFile:
            raise ValueError("유효하지 않은 ZIP 파일입니다.")
        except Exception as e:
            raise ValueError(f"ZIP 파일 처리 중 오류 발생: {e}")

        return all_problems_data
