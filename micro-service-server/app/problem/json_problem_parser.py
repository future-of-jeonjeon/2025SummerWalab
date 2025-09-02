import json
import hashlib
import os
import shutil
import uuid  
import zipfile
from typing import List, Dict, Any


class ZIPJSONProblemParser:
    def __init__(self, zip_file_path: str, destination_test_case_base_path: str):
        self.zip_file_path = zip_file_path
        self.destination_test_case_base_path = destination_test_case_base_path
        os.makedirs(self.destination_test_case_base_path, exist_ok=True)  # 기본 경로가 없으면 생성

    def parse(self) -> List[Dict[str, Any]]:
        all_problems_data: List[Dict[str, Any]] = []

        try:
            with zipfile.ZipFile(self.zip_file_path, 'r') as zf:
                namelist = zf.namelist()  
                problem_dirs = {}  
                for name in namelist:
                    if name.startswith('__MACOSX/') or '/._' in name:
                        continue

                    if name.endswith('.json'):
                        parent_dir = os.path.dirname(name)
                        if parent_dir and not parent_dir.endswith('/'):  
                            parent_dir += '/'

                        if parent_dir not in problem_dirs:
                            problem_dirs[parent_dir] = {'json_file': None, 'test_case_dir_in_zip': None}
                        problem_dirs[parent_dir]['json_file'] = name
                    elif '/test_cases/' in name and not name.endswith('/'):
                        parts = name.split('/test_cases/')
                        parent_dir = parts[0] + '/' if parts[0] else ''  
                        if parent_dir not in problem_dirs:
                            problem_dirs[parent_dir] = {'json_file': None, 'test_case_dir_in_zip': None}
                        problem_dirs[parent_dir][
                            'test_case_dir_in_zip'] = parent_dir + 'test_cases/'  

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
                            if isinstance(problem_data, list):
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

                    if test_case_dir_in_zip:
                        unique_test_case_id = str(uuid.uuid4())
                        problem_data['test_case_id'] = unique_test_case_id  
                        destination_path = os.path.join(self.destination_test_case_base_path, unique_test_case_id)
                        os.makedirs(destination_path, exist_ok=True)
                        for member in namelist:
                            if member.startswith(test_case_dir_in_zip) and not member.endswith(
                                    '/'):  
                                relative_path = os.path.relpath(member, test_case_dir_in_zip)
                                dest_file_path = os.path.join(destination_path, relative_path)
                                os.makedirs(os.path.dirname(dest_file_path), exist_ok=True)  
                                with zf.open(member) as source, open(dest_file_path, 'wb') as target:
                                    shutil.copyfileobj(source, target)
                        if not problem_data.get('test_case_score'):
                            generated_scores = []
                            index = 1
                            while True:
                                in_name = f"{index}.in"
                                out_name = f"{index}.out"
                                in_path = os.path.join(destination_path, in_name)
                                out_path = os.path.join(destination_path, out_name)
                                if os.path.isfile(in_path) and os.path.isfile(out_path):
                                    generated_scores.append({
                                        "input_name": in_name,
                                        "output_name": out_name,
                                        "score": 0
                                    })
                                    index += 1
                                    continue
                                else:
                                    break
                            if not generated_scores:
                                all_files = {f for f in os.listdir(destination_path) if os.path.isfile(os.path.join(destination_path, f))}
                                in_files = sorted([f for f in all_files if f.endswith('.in')])
                                for in_file in in_files:
                                    prefix = in_file[:-3]
                                    out_file = prefix + '.out'
                                    if out_file in all_files:
                                        generated_scores.append({
                                            "input_name": in_file,
                                            "output_name": out_file,
                                            "score": 0
                                        })
                            if problem_data.get("spj") and not generated_scores:
                                all_files = {f for f in os.listdir(destination_path) if os.path.isfile(os.path.join(destination_path, f))}
                                in_files = sorted([f for f in all_files if f.endswith('.in')])
                                for in_file in in_files:
                                    generated_scores.append({
                                        "input_name": in_file,
                                        "output_name": None,
                                        "score": 0
                                    })

                            if generated_scores:
                                problem_data['test_case_score'] = generated_scores
                        info_file_path = os.path.join(destination_path, "info")
                        test_case_info_for_file = {"spj": problem_data.get("spj", False), "test_cases": {}}
                        size_cache = {}
                        md5_cache = {}
                        for f in os.listdir(destination_path):
                            f_path = os.path.join(destination_path, f)
                            if not os.path.isfile(f_path):
                                continue
                            try:
                                with open(f_path, 'rb') as fh:
                                    content = fh.read()
                                    size_cache[f] = len(content)
                                    if f.endswith('.out'):
                                        md5_cache[f] = hashlib.md5(content.rstrip()).hexdigest()
                            except Exception:
                                continue
                        if problem_data.get('test_case_score'):
                            spj_mode = bool(problem_data.get('spj'))
                            for idx, tc_score_item in enumerate(problem_data['test_case_score']):
                                input_name = tc_score_item.get("input_name")
                                output_name = tc_score_item.get("output_name")
                                entry = {
                                    "input_name": input_name,
                                    "score": tc_score_item.get("score", 0),
                                }
                                if not spj_mode:
                                    entry.update({
                                        "output_name": output_name,
                                        "input_size": size_cache.get(input_name, 0),
                                        "output_size": size_cache.get(output_name, 0),
                                        "stripped_output_md5": md5_cache.get(output_name, ""),
                                    })
                                else:
                                    entry.update({
                                        "input_size": size_cache.get(input_name, 0),
                                    })
                                test_case_info_for_file["test_cases"][str(idx + 1)] = entry
                        with open(info_file_path, "w", encoding="utf-8") as f:
                            json.dump(test_case_info_for_file, f, indent=4)
                    else:
                        problem_data['test_case_id'] = None
                    all_problems_data.append(problem_data)

        except zipfile.BadZipFile:
            raise ValueError("unvalid ZIP file ")
        except Exception as e:
            raise ValueError(f"Error: {e}")

        return all_problems_data
