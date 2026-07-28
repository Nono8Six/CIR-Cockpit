"""Extraction des tables de puissances Bonfiglioli BX, MX et BY.

Les pages de caractéristiques sont pivotées dans le PDF. Elles sont ouvertes
par ``open_page_rotated`` avant toute lecture.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (PDF_DIR, OUT_DIR, RAW_DIR, make_provenance,
                    bonfiglioli_frame_size, open_page_rotated, sha256_of,
                    to_float, to_int, validate_frame_sizes, write_json)

PDF_NAME = "Catalogue_BONFIGLIOLI_Moteur.pdf"
RATING_PAGES = {57: "M12", 60: "M14", 61: "M14", 62: "M14",
                63: "M14", 64: "M14", 65: "M14"}

POLE_HEADER = re.compile(
    r"(?P<poles>\d)\s*P\s+(?P<speed>\d{3,4})\s*min-?1.*?(?P<frequency>\d{2})\s*Hz",
    re.IGNORECASE,
)
VOLTAGE_HEADER = re.compile(r"(?P<voltage>\d{3})V")
IE_CLASS_HEADER = re.compile(r"(?:BX|MX|BY)-(?P<ie>IE\d)", re.IGNORECASE)

PAGE_63_60HZ_VOLTAGE_NOTE = (
    'Page 63 imprime "400V" en en-tete, mais les courants publies correspondent '
    'a 460 V (ecart 0,0 % contre 15,1 %). Pages 62 et 65, memes 60 Hz, declarent '
    '460 V. Tension d\'emploi retenue : 460 V. Courant, puissance, rendement et '
    'cos phi conserves tels que publies.'
)

PAGE_60_INERTIA_NOTE = (
    "Inertia J is published in 10^-4 kg.m2 for this sub-30 kW row; converted "
    "to kg.m2 by multiplying by 1e-4. The low-power series is continuous across "
    "the BX and MX 50/60 Hz counterparts."
)
LARGE_MACHINE_INERTIA_NOTE = (
    "Inertia J is read directly in kg.m2. Although the printed header repeats "
    "10^-4, the J(P) series is continuous across pages 60/61 and the values on "
    "pages 57, 61, 63 and 65 are physically consistent only without conversion."
)

# pdfplumber colle parfois kW et hp (par exemple ``0.120.16``). Les puissances
# sont imprimées à deux décimales maximum, ce qui permet de séparer ces valeurs.
DATA_LINE = re.compile(
    r"^(?P<kw>\d+(?:\.\d{1,2})?)\s*(?P<hp>\d+(?:\.\d{1,2})?)\s+"
    r"(?P<type>(?:BX|MX|BY)\s?\d{1,3}[A-Z]{1,3})\s+"
    r"(?P<poles>\d)\s+(?P<rest>.+)$"
)


def parse_line(line: str, frequency_hz: int | None, voltage_v: int | None,
               efficiency_class: str | None, pdf_page: int,
               catalog_page: str, sha: str) -> dict | None:
    """Parse une ligne moteur déjà lue après rotation."""
    match = DATA_LINE.match(line.strip())
    if not match or frequency_hz is None or voltage_v is None or efficiency_class is None:
        return None

    tokens = match.group("rest").split()

    def num(index: int) -> float | None:
        return to_float(tokens[index]) if index < len(tokens) else None

    motor_type = re.sub(r"\s+", " ", match.group("type")).strip()
    series_match = re.match(r"^(BX|MX|BY)\s*(.+)$", motor_type)
    if series_match:
        motor_type = f"{series_match.group(1)} {series_match.group(2)}"
    frame_size, vendor_size_code = bonfiglioli_frame_size(motor_type, {"MX", "M", "ME"})
    brake_match = re.search(r"\b(FD\s?\d+[A-Z]?)\s+(\d+(?:\.\d+)?)", match.group("rest"))
    published_inertia = num(12)
    low_power_inertia = to_float(match.group("kw")) is not None and to_float(match.group("kw")) < 30
    inertia = (published_inertia * 1e-4
               if low_power_inertia and published_inertia is not None
               else published_inertia)
    corrected_voltage = 460 if pdf_page == 63 and frequency_hz == 60 else voltage_v
    provenance = make_provenance(
        PDF_NAME, sha, pdf_page, catalog_page, "pdfplumber-rotated",
    )
    notes: list[str] = []
    if corrected_voltage != voltage_v:
        notes.append(PAGE_63_60HZ_VOLTAGE_NOTE)
    if published_inertia is not None:
        notes.append(PAGE_60_INERTIA_NOTE if low_power_inertia else LARGE_MACHINE_INERTIA_NOTE)
    if notes:
        provenance = provenance | {"normalizationNote": " ".join(notes)}
    record = {
        "brand": "Bonfiglioli",
        "series": motor_type.split()[0],
        "type": motor_type,
        "poles": int(match.group("poles")),
        "frequencyHz": frequency_hz,
        "voltageV": corrected_voltage,
        "voltageCode": f"{corrected_voltage}-{frequency_hz}",
        "supplyMode": "mains",
        "efficiencyClass": efficiency_class,
        "frameSize": frame_size,
        "vendorSizeCode": vendor_size_code,
        "powerKw": to_float(match.group("kw")),
        "ratedSpeedRpm": to_int(num(0)),
        "ratedTorqueNm": num(1),
        "ratedCurrent400V": num(3),
        "efficiency100": num(4),
        "efficiency75": num(5),
        "efficiency50": num(6),
        "cosPhi100": num(7),
        "startingCurrentRatio": num(8),
        "startingTorqueRatio": num(9),
        "breakdownTorqueRatio": num(10),
        "inertiaKgm2": inertia,
        "weightB5Kg": num(14),
        "brakeModel": brake_match.group(1) if brake_match else None,
        "brakeTorqueNm": to_float(brake_match.group(2)) if brake_match else None,
        "provenance": provenance,
    }
    return record


def geometric_355_overrides(page) -> dict[tuple[str, int], dict]:
    """Relit les carcasses 355 dans les cellules géométriques non concaténées."""
    overrides: dict[tuple[str, int], dict] = {}
    for table in page.extract_tables():
        for row in table:
            if len(row) < 21 or not row[2] or "355" not in row[2]:
                continue
            columns = [
                str(cell).splitlines() if cell is not None else []
                for cell in row
            ]
            types = columns[2]
            for index, type_and_poles in enumerate(types):
                match = re.match(r"^(?P<type>(?:BX|MX|BY)\s+\S+)\s+(?P<poles>\d)$", type_and_poles)
                if not match or "355" not in match["type"]:
                    continue

                def value(column: int) -> float | None:
                    return to_float(columns[column][index])

                brake_model = columns[19][index] if index < len(columns[19]) else None
                inertia = value(15)
                overrides[(match["type"], int(match["poles"]))] = {
                    "ratedSpeedRpm": to_int(value(3)),
                    "ratedTorqueNm": value(4),
                    "ratedCurrent400V": value(6),
                    "efficiency100": value(7),
                    "efficiency75": value(8),
                    "efficiency50": value(9),
                    "cosPhi100": value(10),
                    "startingCurrentRatio": value(11),
                    "startingTorqueRatio": value(12),
                    "breakdownTorqueRatio": value(13),
                    "inertiaKgm2": inertia,
                    "weightB5Kg": value(17),
                    "brakeModel": brake_model,
                    "brakeTorqueNm": value(20),
                }
    return overrides


def main() -> None:
    pdf_path = PDF_DIR / PDF_NAME
    sha = sha256_of(pdf_path)
    all_rows: list[dict] = []
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    for pdf_page, catalog_page in sorted(RATING_PAGES.items()):
        page, ctx = open_page_rotated(pdf_path, pdf_page - 1)
        try:
            text = page.extract_text() or ""
            overrides_355 = geometric_355_overrides(page)
        finally:
            ctx.close()
        (RAW_DIR / f"bonfiglioli_p{pdf_page}.txt").write_text(text, encoding="utf-8")

        pole_header = POLE_HEADER.search(text)
        voltage_header = VOLTAGE_HEADER.search(text)
        ie_header = IE_CLASS_HEADER.search(text)
        frequency_hz = int(pole_header.group("frequency")) if pole_header else None
        voltage_v = int(voltage_header.group("voltage")) if voltage_header else None
        efficiency_class = ie_header.group("ie").upper() if ie_header else None
        count = 0
        for line in text.splitlines():
            record = parse_line(
                line, frequency_hz, voltage_v, efficiency_class,
                pdf_page, catalog_page, sha,
            )
            if record is not None and record["powerKw"] is not None and record["ratedSpeedRpm"] is not None:
                override = overrides_355.get((record["type"], record["poles"]))
                if override is not None:
                    record.update(override)
                all_rows.append(record)
                count += 1
        print(f"  page {pdf_page} ({catalog_page}, {frequency_hz} Hz, {efficiency_class}) : {count} moteurs")

    validate_frame_sizes(all_rows, "type", "caracteristiques Bonfiglioli")
    if any(
        row["cosPhi100"] is not None and not 0.1 <= row["cosPhi100"] <= 1
        for row in all_rows
    ):
        raise ValueError("cos phi Bonfiglioli hors [0,1]")
    write_json(OUT_DIR / "bonfiglioli.json", all_rows)


if __name__ == "__main__":
    main()
