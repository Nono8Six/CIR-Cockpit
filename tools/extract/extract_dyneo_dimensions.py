"""Extraction PDF des cotes Dyneo+ (catalogue 5729 fr - 2020.03 / a).

Ne lit que les pages 50--53 de LSHRM_Leroy-Somer.pdf.  La table des bouts
d'arbre (p. 50) comporte deux colonnes de produits : chacune est conservee
avec sa version catalogue, sans les confondre.
"""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from typing import Any

import pdfplumber

from common import OUT_DIR, PDF_DIR, RAW_DIR, make_provenance, sha256_of, to_float, to_int, write_json

PDF_NAME = "LSHRM_Leroy-Somer.pdf"
CATALOG_EDITION = "5729 fr - 2020.03 / a"
SHAFT_COLUMNS = ("F", "GD", "D", "G", "E", "O", "p", "L", "LO")
B3_COLUMNS = ("A", "AB", "B", "BB", "C", "x", "AA", "K", "HA", "H", "AC", "HJ", "LB", "LJ", "J", "I", "II", "AD", "AD1")
FIXED_COLUMNS = ("AC", "LB", "HJ", "LJ", "J", "I", "II", "AD", "AD1")


def number(value: Any) -> int | float | None:
    result = to_float(value)
    return int(result) if result is not None and result.is_integer() else result


def normalise_type(value: Any) -> str:
    text = re.sub(r"\s+", " ", str(value or "").replace("\n", " ")).strip()
    match = re.fullmatch(r"(LSHRM|FLSHRM|PLSHRM)\s*(\d{3})\s*(.*)", text)
    if not match:
        raise ValueError(f"designation Dyneo non reconnue: {value!r}")
    series, frame, suffix = match.groups()
    # Les ** accoles a PLSHRM 315LD p.52 sont un renvoi de note, pas une
    # partie de la designation moteur.
    suffix = re.sub(r"\*+$", "", suffix.replace(" ", ""))
    return f"{series} {frame}{suffix}"


def expand_types(value: Any) -> list[str]:
    """Developpe seulement les groupes '/' explicitement imprimes par le PDF."""
    text = re.sub(r"\s+", " ", str(value or "").replace("\n", " ")).strip()
    match = re.fullmatch(r"(LSHRM|FLSHRM|PLSHRM)\s*(\d{3})\s*(.+)", text)
    if not match:
        return [normalise_type(text)]
    series, frame, suffixes = match.groups()
    return [normalise_type(f"{series} {frame}{part}") for part in suffixes.split("/") if part.strip()]


def table_with_type(page) -> list[list[Any]]:
    tables = [t for t in page.extract_tables() if t and any("Type" in str(c) for row in t[:2] for c in row if c)]
    if not tables:
        raise ValueError("table Type introuvable")
    return max(tables, key=len)


class Collector:
    def __init__(self, sha: str, target_versions: dict[str, set[str]]) -> None:
        self.sha = sha
        self.target_versions = target_versions
        self.items: dict[str, dict[str, Any]] = {}
        self.b5_specs: dict[str, dict[str, Any]] = {}

    def item(self, designation: str) -> dict[str, Any]:
        if designation not in self.items:
            series, frame_and_suffix = designation.split()
            frame = int(re.match(r"\d+", frame_and_suffix).group())
            self.items[designation] = {
                "brand": "Leroy-Somer", "series": series, "designation": designation,
                "frameSize": frame, "version": None, "dimensions": {}, "flanges": [], "_sources": set(),
            }
        return self.items[designation]

    def add_dimensions(self, raw_type: Any, values: dict[str, Any], page: int, method: str) -> None:
        for designation in expand_types(raw_type):
            if designation not in self.target_versions:
                continue
            item = self.item(designation)
            for key, value in values.items():
                if value is not None:
                    item["dimensions"].setdefault(key, value)
            item["_sources"].add((page, method))

    def add_shaft(self, raw_type: Any, values: dict[str, Any], version: str) -> None:
        for designation in expand_types(raw_type):
            if designation not in self.target_versions:
                continue
            item = self.item(designation)
            # La version est celle de la colonne p. 50.  Une designation ne doit
            # pas etre implicitement deplacee vers l'autre colonne.
            item["version"] = version
            for key, value in values.items():
                if value is not None:
                    item["dimensions"].setdefault(key, value)
            item["_sources"].add((50, "pdfplumber-two-column-shaft-table"))

    def add_flange(self, raw_type: Any, mounting: str, spec: dict[str, Any], page: int, method: str) -> None:
        for designation in expand_types(raw_type):
            if designation not in self.target_versions:
                continue
            item = self.item(designation)
            flange = {"mounting": mounting, "role": "standard", **spec, "boreType": "through"}
            if not any(old["mounting"] == mounting and old["designation"] == flange["designation"] for old in item["flanges"]):
                item["flanges"].append(flange)
            item["_sources"].add((page, method))


def parse_shafts(collector: Collector, page) -> None:
    table = table_with_type(page)
    version = "interchangeable"
    for row in table[2:]:
        if not row:
            continue
        # The p.50 section labels are merged into the first two cells.
        marker = " ".join(str(x or "") for x in row[:2]).lower()
        if "compactes" in marker:
            version = "compacte"
        elif "interchangeables" in marker:
            version = "interchangeable"
        for start, row_version in ((0, version), (10, "compacte")):
            raw_type = row[start] if start < len(row) else None
            if not raw_type or not re.match(r"^(?:LSHRM|FLSHRM|PLSHRM)", str(raw_type).strip()):
                continue
            raw_values = {name: row[start + 1 + index] if start + 1 + index < len(row) else None for index, name in enumerate(SHAFT_COLUMNS)}
            # D est publie avec une tolerance ISO (ex. 42k6). Conserver la
            # chaine et la valeur exploitable separement, sans reconstruction.
            d_raw = str(raw_values["D"]).strip() if raw_values["D"] is not None else None
            d_number = number(re.match(r"\d+(?:[,.]\d+)?", d_raw).group()) if d_raw and re.match(r"\d+(?:[,.]\d+)?", d_raw) else None
            values = {key: number(value) for key, value in raw_values.items() if key != "D"}
            values["D"] = d_number
            values["DPublished"] = d_raw
            collector.add_shaft(raw_type, values, row_version)


def parse_b3(collector: Collector, page) -> None:
    table = table_with_type(page)
    for row in table[2:]:
        if row and row[0] and re.match(r"^(?:LSHRM|FLSHRM|PLSHRM)", str(row[0]).strip()):
            collector.add_dimensions(row[0], {key: number(row[index + 1]) for index, key in enumerate(B3_COLUMNS)}, 51, "pdfplumber-b3-table")


def parse_b5(collector: Collector, page) -> None:
    table = table_with_type(page)
    for row in table[2:]:
        if not row or not row[0] or not re.match(r"^(?:LSHRM|FLSHRM|PLSHRM)", str(row[0]).strip()):
            continue
        collector.add_dimensions(row[0], {key: number(row[index + 1]) for index, key in enumerate(FIXED_COLUMNS)}, 53, "pdfplumber-b5-table")
        designation = re.sub(r"\s+", "", str(row[10] or ""))
        if not re.fullmatch(r"FF\d+", designation):
            continue
        spec = {"designation": designation, "orderCode": None,
                "M": number(row[11]), "N": number(row[12]), "P": number(row[13]), "T": number(row[14]),
                "holes": to_int(row[15]), "alphaDeg": number(row[16]), "S": number(row[17]), "LA": number(row[18])}
        collector.b5_specs[designation] = spec
        collector.add_flange(row[0], "B5", spec, 53, "pdfplumber-b5-table")


def parse_b35(collector: Collector, page) -> None:
    table = table_with_type(page)
    for row in table[2:]:
        if not row or not row[0] or not re.match(r"^(?:LSHRM|FLSHRM|PLSHRM)", str(row[0]).strip()):
            continue
        designation = re.sub(r"\s+", "", str(row[20] or ""))
        spec = collector.b5_specs.get(designation)
        if spec is None:
            raise ValueError(f"cotes B5 manquantes pour bride B35 {designation}")
        # La p.52 ne republie que le symbole : les cotes de bride sont celles
        # de la B5 physiquement identique, publiees p.53.
        collector.add_flange(row[0], "B35", spec, 52, "pdfplumber-b35-symbol-plus-b5-spec")
        for motor in expand_types(row[0]):
            if motor in collector.target_versions:
                collector.item(motor)["_sources"].add((53, "pdfplumber-b5-flange-spec"))


def main() -> None:
    pdf_path = PDF_DIR / PDF_NAME
    sha = sha256_of(pdf_path)
    electrical = json.loads((OUT_DIR / "dyneo.json").read_text(encoding="utf-8"))
    target_versions: dict[str, set[str]] = defaultdict(set)
    for row in electrical:
        target_versions[row["type"]].add(row["version"])
    collector = Collector(sha, target_versions)
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page_number in range(50, 54):
            (RAW_DIR / f"dyneo-dimensions_p{page_number}.txt").write_text(pdf.pages[page_number - 1].extract_text() or "", encoding="utf-8")
        parse_shafts(collector, pdf.pages[49])
        parse_b3(collector, pdf.pages[50])
        parse_b5(collector, pdf.pages[52])
        parse_b35(collector, pdf.pages[51])

    rows = []
    for designation in sorted(target_versions):
        item = collector.item(designation)
        item["version"] = item["version"] or (next(iter(target_versions[designation])) if len(target_versions[designation]) == 1 else None)
        item["dimensions"] = {**{key: None for key in ("D", "DPublished", "E", "F", "GD", "G")}, **item["dimensions"]}
        item["provenance"] = {"catalog": PDF_NAME, "catalogSha256": sha, "catalogEdition": CATALOG_EDITION,
                              "sources": [make_provenance(PDF_NAME, sha, page, str(page), method) for page, method in sorted(item.pop("_sources"))]}
        rows.append(item)
    write_json(OUT_DIR / "dimensions-dyneo.json", rows)

    print("[controle] moteurs par serie:", dict(sorted(Counter(row["series"] for row in rows).items())))
    print("[controle] moteurs par version:", dict(sorted(Counter(row["version"] for row in rows).items())))
    print("[controle] brides par montage:", dict(sorted(Counter(f["mounting"] for row in rows for f in row["flanges"]).items())))
    print("[controle] caracteristiques sans cotes:", sorted(set(target_versions) - {row["designation"] for row in rows if any(v is not None for v in row["dimensions"].values())}))
    print("[controle] cotes sans caracteristiques:", sorted({row["designation"] for row in rows} - set(target_versions)))


if __name__ == "__main__":
    main()
