"""Extrait les seuils IEC TS 60034-30-2 de la page 6 Dyneo+."""
from __future__ import annotations

import re
from pathlib import Path

import pdfplumber

from common import PDF_DIR, OUT_DIR, make_provenance, sha256_of, to_float, write_json


PDF_NAME = "Dyneo   IE5.pdf"
PDF_PAGE = 6
STANDARD = "IEC TS 60034-30-2:2016"


def main() -> None:
    pdf_path = PDF_DIR / PDF_NAME
    sha = sha256_of(pdf_path)
    with pdfplumber.open(pdf_path) as pdf:
        text = pdf.pages[PDF_PAGE - 1].extract_text(x_tolerance=2, y_tolerance=3) or ""

    rows = []
    # Chaque ligne contient d'abord les quatre classes 30-1, puis les cinq
    # classes 30-2. Ne conserver que ces cinq dernières valeurs.
    for line in text.splitlines():
        values = re.findall(r"\d+(?:\.\d+)?", line)
        if len(values) != 10 or values[0] not in {"11", "15", "18.5", "22", "30", "37", "45", "55", "75", "90", "110", "132", "160", "200"}:
            continue
        power = to_float(values[0])
        for efficiency_class, min_efficiency in zip(("IE1", "IE2", "IE3", "IE4", "IE5"), values[5:]):
            rows.append({
                "efficiencyClass": efficiency_class,
                "speedMinRpm": 1801,
                "speedMaxRpm": 6000,
                "powerKw": power,
                "minEfficiency": to_float(min_efficiency),
                "standardRef": STANDARD,
                "provenance": make_provenance(PDF_NAME, sha, PDF_PAGE, str(PDF_PAGE), "pdfplumber-text-right-block"),
            })

    if len(rows) != 65:
        raise ValueError(f"Table IEC 30-2 incomplète : {len(rows)} lignes (65 attendues)")
    checks = {11.0: 93.2, 15.0: 93.7, 22.0: 94.4, 55.0: 95.7}
    actual = {r["powerKw"]: r["minEfficiency"] for r in rows if r["efficiencyClass"] == "IE5"}
    if any(actual.get(power) != value for power, value in checks.items()):
        raise ValueError(f"Contrôle IE5 échoué : {actual}")
    write_json(OUT_DIR / "iec-30-2-thresholds.json", rows)


if __name__ == "__main__":
    main()
