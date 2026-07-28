"""Extraction des dimensions mécaniques Leroy-Somer CILS IE4.

Source : ``6154c_fr_CILS_IE4.pdf``, édition 2025, pages 11 à 15.

| Page | Contenu |
| ---: | --- |
| 11 | cotes de montage B3 |
| 12 | cotes de montage V1, plus le symbole de bride |
| 13 | cotes de montage B35, plus le symbole de bride |
| 14 | bouts d'arbre, **deux blocs distincts 2 pôles et 4 pôles** |
| 15 | cotes des brides FF400, FF500 et FF600 |

Deux axes que le catalogue impose et qu'il ne faut pas aplatir
-------------------------------------------------------------
1. **Certaines cotes dépendent du montage.** ``AD`` vaut 350 mm en B3 et
   355 mm en B35 et V1 pour un même CILS 280 SG. Fusionner les trois pages
   dans un seul jeu de cotes écraserait donc une valeur publiée. Les cotes
   sont rendues par montage.
2. **Le bout d'arbre dépend de la polarité.** CILS 280 SG a un arbre Ø 65 mm
   en 2 pôles et Ø 75 mm en 4 pôles, et CILS 225 S n'existe pas en 2 pôles.
   Les cotes d'arbre sont donc rendues par polarité.

Rôle des brides, déduit et non deviné
-------------------------------------
La colonne ``Symb.`` des pages 12 et 13 donne la bride effectivement montée
pour chaque type. Elle fournit le rôle ``standard``. Les autres brides que la
page 15 déclare applicables à la même hauteur d'axe reçoivent ``larger`` ou
``smaller`` par comparaison de leur cote ``M`` avec celle de la bride
standard. Aucun rôle n'est attribué sans cette comparaison.

La légende ``l``/``u`` du bas de page 15, qui distingue « arbre adapté » et
« adaptable sans modification », n'est pas lue : sa grille de symboles n'est
pas reconstructible de façon certaine depuis le texte extrait. Elle est
signalée comme reste à lire plutôt qu'interprétée.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import pdfplumber

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (PDF_DIR, OUT_DIR, RAW_DIR, build_bands, cells_by_band,
                   group_rows, minimum_band_gap, sha256_of, to_float, to_int,
                   write_json)

PDF_SUBDIR = "Leroy_Somer_catalogues_moteurs"
PDF_NAME = "6154c_fr_CILS_IE4.pdf"
CATALOG_EDITION = "6154c fr - 2025"
BAND_GAP = 2.0

HOUSING_COLUMNS = ("A", "AB", "B", "BB", "C", "x", "AA", "K", "HA", "H",
                   "AC", "HD", "LB", "LJ", "J", "I", "II", "AD", "AD1")
V1_COLUMNS = ("AC", "LB", "HJ", "LJ", "J", "I", "II", "AD", "AD1")
SHAFT_COLUMNS = ("F", "GD", "D", "G", "E", "O", "p", "L", "LO")
FLANGE_COLUMNS = ("M", "N", "P", "T", "holes", "alphaDeg", "S", "LA")

# page PDF -> (montage, colonnes de cotes, colonne de symbole de bride)
DIMENSION_PAGES: dict[int, tuple[str, tuple[str, ...], bool]] = {
    11: ("B3", HOUSING_COLUMNS, False),
    12: ("V1", V1_COLUMNS, True),
    13: ("B35", HOUSING_COLUMNS, True),
}
SHAFT_PAGE = 14
FLANGE_PAGE = 15

DESIGNATION = re.compile(r"^CILS\s?(?P<frame>\d{3})(?:/(?P<frame2>\d{3}))?\s?(?P<letters>[A-Z]{0,2})$")
SHAFT_TOLERANCE = re.compile(r"^(?P<value>\d+(?:[.,]\d+)?)\s+(?P<tolerance>[a-z]\d+)$")

FLANGE_ROLE_NOTE = (
    "Role deduit par comparaison de la cote M avec la bride portee par la "
    "colonne Symb. des pages 12 et 13. La legende l/u de la page 15, qui "
    "distingue arbre adapte et adaptable sans modification, reste a lire."
)
SHAFT_NOTE = (
    "Bout d'arbre publie separement en 2 poles et en 4 poles ; les deux jeux "
    "sont conserves distincts car ils diffferent (exemple CILS 280 SG : "
    "diametre 65 mm en 2 poles, 75 mm en 4 poles)."
)
AD_NOTE = (
    "Cotes rendues par montage : AD differe entre B3 et B35/V1 sur les "
    "hauteurs 280 et 315. Une fusion des trois pages ecraserait une valeur "
    "publiee."
)


def read_labelled_rows(page) -> tuple[list[tuple[re.Match[str], list[dict]]], list[tuple[float, float]]]:
    """Lit les lignes préfixées d'une désignation CILS et construit les colonnes.

    La désignation s'imprime tantôt ``CILS 225 S``, tantôt ``CILS225S``,
    tantôt ``CILS 280SG``, et page 15 ``CILS 225/250``. Le préfixe le plus long
    qui satisfait le motif est retenu, sinon ``CILS 225 S`` serait tronqué en
    ``CILS 225`` et sa lettre de carcasse basculerait dans les cotes.
    """
    words = page.extract_words(x_tolerance=1.5)
    heads: list[tuple[re.Match[str], list[dict]]] = []
    for row in group_rows(words):
        texts = [word["text"] for word in row]
        for cut in (3, 2, 1):
            if len(texts) < cut:
                continue
            match = DESIGNATION.match(" ".join(texts[:cut]))
            if match is not None:
                heads.append((match, row[cut:]))
                break
    bands = build_bands([tail for _, tail in heads], gap=BAND_GAP)
    gap = minimum_band_gap(bands)
    if gap <= BAND_GAP:
        raise SystemExit(
            f"blanc inter-colonnes {gap:.2f} pt trop faible pour la tolerance "
            f"{BAND_GAP} pt : colonnes fusionnees silencieusement"
        )
    return heads, bands


def designation_of(match: re.Match[str]) -> str:
    return f"CILS {match.group('frame')} {match.group('letters')}".strip()


def read_dimension_page(page, columns: tuple[str, ...],
                       has_flange_symbol: bool) -> dict[str, dict]:
    heads, bands = read_labelled_rows(page)
    expected = len(columns) + (1 if has_flange_symbol else 0)
    if len(bands) != expected:
        raise SystemExit(
            f"{len(bands)} colonnes lues pour {expected} attendues : "
            f"{[list(map(round, band)) for band in bands]}"
        )
    result: dict[str, dict] = {}
    for match, tail in heads:
        cells = cells_by_band(tail, bands)
        dimensions = {
            name: to_float(cells.get(index))
            for index, name in enumerate(columns)
        }
        entry: dict = {"dimensions": dimensions}
        if has_flange_symbol:
            entry["flangeSymbol"] = cells.get(len(columns))
        result[designation_of(match)] = entry
    return result


def read_shaft_page(page) -> dict[str, dict[int, dict]]:
    """Deux blocs côte à côte : 2 pôles à gauche, 4 pôles à droite."""
    heads, bands = read_labelled_rows(page)
    expected = 2 * len(SHAFT_COLUMNS)
    if len(bands) != expected:
        raise SystemExit(
            f"page arbre : {len(bands)} colonnes lues pour {expected} attendues"
        )
    result: dict[str, dict[int, dict]] = {}
    for match, tail in heads:
        cells = cells_by_band(tail, bands)
        by_poles: dict[int, dict] = {}
        for block, poles in enumerate((2, 4)):
            shaft: dict = {}
            for offset, name in enumerate(SHAFT_COLUMNS):
                raw = cells.get(block * len(SHAFT_COLUMNS) + offset)
                if raw is None:
                    shaft[name] = None
                    continue
                tolerance = SHAFT_TOLERANCE.match(raw)
                if tolerance is not None:
                    # « 60 m6 » : diamètre et classe de tolérance dans une
                    # seule cellule imprimée. Les deux sont conservés.
                    shaft[name] = to_float(tolerance.group("value"))
                    shaft[f"{name}_tolerance"] = tolerance.group("tolerance")
                elif re.fullmatch(r"[A-Z]\d+", raw):
                    # « M20 » : filetage en bout d'arbre, valeur textuelle.
                    shaft[name] = None
                    shaft[f"{name}_thread"] = raw
                else:
                    shaft[name] = to_float(raw)
            if any(value is not None for value in shaft.values()):
                by_poles[poles] = shaft
        result[designation_of(match)] = by_poles
    return result


def read_flange_page(page) -> dict[int, dict[str, dict]]:
    """Cotes de bride par hauteur d'axe. Une ligne peut couvrir deux hauteurs."""
    heads, bands = read_labelled_rows(page)
    expected = len(FLANGE_COLUMNS) + 1  # symbole CEI en tête
    if len(bands) != expected:
        raise SystemExit(
            f"page brides : {len(bands)} colonnes lues pour {expected} attendues"
        )
    by_frame: dict[int, dict[str, dict]] = {}
    for match, tail in heads:
        cells = cells_by_band(tail, bands)
        symbol = cells.get(0)
        values = {
            name: to_float(cells.get(index + 1))
            for index, name in enumerate(FLANGE_COLUMNS)
        }
        frames = [int(match.group("frame"))]
        if match.group("frame2"):
            frames.append(int(match.group("frame2")))
        for frame in frames:
            by_frame.setdefault(frame, {})[symbol] = values
    return by_frame


def build_flanges(frame: int, standard_symbol: str | None,
                 flanges_by_frame: dict[int, dict[str, dict]],
                 mountings: list[str]) -> tuple[list[dict], list[str]]:
    """Brides applicables, avec un rôle déduit de la cote M de la standard."""
    available = flanges_by_frame.get(frame, {})
    warnings: list[str] = []
    if standard_symbol is None or standard_symbol not in available:
        warnings.append(
            f"hauteur {frame} : bride standard {standard_symbol} absente de la "
            f"page 15, roles non attribues"
        )
        reference_m = None
    else:
        reference_m = available[standard_symbol]["M"]

    entries: list[dict] = []
    for symbol, values in sorted(available.items()):
        if reference_m is None:
            role = None
        elif symbol == standard_symbol:
            role = "standard"
        elif values["M"] is None:
            role = None
        else:
            role = "larger" if values["M"] > reference_m else "smaller"
        for mounting in mountings:
            entries.append({
                "mounting": mounting,
                "role": role,
                "designation": symbol,
                "orderCode": None,
                "M": values["M"],
                "N": values["N"],
                "P": values["P"],
                "S": values["S"],
                "T": values["T"],
                "holes": to_int(values["holes"]),
                "alphaDeg": values["alphaDeg"],
                "LA": values["LA"],
                "boreType": "through",
            })
    return entries, warnings


def main() -> None:
    pdf_path = PDF_DIR / PDF_SUBDIR / PDF_NAME
    sha = sha256_of(pdf_path)
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    print(f"[source] {PDF_NAME} ({CATALOG_EDITION}) sha256 {sha[:16]}...")

    by_mounting: dict[str, dict[str, dict]] = {}
    sources: list[dict] = []
    warnings: list[str] = []

    with pdfplumber.open(str(pdf_path)) as pdf:
        for pdf_page, (mounting, columns, has_symbol) in sorted(DIMENSION_PAGES.items()):
            page = pdf.pages[pdf_page - 1]
            (RAW_DIR / f"cils_dim_p{pdf_page}.txt").write_text(
                page.extract_text() or "", encoding="utf-8")
            by_mounting[mounting] = read_dimension_page(page, columns, has_symbol)
            sources.append({
                "catalog": PDF_NAME, "catalogSha256": sha, "pdfPage": pdf_page,
                "catalogPage": str(pdf_page),
                "extractionMethod": f"pdfplumber-column-bands-{mounting.lower()}",
            })
            print(f"  page {pdf_page} ({mounting}) : "
                  f"{len(by_mounting[mounting])} types, {len(columns)} cotes")

        shaft_page = pdf.pages[SHAFT_PAGE - 1]
        (RAW_DIR / f"cils_dim_p{SHAFT_PAGE}.txt").write_text(
            shaft_page.extract_text() or "", encoding="utf-8")
        shafts = read_shaft_page(shaft_page)
        sources.append({
            "catalog": PDF_NAME, "catalogSha256": sha, "pdfPage": SHAFT_PAGE,
            "catalogPage": str(SHAFT_PAGE),
            "extractionMethod": "pdfplumber-column-bands-shaft",
        })
        polarities = {
            designation: sorted(blocks) for designation, blocks in shafts.items()
        }
        print(f"  page {SHAFT_PAGE} (arbres) : {len(shafts)} types, "
              f"polarites publiees {sorted({tuple(v) for v in polarities.values()})}")

        flange_page = pdf.pages[FLANGE_PAGE - 1]
        (RAW_DIR / f"cils_dim_p{FLANGE_PAGE}.txt").write_text(
            flange_page.extract_text() or "", encoding="utf-8")
        flanges_by_frame = read_flange_page(flange_page)
        sources.append({
            "catalog": PDF_NAME, "catalogSha256": sha, "pdfPage": FLANGE_PAGE,
            "catalogPage": str(FLANGE_PAGE),
            "extractionMethod": "pdfplumber-column-bands-flange",
        })
        print(f"  page {FLANGE_PAGE} (brides) : "
              + ", ".join(f"hauteur {frame} -> {sorted(symbols)}"
                          for frame, symbols in sorted(flanges_by_frame.items())))

    designations = sorted(set().union(*(entries.keys() for entries in by_mounting.values())))
    records: list[dict] = []
    for designation in designations:
        frame = int(designation.split()[1])
        present = {
            mounting: entries[designation]
            for mounting, entries in by_mounting.items() if designation in entries
        }
        missing = sorted(set(by_mounting) - set(present))
        if missing:
            warnings.append(f"{designation} : absent des pages {', '.join(missing)}")

        symbols = {
            entry["flangeSymbol"] for entry in present.values()
            if entry.get("flangeSymbol")
        }
        if len(symbols) > 1:
            warnings.append(
                f"{designation} : symboles de bride divergents entre montages "
                f"{sorted(symbols)}, role non attribue"
            )
            standard_symbol = None
        else:
            standard_symbol = next(iter(symbols), None)

        flange_mountings = sorted(
            mounting for mounting, entry in present.items() if entry.get("flangeSymbol")
        )
        flanges, flange_warnings = build_flanges(
            frame, standard_symbol, flanges_by_frame, flange_mountings,
        )
        warnings.extend(flange_warnings)

        records.append({
            "brand": "Leroy-Somer",
            "series": "CILS",
            "designation": designation,
            "frameSize": frame,
            "casingMaterial": "cast-iron",
            "lifecycle": "current",
            "dimensionsByMounting": {
                mounting: entry["dimensions"] for mounting, entry in sorted(present.items())
            },
            "shaftByPoles": {
                str(poles): shaft for poles, shaft in sorted(shafts.get(designation, {}).items())
            },
            "flanges": flanges,
            "provenance": {
                "catalog": PDF_NAME,
                "catalogSha256": sha,
                "catalogEdition": CATALOG_EDITION,
                "normalizationNote": " ".join((AD_NOTE, SHAFT_NOTE, FLANGE_ROLE_NOTE)),
                "sources": sources,
            },
        })

    print(f"[controle] {len(records)} types de cotes")
    mounting_variance: list[str] = []
    for record in records:
        per_mounting = record["dimensionsByMounting"]
        shared = set.intersection(*(set(values) for values in per_mounting.values())) \
            if len(per_mounting) > 1 else set()
        for code in sorted(shared):
            values = {values[code] for values in per_mounting.values()}
            if len(values) > 1:
                mounting_variance.append(
                    f"{record['designation']} {code} : "
                    + ", ".join(f"{mounting}={entry[code]}"
                                for mounting, entry in sorted(per_mounting.items()))
                )
    print(f"[controle] cotes dependant du montage : {len(mounting_variance)}")
    for line in mounting_variance[:12]:
        print(f"    {line}")

    roles: dict[str, int] = {}
    for record in records:
        for flange in record["flanges"]:
            key = f"{flange['mounting']}/{flange['role']}"
            roles[key] = roles.get(key, 0) + 1
    print(f"[controle] brides par montage et role : {dict(sorted(roles.items()))}")

    absent_shaft = [record["designation"] for record in records if not record["shaftByPoles"]]
    if absent_shaft:
        warnings.append(f"aucune cote d'arbre pour : {', '.join(absent_shaft)}")

    if warnings:
        print(f"[controle] {len(warnings)} points a lever :")
        for warning in sorted(set(warnings)):
            print(f"    {warning}")
    else:
        print("[controle] aucun point a lever")

    write_json(OUT_DIR / "dimensions-cils.json", records)
    write_json(
        OUT_DIR / "dimensions-cils-warnings.json",
        [{"message": message} for message in sorted(set(warnings))],
    )


if __name__ == "__main__":
    main()
