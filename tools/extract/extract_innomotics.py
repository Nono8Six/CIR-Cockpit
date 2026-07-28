"""Extraction ancrée sur les références article des tables Innomotics."""
from __future__ import annotations

import re
import sys
from pathlib import Path

import pdfplumber
from pypdf import PdfReader

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import PDF_DIR, OUT_DIR, RAW_DIR, make_provenance, sha256_of, to_float, to_int, write_json

PDF_NAME = "Catalogue_Moteur_Innomotics.pdf"
IEC_PAGES = (
    set(range(153, 206)) | set(range(242, 245)) | set(range(350, 377)) |
    {520, 522, 524, 526, 528, 530, 532, 534}
)
ARTICLE = re.compile(r"(?P<article>1[LM]E\d{4}-[0-9A-Z]{4,6})\s*(?:[■\-\s]*)?(?P<weight>\d+(?:\.\d+)?)\s+(?P<inertia>\d+(?:\.\d+)?)")
POLES = re.compile(r"(\d)-(?:pole|polig)\s*:", re.I)
POLE_CONFIG = re.compile(r"(\d)\s*/\s*(\d)-pole\s*:", re.I)
SERIES = re.compile(r"\b(1[LM]E\d{4})\b")
IE = re.compile(r"\b(IE[1-4])\b", re.I)

INDETERMINATE_INERTIA_ARTICLES = {
    "1LE1583-3AB5": (
        "PDF page 176 publishes inertia J as '3443 kgm2' without a decimal "
        "separator. This is implausible for 200 kW, but the PDF does not prove "
        "a missing separator; inertia retained as NULL rather than inferred."
    ),
}


def page_kind(text: str) -> tuple[int, str, str | None] | None:
    """Retourne fréquence et matériau seulement pour une vraie table moteur."""
    if "Selection and ordering data" not in text:
        return None
    lines = text.splitlines()
    index = next(i for i, line in enumerate(lines) if "Selection and ordering data" in line)
    following = lines[index + 1] if index + 1 < len(lines) else ""
    if "Eagle Line" in text:
        frequency = 60
        efficiency_standard = "NEMA Premium" if "NEMA Premium" in text else "NEMA Energy Efficient"
    elif "ABNT Line" in text:
        frequency = 60
        efficiency_standard = "IR3"
    elif "Technical specifications at" in following and "60 Hz" in following:
        frequency = 60
        efficiency_standard = None
    elif following.startswith("Operating values at rated power"):
        frequency = 50
        efficiency_standard = None
    else:
        return None
    lower = text.lower()
    if "cast-iron" in lower:
        casing = "cast-iron"
    elif "aluminum" in lower:
        casing = "aluminium"
    else:
        return None
    return frequency, casing, efficiency_standard


def parse_line(line: str, poles: int | None, frequency: int, casing: str,
               efficiency_class: str | None, efficiency_standard: str | None,
               series: str | None, pdf_page: int, sha: str) -> dict | None:
    match = ARTICLE.search(line)
    if not match or poles is None:
        return None
    tokens = [token for token in line[:match.start()].split() if not IE.fullmatch(token)]
    if len(tokens) < 15:
        return None
    # Les appels de note peuvent précéder une ligne ("2 5.5 6.3 132 S …").
    # L'ancre fiable est donc le couple hauteur d'axe / suffixe, pas un index fixe.
    frame_index = next((i for i in range(2, len(tokens) - 1)
                        if re.fullmatch(r"\d{2,3}", tokens[i])
                        and 56 <= int(tokens[i]) <= 355
                        and re.fullmatch(r"[A-Z]{1,3}", tokens[i + 1])), None)
    if frame_index is None or frame_index < 2:
        return None
    frame_size = int(tokens[frame_index])
    values = [to_float(token) for token in tokens[frame_index + 2:]]
    def number(index: int) -> float | None:
        return values[index] if index < len(values) else None
    article = match.group("article")
    # Sur les pages 352 et 362, pdfplumber isole un appel typographique "3"
    # avant 90 / 315 kW ("3 90 315 M", "3 315 355 L"). Ce n'est pas une
    # puissance : la colonne suivante est celle publiee avant la carcasse.
    power_index = frame_index - 2
    power_60_index = frame_index - 1
    if (
        frame_index == 2
        and tokens[0] == "3"
        and to_float(tokens[1]) is not None
        and to_float(tokens[1]) >= 90
    ):
        power_index = 1
        power_60_index = -1
    published_inertia = to_float(match.group("inertia"))
    inertia_note = INDETERMINATE_INERTIA_ARTICLES.get(article)
    provenance = make_provenance(PDF_NAME, sha, pdf_page, None, "pdfplumber-anchored")
    if inertia_note:
        provenance = provenance | {"normalizationNote": inertia_note}
    return {
        "brand": "Innomotics", "series": series or article[:7], "type": article,
        "articleNo": article, "casingMaterial": casing, "poles": poles,
        "poleConfig": str(poles),
        "frequencyHz": frequency, "voltageV": 400 if frequency == 50 else 460,
        "voltageCode": "400-50" if frequency == 50 else "460-60", "supplyMode": "mains",
        "efficiencyClass": efficiency_class, "efficiencyStandard": efficiency_standard,
        "differentEfficiencyClass60Hz": next((t for t in line[:match.start()].split() if IE.fullmatch(t)), None),
        "frameSize": frame_size, "powerKw": to_float(tokens[power_index]),
        "power60HzKw": to_float(tokens[power_60_index]) if power_60_index >= 0 else None,
        "ratedSpeedRpm": to_int(number(0)), "ratedTorqueNm": number(1),
        "efficiency100": number(2), "efficiency75": number(3), "efficiency50": number(4),
        "cosPhi100": number(5), "ratedCurrent400V": number(6),
        "startingTorqueRatio": number(7), "startingCurrentRatio": number(8), "breakdownTorqueRatio": number(9),
        "noiseDb": number(10), "noise60HzDb": number(11),
        "weightKg": to_float(match.group("weight")),
        "inertiaKgm2": None if inertia_note else published_inertia,
        "provenance": provenance,
    }


def parse_pole_changing_line(line: str, pole_config: str | None, casing: str,
                              pdf_page: int, sha: str) -> list[dict]:
    """Une ligne 1LE1011/1LE1012 décrit deux points N1/N2 documentés."""
    match = ARTICLE.search(line)
    if not match or pole_config is None:
        return []
    tokens = line[:match.start()].split()
    if len(tokens) < 20 or not re.fullmatch(r"\d{2,3}", tokens[2]):
        return []
    poles_1, poles_2 = (int(value) for value in pole_config.split("/"))
    article = match.group("article")
    frame_size = int(tokens[2])
    common = {
        "brand": "Innomotics", "series": article[:7], "type": article,
        "articleNo": article, "casingMaterial": casing, "frequencyHz": 50,
        "voltageV": 400, "voltageCode": "400-50", "supplyMode": "mains",
        "efficiencyClass": None, "efficiencyStandard": None, "poleConfig": pole_config,
        "frameSize": frame_size, "weightKg": to_float(match.group("weight")),
        "inertiaKgm2": to_float(match.group("inertia")),
        "provenance": make_provenance(PDF_NAME, sha, pdf_page, None, "pdfplumber-anchored-pole-changing"),
    }
    def point(power_index: int, start: int, poles: int) -> dict:
        published_efficiency = to_float(tokens[start + 2])
        # p243 imprime exceptionnellement eta-rated2 en fraction (0.9 / 0.91)
        # alors que l'en-tete est bien en %. La conversion d'unite est tracee
        # dans la provenance et ne modifie pas la valeur publiee silencieusement.
        normalized = (
            published_efficiency * 100
            if published_efficiency is not None and 0 < published_efficiency < 1.5
            else published_efficiency
        )
        provenance = common["provenance"]
        if normalized != published_efficiency:
            provenance = provenance | {
                "normalizationNote": (
                    f"efficiency100 normalized from published fraction "
                    f"{published_efficiency:g} to percentage {normalized:g}; "
                    "PDF column eta-rated2 is headed %"
                )
            }
        return common | {
            "poles": poles, "powerKw": to_float(tokens[power_index]),
            "ratedSpeedRpm": to_int(tokens[start]), "ratedTorqueNm": to_float(tokens[start + 1]),
            "efficiency100": normalized, "efficiency75": None, "efficiency50": None,
            "cosPhi100": to_float(tokens[start + 3]), "ratedCurrent400V": to_float(tokens[start + 4]),
            "startingTorqueRatio": to_float(tokens[start + 5]), "startingCurrentRatio": to_float(tokens[start + 6]),
            "breakdownTorqueRatio": to_float(tokens[start + 7]),
            "provenance": provenance,
        }
    return [point(0, 4, poles_1), point(1, 12, poles_2)]


def main() -> None:
    pdf_path = PDF_DIR / PDF_NAME
    sha = sha256_of(pdf_path)
    # pypdf sert seulement à présélectionner rapidement les pages ; pdfplumber
    # reste l'unique lecteur des valeurs extraites.
    reader = PdfReader(str(pdf_path))
    candidates = [
        i + 1 for i, page in enumerate(reader.pages)
        if i + 1 in IEC_PAGES and "Selection and ordering data" in (page.extract_text() or "")
    ]
    rows: list[dict] = []
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    with pdfplumber.open(str(pdf_path)) as pdf:
        for pdf_page in candidates:
            text = pdf.pages[pdf_page - 1].extract_text() or ""
            kind = page_kind(text)
            if kind is None:
                continue
            frequency, casing, efficiency_standard = kind
            if frequency != 50:
                raise ValueError(f"page IEC {pdf_page} annoncée hors 50 Hz")
            (RAW_DIR / f"innomotics_p{pdf_page}.txt").write_text(text, encoding="utf-8")
            poles = None
            pole_config = None
            efficiency_class = None
            series = None
            count = 0
            for line in text.splitlines():
                config_header = POLE_CONFIG.search(line)
                if config_header:
                    pole_config = f"{config_header.group(1)}/{config_header.group(2)}"
                    continue
                header = POLES.search(line)
                if header:
                    poles = int(header.group(1))
                    continue
                if "Efficiency" in line:
                    found = IE.search(line)
                    if found:
                        efficiency_class = found.group(1).upper()
                found_series = SERIES.search(line)
                if found_series and "series" in line.lower():
                    series = found_series.group(1)
                if pdf_page in {242, 243, 244}:
                    records = parse_pole_changing_line(line, pole_config, casing, pdf_page, sha)
                else:
                    record = parse_line(line, poles, frequency, casing, efficiency_class, efficiency_standard, series, pdf_page, sha)
                    records = [record] if record else []
                for record in records:
                    if record["powerKw"] is not None and record["ratedSpeedRpm"] is not None:
                        rows.append(record); count += 1
            if count:
                print(f"  page {pdf_page} ({frequency} Hz {casing}) : {count} moteurs")
    write_json(OUT_DIR / "innomotics.json", rows)


if __name__ == "__main__":
    main()
