"""Extrait les points Dyneo+ des pages techniques 36 à 49 uniquement."""
from __future__ import annotations

import re

import pdfplumber

from common import PDF_DIR, OUT_DIR, RAW_DIR, make_provenance, sha256_of, to_float, to_int, write_json


PDF_NAME = "LSHRM_Leroy-Somer.pdf"
STANDARD = "IEC TS 60034-30-2"
SERIES_RE = r"(?:LSHRM|FLSHRM|PLSHRM)\s+\S+"
RIGHT_RE = re.compile(
    rf"^(?:(?P<type>{SERIES_RE})\s+)?(?P<speed>\d+)\s*/\s*(?P<voltage>\d+)\s*(?P<coupling>[YD])\s+(?P<power>[\d,.]+)\s+(?P<ie>IE[345])\s+(?P<eff50>[\d,.]+)\s+(?P<eff75>[\d,.]+)\s+(?P<eff100>[\d,.]+)\s+(?P<current>[\d,.]+)\s+(?P<noise>[\d,.]+)(?:\s+(?P<torque>[\d,.]+)\s+(?P<inertia>[\d,.]+)\s+(?P<mass>[\d,.]+))?$"
)
LEFT_RE = re.compile(
    rf"^(?:(?P<type>{SERIES_RE})\s+)?(?P<voltage>\d+)\s*(?P<coupling>[YD])\s+(?P<power>[\d,.]+)\s+(?P<speed>\d+)\s+(?P<frequency>[\d,.]+)\s+(?P<t10>[\d,.]+)\s+(?P<t20>[\d,.]+)\s+(?P<t33>[\d,.]+)\s+(?P<t50>[\d,.]+)\s+(?P<t100>[\d,.]+)\s+(?P<current>[\d,.]+)$"
)
MODEL_RE = re.compile(rf"^(?P<type>{SERIES_RE})\s+(?P<torque>[\d,.]+)\s+(?P<inertia>[\d,.]+)\s+(?P<mass>[\d,.]+)$")
NAME_ONLY_RE = re.compile(rf"^(?P<type>{SERIES_RE})$")

# page gauche, page droite, version, matériau. Les lignes PLSHRM sont acier.
PAGE_PAIRS = (
    (36, 37, "interchangeable", "aluminium"),
    (38, 39, "interchangeable", "aluminium"),
    (40, 41, "interchangeable", "cast-iron"),
    (42, 43, "interchangeable", "cast-iron"),
    (44, 45, "compacte", "aluminium"),
    (46, 47, "compacte", "aluminium"),
    (48, 49, "compacte", "aluminium"),
)


def number(group: str | None) -> float | None:
    return to_float(group)


def line_records(text: str, side: str) -> list[dict]:
    """Associe les lignes sans désignation au bloc dont la désignation est au milieu."""
    regex = RIGHT_RE if side == "right" else LEFT_RE
    pending: list[dict] = []
    records: list[dict] = []
    current_type: str | None = None
    current_model: dict | None = None

    def variant_anchor(item: dict) -> str:
        power = number(item["power"])
        if power is None:
            raise ValueError(f"Puissance d'ancrage absente: {item}")
        return f"Base {power:g} kW @ {int(item['speed'])} rpm"

    def attach(items: list[dict], type_name: str, model: dict | None) -> None:
        for item in items:
            item["type"] = type_name
            if model:
                item.update(model)
            records.append(item)

    for raw in text.splitlines():
        line = " ".join(raw.split()).replace("/400", "/ 400")
        model_match = MODEL_RE.match(line) if side == "right" else None
        if model_match:
            previous_type = current_type
            current_type = model_match["type"]
            if pending:
                current_model = {
                    "maxTorqueNm": number(model_match["torque"]),
                    "inertiaKgm2": number(model_match["inertia"]),
                    "massKg": number(model_match["mass"]),
                    "variantKey": variant_anchor(pending[0]),
                }
                attach(pending, current_type, current_model)
                pending = []
            else:
                # Dans les tableaux où la signature physique est imprimée au
                # milieu du bloc, les deux lignes qui la précèdent
                # appartiennent au nouveau modèle, pas au précédent.
                previous_rows = records[-2:]
                if len(previous_rows) != 2 or any(
                    item["type"] != previous_type for item in previous_rows
                ):
                    raise ValueError(
                        f"Bloc droit centré inattendu avant {current_type}: {previous_rows}"
                    )
                current_model = {
                    "maxTorqueNm": number(model_match["torque"]),
                    "inertiaKgm2": number(model_match["inertia"]),
                    "massKg": number(model_match["mass"]),
                    "variantKey": variant_anchor(previous_rows[0]),
                }
                for item in previous_rows:
                    item["type"] = current_type
                    item.update(current_model)
            continue
        name_match = NAME_ONLY_RE.match(line)
        if name_match:
            previous_type = current_type
            current_type = name_match["type"]
            if side == "left":
                if pending:
                    attach(pending, current_type, None)
                    pending = []
                else:
                    previous_rows = records[-2:]
                    if len(previous_rows) != 2 or any(
                        item["type"] != previous_type for item in previous_rows
                    ):
                        raise ValueError(
                            f"Bloc gauche centré inattendu avant {current_type}: {previous_rows}"
                        )
                    for item in previous_rows:
                        item["type"] = current_type
            continue
        match = regex.match(line)
        if not match:
            continue
        item = {key: value for key, value in match.groupdict().items() if key != "type"}
        named = match.group("type")
        item["_sourceNamed"] = named is not None
        previous_type = current_type
        if named:
            current_type = named
        if side == "right":
            inline_model = all(match.group(key) is not None for key in ("torque", "inertia", "mass"))
            if inline_model:
                anchor = item
                if records:
                    previous = records[-1]
                    if (
                        not previous.get("_sourceNamed")
                        and previous["type"] == previous_type
                        and previous.get("power") == item["power"]
                    ):
                        anchor = previous
                # Sur une ligne collée, les cinq dernières colonnes sont
                # Tmax, Imax, bruit, inertie, masse. RIGHT_RE les capture
                # d'abord comme current, noise, torque, inertia, mass.
                current_model = {
                    "maxTorqueNm": number(match["current"]),
                    "inertiaKgm2": number(match["inertia"]),
                    "massKg": number(match["mass"]),
                    "variantKey": variant_anchor(anchor),
                }
                item["current"] = match["noise"]
                item["noise"] = match["torque"]
            # Dans les tableaux 3000, la désignation est imprimée sur la
            # seconde ligne d'un bloc. La ligne immédiatement précédente a
            # parfois déjà la puissance du bloc suivant : la rattacher au
            # nouveau type, avec ses données modèle, avant de poursuivre.
            if named and records:
                previous = records[-1]
                if (
                    not previous.get("_sourceNamed")
                    and previous["type"] == previous_type
                    and previous.get("power") == item["power"]
                ):
                    previous["type"] = named
                    if current_model:
                        previous.update(current_model)
            if current_type is None:
                pending.append(item)
            elif current_model is None:
                pending.append(item)
            else:
                attach([item], current_type, current_model)
        elif current_type is None:
            pending.append(item)
        else:
            if named and records:
                previous = records[-1]
                if (
                    not previous.get("_sourceNamed")
                    and previous["type"] == previous_type
                    and previous.get("power") == item["power"]
                ):
                    previous["type"] = named
            attach([item], current_type, None)
    if pending:
        if current_type is None or (side == "right" and current_model is None):
            raise ValueError(f"Bloc {side} sans désignation ou données modèle : {pending[:2]}")
        attach(pending, current_type, current_model)
    return records


def pairing_key(item: dict) -> tuple[str, int, int, float]:
    """Clé source : le couplage est une valeur à contrôler, pas un identifiant."""
    return (item["type"], int(item["speed"]), int(item["voltage"]), number(item["power"]) or 0)


def main() -> None:
    pdf_path = PDF_DIR / PDF_NAME
    sha = sha256_of(pdf_path)
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    output: list[dict] = []
    unmatched: list[tuple[int, tuple]] = []
    reconciled_couplings: list[dict] = []
    with pdfplumber.open(pdf_path) as pdf:
        for left_page, right_page, version, casing in PAGE_PAIRS:
            left_text = pdf.pages[left_page - 1].extract_text(x_tolerance=2, y_tolerance=3) or ""
            right_text = pdf.pages[right_page - 1].extract_text(x_tolerance=2, y_tolerance=3) or ""
            (RAW_DIR / f"dyneo_p{left_page}.txt").write_text(left_text, encoding="utf-8")
            (RAW_DIR / f"dyneo_p{right_page}.txt").write_text(right_text, encoding="utf-8")
            left = {pairing_key(row): row for row in line_records(left_text, "left")}
            right = line_records(right_text, "right")
            page_count = 0
            for row in right:
                match_key = pairing_key(row)
                torque = left.get(match_key)
                if torque is None:
                    unmatched.append((right_page, match_key))
                    continue
                coupling = torque["coupling"] if torque["coupling"] != row["coupling"] else row["coupling"]
                if torque["coupling"] != row["coupling"]:
                    reconciled_couplings.append({
                        "type": row["type"], "speedRpm": to_int(row["speed"]), "voltageV": to_int(row["voltage"]),
                        "powerKw": number(row["power"]), "leftPage": left_page, "rightPage": right_page,
                        "leftCoupling": torque["coupling"], "rightCoupling": row["coupling"], "retainedCoupling": coupling,
                    })
                series = row["type"].split()[0]
                row_casing = "steel" if series == "PLSHRM" else casing
                output.append({
                    "brand": "Leroy-Somer", "series": series, "type": row["type"],
                    "version": version, "casingMaterial": row_casing,
                    "motorTechnology": "PMaSynRM", "supplyMode": "vfd",
                    "frequencyHz": number(torque["frequency"]), "voltageV": to_int(row["voltage"]), "coupling": coupling,
                    "ratedSpeedRpm": to_int(row["speed"]), "powerKw": number(row["power"]),
                    "efficiencyClass": row["ie"], "efficiencyStandard": STANDARD,
                    "efficiency50": number(row["eff50"]), "efficiency75": number(row["eff75"]), "efficiency100": number(row["eff100"]),
                    "maxCurrentA": number(row["current"]), "noiseDb": number(row["noise"]),
                    "cosPhi100": None, "maxTorqueNm": row["maxTorqueNm"], "inertiaKgm2": row["inertiaKgm2"], "massKg": row["massKg"],
                    "variantKey": row.get("variantKey"),
                    "torquePoints": [{"speedFraction": fraction, "frequencyHz": number(torque["frequency"]) * fraction, "torqueNm": number(torque[field])} for fraction, field in ((.1, "t10"), (.2, "t20"), (.33, "t33"), (.5, "t50"), (1.0, "t100"))],
                    "provenance": make_provenance(PDF_NAME, sha, right_page, str(right_page), "pdfplumber-text-paired-pages"),
                })
                page_count += 1
            print(f"  pages {left_page}-{right_page}: {page_count} points")
    if unmatched:
        raise ValueError(f"Appariements gauche/droite absents ({len(unmatched)}) : {unmatched}")
    print(f"  [couplage-réconcilié] {len(reconciled_couplings)} ligne(s) : {reconciled_couplings}")
    if not output:
        raise ValueError("Aucun point Dyneo extrait")
    write_json(OUT_DIR / "dyneo.json", output)


if __name__ == "__main__":
    main()
