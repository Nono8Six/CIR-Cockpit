"""Extraction des corrélations constructeur Bonfiglioli M11.

Les tableaux sont lus après rotation. ``pdfplumber.extract_tables`` conserve
les colonnes géométriques : une colonne de puissance définit un groupe de
désignations explicitement corrélées par le constructeur.
"""
from __future__ import annotations

import itertools
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (PDF_DIR, OUT_DIR, make_provenance, open_page_rotated,
                    sha256_of, to_float, write_json)

PDF_NAME = "Catalogue_BONFIGLIOLI_Moteur.pdf"

# Contexte vérifié dans le flux M11.1 puis M11.2. Les numéros de figure sont
# ceux imprimés dans le catalogue ; les indices sont ceux de extract_tables().
CORRELATION_TABLES = (
    (54, 1, "F64", 50, 4),
    (54, 2, "F65", 50, 2),
    (55, 1, "F66", 50, 6),
    (55, 0, "F67", 60, 2),
    (56, 1, "F68", 60, 4),
    (56, 0, "F69", 60, 6),
)

IE_CLASS = re.compile(r"^IE[1-4]$")
DESIGNATION = re.compile(r"\b(BN|BE|BX|BY|M|ME|MX)\s*([0-9]{1,3}[A-Z]{0,3})\s+(2|4|6)\b")


def find_power_row(table: list[list[str | None]]) -> list[str | None]:
    """Trouve la ligne contenant les puissances, et non les en-têtes."""
    for row in table:
        if sum(to_float(cell) is not None for cell in row if cell is not None) >= 5:
            return row
    raise ValueError("ligne de puissances introuvable")


def parse_cell(cell: str | None, expected_poles: int) -> list[str]:
    """Retourne toutes les désignations documentées dans une cellule."""
    if not cell:
        return []
    normalized = re.sub(r"\s+", " ", cell)
    types = []
    for series, frame, poles in DESIGNATION.findall(normalized):
        if int(poles) == expected_poles:
            types.append(f"{series} {frame}")
    return types


def correlation_rows(table: list[list[str | None]], pdf_page: int,
                     figure: str, frequency_hz: int, poles: int,
                     sha: str) -> list[dict]:
    powers = find_power_row(table)
    by_power: dict[int, list[dict]] = {}
    for row in table:
        row_class = next((str(cell).strip() for cell in reversed(row) if cell and IE_CLASS.match(str(cell).strip())), None)
        if row_class is None:
            continue
        for index, cell in enumerate(row):
            power = to_float(powers[index]) if index < len(powers) else None
            if power is None:
                continue
            for motor_type in parse_cell(cell, poles):
                by_power.setdefault(index, []).append({
                    "type": motor_type,
                    "efficiencyClass": row_class,
                    "powerKw": power,
                })

    provenance = make_provenance(
        PDF_NAME, sha, pdf_page, figure, "pdfplumber-rotated-table",
    )
    records: list[dict] = []
    for entries in by_power.values():
        # Une paire est sans orientation : A-B et B-A ne sont jamais dupliquées.
        for left, right in itertools.combinations(entries, 2):
            records.append({
                "brand": "Bonfiglioli",
                "powerKw": left["powerKw"],
                "poles": poles,
                "frequencyHz": frequency_hz,
                "left": {"type": left["type"], "efficiencyClass": left["efficiencyClass"]},
                "right": {"type": right["type"], "efficiencyClass": right["efficiencyClass"]},
                "provenance": provenance,
            })
    return records


def main() -> None:
    pdf_path = PDF_DIR / PDF_NAME
    sha = sha256_of(pdf_path)
    all_rows: list[dict] = []
    for pdf_page, table_index, figure, frequency_hz, poles in CORRELATION_TABLES:
        page, ctx = open_page_rotated(pdf_path, pdf_page - 1)
        try:
            tables = page.extract_tables()
        finally:
            ctx.close()
        rows = correlation_rows(
            tables[table_index], pdf_page, figure, frequency_hz, poles, sha,
        )
        print(f"  {figure} page {pdf_page} ({frequency_hz} Hz, {poles} poles) : {len(rows)} paires")
        all_rows.extend(rows)
    write_json(OUT_DIR / "bonfiglioli-correlation.json", all_rows)


if __name__ == "__main__":
    main()
