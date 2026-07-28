"""Extraction des caractéristiques électriques Leroy-Somer CILS IE4.

Source : ``6154c_fr_CILS_IE4.pdf``, 20 pages, édition 2025. C'est le catalogue
technique dédié au CILS. Il ne doit pas être confondu avec ``CILS IE4.pdf``
(6 pages), qui est une plaquette commerciale sans tableau exploitable.

Attention, génération de désignations différente
------------------------------------------------
Le catalogue 5147 déjà chargé publie ``CILS 280 S/M`` et ``CILS 315 S/M/L``.
Le 6154c publie ``CILS 225 S/M``, ``CILS 250 M``, ``CILS 280 SG/MG`` et
``CILS 315 SE/ME/LE``, sur la même plage de puissances et deux crans de plus.
Ce sont deux générations de désignations, pas des doublons. L'extracteur les
sort telles que publiées et signale les recouvrements de puissance : la
décision de conserver, remplacer ou marquer obsolète l'ancienne génération est
une décision de catalogue, pas d'extraction.

Pourquoi une lecture par positions
----------------------------------
Le catalogue est français : le séparateur de milliers est une espace. ``1 026``
et ``2 978`` se découpent en deux mots, ce qui décale tout parseur positionnel
travaillant sur les jetons. Les cellules sont donc rattachées à leur colonne
par abscisse, avec une tolérance de fusion très inférieure au blanc réel entre
colonnes, et le contrôle ``minimum_band_gap`` vérifie cette marge.

L'ordre des colonnes est déclaré page par page, puis **prouvé** par la
physique : ``Mn = 9550 · Pn / Nn`` et ``In = Pn / (√3 · U · η · cos φ)``.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import pdfplumber

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (PDF_DIR, OUT_DIR, RAW_DIR, build_bands, cells_by_band,
                   group_rows, make_provenance, minimum_band_gap, sha256_of,
                   to_float, to_int, write_json)

PDF_SUBDIR = "Leroy_Somer_catalogues_moteurs"
PDF_NAME = "6154c_fr_CILS_IE4.pdf"
CATALOG_EDITION = "6154c fr - 2025"

VOLTAGE_V = 400
FREQUENCY_HZ = 50
EFFICIENCY_CLASS = "IE4"
SQRT3 = 3 ** 0.5
BAND_GAP = 2.0  # très inférieur au blanc entre colonnes, contrôlé à l'exécution

# Ordre imprimé des colonnes, hors désignation. Il est déclaré ici et vérifié
# par les contrôles physiques : aucune colonne n'est devinée à la lecture.
MAINS_COLUMNS = (
    "powerKw", "ratedTorqueNm", "startingTorqueRatio", "breakdownTorqueRatio",
    "startingCurrentRatio", "inertiaKgm2", "massB3Kg", "noiseDb",
    "ratedSpeedRpm", "ratedCurrentA",
    "efficiency100", "efficiency75", "efficiency50",
    "cosPhi100", "cosPhi75", "cosPhi50",
)
VFD_COLUMNS = (
    "powerKw", "ratedSpeedRpm", "ratedCurrentA", "cosPhi100",
    "torque5Hz", "torque10Hz", "torque17Hz", "torque25Hz",
)
VFD_TORQUE_FREQUENCIES = {"torque5Hz": 5, "torque10Hz": 10,
                          "torque17Hz": 17, "torque25Hz": 25}

DESIGNATION = re.compile(r"^CILS\s?(?P<frame>\d{3})\s?(?P<letters>[A-Z]{0,2})$")
POLE_SECTION = re.compile(r"^(?P<poles>\d)\s*p[ôo]les?$", re.IGNORECASE)

VFD_NOTE = (
    "Couples disponibles a 5, 10, 17 et 25 Hz publies en N.m ; la valeur "
    "maximale de la serie egale le couple nominal reseau du meme moteur, ce "
    "qui ecarte une lecture en pourcentage malgre l'en-tete imprime."
)


def normalize_designation(frame: str, letters: str) -> str:
    return f"CILS {frame} {letters}".strip()


def read_rows(page, expected_columns: tuple[str, ...]) -> tuple[list[dict], list[str]]:
    """Lit les lignes de données d'une page et rattache les cellules aux colonnes.

    Retourne les lignes et les avertissements de structure. La désignation est
    reconnue sur le plus court préfixe de mots qui la satisfait, puis la queue
    numérique est rattachée aux colonnes construites sur l'ensemble des lignes.
    """
    words = page.extract_words(x_tolerance=1.5)
    warnings: list[str] = []
    poles: int | None = None
    heads: list[tuple[str, int, list[dict]]] = []

    for row in group_rows(words):
        texts = [word["text"] for word in row]
        section = POLE_SECTION.match(" ".join(texts))
        if section is not None:
            poles = int(section.group("poles"))
            continue
        for cut in (3, 2):
            if len(texts) < cut:
                continue
            match = DESIGNATION.match(" ".join(texts[:cut]))
            if match is None:
                continue
            if poles is None:
                warnings.append(
                    f"{normalize_designation(**match.groupdict())} : lue avant "
                    f"toute section de polarite, ligne ignoree"
                )
                break
            heads.append((
                normalize_designation(match.group("frame"), match.group("letters")),
                poles, row[cut:],
            ))
            break

    tails = [tail for _, _, tail in heads]
    bands = build_bands(tails, gap=BAND_GAP)
    gap = minimum_band_gap(bands)
    if gap <= BAND_GAP:
        raise SystemExit(
            f"blanc inter-colonnes {gap:.2f} pt trop faible pour la tolerance "
            f"de fusion {BAND_GAP} pt : colonnes fusionnees silencieusement"
        )
    if len(bands) != len(expected_columns):
        raise SystemExit(
            f"{len(bands)} colonnes lues pour {len(expected_columns)} attendues : "
            f"{[list(map(round, band)) for band in bands]}"
        )

    rows: list[dict] = []
    for designation, row_poles, tail in heads:
        cells = cells_by_band(tail, bands)
        record: dict = {"designation": designation, "poles": row_poles}
        for index, name in enumerate(expected_columns):
            record[name] = to_float(cells.get(index))
        rows.append(record)
    return rows, warnings


def check_physics(rows: list[dict], voltage_v: int, label: str) -> list[dict]:
    """Prouve l'ordre déclaré des colonnes et journalise les écarts réels.

    Un écart de couple ou de courant ne remet pas en cause l'extraction dès
    lors que l'ensemble de la page est cohérent : c'est une valeur imprimée.
    En revanche un écart médian important signifierait un décalage de colonnes
    et bloque.
    """
    anomalies: list[dict] = []
    torque_deviations: list[float] = []
    current_deviations: list[float] = []

    for row in rows:
        name = f"{row['designation']} {row['poles']}P"
        power, speed = row.get("powerKw"), row.get("ratedSpeedRpm")
        torque, current = row.get("ratedTorqueNm"), row.get("ratedCurrentA")
        efficiency, cos_phi = row.get("efficiency100"), row.get("cosPhi100")

        if None not in (power, speed, torque) and speed:
            expected = power * 9550 / speed
            deviation = torque / expected - 1
            torque_deviations.append(abs(deviation))
            if abs(deviation) > 0.03:
                anomalies.append({
                    "code": "TORQUE_MISMATCH", "designation": row["designation"],
                    "poles": row["poles"], "powerKw": power, "published": torque,
                    "computed": round(expected, 1),
                    "deviationPct": round(deviation * 100, 1),
                    "message": (f"{name} : couple publie {torque} N.m contre "
                                f"{expected:.1f} N.m deduit de {power} kW a {speed} tr/min"),
                })
        if None not in (power, current, efficiency, cos_phi) and current:
            expected = (power * 1000) / (SQRT3 * voltage_v * (efficiency / 100) * cos_phi)
            deviation = current / expected - 1
            current_deviations.append(abs(deviation))
            if abs(deviation) > 0.05:
                anomalies.append({
                    "code": "CURRENT_MISMATCH", "designation": row["designation"],
                    "poles": row["poles"], "powerKw": power, "published": current,
                    "computed": round(expected, 1),
                    "deviationPct": round(deviation * 100, 1),
                    "message": (f"{name} : courant publie {current} A contre "
                                f"{expected:.1f} A deduit de {power} kW, "
                                f"{efficiency} %, cos phi {cos_phi} sous {voltage_v} V"),
                })

    for values, quantity in ((torque_deviations, "couple"), (current_deviations, "courant")):
        if values:
            median = sorted(values)[len(values) // 2]
            print(f"  [controle] {label} : ecart median sur le {quantity} "
                  f"{median * 100:.2f} %")
            if median > 0.05:
                raise SystemExit(
                    f"controle bloquant {label} : ecart median {median * 100:.1f} % "
                    f"sur le {quantity}, colonnes probablement decalees"
                )
    return anomalies


def build_operating_points(rows: list[dict], supply_mode: str, pdf_page: int,
                          sha: str, extra_note: str | None = None) -> list[dict]:
    records: list[dict] = []
    for row in rows:
        provenance = make_provenance(
            PDF_NAME, sha, pdf_page, str(pdf_page), "pdfplumber-column-bands",
        ) | {"catalogEdition": CATALOG_EDITION}
        if extra_note:
            provenance = provenance | {"normalizationNote": extra_note}
        records.append({
            "brand": "Leroy-Somer",
            "series": "CILS",
            "type": row["designation"],
            "lifecycle": "current",
            "casingMaterial": "cast-iron",
            "motorTechnology": "asynchronous",
            "protectionIp": "IP55",
            "poles": row["poles"],
            "frequencyHz": FREQUENCY_HZ,
            "voltageV": VOLTAGE_V,
            "voltageCode": f"{VOLTAGE_V}-{FREQUENCY_HZ}",
            "supplyMode": supply_mode,
            "efficiencyClass": EFFICIENCY_CLASS,
            "frameSize": to_int(row["designation"].split()[1]),
            "powerKw": row["powerKw"],
            "ratedSpeedRpm": to_int(row["ratedSpeedRpm"]),
            "ratedTorqueNm": row.get("ratedTorqueNm"),
            "ratedCurrentA": row.get("ratedCurrentA"),
            "efficiency100": row.get("efficiency100"),
            "efficiency75": row.get("efficiency75"),
            "efficiency50": row.get("efficiency50"),
            "cosPhi100": row.get("cosPhi100"),
            "cosPhi75": row.get("cosPhi75"),
            "cosPhi50": row.get("cosPhi50"),
            "startingCurrentRatio": row.get("startingCurrentRatio"),
            "startingTorqueRatio": row.get("startingTorqueRatio"),
            "breakdownTorqueRatio": row.get("breakdownTorqueRatio"),
            "inertiaKgm2": row.get("inertiaKgm2"),
            "massB3Kg": row.get("massB3Kg"),
            "noiseDb": row.get("noiseDb"),
            "provenance": provenance,
        })
    return records


def build_torque_points(rows: list[dict], pdf_page: int, sha: str) -> list[dict]:
    points: list[dict] = []
    for row in rows:
        provenance = make_provenance(
            PDF_NAME, sha, pdf_page, str(pdf_page), "pdfplumber-column-bands",
        ) | {"catalogEdition": CATALOG_EDITION, "normalizationNote": VFD_NOTE}
        for field, frequency_hz in VFD_TORQUE_FREQUENCIES.items():
            torque = row.get(field)
            if torque is None:
                continue
            points.append({
                "brand": "Leroy-Somer",
                "series": "CILS",
                "type": row["designation"],
                "poles": row["poles"],
                "powerKw": row["powerKw"],
                "supplyMode": "vfd",
                "frequencyHz": frequency_hz,
                "torqueNm": torque,
                "provenance": provenance,
            })
    return points


def report_generation_overlap(rows: list[dict]) -> None:
    """Signale les recouvrements de puissance avec la génération déjà chargée."""
    previous = {
        (2, 75.0): "CILS 280 S", (2, 90.0): "CILS 280 M",
        (2, 110.0): "CILS 315 S", (2, 132.0): "CILS 315 M",
        (2, 160.0): "CILS 315 L", (4, 75.0): "CILS 280 S",
        (4, 90.0): "CILS 280 M", (4, 110.0): "CILS 315 S",
        (4, 132.0): "CILS 315 M", (4, 160.0): "CILS 315 L",
    }
    print("[controle] recouvrements avec la generation 5147 deja chargee :")
    overlaps = sorted({
        (row["poles"], row["powerKw"], previous[(row["poles"], row["powerKw"])], row["type"])
        for row in rows
        if (row["poles"], row["powerKw"]) in previous
        and row["type"] != previous[(row["poles"], row["powerKw"])]
    })
    for poles, power, old, new in overlaps:
        print(f"    {poles}P {power} kW : {old} (5147) et {new} (6154c)")
    if not overlaps:
        print("    aucun")


def main() -> None:
    pdf_path = PDF_DIR / PDF_SUBDIR / PDF_NAME
    sha = sha256_of(pdf_path)
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    print(f"[source] {PDF_NAME} ({CATALOG_EDITION}) sha256 {sha[:16]}...")

    all_points: list[dict] = []
    all_anomalies: list[dict] = []
    torque_points: list[dict] = []

    with pdfplumber.open(str(pdf_path)) as pdf:
        for pdf_page, columns, supply_mode in ((9, MAINS_COLUMNS, "mains"),
                                               (10, VFD_COLUMNS, "vfd")):
            page = pdf.pages[pdf_page - 1]
            (RAW_DIR / f"cils_p{pdf_page}.txt").write_text(
                page.extract_text() or "", encoding="utf-8")
            rows, warnings = read_rows(page, columns)
            for warning in warnings:
                print(f"  [avertissement] p{pdf_page} {warning}")
            label = f"p{pdf_page} {supply_mode}"
            all_anomalies.extend(check_physics(rows, VOLTAGE_V, label))
            note = VFD_NOTE if supply_mode == "vfd" else None
            all_points.extend(build_operating_points(rows, supply_mode, pdf_page, sha, note))
            if supply_mode == "vfd":
                torque_points.extend(build_torque_points(rows, pdf_page, sha))
            by_poles: dict[int, int] = {}
            for row in rows:
                by_poles[row["poles"]] = by_poles.get(row["poles"], 0) + 1
            print(f"  page {pdf_page} ({supply_mode}) : {len(rows)} points, "
                  f"par polarite {by_poles}")

    designations = sorted({row["type"] for row in all_points})
    print(f"[controle] {len(all_points)} points, {len(designations)} designations : "
          f"{', '.join(designations)}")
    print(f"[controle] {len(torque_points)} points de couple variateur")

    absent = {
        field: sum(1 for row in all_points if row[field] is None)
        for field in ("ratedTorqueNm", "efficiency100", "cosPhi100",
                      "inertiaKgm2", "massB3Kg", "noiseDb")
    }
    print("[controle] cellules absentes conservees a null :",
          {field: count for field, count in absent.items() if count})

    report_generation_overlap(all_points)

    if all_anomalies:
        print(f"[controle] {len(all_anomalies)} anomalies catalogue conservees :")
        for anomaly in all_anomalies:
            print(f"    [{anomaly['code']}] {anomaly['message']} "
                  f"(ecart {anomaly['deviationPct']:+.1f} %)")
    else:
        print("[controle] aucune anomalie catalogue")

    write_json(OUT_DIR / "cils.json", all_points)
    write_json(OUT_DIR / "cils-vfd-torque.json", torque_points)
    write_json(OUT_DIR / "cils-anomalies.json", all_anomalies)


if __name__ == "__main__":
    main()
