import xml.etree.ElementTree as ET
import zipfile
from datetime import datetime
from typing import List, Dict, Any


class FPSParserSQLAlchemy:
    """
    FPS (Free Problem Set) 형식의 XML 또는 ZIP 파일을 파싱하는 클래스.
    기존 Django의 FPSParser를 대체하며, Django 의존성이 없습니다.
    """

    def __init__(self, file_path: str):
        self.file_path = file_path

    def parse(self) -> List[Dict[str, Any]]:
        """
        파일 경로에 따라 XML 또는 ZIP 파일을 파싱하고, 문제 데이터 리스트를 반환합니다.
        """
        if self.file_path.endswith(".zip"):
            return self._parse_zip()
        elif self.file_path.endswith(".xml"):
            return self._parse_xml(self.file_path)
        else:
            raise ValueError("지원하지 않는 파일 형식입니다. .zip 또는 .xml 파일만 지원됩니다.")

    def _parse_zip(self) -> List[Dict[str, Any]]:
        """
        ZIP 파일 내의 XML 파일을 찾아 파싱합니다.
        """
        with zipfile.ZipFile(self.file_path, 'r') as zf:
            xml_file_name = None
            # ZIP 파일 내에서 .xml 파일을 찾습니다. (보통 fps.xml)
            for name in zf.namelist():
                if name.endswith('.xml'):
                    xml_file_name = name
                    break
            if not xml_file_name:
                raise ValueError("ZIP 아카이브 내에 XML 파일이 없습니다.")

            with zf.open(xml_file_name) as xml_file:
                xml_content = xml_file.read()
                return self._parse_xml_content(xml_content)

    def _parse_xml(self, xml_path: str) -> List[Dict[str, Any]]:
        """
        XML 파일을 직접 파싱합니다.
        """
        with open(xml_path, 'rb') as f:
            xml_content = f.read()
            return self._parse_xml_content(xml_content)

    def _parse_xml_content(self, xml_content: bytes) -> List[Dict[str, Any]]:
        """
        XML 내용을 파싱하여 문제 데이터 딕셔너리 리스트를 생성합니다.
        FPS XML 구조에 대한 가정을 기반으로 합니다.
        """
        root = ET.fromstring(xml_content)
        problems_data = []

        # <fps> 루트 아래의 각 <problem> 요소를 찾습니다.
        for problem_elem in root.findall('problem'):
            problem_dict = {}

            # 직접 매핑되는 필드들
            problem_dict['_id'] = problem_elem.findtext('id')
            problem_dict['title'] = problem_elem.findtext('title')
            problem_dict['description'] = problem_elem.findtext('description')
            problem_dict['input_description'] = problem_elem.findtext('input_description')
            problem_dict['output_description'] = problem_elem.findtext('output_description')

            # samples 파싱: <samples><sample><input>...</input><output>...</output></sample></samples>
            samples = []
            for sample_elem in problem_elem.findall('samples/sample'):
                samples.append({
                    'input': sample_elem.findtext('input'),
                    'output': sample_elem.findtext('output')
                })
            problem_dict['samples'] = samples

            problem_dict['test_case_id'] = problem_elem.findtext('test_case_id')

            # test_case_score 파싱: <test_case_score><case><input_name>...</input_name><output_name>...</output_name><score>...</score></case></test_case_score>
            test_case_score = []
            for case_elem in problem_elem.findall('test_case_score/case'):
                test_case_score.append({
                    'input_name': case_elem.findtext('input_name'),
                    'output_name': case_elem.findtext('output_name'),
                    'score': int(case_elem.findtext('score', '0'))
                })
            problem_dict['test_case_score'] = test_case_score if test_case_score else None

            problem_dict['hint'] = problem_elem.findtext('hint')

            # languages 파싱: <languages><language>...</language></languages>
            languages = [lang.text for lang in problem_elem.findall('languages/language')]
            problem_dict['languages'] = languages

            # template 파싱: <template><lang name="python"><code>...</code></lang></template>
            template = {}
            for lang_elem in problem_elem.findall('template/lang'):
                template[lang_elem.get('name')] = lang_elem.findtext('code')
            problem_dict['template'] = template

            problem_dict['time_limit'] = int(problem_elem.findtext('time_limit', '0'))
            problem_dict['memory_limit'] = int(problem_elem.findtext('memory_limit', '0'))

            # io_mode 파싱: <io_mode><mode>...</mode><input>...</input><output>...</output></io_mode>
            io_mode_elem = problem_elem.find('io_mode')
            if io_mode_elem:
                problem_dict['io_mode'] = {
                    'io_mode': io_mode_elem.findtext('mode'),
                    'input': io_mode_elem.findtext('input'),
                    'output': io_mode_elem.findtext('output')
                }
            else:
                problem_dict['io_mode'] = {"io_mode": "Standard IO", "input": "input.txt", "output": "output.txt"}

            problem_dict['spj'] = problem_elem.findtext('spj') == 'true'
            problem_dict['spj_language'] = problem_elem.findtext('spj_language')
            problem_dict['spj_code'] = problem_elem.findtext('spj_code')
            problem_dict['spj_version'] = problem_elem.findtext('spj_version')
            problem_dict['spj_compile_ok'] = problem_elem.findtext('spj_compile_ok') == 'true'

            problem_dict['rule_type'] = problem_elem.findtext('rule_type', 'OI')
            problem_dict['visible'] = problem_elem.findtext('visible') == 'true'
            problem_dict['difficulty'] = problem_elem.findtext('difficulty')
            problem_dict['source'] = problem_elem.findtext('source')
            problem_dict['total_score'] = int(problem_elem.findtext('total_score', '0'))

            # tags 파싱: <tags><tag>...</tag></tags>
            tags = [tag.text for tag in problem_elem.findall('tags/tag')]
            problem_dict['tags'] = tags

            # 기본값 설정 (FPS에 없을 수 있는 필드)
            problem_dict['submission_number'] = 0
            problem_dict['accepted_number'] = 0
            problem_dict['statistic_info'] = {}
            problem_dict['share_submission'] = False
            problem_dict['create_time'] = datetime.now()
            problem_dict['last_update_time'] = datetime.now()

            problems_data.append(problem_dict)

        return problems_data