from app.exception import handlers
from app.exception.codes import ErrorCode


def problem_not_found():
    handlers.not_found("Problem not found", ErrorCode.PROBLEM_NOT_FOUND)


def polling_not_found():
    handlers.not_found("Polling data not found", ErrorCode.POLLING_NOT_FOUND)


def bad_zip_file():
    handlers.bad_request("Bad zip file", ErrorCode.BAD_REQUEST)


def empty_zip_file():
    handlers.bad_request("Empty file", ErrorCode.BAD_REQUEST)


def invalid_sort_parameter(param: str):
    handlers.bad_request(f"Invalid sort_by parameter: {param}", ErrorCode.BAD_REQUEST)


def format_error(detail: str):
    handlers.bad_request(f"Format Error: {detail}", ErrorCode.PROBLEM_IMPORT_FORMAT_ERROR)


def missing_file_error(filename: str):
    handlers.bad_request(f"Missing File: {filename}", ErrorCode.PROBLEM_IMPORT_MISSING_FILE)


def invalid_metadata(detail: str):
    handlers.bad_request(f"Invalid Metadata: {detail}", ErrorCode.PROBLEM_IMPORT_INVALID_METADATA)


def judge_server_error():
    handlers.bad_request(f"Judge Server Error", ErrorCode.PROBLEM_JUDGE_SERVER_ERROR)


def test_case_not_match(input_str: str, output_str: str, result_str: str):
    message = (
        f"Problem Test Case Not Match\n"
        f"- Input: {input_str}\n"
        f"- Output: {output_str}\n"
        f"- Judge Server Result: {result_str}"
    )
    handlers.bad_request(message, ErrorCode.PROBLEM_TEST_CASE_NOT_MATCH)
