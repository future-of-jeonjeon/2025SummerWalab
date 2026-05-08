#!/usr/bin/env python3
from __future__ import annotations

import csv
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Dict, List
from xml.etree import ElementTree as ET
from zipfile import ZipFile
from xml.sax.saxutils import escape


NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
TARGET_COLUMNS = ["D", "E", "F", "G", "H", "I", "J", "K"]
SATISFIED_VALUE = "그렇다"
VERY_SATISFIED_VALUE = "매우 그렇다"
SHORT_LABELS = {
    "D": "UI 불편함 없음",
    "E": "UI 친숙성",
    "F": "코드 실행/테스트 유용성",
    "G": "제출 결과 확인 용이성",
    "H": "비대면 시험 진행 원활성",
    "I": "플랫폼 전반 만족도",
    "J": "단체 대회 개최 사용 의향",
    "K": "소규모 코딩테스트 적합성",
}


def col_key(cell_ref: str) -> str:
    match = re.match(r"([A-Z]+)", cell_ref)
    if not match:
        raise ValueError(f"Unexpected cell reference: {cell_ref}")
    return match.group(1)


def get_shared_string_text(si: ET.Element) -> str:
    return "".join(
        text_node.text or ""
        for text_node in si.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")
    )


def read_sheet_rows(xlsx_path: Path) -> List[Dict[str, str]]:
    with ZipFile(xlsx_path) as archive:
        shared_strings: List[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            shared_root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            shared_strings = [
                get_shared_string_text(si) for si in shared_root.findall("a:si", NS)
            ]

        sheet_root = ET.fromstring(archive.read("xl/worksheets/sheet1.xml"))
        rows: List[Dict[str, str]] = []

        for row in sheet_root.find("a:sheetData", NS).findall("a:row", NS):
            values: Dict[str, str] = {}

            for cell in row.findall("a:c", NS):
                column = col_key(cell.attrib["r"])
                cell_type = cell.attrib.get("t")
                value_node = cell.find("a:v", NS)

                if cell_type == "s" and value_node is not None:
                    value = shared_strings[int(value_node.text)]
                elif cell_type == "inlineStr":
                    inline_node = cell.find("a:is", NS)
                    value = (
                        "".join(
                            text_node.text or ""
                            for text_node in inline_node.iter(
                                "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t"
                            )
                        )
                        if inline_node is not None
                        else ""
                    )
                else:
                    value = value_node.text if value_node is not None else ""

                values[column] = (value or "").strip()

            rows.append(values)

    return rows


def wrap_text(text: str, max_chars: int = 28) -> List[str]:
    words = text.split()
    if not words:
        return [text]

    lines: List[str] = []
    current = words[0]

    for word in words[1:]:
        candidate = f"{current} {word}"
        if len(candidate) <= max_chars:
            current = candidate
        else:
            lines.append(current)
            current = word

    lines.append(current)
    return lines


def make_svg(stats: List[Dict[str, object]], output_path: Path) -> None:
    width = 1920
    height = 1080
    top_margin = 220
    bottom_margin = 140
    left_margin = 650
    right_margin = 130
    plot_width = width - left_margin - right_margin
    label_line_height = 30
    bar_height = 36
    row_region_height = height - top_margin - bottom_margin
    row_step = row_region_height / max(len(stats), 1)

    colors = {
        "positive": "#2563EB",
        "grid": "#D1D5DB",
        "axis": "#6B7280",
        "text": "#111827",
        "subtext": "#4B5563",
    }

    svg_parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        '<rect width="100%" height="100%" fill="#FFFFFF"/>',
        (
            '<text x="40" y="50" fill="#111827" '
            'font-family="Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR, sans-serif" '
            'font-size="52" font-weight="700">'
            "플랫폼 사용 만족도 문항별 긍정 응답 비율"
            "</text>"
        ),
        (
            '<text x="40" y="104" fill="#4B5563" '
            'font-family="Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR, sans-serif" '
            'font-size="26">'
            "대상 문항: D~K / 기준: 만족+매우 만족 / 전체 응답 56명"
            "</text>"
        ),
    ]

    legend_y = 152
    legend_x = 40
    svg_parts.append(
        f'<rect x="{legend_x}" y="{legend_y - 16}" width="28" height="28" rx="6" fill="{colors["positive"]}"/>'
    )
    svg_parts.append(
        (
            f'<text x="{legend_x + 42}" y="{legend_y + 6}" fill="{colors["subtext"]}" '
            'font-family="Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR, sans-serif" '
            'font-size="24">긍정 응답(만족+매우 만족)</text>'
        )
    )

    for tick in range(0, 101, 20):
        x = left_margin + plot_width * tick / 100
        svg_parts.append(
            f'<line x1="{x:.2f}" y1="{top_margin - 28}" x2="{x:.2f}" y2="{height - bottom_margin + 12}" '
            f'stroke="{colors["grid"]}" stroke-width="1"/>'
        )
        svg_parts.append(
            (
                f'<text x="{x:.2f}" y="{height - bottom_margin + 50}" fill="{colors["axis"]}" '
                'font-family="Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR, sans-serif" '
                f'font-size="22" text-anchor="middle">{tick}%</text>'
            )
        )

    for idx, item in enumerate(stats):
        center_y = top_margin + row_step * (idx + 0.5)
        label_lines = wrap_text(str(item["question"]), max_chars=20)
        label_block_height = len(label_lines) * label_line_height
        label_start_y = center_y - label_block_height / 2 + 10

        for line_idx, line in enumerate(label_lines):
            svg_parts.append(
                (
                    f'<text x="{left_margin - 32}" y="{label_start_y + line_idx * label_line_height:.2f}" '
                    f'fill="{colors["text"]}" '
                    'font-family="Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR, sans-serif" '
                    'font-size="28" font-weight="600" text-anchor="end">'
                    f"{escape(line)}"
                    "</text>"
                )
            )

        y = center_y - bar_height / 2
        positive_pct = float(item["positive_pct"])
        bar_width = plot_width * positive_pct / 100

        svg_parts.append(
            f'<rect x="{left_margin}" y="{y:.2f}" width="{plot_width}" height="{bar_height}" '
            'rx="14" fill="#EEF2F7"/>'
        )
        svg_parts.append(
            f'<rect x="{left_margin}" y="{y:.2f}" width="{bar_width:.2f}" height="{bar_height}" '
            f'rx="14" fill="{colors["positive"]}"/>'
        )
        value_x = min(left_margin + bar_width + 14, width - right_margin + 56)
        svg_parts.append(
            (
                f'<text x="{value_x:.2f}" y="{y + 26:.2f}" fill="{colors["text"]}" '
                'font-family="Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR, sans-serif" '
                f'font-size="24" font-weight="600">{positive_pct:.1f}%</text>'
            )
        )

    svg_parts.append("</svg>")
    output_path.write_text("\n".join(svg_parts), encoding="utf-8")


def write_summary_csv(stats: List[Dict[str, object]], output_path: Path) -> None:
    with output_path.open("w", newline="", encoding="utf-8-sig") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(
            [
                "column",
                "short_question",
                "full_question",
                "total_responses",
                "positive_count",
                "positive_pct",
            ]
        )
        for item in stats:
            writer.writerow(
                [
                    item["column"],
                    item["question"],
                    item["full_question"],
                    item["total"],
                    item["positive_count"],
                    f'{float(item["positive_pct"]):.1f}',
                ]
            )


def build_stats(rows: List[Dict[str, str]]) -> List[Dict[str, object]]:
    if not rows:
        raise ValueError("No rows found in the workbook.")

    headers = rows[0]
    data_rows = rows[1:]
    stats: List[Dict[str, object]] = []

    for column in TARGET_COLUMNS:
        answers = [row.get(column, "").strip() for row in data_rows if row.get(column, "").strip()]
        counts = Counter(answers)
        total = len(answers)
        if total == 0:
            continue

        satisfied_count = counts[SATISFIED_VALUE]
        very_satisfied_count = counts[VERY_SATISFIED_VALUE]
        positive_count = satisfied_count + very_satisfied_count
        full_question = headers.get(column, column)

        stats.append(
            {
                "column": column,
                "question": SHORT_LABELS.get(column, full_question),
                "full_question": full_question,
                "total": total,
                "positive_count": positive_count,
                "positive_pct": positive_count / total * 100,
            }
        )

    return stats


def main() -> int:
    input_path = (
        Path(sys.argv[1]).expanduser()
        if len(sys.argv) > 1
        else Path(
            "/Users/parkjunhyun/Downloads/코딩테스트 플렛폼 이용 만족도조사 및 코딩테스트 운영 관련 설문 (응답).xlsx"
        )
    )
    output_dir = (
        Path(sys.argv[2]).expanduser()
        if len(sys.argv) > 2
        else Path("docs/survey_analysis")
    )

    output_dir.mkdir(parents=True, exist_ok=True)

    rows = read_sheet_rows(input_path)
    stats = build_stats(rows)

    svg_path = output_dir / "platform_satisfaction_d_to_k.svg"
    csv_path = output_dir / "platform_satisfaction_d_to_k_summary.csv"

    make_svg(stats, svg_path)
    write_summary_csv(stats, csv_path)

    print(f"input={input_path}")
    print(f"chart={svg_path.resolve()}")
    print(f"summary={csv_path.resolve()}")
    print("rows=" + str(len(rows) - 1))
    for item in stats:
        print(f'{item["column"]}: 긍정 응답 {float(item["positive_pct"]):.1f}%')
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
