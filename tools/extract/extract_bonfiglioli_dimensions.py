"""Cotes Bonfiglioli publiees dans le catalogue fabricant.

Les tableaux M13/M15 sont transposes : chaque colonne est un moteur.  Ce
parseur ne lit donc que les tables pdfplumber apres rotation et propage, ligne
par ligne, les cellules videes par une fusion PDF.  Les pages FD ne sont pas
fusionnees aux versions standard : elles publient des encombrements differents
pour une meme designation.
"""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from typing import Any

from common import (OUT_DIR, PDF_DIR, bonfiglioli_frame_size, make_provenance,
                    open_page_rotated, sha256_of, to_float,
                    validate_frame_sizes, write_json)

PDF_NAME = "Catalogue_BONFIGLIOLI_Moteur.pdf"
METHOD = "pdfplumber-rotated-transposed-geometric-table"

# Pages catalogue/PDF de la version standard, sans l'option FD qui change L,
# AC et les autres encombrements.  MX ne publie ici que le bout d'arbre AR.
# 72-73 sont la version CUS/NBR; elles ne remplacent jamais les cotes
# standard deja lues, mais publient BX 90SR, absent des pages 66-67.
PAGES = (
    (58, "B3", None), (59, "B5", "through"),
    (66, "B3", None), (67, "B5", "through"), (68, "B14", "tapped"),
    (71, "B14", "tapped"), (72, "B3", None), (73, "B5", "through"),
    (74, "B14", "tapped"), (77, "B14", "tapped"),
    (78, None, None), (79, None, None),
    (90, "B3", None), (91, "B5", "through"), (92, "B14", "tapped"), (95, "B14", "tapped"),
    (96, None, None), (97, None, None),
    (108, "B3", None), (109, "B5", "through"), (110, "B14", "tapped"), (113, "B14", "tapped"),
    (114, None, None), (115, None, None),
)
SERIES = {"BY", "BX", "MX", "BE", "ME", "BN", "M"}
FLANGE_KEYS = {"M", "N", "P", "S", "T", "LA"}
DOUBLE_CODES = {"DA D", "EA E", "GC GA", "FA F"}
DIMENSION_CODES = {"A", "AB", "AC", "AD", "AF", "B", "BB", "C", "D", "DA", "DB", "E", "EA", "F", "FA", "GA", "GC", "H", "HA", "J", "K", "L", "LB", "LC", "LL", "R", "V", *FLANGE_KEYS}
EXACT_B_FIXTURES = {
    "BY 280SCK": 368,
    "BY 280MAK": 419,
    "BY 315SCK": 406,
    "BY 315SDK": 406,
    "BY 315MBK": 457,
}

# Bornes volontairement larges. Elles ne servent jamais à corriger une valeur :
# elles bloquent la publication afin d'imposer une relecture du PDF.
ABSOLUTE_MAX_MM = {
    "A": 1500, "AB": 2500, "AC": 2500, "AD": 2500, "AF": 2500,
    "B": 1500, "BB": 2500, "C": 1000,
    "D": 500, "DA": 500, "DB": 500,
    "E": 1000, "EA": 1000,
    "F": 250, "FA": 250, "GA": 500, "GC": 500,
    "H": 1000, "HA": 500, "J": 250, "K": 150,
    "L": 3000, "LB": 3000, "LC": 3000, "LL": 3000,
    "R": 1000, "V": 1000,
}


def normalise_designation(value: Any) -> str | None:
    text = re.sub(r"\s+", " ", str(value or "").replace("\n", " ")).strip()
    match = re.fullmatch(r"(BX|BY|MX|BE|ME|BN|M) (.+)", text)
    if not match:
        return None
    # Les espaces sont des retours de cellule pour les hauteurs 180 L, 355 MCK,
    # etc. et font partie de la designation, sauf entre nombre et suffixe.
    series, suffix = match.groups()
    suffix = re.sub(r"(\d) ([A-Z])", r"\1\2", suffix)
    return f"{series} {suffix}"


def scalar(value: str) -> int | float | str | None:
    value = value.strip().replace("\n", " ")
    if not value or value in {"-", "—"}:
        return None
    number = to_float(value)
    if number is not None:
        # Une cote nulle n'est pas publiee dans ces tableaux. C'est le signe
        # connu d'une cellule rognée (BY 355SAK B: «00» au lieu de «500»).
        return None if number == 0 else int(number) if number.is_integer() else number
    # Une cellule de cote simple qui contient plusieurs tokens est ambigue
    # (ex. DB «M3 M4» apres perte des marqueurs de bout d'arbre).
    return value if re.fullmatch(r"M\d+(?:[.,]\d+)?", value) else None


def values_for(code: str, cell: Any) -> dict[str, int | float | str | None]:
    """Decode une cellule sans deduire une cote absente.

    Dans les libelles doubles, l'ordre publie est celui de la cellule :
    DA/D, EA/E, GC/GA et FA/F.  Le premier terme est celui marque (1), donc le
    bout d'arbre arriere; il reste dans la cle DA/EA/GC/FA distincte.
    """
    text = str(cell or "").replace("\n", " ").replace("(1)", " ").strip()
    codes = code.replace("\n", " ").split()
    if not text:
        return {key: None for key in codes}
    if len(codes) == 1:
        return {codes[0]: scalar(text)}
    parts = re.findall(r"M\d+(?:[.,]\d+)?|[-+]?\d+(?:[.,]\d+)?|—|-", text)
    if len(codes) == 2 and len(parts) == 1:
        # Une seule cellule imprimée sous un en-tête double signifie que la
        # même cote est publiée pour les deux bouts d'arbre. Exemple page 90 :
        # BE 63 publie « 11 » sous D/DA, puis « 23 » sous E/EA.
        value = scalar(parts[0])
        return {key: value for key in codes}
    if len(parts) != len(codes):
        # La source ne permet pas d'associer surement les deux valeurs.
        return {key: None for key in codes}
    return {key: scalar(part) for key, part in zip(codes, parts)}


def code_at(row: list[Any]) -> str | None:
    # Les tables ont 0 a 2 colonnes decoratives apres le code suivant la page.
    for cell in reversed(row[-6:]):
        text = re.sub(r"\s+", " ", str(cell or "").replace("\n", " ")).strip()
        if text in DIMENSION_CODES or text in DOUBLE_CODES:
            return text
    return None


def geometric_cells_for_motors(
    page: Any,
    table: Any,
    row_index: int,
    motor_indices: list[int],
    code: str,
    page_words: list[dict[str, Any]],
) -> dict[int, str | None]:
    """Relit les valeurs avec leurs coordonnées, même si le PDF fusionne les cellules.

    ``extract_tables`` concatène le texte d'une cellule fusionnée (par exemple
    ``457 / 406 / 406`` devient ``57 06``). Les mots, eux, conservent leur
    valeur et leur position. Chaque valeur est donc rattachée à la colonne
    moteur la plus proche, uniquement à l'intérieur de la cellule source
    fusionnée. Une colonne sans mot reprend la valeur spatiale la plus proche
    de cette même cellule, ce qui restitue la sémantique de fusion sans
    propager une cote entre deux cellules distinctes.
    """
    header_cells = table.rows[0].cells
    centers = {
        index: (header_cells[index][0] + header_cells[index][2]) / 2
        for index in motor_indices
        if index < len(header_cells) and header_cells[index] is not None
    }
    result: dict[int, str | None] = {index: None for index in motor_indices}
    chars = page.chars
    motor_right = max(header_cells[index][2] for index in motor_indices)
    motor_row_cells = [
        cell for cell in table.rows[row_index].cells
        if cell is not None and any(cell[0] <= center <= cell[2] for center in centers.values())
    ]
    row_top = min(cell[1] for cell in motor_row_cells)
    row_bottom = max(cell[3] for cell in motor_row_cells)
    code_tokens = set(code.split())
    label_words = [
        word for word in page_words
        if code_tokens.intersection({str(word["text"]).strip()})
        and motor_right <= (word["x0"] + word["x1"]) / 2 <= table.bbox[2]
        and row_top - 3 <= (word["top"] + word["bottom"]) / 2 <= row_bottom + 3
    ]
    label_top = min((word["top"] for word in label_words), default=None)
    label_bottom = max((word["bottom"] for word in label_words), default=None)

    for cell in (cell for cell in table.rows[row_index].cells if cell is not None):
        x0, top, x1, bottom = cell
        members = [
            index for index, center in centers.items()
            if x0 <= center <= x1
        ]
        if not members:
            continue
        target_top = label_top - 4 if label_top is not None else top - 2
        target_bottom = label_bottom + 2 if label_bottom is not None else bottom
        cell_chars = [
            char for char in chars
            if x0 <= (char["x0"] + char["x1"]) / 2 <= x1
            and target_top <= (char["top"] + char["bottom"]) / 2 <= target_bottom
            and str(char["text"]).strip()
        ]
        # Les caractères d'une valeur ont le même axe x sur ces pages
        # pivotées. ``extract_words`` ne peut pas être utilisé ici : il colle
        # parfois trois lignes successives (L/LB/LC) en un seul faux nombre.
        token_groups: list[list[dict[str, Any]]] = []
        for char in sorted(cell_chars, key=lambda item: ((item["x0"] + item["x1"]) / 2, item["top"])):
            center = (char["x0"] + char["x1"]) / 2
            if (
                token_groups
                and abs(
                    center
                    - sum((item["x0"] + item["x1"]) / 2 for item in token_groups[-1])
                    / len(token_groups[-1])
                )
                <= 1.5
            ):
                token_groups[-1].append(char)
            else:
                token_groups.append([char])
        tokens = []
        for group in token_groups:
            text = "".join(str(char["text"]) for char in sorted(group, key=lambda item: item["top"])).strip()
            if text and text not in {"(1)", "1)"}:
                tokens.append({
                    "text": text,
                    "x0": min(char["x0"] for char in group),
                    "x1": max(char["x1"] for char in group),
                })
        assigned: dict[int, list[dict[str, Any]]] = {index: [] for index in members}
        for word in tokens:
            word_center = (word["x0"] + word["x1"]) / 2
            nearest = min(members, key=lambda index: (abs(centers[index] - word_center), index))
            assigned[nearest].append(word)

        texts = {
            index: " ".join(
                str(word["text"]).strip()
                for word in sorted(index_words, key=lambda word: word["x0"])
            )
            for index, index_words in assigned.items()
            if index_words
        }
        if not texts:
            continue
        for index in members:
            nearest = min(texts, key=lambda source: (abs(centers[index] - centers[source]), source))
            result[index] = texts[nearest]

    return result


class Collector:
    def __init__(self, sha: str) -> None:
        self.sha = sha
        self.items: dict[str, dict[str, Any]] = {}

    def item(self, designation: str) -> dict[str, Any]:
        if designation not in self.items:
            frame_size, vendor_size_code = bonfiglioli_frame_size(designation, {"MX", "M", "ME"})
            self.items[designation] = {
                "brand": "Bonfiglioli", "designation": designation,
                "frameSize": frame_size, "vendorSizeCode": vendor_size_code,
                "dimensions": {}, "flanges": [], "_sources": set(),
            }
        return self.items[designation]

    def add(self, designation: str, values: dict[str, Any], page: int, mounting: str | None, bore_type: str | None) -> None:
        item = self.item(designation)
        dimensions = {k: v for k, v in values.items() if k not in FLANGE_KEYS}
        for key, value in dimensions.items():
            if value is not None and key not in item["dimensions"]:
                item["dimensions"][key] = value
        if mounting and any(values.get(key) is not None for key in FLANGE_KEYS):
            flange = {
                "mounting": mounting, "role": "standard", "designation": mounting,
                "orderCode": None, "boreType": bore_type,
                **{key: values.get(key) for key in ("M", "N", "P", "S", "T", "LA")},
            }
            old = next((x for x in item["flanges"] if x["mounting"] == mounting), None)
            if old is None:
                item["flanges"].append(flange)
            elif any(old[k] is None and flange[k] is not None for k in FLANGE_KEYS):
                for key in FLANGE_KEYS:
                    if old[key] is None:
                        old[key] = flange[key]
        item["_sources"].add((page, mounting))


def parse_page(collector: Collector, pdf_page: int, mounting: str | None, bore_type: str | None) -> None:
    pdf_path = PDF_DIR / PDF_NAME
    page, context = open_page_rotated(pdf_path, pdf_page - 1)
    try:
        tables = page.find_tables()
        table = next(
            (
                candidate for candidate in tables
                if candidate.extract()
                and any(normalise_designation(x) for x in candidate.extract()[0])
            ),
            None,
        )
        if table is None:
            raise ValueError(f"table de dimensions introuvable page {pdf_page}")
        extracted = table.extract()
        names = {index: normalise_designation(cell) for index, cell in enumerate(extracted[0])}
        names = {index: name for index, name in names.items() if name and name.split()[0] in SERIES}
        motor_indices = sorted(names)
        page_words = page.extract_words()
        for row_index, row in enumerate(extracted[1:], 1):
            code = code_at(row)
            if not code:
                continue
            cells = geometric_cells_for_motors(
                page,
                table,
                row_index,
                motor_indices,
                code,
                page_words,
            )
            for index in motor_indices:
                cell = cells.get(index)
                if cell is not None:
                    collector.add(
                        names[index],
                        values_for(code, cell),
                        pdf_page,
                        mounting,
                        bore_type,
                    )
    finally:
        context.close()


def implausible_dimensions(rows: list[dict[str, Any]]) -> list[tuple[str, str, int | float, str]]:
    anomalies: list[tuple[str, str, int | float, str]] = []
    for row in rows:
        designation = row["designation"]
        frame = row.get("frameSize")
        for code, value in row["dimensions"].items():
            if not isinstance(value, (int, float)):
                continue
            if value <= 0:
                anomalies.append((designation, code, value, "valeur non positive"))
                continue
            absolute_max = ABSOLUTE_MAX_MM.get(code)
            if absolute_max is not None and value > absolute_max:
                anomalies.append((designation, code, value, f"maximum prudent {absolute_max} mm"))
                continue
            if not isinstance(frame, (int, float)):
                continue
            relative_factor = (
                4 if code in {"A", "B"}
                else 8 if code in {"AB", "AC", "AD", "AF", "BB", "L", "LB", "LC", "LL"}
                else None
            )
            if relative_factor is not None and value > frame * relative_factor:
                anomalies.append(
                    (designation, code, value, f"rapport > {relative_factor} x hauteur {frame}")
                )
    return anomalies


def assert_exact_b_fixtures(rows: list[dict[str, Any]]) -> None:
    by_designation = {row["designation"]: row for row in rows}
    observed = {
        designation: by_designation.get(designation, {}).get("dimensions", {}).get("B")
        for designation in EXACT_B_FIXTURES
    }
    if observed != EXACT_B_FIXTURES:
        raise SystemExit(
            "controle bloquant fixtures B Bonfiglioli echoue : "
            f"attendu={EXACT_B_FIXTURES}, observe={observed}"
        )


def expected_f(diameter: int | float | None) -> int | None:
    table = {11: 4, 14: 5, 19: 6, 24: 8, 28: 8, 38: 10, 42: 12,
             48: 14, 55: 16, 60: 18, 65: 18, 75: 20, 80: 22, 95: 25}
    return table.get(diameter)


def main() -> None:
    pdf_path = PDF_DIR / PDF_NAME
    sha = sha256_of(pdf_path)
    collector = Collector(sha)
    for page, mounting, bore_type in PAGES:
        parse_page(collector, page, mounting, bore_type)

    rows = []
    for item in collector.items.values():
        item["dimensions"] = {**{key: None for key in ("D", "E", "F")}, **item["dimensions"]}
        item["provenance"] = {
            "catalog": PDF_NAME, "catalogSha256": sha,
            "sources": [make_provenance(PDF_NAME, sha, p, str(p), METHOD) for p, _ in sorted(item.pop("_sources"))],
        }
        rows.append(item)
    rows.sort(key=lambda row: (row["designation"].split()[0], row["frameSize"] or 0, row["designation"]))
    validate_frame_sizes(rows, "designation", "cotes Bonfiglioli")
    assert_exact_b_fixtures(rows)
    implausible = implausible_dimensions(rows)
    if implausible:
        raise SystemExit(
            "controle bloquant cote implausible : relecture du PDF requise, "
            f"aucune correction automatique autorisee : {implausible}"
        )
    write_json(OUT_DIR / "dimensions-bonfiglioli.json", rows)

    characteristics = json.loads((OUT_DIR / "bonfiglioli.json").read_text(encoding="utf-8"))
    characteristic_types = {str(row["type"]).strip() for row in characteristics}
    extracted_types = {row["designation"] for row in rows}
    by_series = Counter(row["designation"].split()[0] for row in rows)
    ref = next(row for row in rows if row["designation"] == "BX 63A")
    h_mismatches = [row["designation"] for row in rows if row["frameSize"] is not None and row["dimensions"].get("H") is not None and row["dimensions"]["H"] != row["frameSize"]]
    iec_checked = [row for row in rows if expected_f(row["dimensions"].get("D")) is not None]
    iec_mismatches = [(row["designation"], row["dimensions"].get("D"), row["dimensions"].get("F"), expected_f(row["dimensions"].get("D"))) for row in iec_checked if row["dimensions"].get("F") != expected_f(row["dimensions"].get("D"))]
    no_dimensions = [row["designation"] for row in rows if not any(v is not None for v in row["dimensions"].values())]
    print("[controle] moteurs par serie:", dict(sorted(by_series.items())))
    print("[controle] codes extraits:", sorted({key for row in rows for key, value in row["dimensions"].items() if value is not None}))
    print("[controle] BX 63A:", {key: ref["dimensions"].get(key) for key in ("D", "E", "F", "A", "B", "H", "AC", "L", "LB", "LC")})
    print("[controle] ecarts frameSize/H:", h_mismatches)
    print("[controle] IEC D/F controles:", len(iec_checked))
    print("[controle] IEC D/F ecarts:", iec_mismatches)
    print("[controle] fixtures B Bonfiglioli:", EXACT_B_FIXTURES)
    print("[controle] cotes implausibles:", implausible)
    print("[controle] moteurs sans cotes:", no_dimensions)
    print("[controle] caracteristiques sans cotes:", sorted(characteristic_types - extracted_types))
    print("[controle] cotes sans caracteristiques:", sorted(extracted_types - characteristic_types))
    flange_counts = Counter((flange["mounting"], flange["role"]) for row in rows for flange in row["flanges"])
    flange_series = Counter((row["designation"].split()[0], flange["mounting"]) for row in rows for flange in row["flanges"])
    no_flanges = [row["designation"] for row in rows if not row["flanges"]]
    incomplete_flanges = [
        (row["designation"], flange["mounting"])
        for row in rows for flange in row["flanges"]
        if any(flange[key] is None for key in ("M", "N", "P", "S", "T"))
    ]
    print("[controle] brides par (montage, role):", dict(sorted(flange_counts.items())))
    print("[controle] brides par (serie, montage):", dict(sorted(flange_series.items())))
    print("[controle] brides incompletes:", incomplete_flanges)
    print("[controle] sans aucune bride:", no_flanges)
    print("[controle] BX 63A brides:", ref["flanges"])
    if h_mismatches:
        raise SystemExit("controle bloquant H echoue")


if __name__ == "__main__":
    main()
