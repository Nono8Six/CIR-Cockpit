"""Extraction du catalogue Leroy-Somer IMfinity."""
from __future__ import annotations

import re
import sys
from pathlib import Path

import pdfplumber

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (PDF_DIR, OUT_DIR, RAW_DIR, make_provenance, sha256_of,
                    to_float, to_int, write_json)

PDF_NAME = "Catalogue_LS_LSES.pdf"
CATALOG_EDITION = "5147 fr - 2023.08 / j"

# Page PDF -> (classe IE, matériau du carter, mode d'alimentation)
PAGE_SPECS = {
    58: ("IE2", "aluminium", "mains"),
    60: ("IE3", "aluminium", "mains"),
    62: ("IE3", "aluminium", "vfd"),
    88: ("IE3", "cast-iron", "mains"),
    90: ("IE3", "cast-iron", "vfd"),
    91: ("IE4", "cast-iron", "mains"),
    92: ("IE4", "cast-iron", "vfd"),
    118: ("IE3", "steel", "mains"),
    120: ("IE3", "steel", "vfd"),
    121: ("IE4", "steel", "mains"),
    122: ("IE4", "steel", "vfd"),
}

# Index pdfplumber -> champ, tables réseau.
COLUMNS = {
    1: "powerKw",
    2: "ratedTorqueNm",
    3: "startingTorqueRatio",
    4: "breakdownTorqueRatio",
    5: "startingCurrentRatio",
    6: "inertiaKgm2",
    7: "weightB3Kg",
    8: "noiseDb",
    9: "ratedSpeedRpm",
    10: "ratedCurrent400V",
    11: "efficiency100",
    12: "efficiency75",
    13: "efficiency50",
    14: "cosPhi100",
}

# Index pdfplumber -> champ, tables variateur.
COLUMNS_VFD = {
    1: "powerKw",
    2: "ratedSpeedRpm",
    3: "ratedCurrentA",
    4: "cosPhi100",
    5: "torque_10Hz",
    6: "torque_17Hz",
    7: "torque_25Hz",
    8: "torque_50Hz",
    9: "torque_87Hz",
    10: "powerKw_87",
    11: "ratedSpeedRpm_87",
    12: "ratedCurrentA_87",
    13: "cosPhi100_87",
    14: "maxMechSpeedRpm",
}

# Les grandes carcasses IE4 de la page 92 ne publient pas de bloc 87 Hz.
# La dernière colonne est la vitesse mécanique maximale.
COLUMNS_VFD_NO_87 = {
    1: "powerKw",
    2: "ratedSpeedRpm",
    3: "ratedCurrentA",
    4: "cosPhi100",
    5: "torque_10Hz",
    6: "torque_17Hz",
    7: "torque_25Hz",
    8: "torque_50Hz",
    9: "torque_60Hz",
    10: "maxMechSpeedRpm",
}

REQUIRED = ["powerKw", "ratedSpeedRpm", "ratedCurrent400V",
            "efficiency100", "cosPhi100", "ratedTorqueNm"]
REQUIRED_VFD = ["powerKw", "ratedSpeedRpm", "ratedCurrentA"]


def frame_size_from_type(type_name: str) -> int | None:
    """Extrait la hauteur d'axe depuis une désignation Leroy-Somer."""
    match = re.search(r"(?:LSES|FLSES|CILS|PLSES)\s*(\d{2,3})", type_name)
    return int(match.group(1)) if match else None


def base_record(first: str, current_poles: int, eff_class: str, casing: str,
                supply: str, pdf_page: int, sha: str) -> dict:
    """Métadonnées communes, toutes directement documentées par la page."""
    return {
        "brand": "Leroy-Somer",
        "series": first.split()[0],
        "type": first,
        "casingMaterial": casing,
        "poles": current_poles,
        "supplyMode": supply,
        "efficiencyClass": eff_class,
        "frameSize": frame_size_from_type(first),
        "provenance": make_provenance(
            PDF_NAME, sha, pdf_page, str(pdf_page), "pdfplumber-table"),
    }


def parse_mains_row(row: list, first: str, current_poles: int, eff_class: str,
                    casing: str, pdf_page: int, sha: str) -> dict | None:
    record = base_record(first, current_poles, eff_class, casing, "mains", pdf_page, sha)
    record.update({
        "frequencyHz": 50,
        "voltageV": 400,
        "voltageCode": "400-50",
        "coupling": None,
    })
    for idx, field in COLUMNS.items():
        record[field] = to_float(row[idx]) if idx < len(row) else None
    record["ratedSpeedRpm"] = to_int(record["ratedSpeedRpm"])
    return record if all(record.get(field) is not None for field in REQUIRED) else None


def torque_points(values: dict, frequencies: tuple[int, ...]) -> list[dict]:
    """Conserve uniquement les points de couple effectivement publiés."""
    points = []
    for frequency in frequencies:
        torque = values.get(f"torque_{frequency}Hz")
        if torque is not None:
            points.append({"frequencyHz": frequency, "torqueNm": torque})
    return points


def parse_vfd_row(row: list, first: str, current_poles: int, eff_class: str,
                  casing: str, pdf_page: int, sha: str) -> list[dict]:
    columns = COLUMNS_VFD_NO_87 if len(row) == 11 else COLUMNS_VFD
    values = {
        field: to_float(row[idx]) if idx < len(row) else None
        for idx, field in columns.items()
    }
    values["ratedSpeedRpm"] = to_int(values["ratedSpeedRpm"])
    if "ratedSpeedRpm_87" in values:
        values["ratedSpeedRpm_87"] = to_int(values["ratedSpeedRpm_87"])
    values["maxMechSpeedRpm"] = to_int(values["maxMechSpeedRpm"])
    if not all(values.get(field) is not None for field in REQUIRED_VFD):
        return []

    mains_point = base_record(first, current_poles, eff_class, casing, "vfd", pdf_page, sha)
    mains_point.update({
        "frequencyHz": 50,
        "voltageV": 400,
        "coupling": None,
        "powerKw": values["powerKw"],
        "ratedSpeedRpm": values["ratedSpeedRpm"],
        "ratedCurrentA": values["ratedCurrentA"],
        "cosPhi100": values["cosPhi100"],
        "efficiency100": None,
        "torquePoints": torque_points(values, (10, 17, 25, 50, 60)),
        "variantKey": f"P50 {values['powerKw']:g} kW",
    })
    if columns is COLUMNS_VFD_NO_87:
        mains_point["maxMechSpeedRpm"] = values["maxMechSpeedRpm"]
        return [mains_point]

    hz87_point = base_record(first, current_poles, eff_class, casing, "vfd", pdf_page, sha)
    hz87_point.update({
        "frequencyHz": 87,
        "voltageV": 400,
        "coupling": "D",
        "powerKw": values["powerKw_87"],
        "ratedSpeedRpm": values["ratedSpeedRpm_87"],
        "ratedCurrentA": values["ratedCurrentA_87"],
        "cosPhi100": values["cosPhi100_87"],
        "efficiency100": None,
        "torquePoints": torque_points(values, (87,)),
        "maxMechSpeedRpm": values["maxMechSpeedRpm"],
        "variantKey": f"P50 {values['powerKw']:g} kW",
    })
    records = [mains_point]
    # Une colonne 87 Hz vide signifie qu'aucun point de fonctionnement 87 Hz
    # n'est publié pour ce moteur : ne pas créer un enregistrement sans puissance.
    if hz87_point["powerKw"] is not None:
        records.append(hz87_point)
    return records


def parse_page(page, pdf_page: int, eff_class: str, casing: str,
               supply: str, sha: str) -> list[dict]:
    rows: list[dict] = []
    current_poles: int | None = None
    for table in page.extract_tables():
        for row in table:
            if not row or not row[0]:
                continue
            first = str(row[0]).strip()
            pole_match = re.match(r"(\d+)\s*p[oô]les", first, re.IGNORECASE)
            if pole_match:
                current_poles = int(pole_match.group(1))
                continue
            if current_poles is None:
                continue
            if not re.match(r"^(LSES|FLSES|CILS|PLSES)\b", first):
                continue
            if supply == "mains":
                record = parse_mains_row(
                    row, first, current_poles, eff_class, casing, pdf_page, sha)
                if record is not None:
                    rows.append(record)
            else:
                rows.extend(parse_vfd_row(
                    row, first, current_poles, eff_class, casing, pdf_page, sha))
    return rows


def main() -> None:
    pdf_path = PDF_DIR / PDF_NAME
    sha = sha256_of(pdf_path)
    all_rows: list[dict] = []
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    with pdfplumber.open(str(pdf_path)) as pdf:
        for pdf_page, (eff, casing, supply) in sorted(PAGE_SPECS.items()):
            page = pdf.pages[pdf_page - 1]
            (RAW_DIR / f"leroy-somer_p{pdf_page}.txt").write_text(
                page.extract_text() or "", encoding="utf-8")
            rows = parse_page(page, pdf_page, eff, casing, supply, sha)
            print(f"  page {pdf_page} ({eff} {casing} {supply}) : {len(rows)} moteurs")
            all_rows.extend(rows)
    if any(row["ratedSpeedRpm"] is None for row in all_rows):
        raise ValueError("Une vitesse nominale Leroy-Somer extraite est absente")
    if any(row["powerKw"] is None or row["powerKw"] > 1200 for row in all_rows):
        raise ValueError("Une puissance Leroy-Somer est absente ou supérieure à 1200 kW")
    if any(
        row["provenance"]["pdfPage"] == 92 and row["frequencyHz"] == 87
        for row in all_rows
    ):
        raise ValueError("La page 92 ne publie aucun point 87 Hz")
    write_json(OUT_DIR / "leroy-somer.json", all_rows)


if __name__ == "__main__":
    main()
