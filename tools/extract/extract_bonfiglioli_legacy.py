"""Extraction des tables de puissances Bonfiglioli BE, ME, BN et M.

Ces gammes IE1/IE2 complètent BX, MX et BY déjà traités par
``extract_bonfiglioli.py``. Elles occupent 18 pages du même PDF, déjà
enregistré et déjà empreint : l'extraction complète la provenance, elle ne
crée pas une nouvelle source.

Numérotation : le catalogue imprime un numéro de page décalé de 2 par rapport
au PDF (page PDF = page imprimée + 2). ``pdfPage`` porte la page PDF,
``catalogPage`` la page imprimée, ``catalogSection`` le chapitre.

Pourquoi une lecture par positions et non par ligne de texte
------------------------------------------------------------
Les cinq gabarits de colonnes de ces pages diffèrent (``hp`` absent,
``lb·in`` absent, code KVA absent, un seul rendement à 60 Hz, deux blocs de
frein). Deux pièges interdisent un parseur positionnel naïf :

1. l'en-tête extrait est parfois incomplet — page 85 perd ``lb·in`` alors que
   la colonne existe dans les données ;
2. une cellule vide au milieu d'une ligne décale tout ce qui suit. Page 98,
   ``BN 90SA`` publie deux rendements aux abscisses des colonnes 75 % et
   50 % : c'est **η100 qui est vide**. Un parseur qui compte les valeurs
   affecterait 81,5 à η100 et fabriquerait une donnée fausse.

Les cellules sont donc rattachées à leur colonne par abscisse. Une cellule
absente reste absente.

Contrôles physiques appliqués
-----------------------------
Le catalogue publie plusieurs grandeurs deux fois, en SI puis en unités
américaines. Ces doublons servent d'oracles : ils prouvent l'identification
des colonnes et le facteur d'échelle de l'inertie au lieu de les supposer.

- couple : ``lb·in = N·m × 8,8507`` ;
- inertie : ``lb·ft² = kg·m² × 23,7304``, ce qui démontre le facteur 10⁻⁴ ;
- masse : ``lbs = kg × 2,20462`` ;
- courant : ``I = P / (√3 · U · η · cos φ)`` détermine la tension d'emploi
  réelle des pages 60 Hz, dont l'en-tête imprime 400 V à tort.

Hors périmètre, conformément au cadrage : ``hp``, ``lb·in``, ``lb·ft²`` et
``lbs`` sont lus pour caler les colonnes puis jetés. Le frein est une option,
pas un modèle : seuls son type et son couple sont conservés, comme pour BX.
"""
from __future__ import annotations

import re
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (PDF_DIR, OUT_DIR, RAW_DIR, bonfiglioli_frame_size,
                   build_bands, cells_by_band, group_rows, make_provenance,
                   open_page_rotated, sha256_of, to_float, to_int,
                   validate_frame_sizes, write_json)

PDF_NAME = "Catalogue_BONFIGLIOLI_Moteur.pdf"

# page PDF -> (page imprimée, chapitre, gamme attendue)
RATING_PAGES: dict[int, tuple[str, str, str]] = {
    82: ("80", "M16", "BE"),
    83: ("81", "M16", "BE"),
    84: ("82", "M16", "BE"),
    85: ("83", "M16", "BE"),
    86: ("84", "M16", "ME"),
    87: ("85", "M16", "ME"),
    88: ("86", "M16", "ME"),
    89: ("87", "M16", "ME"),
    98: ("96", "M18", "BN"),
    99: ("97", "M18", "BN"),
    100: ("98", "M18", "BN"),
    101: ("99", "M18", "BN"),
    102: ("100", "M18", "BN"),
    103: ("101", "M18", "M"),
    104: ("102", "M18", "M"),
    105: ("103", "M18", "M"),
    106: ("104", "M18", "M"),
    107: ("105", "M18", "M"),
}

# Gammes IE1/IE2 : plus commercialisables neuves (règlement UE 2019/1781).
# Elles décrivent le parc installé, pas une offre de remplacement.
LEGACY_SERIES = {"BE", "ME", "BN", "M"}

LB_IN_PER_NM = 8.8507
LB_FT2_PER_KGM2 = 23.7304
LBS_PER_KG = 2.20462
SQRT3 = 3 ** 0.5
INERTIA_SCALE = 1e-4

POLE_HEADER = re.compile(
    r"(?P<poles>\d)\s*P\s+(?P<speed>\d{3,4})\s*min-?1.*?(?P<frequency>\d{2})\s*Hz",
    re.IGNORECASE,
)
IE_CLASS_HEADER = re.compile(r"\b(?:BE|ME|BN|MX|BX|BY|M)-(?P<ie>IE\d)\b")
VOLTAGE_HEADER = re.compile(r"(?P<voltage>\d{3})\s?V")

SERIES_ALTERNATION = "BE|BN|ME|MX|BX|BY|M"  # M en dernier : préfixe de MX et ME
ROW_HEAD = re.compile(
    r"^(?P<kw>\d+(?:\.\d{1,2})?)\s+"
    r"(?:(?P<hp>\d+(?:\.\d{1,2})?)\s+)?"
    r"(?P<series>" + SERIES_ALTERNATION + r")\s?"
    r"(?P<frame>\d{1,3}\s?[A-Z]{0,3})\s+"
    r"(?P<poles>\d)(?:\s|$)"
)
FOOTNOTE = re.compile(r"^\(\*+\)$")
KVA_CODE = re.compile(r"^[A-Z]$")

# Tension d'emploi retenue quand l'en-tête 400 V est contredit par les courants.
VOLTAGE_NOTE = (
    "En-tete imprime {declared} V, mais les courants publies correspondent a "
    "{retained} V (ecart median {retained_gap:.1f} % contre {declared_gap:.1f} % "
    "sur I = P / (racine(3) . U . rendement . cos phi)). Tension d'emploi "
    "retenue : {retained} V. Puissance, courant, rendement et cos phi "
    "conserves tels que publies."
)
INERTIA_NOTE = (
    "Inertie publiee en 10^-4 kg.m2, convertie en kg.m2. Le facteur est "
    "demontre ligne a ligne par la colonne lb.ft2 du catalogue "
    "(lb.ft2 = kg.m2 x 23,7304), pas suppose."
)


class RowRejected(Exception):
    """Ligne non résolue : conservée en anomalie, jamais devinée."""


def close_ratio(value: float | None, expected: float, tolerance: float) -> bool:
    if value is None or expected == 0:
        return False
    return abs(value / expected - 1) <= tolerance


def median_ratio(pairs: list[tuple[float, float]]) -> float | None:
    """Médiane de a/b sur les lignes où les deux cellules sont présentes."""
    ratios = [a / b for a, b in pairs if b not in (0, None) and a is not None]
    return statistics.median(ratios) if ratios else None


def column_values(rows: list[dict[int, str]], index: int) -> list[float]:
    values = [to_float(row[index]) for row in rows if index in row]
    return [value for value in values if value is not None]


def all_within(values: list[float], low: float, high: float, minimum: int = 2) -> bool:
    return len(values) >= minimum and all(low <= value <= high for value in values)


def resolve_layout(rows: list[dict[int, str]], band_count: int) -> dict[str, int | None]:
    """Identifie les colonnes de la page à partir de leurs valeurs.

    Le gabarit est une propriété de la page ; une cellule manquante est une
    propriété de la ligne. Cette fonction ne décide que du gabarit.
    """
    layout: dict[str, int | None] = {}
    index = 0

    def values(at: int) -> list[float]:
        return column_values(rows, at)

    def paired(numerator: int, denominator: int) -> list[tuple[float, float]]:
        return [
            (to_float(row[numerator]), to_float(row[denominator]))
            for row in rows
            if numerator in row and denominator in row
            and to_float(row[numerator]) is not None
            and to_float(row[denominator]) is not None
        ]

    layout["rated_speed_rpm"] = index
    index += 1
    layout["torque_nm"] = index
    index += 1

    ratio = median_ratio(paired(index, layout["torque_nm"]))
    layout["torque_lb_in"] = index if close_ratio(ratio, LB_IN_PER_NM, 0.02) else None
    if layout["torque_lb_in"] is not None:
        index += 1

    layout["current_a"] = index
    index += 1

    efficiency_bands: list[int] = []
    while index < band_count and all_within(values(index), 20.0, 100.0) and len(efficiency_bands) < 3:
        efficiency_bands.append(index)
        index += 1
    if not efficiency_bands:
        raise RowRejected("aucune colonne de rendement identifiee")
    for name, band in zip(("efficiency100", "efficiency75", "efficiency50"), efficiency_bands):
        layout[name] = band
    for name in ("efficiency100", "efficiency75", "efficiency50"):
        layout.setdefault(name, None)

    if not all_within(values(index), 0.3, 1.0):
        raise RowRejected(f"colonne cos phi introuvable a l'abscisse {index}")
    layout["cos_phi"] = index
    index += 1

    for name in ("starting_current_ratio", "starting_torque_ratio", "breakdown_torque_ratio"):
        layout[name] = index
        index += 1

    letters = [row[index] for row in rows if index in row]
    layout["kva_code"] = index if letters and all(KVA_CODE.match(text) for text in letters) else None
    if layout["kva_code"] is not None:
        index += 1

    layout["inertia_e4"] = index
    index += 1

    inertia_pairs = [
        (numerator, denominator * INERTIA_SCALE)
        for numerator, denominator in paired(index, layout["inertia_e4"])
    ]
    layout["inertia_lb_ft2"] = (
        index if close_ratio(median_ratio(inertia_pairs), LB_FT2_PER_KGM2, 0.03) else None
    )
    if layout["inertia_lb_ft2"] is not None:
        index += 1

    layout["mass_kg"] = index
    index += 1

    layout["mass_lbs"] = (
        index if close_ratio(median_ratio(paired(index, layout["mass_kg"])), LBS_PER_KG, 0.03) else None
    )
    if layout["mass_lbs"] is not None:
        index += 1

    layout["brake_from"] = index
    return layout


def infer_voltage(rows: list[dict], declared_v: int) -> tuple[int, str | None]:
    """Tension d'emploi déduite des courants publiés.

    Les pages 60 Hz impriment 400 V alors que les courants correspondent à
    460 V. La tension retenue est celle qui reproduit les courants publiés.
    """
    candidates = (declared_v, 460)
    gaps: dict[int, float] = {}
    for voltage in candidates:
        deviations = []
        for row in rows:
            power = row["powerKw"]
            efficiency = row["efficiency100"]
            cos_phi = row["cosPhi100"]
            current = row["ratedCurrent400V"]
            if None in (power, efficiency, cos_phi, current) or current == 0:
                continue
            computed = (power * 1000) / (SQRT3 * voltage * (efficiency / 100) * cos_phi)
            deviations.append(abs(computed / current - 1))
        if deviations:
            gaps[voltage] = statistics.median(deviations) * 100
    if len(gaps) < 2:
        return declared_v, None

    retained = min(gaps, key=lambda voltage: gaps[voltage])
    if retained == declared_v or gaps[retained] > 5.0:
        return declared_v, None
    return retained, VOLTAGE_NOTE.format(
        declared=declared_v, retained=retained,
        retained_gap=gaps[retained], declared_gap=gaps[declared_v],
    )


def join_candidates(series: str, designation: str) -> list[str]:
    """Clés de rattachement aux tables de cotes, dans un ordre déclaré.

    Les sections BX/MX/BY publient les cotes par variante de bobinage ; les
    sections BE/ME/BN/M les publient par taille de carcasse. Une ligne de
    cotes sert donc plusieurs lignes de performances, et la correspondance
    imprimée est irrégulière : ``BE 90SA`` renvoie à ``BE 90S`` mais
    ``BE 132MB`` existe tel quel côté cotes.

    L'extracteur ne tranche pas : il publie les clés à essayer dans l'ordre.
    Le chargeur applique la première qui existe et journalise laquelle, ce qui
    rend la décision auditable au lieu de l'enfouir dans une correspondance
    approximative.
    """
    body = designation[len(series):].strip()
    candidates = [f"{series}{body}"]
    if len(body) >= 2 and body[-1] in "ABCD" and body[-2].isalpha():
        candidates.append(f"{series}{body[:-1]}")
    elif len(body) >= 2 and body[-1] in "ABCD":
        candidates.append(f"{series}{body[:-1]}")
    frame = re.match(r"^\d{1,3}", body)
    if frame:
        candidates.append(f"{series}{frame.group()}")
    seen: set[str] = set()
    return [key for key in candidates if not (key in seen or seen.add(key))]


def parse_page(pdf_path: Path, pdf_page: int, catalog_page: str, section: str,
               expected_series: str, sha: str) -> tuple[list[dict], list[dict]]:
    page, ctx = open_page_rotated(pdf_path, pdf_page - 1)
    try:
        words = page.extract_words(x_tolerance=1.5)
        text = page.extract_text() or ""
    finally:
        ctx.close()
    (RAW_DIR / f"bonfiglioli_legacy_p{pdf_page}.txt").write_text(text, encoding="utf-8")

    pole_header = POLE_HEADER.search(text)
    ie_header = IE_CLASS_HEADER.search(text)
    voltage_header = VOLTAGE_HEADER.search(text)
    if pole_header is None or ie_header is None:
        raise SystemExit(f"page {pdf_page} : en-tete de frequence ou de classe IE introuvable")
    frequency_hz = int(pole_header.group("frequency"))
    efficiency_class = ie_header.group("ie").upper()
    declared_voltage = int(voltage_header.group("voltage")) if voltage_header else 400

    heads: list[re.Match[str]] = []
    tails: list[list[dict]] = []
    for row_words in group_rows(words):
        row_words = [w for w in row_words if not FOOTNOTE.match(w["text"])]
        texts = [word["text"] for word in row_words]
        # La colonne hp peut contenir le même chiffre que la polarité
        # (« 1.5 2 BE 90SA 2 … ») : la fin de l'en-tête de ligne est donc
        # déterminée par le plus court préfixe qui satisfait ROW_HEAD, jamais
        # par la première occurrence du chiffre de polarité.
        for cut in range(3, min(len(texts), 8) + 1):
            head = ROW_HEAD.match(" ".join(texts[:cut]))
            if head is not None and head.group("poles") == texts[cut - 1]:
                heads.append(head)
                tails.append(row_words[cut:])
                break

    bands = build_bands(tails)
    band_rows = [cells_by_band(tail, bands) for tail in tails]
    layout = resolve_layout(band_rows, len(bands))

    records: list[dict] = []
    rejections: list[dict] = []
    for head, cells in zip(heads, band_rows):
        def value(field: str) -> float | None:
            index = layout.get(field)
            return to_float(cells[index]) if index is not None and index in cells else None

        series = head.group("series")
        designation = f"{series} {re.sub(r'\\s+', '', head.group('frame'))}"
        power_kw = to_float(head.group("kw"))
        speed_rpm = to_int(value("rated_speed_rpm"))
        if power_kw is None or speed_rpm is None:
            rejections.append({
                "pdfPage": pdf_page, "designation": designation,
                "reason": "puissance ou vitesse absente de la ligne",
            })
            continue
        if series != expected_series:
            rejections.append({
                "pdfPage": pdf_page, "designation": designation,
                "reason": f"gamme {series} inattendue sur une page {expected_series}",
            })
            continue

        # Contre-vérification d'unités, ligne à ligne. Le gabarit de la page est
        # déjà prouvé par la médiane ; un désaccord isolé porte sur une colonne
        # américaine que l'on ne conserve pas. La valeur SI publiée reste donc
        # retenue et l'écart est journalisé : rejeter la ligne perdrait un
        # moteur valide à cause d'une coquille dans une colonne jetée.
        inertia_e4 = value("inertia_e4")
        crosschecks = [
            ("couple", "lb.in", "torque_lb_in", value("torque_nm"), LB_IN_PER_NM),
            ("inertie", "lb.ft2", "inertia_lb_ft2",
             inertia_e4 * INERTIA_SCALE if inertia_e4 is not None else None,
             LB_FT2_PER_KGM2),
            ("masse", "lbs", "mass_lbs", value("mass_kg"), LBS_PER_KG),
        ]
        unit_mismatches: list[dict] = []
        for label, unit, field, si_value, factor in crosschecks:
            index = layout.get(field)
            printed = cells.get(index) if index is not None else None
            us_value = to_float(printed)
            if us_value is None or si_value is None:
                continue
            expected = si_value * factor
            decimals = len(printed.partition(".")[2]) if "." in printed else 0
            rounding_allowance = 0.5 * 10 ** -decimals
            if (abs(us_value / expected - 1) <= 0.03
                    or abs(us_value - expected) <= rounding_allowance):
                continue
            unit_mismatches.append({
                "quantity": label, "unit": unit, "printed": us_value,
                "expected": round(expected, 4),
                "deviationPct": round((us_value / expected - 1) * 100, 1),
            })

        frame_size, vendor_size_code = bonfiglioli_frame_size(designation, {"MX", "M", "ME"})
        brake_index = layout["brake_from"]
        brake_cells = [cells[index] for index in sorted(cells) if index >= brake_index]
        brake_text = " ".join(brake_cells)
        brake = re.match(r"^(FD\s?\d+[A-Z]?)\s+(\d+(?:\.\d+)?)", brake_text)

        records.append({
            "brand": "Bonfiglioli",
            "series": series,
            "type": designation,
            "lifecycle": "legacy",
            "poles": int(head.group("poles")),
            "frequencyHz": frequency_hz,
            "voltageV": declared_voltage,
            "supplyMode": "mains",
            "efficiencyClass": efficiency_class,
            "frameSize": frame_size,
            "vendorSizeCode": vendor_size_code,
            "dimensionJoinCandidates": join_candidates(series, designation.replace(" ", "")),
            "powerKw": power_kw,
            "ratedSpeedRpm": speed_rpm,
            "ratedTorqueNm": value("torque_nm"),
            "ratedCurrent400V": value("current_a"),
            "efficiency100": value("efficiency100"),
            "efficiency75": value("efficiency75"),
            "efficiency50": value("efficiency50"),
            "cosPhi100": value("cos_phi"),
            "startingCurrentRatio": value("starting_current_ratio"),
            "startingTorqueRatio": value("starting_torque_ratio"),
            "breakdownTorqueRatio": value("breakdown_torque_ratio"),
            "inertiaKgm2": inertia_e4 * INERTIA_SCALE if inertia_e4 is not None else None,
            "weightB5Kg": value("mass_kg"),
            "brakeModel": brake.group(1) if brake else None,
            "brakeTorqueNm": to_float(brake.group(2)) if brake else None,
            "_unitMismatches": unit_mismatches,
            "_pdfPage": pdf_page,
            "_catalogPage": catalog_page,
            "_section": section,
        })

    retained_voltage, voltage_note = infer_voltage(records, declared_voltage)
    notes = [INERTIA_NOTE] if any(row["inertiaKgm2"] is not None for row in records) else []
    if voltage_note:
        notes.append(voltage_note)
    for row in records:
        row["voltageV"] = retained_voltage
        row["voltageCode"] = f"{retained_voltage}-{frequency_hz}"
        provenance = make_provenance(
            PDF_NAME, sha, row.pop("_pdfPage"), row.pop("_catalogPage"),
            "pdfplumber-rotated-column-bands",
        ) | {"catalogSection": row.pop("_section")}
        if notes:
            provenance = provenance | {"normalizationNote": " ".join(notes)}
        row["provenance"] = provenance

    layout_summary = {
        name: index for name, index in layout.items() if index is not None
    }
    print(f"  page {pdf_page} (impr. {catalog_page}, {expected_series}, "
          f"{frequency_hz} Hz, {efficiency_class}, {retained_voltage} V) : "
          f"{len(records)} moteurs, {len(bands)} colonnes")
    if voltage_note:
        print(f"      tension corrigee : {declared_voltage} V -> {retained_voltage} V")
    missing = [name for name in ("efficiency75", "efficiency50") if layout.get(name) is None]
    if missing:
        print(f"      colonnes absentes de la page : {', '.join(missing)}")
    print(f"      gabarit : {layout_summary}")
    return records, rejections


def check_extraction(rows: list[dict]) -> None:
    """Contrôles bloquants : ils prouvent l'identification des colonnes.

    Une valeur hors de ces bornes ne peut pas être une donnée constructeur
    plausible : c'est une cellule rattachée à la mauvaise colonne. Blocage.
    """
    problems: list[str] = []
    for row in rows:
        label = f"{row['type']} {row['poles']}P {row['frequencyHz']}Hz"
        cos_phi = row["cosPhi100"]
        if cos_phi is not None and not 0.3 <= cos_phi <= 1.0:
            problems.append(f"{label} : cos phi {cos_phi} hors [0,3 ; 1]")
        speed = row["ratedSpeedRpm"]
        synchronous = 120 * row["frequencyHz"] / row["poles"]
        if speed is not None and not 0.80 * synchronous <= speed <= synchronous:
            problems.append(
                f"{label} : vitesse {speed} incoherente avec {row['poles']} poles a "
                f"{row['frequencyHz']} Hz (synchrone {synchronous:.0f})"
            )
        for name in ("startingCurrentRatio", "startingTorqueRatio", "breakdownTorqueRatio"):
            ratio = row[name]
            if ratio is not None and not 1.0 <= ratio <= 12.0:
                problems.append(f"{label} : {name} {ratio} hors [1 ; 12]")
        for name in ("efficiency100", "efficiency75", "efficiency50"):
            efficiency = row[name]
            if efficiency is not None and not 20 <= efficiency <= 100:
                problems.append(f"{label} : {name} {efficiency} hors [20 ; 100]")
    if problems:
        for problem in problems[:40]:
            print(f"  [bloquant] {problem}")
        raise SystemExit(f"controle bloquant : {len(problems)} colonnes mal identifiees")


def collect_catalog_anomalies(rows: list[dict]) -> list[dict]:
    """Incohérences internes au catalogue : conservées, jamais corrigées.

    Ces écarts ne remettent pas en cause l'extraction — les oracles d'unités
    prouvent déjà que la colonne est la bonne. Ce sont des valeurs imprimées
    mutuellement incohérentes. Elles sont journalisées et rattachées à la
    ligne pour rester visibles dans le configurateur.
    """
    anomalies: list[dict] = []
    for row in rows:
        label = f"{row['type']} {row['poles']}P {row['frequencyHz']}Hz"
        for mismatch in row.pop("_unitMismatches", []):
            anomalies.append({
                "code": "UNIT_CROSSCHECK_MISMATCH", "designation": row["type"],
                "poles": row["poles"], "frequencyHz": row["frequencyHz"],
                "powerKw": row["powerKw"], "published": mismatch["printed"],
                "computed": mismatch["expected"],
                "deviationPct": mismatch["deviationPct"],
                "message": (
                    f"{label} : {mismatch['quantity']} imprime "
                    f"{mismatch['printed']} {mismatch['unit']} contre "
                    f"{mismatch['expected']} deduit de la valeur SI publiee. "
                    f"Valeur SI conservee, colonne {mismatch['unit']} non retenue"
                ),
                "pdfPage": row["provenance"]["pdfPage"],
            })
        speed, torque, power = row["ratedSpeedRpm"], row["ratedTorqueNm"], row["powerKw"]
        if torque is not None and speed:
            expected = power * 9550 / speed
            if not close_ratio(torque, expected, 0.06):
                anomalies.append({
                    "code": "TORQUE_MISMATCH", "designation": row["type"],
                    "poles": row["poles"], "frequencyHz": row["frequencyHz"],
                    "powerKw": power, "published": torque,
                    "computed": round(expected, 2),
                    "deviationPct": round((torque / expected - 1) * 100, 1),
                    "message": (
                        f"{label} : couple publie {torque} N.m contre "
                        f"{expected:.1f} N.m deduit de {power} kW a {speed} tr/min"
                    ),
                    "pdfPage": row["provenance"]["pdfPage"],
                })
        current, efficiency, cos_phi = row["ratedCurrent400V"], row["efficiency100"], row["cosPhi100"]
        if None not in (current, efficiency, cos_phi) and current:
            expected = (power * 1000) / (SQRT3 * row["voltageV"] * (efficiency / 100) * cos_phi)
            if not close_ratio(current, expected, 0.10):
                anomalies.append({
                    "code": "CURRENT_MISMATCH", "designation": row["type"],
                    "poles": row["poles"], "frequencyHz": row["frequencyHz"],
                    "powerKw": power, "published": current,
                    "computed": round(expected, 2),
                    "deviationPct": round((current / expected - 1) * 100, 1),
                    "message": (
                        f"{label} : courant publie {current} A contre "
                        f"{expected:.2f} A deduit de {power} kW, {efficiency} %, "
                        f"cos phi {cos_phi} sous {row['voltageV']} V"
                    ),
                    "pdfPage": row["provenance"]["pdfPage"],
                })
    index: dict[tuple, list[str]] = {}
    for anomaly in anomalies:
        key = (anomaly["designation"], anomaly["poles"], anomaly["frequencyHz"], anomaly["powerKw"])
        index.setdefault(key, []).append(anomaly["code"])
    for row in rows:
        key = (row["type"], row["poles"], row["frequencyHz"], row["powerKw"])
        row["anomalyCodes"] = sorted(set(index.get(key, [])))
    return anomalies


def report_missing(rows: list[dict]) -> None:
    """Rend visible ce que le catalogue ne publie pas. Aucune valeur inventée."""
    fields = ("efficiency100", "efficiency75", "efficiency50", "cosPhi100",
              "ratedTorqueNm", "ratedCurrent400V", "inertiaKgm2", "weightB5Kg")
    print("[controle] cellules absentes conservees a null :")
    for field in fields:
        absent = sum(1 for row in rows if row[field] is None)
        if absent:
            print(f"    {field} : {absent} / {len(rows)}")


def main() -> None:
    pdf_path = PDF_DIR / PDF_NAME
    sha = sha256_of(pdf_path)
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    all_rows: list[dict] = []
    all_rejections: list[dict] = []
    for pdf_page, (catalog_page, section, series) in sorted(RATING_PAGES.items()):
        rows, rejections = parse_page(
            pdf_path, pdf_page, catalog_page, section, series, sha,
        )
        all_rows.extend(rows)
        all_rejections.extend(rejections)

    by_series: dict[str, int] = {}
    for row in all_rows:
        by_series[row["series"]] = by_series.get(row["series"], 0) + 1
    print(f"[controle] lignes par gamme : {by_series}")

    validate_frame_sizes(all_rows, "type", "caracteristiques Bonfiglioli IE1/IE2")
    check_extraction(all_rows)
    anomalies = collect_catalog_anomalies(all_rows)
    report_missing(all_rows)

    by_code: dict[str, int] = {}
    for anomaly in anomalies:
        by_code[anomaly["code"]] = by_code.get(anomaly["code"], 0) + 1
    print(f"[controle] anomalies catalogue conservees : {by_code or 'aucune'}")
    for anomaly in anomalies:
        print(f"    [{anomaly['code']}] {anomaly['message']} "
              f"(ecart {anomaly['deviationPct']:+.1f} %, page PDF {anomaly['pdfPage']})")

    if all_rejections:
        print(f"[controle] {len(all_rejections)} lignes rejetees :")
        for rejection in all_rejections[:20]:
            print(f"    p{rejection['pdfPage']} {rejection['designation']} : {rejection['reason']}")
    else:
        print("[controle] aucune ligne rejetee")

    write_json(OUT_DIR / "bonfiglioli-legacy.json", all_rows)
    write_json(OUT_DIR / "bonfiglioli-legacy-anomalies.json", anomalies)
    write_json(OUT_DIR / "bonfiglioli-legacy-rejections.json", all_rejections)


if __name__ == "__main__":
    main()
