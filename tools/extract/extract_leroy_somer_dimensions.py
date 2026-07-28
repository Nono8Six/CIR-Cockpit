"""Extraction des cotes dimensionnelles Leroy-Somer IMfinity.

Le fichier produit est volontairement indépendant des donnees electriques : une
designation est normalisee avant toute fusion et chaque valeur conserve les pages
du catalogue qui la publient.
"""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

import pdfplumber

from common import OUT_DIR, PDF_DIR, RAW_DIR, make_provenance, sha256_of, to_float, to_int, write_json

PDF_NAME = "Catalogue_LS_LSES.pdf"
CATALOG_EDITION = "5147 fr - 2023.08 / j"

B3_COLUMNS = ["A", "AB", "B", "BB", "C", "X", "AA", "K", "HA", "H", "AC", "HD", "LB", "LJ", "J", "I", "II", "AD", "AD1"]
FIXED_COLUMNS = ["AC", "LB", "HJ", "LJ", "J", "I", "II", "AD", "AD1"]


def number(value: Any) -> int | float | None:
    value = to_float(value)
    if value is None:
        return None
    return int(value) if value.is_integer() else value


def designation(value: str) -> str:
    """Normalise les espaces et le suffixe typographique 1 du catalogue."""
    value = value.strip().replace("\u00a0", " ")
    value = re.sub(r"\s+", " ", value)
    value = re.sub(r"^LS\b\s*", "LSES ", value)  # les lignes LS 56/63/71 sont les LSES de la page B3
    value = re.sub(r"^(LSES|FLSES|CILS|PLSES)\s*(\d{2,3})\s*", r"\1 \2 ", value)
    value = re.sub(r"(?<=\D)1$", "", value)  # note 1 accollee a la designation, pas une taille moteur
    return re.sub(r"\s+", " ", value).strip()


def expand_types(value: str) -> list[str]:
    """Eclate uniquement les groupes explicites de variantes publies avec /."""
    value = designation(value)
    match = re.match(r"^(LSES|FLSES|CILS|PLSES) (\d{2,3}) (.+)$", value)
    if not match:
        return [value]
    series, frame, suffixes = match.groups()
    return [f"{series} {frame} {part}" for part in suffixes.split("/") if part]


def table_with_type(page) -> list[list[Any]]:
    candidates = [table for table in page.extract_tables() if table and any("Type" in str(cell) for row in table[:3] for cell in row if cell)]
    if not candidates:
        raise ValueError("table Type introuvable")
    return max(candidates, key=lambda table: len(table) * max(map(len, table)))


def row_values(row: list[Any], start: int, names: list[str]) -> dict[str, int | float | None]:
    return {name: number(row[start + index]) if start + index < len(row) else None for index, name in enumerate(names)}


class Collector:
    def __init__(self, sha: str) -> None:
        self.sha = sha
        self.items: dict[str, dict[str, Any]] = {}
        self.ft_specs: dict[str, dict[str, Any]] = {}
        self.ff_specs: dict[str, dict[str, Any]] = {}

    def item(self, name: str) -> dict[str, Any]:
        if name not in self.items:
            series = name.split()[0]
            frame = int(name.split()[1])
            casing = {"LSES": "aluminium", "FLSES": "cast-iron", "CILS": "cast-iron", "PLSES": "steel"}[series]
            self.items[name] = {
                "brand": "Leroy-Somer", "designation": name, "frameSize": frame,
                "casingMaterial": casing, "dimensions": {}, "flanges": [], "_sources": set(),
            }
        return self.items[name]

    def source(self, page: int, method: str) -> dict[str, Any]:
        return make_provenance(PDF_NAME, self.sha, page, str(page), method)

    def add_dimensions(self, raw_type: str, values: dict[str, Any], page: int, method: str, overwrite: bool = False) -> None:
        for name in expand_types(raw_type):
            item = self.item(name)
            for key, value in values.items():
                if value is not None and (overwrite or key not in item["dimensions"]):
                    item["dimensions"][key] = value
            item["_sources"].add((page, method))

    def add_flange(self, raw_type: str, mounting: str, bore_type: str, spec: dict[str, Any], page: int, method: str) -> None:
        for name in expand_types(raw_type):
            item = self.item(name)
            flange = {"mounting": mounting, "role": "standard", "designation": spec["designation"], "orderCode": None,
                      "M": spec.get("M"), "N": spec.get("N"), "P": spec.get("P"), "S": spec.get("S"),
                      "T": spec.get("T"), "holes": spec.get("holes"), "boreType": bore_type}
            if not any(old["mounting"] == mounting and old["designation"] == flange["designation"] for old in item["flanges"]):
                item["flanges"].append(flange)
            item["_sources"].add((page, method))


def parse_b3(collector: Collector, page, pdf_page: int, mounting: str = "B3") -> None:
    table = table_with_type(page)
    for row in table[2:]:
        if not row or not row[0] or not re.match(r"^(?:LS|LSES|FLSES|CILS|PLSES)", str(row[0]).strip()):
            continue
        # Les tables aluminium/fonte ont une colonne vide apres Type; PLSES non.
        start = 2 if len(row) > 1 and not str(row[1] or "").strip() else 1
        collector.add_dimensions(str(row[0]), row_values(row, start, B3_COLUMNS), pdf_page, f"pdfplumber-{mounting.lower()}")


def parse_flange_page(collector: Collector, page, pdf_page: int, mounting: str, bore_type: str, has_specs: bool) -> None:
    table = table_with_type(page)
    for row in table[2:]:
        if not row or not row[0] or not re.match(r"^(?:LS|LSES|FLSES|CILS|PLSES)", str(row[0]).strip()):
            continue
        raw_type = str(row[0])
        blank_after_type = len(row) > 1 and not str(row[1] or "").strip()
        start = 2 if blank_after_type else 1
        # B5/B14 publient d'abord les encombrements de bride.
        collector.add_dimensions(raw_type, row_values(row, start, FIXED_COLUMNS), pdf_page, f"pdfplumber-{mounting.lower()}")
        designation_index = start + 10 if has_specs else len(row) - 1
        raw_designation = str(row[designation_index] or "") if designation_index < len(row) else ""
        flange_name = re.sub(r"\s+", "", raw_designation)
        if not re.match(r"^(FF|FT)\d+$", flange_name):
            continue
        if has_specs:
            offset = designation_index + 1
            if offset < len(row) and not str(row[offset] or "").strip():
                offset += 1
            spec = {
                "designation": flange_name, "M": number(row[offset]) if offset < len(row) else None,
                "N": number(row[offset + 1]) if offset + 1 < len(row) else None,
                "P": number(row[offset + 2]) if offset + 2 < len(row) else None,
                "T": number(row[offset + 3]) if offset + 3 < len(row) else None,
                "holes": to_int(row[offset + 4]) if offset + 4 < len(row) else None,
                "S": (str(row[offset + 6]).strip() if bore_type == "tapped" and offset + 6 < len(row) else number(row[offset + 6]) if offset + 6 < len(row) else None),
            }
            known_specs = collector.ft_specs if flange_name.startswith("FT") else collector.ff_specs
            if spec["M"] is None and flange_name in known_specs:
                spec = known_specs[flange_name]
            elif spec["M"] is not None:
                known_specs[flange_name] = spec
        else:
            spec = (collector.ft_specs if flange_name.startswith("FT") else collector.ff_specs).get(flange_name)
            if spec is None:
                continue  # designation publiee, mais aucune cote de bride publiee dans le catalogue
        collector.add_flange(raw_type, mounting, bore_type, spec, pdf_page, f"pdfplumber-{mounting.lower()}")


def parse_plses_lookup(collector: Collector, table: list[list[Any]]) -> None:
    for row in table[2:]:
        if not row or not row[0]:
            continue
        name = re.sub(r"\s+", "", str(row[0]))
        if not name.startswith("FF"):
            continue
        collector.ff_specs[name] = {"designation": name, "M": number(row[1]), "N": number(row[2]), "P": number(row[3]),
                                    "T": number(row[4]), "holes": to_int(row[5]), "S": number(row[7])}


def parse_plses_b35_or_b5(collector: Collector, page, pdf_page: int, mounting: str) -> None:
    tables = page.extract_tables()
    main = table_with_type(page)
    lookup = next(table for table in tables if table and "Symbol" in str(table[0][0]) and len(table) > 2)
    parse_plses_lookup(collector, lookup)
    for row in main[2:]:
        if not row or not row[0] or not str(row[0]).startswith("PLSES"):
            continue
        collector.add_dimensions(str(row[0]), row_values(row, 1, B3_COLUMNS if mounting == "B35" else FIXED_COLUMNS), pdf_page, f"pdfplumber-{mounting.lower()}")
        flange_name = re.sub(r"\s+", "", str(row[-1] or ""))
        spec = collector.ff_specs.get(flange_name)
        if spec:
            collector.add_flange(str(row[0]), mounting, "through", spec, pdf_page, f"pdfplumber-{mounting.lower()}")


def parse_shafts(collector: Collector, page, pdf_page: int) -> None:
    table = next(table for table in page.extract_tables() if table and "Bouts d’arbre" in str(table[0]) and len(table[0]) >= 19)
    for row in table[3:]:
        if not row or not row[0] or not re.match(r"^(?:LS|LSES|FLSES|CILS|PLSES)", str(row[0]).strip()):
            continue
        # D/E/F for 4-6 poles and 2 poles. A value is kept only when both published
        # alternatives agree, or when the other alternative is explicitly absent.
        shaft_number = lambda value: number(re.match(r"\d+(?:[,.]\d+)?", str(value or "")).group(0)) if re.match(r"\d+(?:[,.]\d+)?", str(value or "")) else None
        left = {"F": shaft_number(row[1]), "D": shaft_number(row[3]), "E": shaft_number(row[5])}
        right = {"F": shaft_number(row[10]), "D": shaft_number(row[12]), "E": shaft_number(row[14])}
        agreed = {key: left[key] if left[key] is not None and (right[key] is None or right[key] == left[key]) else right[key] if right[key] is not None and left[key] is None else None for key in left}
        if any(value is not None for value in agreed.values()):
            collector.add_dimensions(str(row[0]), agreed, pdf_page, "pdfplumber-shaft")


def main() -> None:
    pdf_path = PDF_DIR / PDF_NAME
    sha = sha256_of(pdf_path)
    collector = Collector(sha)
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    with pdfplumber.open(str(pdf_path)) as pdf:
        for pdf_page in (64, 65, 66, 67, 68, 69, 94, 95, 96, 97, 98, 99, 124, 125, 126, 127):
            (RAW_DIR / f"leroy-somer_p{pdf_page}.txt").write_text(pdf.pages[pdf_page - 1].extract_text() or "", encoding="utf-8")
        parse_shafts(collector, pdf.pages[63], 64)
        parse_b3(collector, pdf.pages[64], 65)
        parse_flange_page(collector, pdf.pages[66], 67, "B5", "through", True)
        parse_flange_page(collector, pdf.pages[65], 66, "B35", "through", False)
        parse_flange_page(collector, pdf.pages[68], 69, "B14", "tapped", True)
        parse_flange_page(collector, pdf.pages[67], 68, "B34", "tapped", False)
        parse_shafts(collector, pdf.pages[93], 94)
        parse_b3(collector, pdf.pages[94], 95)
        parse_flange_page(collector, pdf.pages[96], 97, "B5", "through", True)
        parse_flange_page(collector, pdf.pages[95], 96, "B35", "through", False)
        parse_flange_page(collector, pdf.pages[98], 99, "B14", "tapped", True)
        parse_flange_page(collector, pdf.pages[97], 98, "B34", "tapped", False)
        parse_shafts(collector, pdf.pages[123], 124)
        parse_b3(collector, pdf.pages[124], 125)
        parse_plses_b35_or_b5(collector, pdf.pages[125], 126, "B35")
        parse_plses_b35_or_b5(collector, pdf.pages[126], 127, "B5")

    rows = []
    for item in collector.items.values():
        item["dimensions"] = {**{key: None for key in ("D", "E", "F")}, **item["dimensions"]}
        item["provenance"] = {"catalog": PDF_NAME, "catalogSha256": sha, "catalogEdition": CATALOG_EDITION,
                              "sources": [collector.source(page, method) for page, method in sorted(item.pop("_sources"))]}
        rows.append(item)
    rows.sort(key=lambda row: (row["designation"].split()[0], row["frameSize"], row["designation"]))
    write_json(OUT_DIR / "dimensions-leroy-somer.json", rows)

    existing = json.loads((OUT_DIR / "leroy-somer.json").read_text(encoding="utf-8"))
    characteristics = {designation(row["type"]) for row in existing}
    dimensions = {row["designation"] for row in rows}
    missing_dimensions = sorted(characteristics - dimensions)
    missing_characteristics = sorted(dimensions - characteristics)
    mismatches = [row["designation"] for row in rows if row["dimensions"].get("H") is not None and row["dimensions"]["H"] != row["frameSize"]]
    no_dimensions = [row["designation"] for row in rows if not any(value is not None for value in row["dimensions"].values())]
    bad_flanges = [row["designation"] for row in rows if row["flanges"] and any(flange["M"] is None or flange["N"] is None or flange["P"] is None for flange in row["flanges"])]
    print("[controle] moteurs par serie:", dict(sorted(Counter(row["designation"].split()[0] for row in rows).items())))
    print("[controle] brides par montage:", dict(sorted(Counter(flange["mounting"] for row in rows for flange in row["flanges"]).items())))
    print("[controle] ecarts frameSize/H:", mismatches)
    print("[controle] dimensions vides:", no_dimensions)
    print("[controle] brides sans M/N/P:", bad_flanges)
    print("[controle] caracteristiques sans cotes:", missing_dimensions)
    print("[controle] cotes sans caracteristiques:", missing_characteristics)
    if mismatches or no_dimensions or bad_flanges:
        raise SystemExit("controle bloquant echoue")


if __name__ == "__main__":
    main()
