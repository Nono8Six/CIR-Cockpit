"""Cotes Innomotics : jointure par hauteur d'axe, jamais par catalogue applicatif.

Les brides sont transcrites des pages PDF 66-67 (catalogue 1/60-1/61). Les
cotes d'arbre viennent uniquement des tableaux IMB35, qui publient D/E/F sans
interprétation du schema. L reste nul : dans ces tableaux il varie suivant le
suffixe de type, alors que cette extraction est volontairement par frame/poles.
"""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict

import pdfplumber

from common import OUT_DIR, PDF_DIR, make_provenance, sha256_of, to_float, write_json

PDF_NAME = "Catalogue_Moteur_Innomotics.pdf"

# Ces pages publient les pattes et l'encombrement. Les pages IR3 Rendimento
# (308, 326--329) sont volontairement absentes : elles sont hors périmètre IEC.
# Le filtre par série est le libellé constructeur de la table, jamais une
# corrélation entre séries ou une valeur normalisée IEC.
FOOT_DIMENSION_PAGES = (
    (294, ("1LE1004",)),
    (296, ("1LE1003",)),
    (298, ("1LE1003",)),
    (300, ("1LE1003",)),
    (306, ("1LE1083",)),
    (310, ("1LE1001", "1LE1002", "1LE1011", "1LE1012")),
    (316, ("1LE1504", "1LE1604")),
    (318, ("1LE1503", "1LE1603")),
    (320, ("1LE1503", "1LE1603")),
    (322, ("1LE1583",)),
    (324, ("1LE1583",)),
    (330, ("1LE1501", "1LE1502", "1LE1601")),
    (332, ("1LE1501", "1LE1502", "1LE1601")),
    (334, ("1LE1501", "1LE1502", "1LE1601")),
    # 412 porte la table de pattes 1LE5.0.; ses suffixes publiés recouvrent
    # les articles 1LE1604 concernés (dont 2BB0); 413 est sa page arbre.
    (412, ("1LE1604", "1LE5504")),
    # 419--421 sont des pages sans paire simple. La table 421 répartit ses
    # valeurs sur plusieurs blocs graphiques : ses abscisses ne permettent pas
    # d'associer sûrement les colonnes au moteur 1LE5584; on la laisse nulle.
)
FOOT_DIMENSION_SUFFIX_MATCH_PAGES = {296, 298, 300, 306, 412}

# Table de correspondance pattes <-> arbre : chaque page de pattes a sa page arbre associée (pdf_page + 1).
SHAFT_DIMENSION_PAGES = {f_page: f_page + 1 for f_page, _ in FOOT_DIMENSION_PAGES}

FOOT_DIMENSION_KEYS = {
    "A", "AA", "AB", "AC", "AD", "AD'", "AD''", "AF", "AF'", "AG", "AG'", "AG''", "AH", "AS",
    "B", "B'", "B''", "BA", "BA'", "BB", "BC", "BE", "BE'", "C", "CA", "CA'", "CA''", "H", "HA", "HB", "Y",
    "K", "K'", "HH",
}

SHAFT_DIMENSION_KEYS = {
    "H", "HA", "HB", "HB'", "HB''", "HC", "HD", "HD'", "HH", "Y", "K", "K'",
    "L", "L1", "L1)", "L12)", "D1", "LA", "LC", "LC1)", "LL", "D", "DB", "E", "EB", "ED",
    "F", "GA", "DA", "DC", "EA", "EC", "EE", "FA", "GC"
}

IGNORED_HEADER_TEXTS = {
    "Frame", "Motor", "type", "No.", "of", "Dimensional", "drawings", "Type", "construction", "IMB35",
    "For", "flange", "dimensions,", "see", "page", "1/60", "(Z", "=", "the", "number", "retaining", "holes)",
    "DE", "shaft", "extension", "NDE", "acc.", "to", "IEC", "1)", "12)", "2)"
}


def n(value):
    return int(value) if isinstance(value, float) and value.is_integer() else value


def flange(designation, din, la, le, m, nn, p, s, t, holes, role, code, bore):
    return {"designation": designation, "dinDesignation": din, "LA": la, "LE": le,
            "M": m, "N": nn, "P": p, "S": s, "T": t, "holes": holes,
            "role": role, "orderCode": code, "boreType": bore}


# frame -> lignes PDF 1/60-1/61. B5 et B35 (ou B14 et B34) partagent la meme bride.
F = {
 63: [("through", [flange("FF115","A140",None,23,115,95,140,10,3,4,"standard",None,"through"), flange("FF100","A120",None,23,100,80,120,7,3,4,"smaller","P02","through")]), ("tapped", [flange("FT75","C90",None,23,75,60,90,"M6",2.5,4,"standard",None,"tapped"), flange("FT100","C120",None,23,100,80,120,"M6",3,4,"larger","P01","tapped"), flange("FT65","C80",None,23,65,50,80,"M5",2.5,4,"smaller","P02","tapped")])],
 71: [("through", [flange("FF130","A160",5,30,130,110,160,10,3.5,4,"standard",None,"through"), flange("FF115","A140",None,30,115,95,140,10,3,4,"smaller","P02","through")]), ("tapped", [flange("FT85","C105",None,30,85,70,105,"M6",2.5,4,"standard",None,"tapped"), flange("FT115","C140",None,30,115,95,140,"M8",3,4,"larger","P01","tapped"), flange("FT75","C90",None,30,75,60,90,"M5",2.5,4,"smaller","P02","tapped")])],
 80: [("through", [flange("FF165","A200",10,40,165,130,200,12,3.5,4,"standard",None,"through"), flange("FF130","A160",None,40,130,110,160,10,3.5,4,"smaller","P02","through")]), ("tapped", [flange("FT100","C120",None,40,100,80,120,"M6",3,4,"standard",None,"tapped"), flange("FT130","C160",None,40,130,110,160,"M8",3.5,4,"larger","P01","tapped")])],
 90: [("through", [flange("FF165","A200",10,50,165,130,200,12,3.5,4,"standard",None,"through"), flange("FF215","A250",None,50,215,180,250,14.5,4,4,"larger","P01","through")]), ("tapped", [flange("FT115","C140",None,50,115,95,140,"M8",3,4,"standard",None,"tapped"), flange("FT130","C160",None,50,130,110,160,"M8",3.5,4,"larger","P01","tapped")])],
 100: [("through", [flange("FF215","A250",11,60,215,180,250,14.5,4,4,"standard",None,"through"), flange("FF265","A300",12,60,265,230,300,14.5,4,4,"larger","P01","through"), flange("FF165","A200",11,60,165,130,200,12,3.5,4,"smaller","P02","through")]), ("tapped", [flange("FT130","C160",None,60,130,110,160,"M8",3.5,4,"standard",None,"tapped"), flange("FT165","C200",None,60,165,130,200,"M10",3.5,4,"larger","P01","tapped"), flange("FT115","C140",None,60,115,95,140,"M8",3,4,"smaller","P02","tapped")])],
 112: [], 132: [], 160: [], 180: [], 200: [], 225: [], 250: [], 280: [], 315: [],
}
# lignes identiques ou plus courtes du tableau (copie explicite pour garder les roles publies).
F[112] = F[100]
F[132] = [("through", [flange("FF265","A300",12,80,265,230,300,14.5,4,4,"standard",None,"through"), flange("FF300","A350",13,80,300,250,350,18.5,5,4,"larger","P01","through"), flange("FF215","A250",11,80,215,180,250,14.5,4,4,"smaller","P02","through")]), ("tapped", [flange("FT165","C200",None,80,165,130,200,"M10",3.5,4,"standard",None,"tapped"), flange("FT215","C250",None,80,215,180,250,"M12",4,4,"larger","P01","tapped")])]
F[160] = [("through", [flange("FF300","A350",13,110,300,250,350,18.5,5,4,"standard",None,"through"), flange("FF265","A300",12,110,265,230,300,14.5,4,4,"smaller","P02","through")]), ("tapped", [flange("FT215","C250",None,110,215,180,250,"M12",4,4,"standard",None,"tapped")])]
F[180] = F[160]
F[200] = [("through", [flange("FF350","A400",15,110,350,300,400,18.5,5,4,"standard",None,"through"), flange("FF300","A350",13,110,300,250,350,18.5,5,4,"smaller","P02","through")])]
F[225] = [("through", [flange("FF400","A450",16,110,400,350,450,18.5,5,8,"standard",None,"through")])]
F[250] = [("through", [flange("FF500","A550",18,140,500,450,550,18.5,5,8,"standard",None,"through")])]
F[280] = F[250]
F[315] = [("through", [flange("FF600","A660",22,140,600,550,660,24,6,8,"standard",None,"through")])]

# D/E/F des tables IMB35 : 2/153, 2/155, 2/175, 2/177 et 2/181.
# Les grandes hauteurs sont raffinees ci-dessous avec le suffixe article publie.
# Valeur apres ED, ancree entre DB (premier filetage) et GA : c'est F, pas ED.
SHAFT = {63:(11,23,4,297), 71:(14,30,5,297), 80:(19,40,6,297), 90:(24,50,8,297),
         100:(28,60,8,299), 112:(28,60,8,299), 132:(38,80,10,299), 160:(42,110,12,299),
         180:(48,110,14,321), 200:(55,110,16,321)}


def shaft_for(motor):
    """Retourne seulement les D/E/F explicitement publies pour suffixe/frame."""
    frame, article = motor.get("frameSize"), motor["articleNo"]
    suffix = article.split("-", 1)[-1]
    page = 421 if article.startswith("1LE5584-") else 413 if article.startswith("1LE5504-") else 325
    if frame == 225:
        return (55, 110, 16, page) if suffix in {"2BA2", "2BA6"} else (60, 140, 18, page)
    if frame == 250:
        return (60, 140, 18, page)
    if frame == 280:
        return (75, 140, 20, page) if suffix in {"2DC2", "2DD2"} else (65, 140, 18, page)
    if frame == 315:
        return (65, 140, 18, page) if suffix in {"3AA0", "3AA2", "3AA4", "3AA5"} else (80, 170, 22, page)
    if frame == 355 and article.startswith("1LE5584-") and suffix == "3BC2":
        return (95, 170, 25, 421)
    return SHAFT.get(frame)


def flanges_for(motor):
    """Brides communes par HA, avec les exceptions 1LE5 imprimees page 1/61."""
    frame, poles = motor.get("frameSize"), motor.get("poles")
    large_le = 140 if poles == 2 else 170
    if motor["articleNo"].startswith("1LE5") and frame == 315:
        specs = [flange("FF740", "A800", 25, large_le, 740, 680, 800, 24, 6, 8, "standard", None, "through"),
                 flange("FF600", "A660", 22, large_le, 600, 550, 660, 24, 6, 8, "smaller", "P02", "through")]
        return [{**spec, "mounting": mount} for mount in ("B5", "B35") for spec in specs]
    if motor["articleNo"].startswith("1LE5") and frame == 355:
        specs = [flange("FF840", "A900", 25, large_le, 840, 780, 900, 24, 6, 8, "standard", None, "through"),
                 flange("FF740", "A800", 25, large_le, 740, 680, 800, 24, 6, 8, "smaller", "P02", "through")]
        return [{**spec, "mounting": mount} for mount in ("B5", "B35") for spec in specs]
    result = []
    for bore, specs in F.get(frame, []):
        mounts = ("B5", "B35") if bore == "through" else ("B14", "B34")
        result.extend({**spec, "mounting": mount} for mount in mounts for spec in specs)
    return result


def catalog_page_for(pdf_page):
    return f"2/{pdf_page - 144}" if pdf_page < 400 else f"3/{pdf_page - 338}"


def expected_iec_f(diameter):
    """Controle seulement : plages communiquees, jamais une source de valeurs."""
    for lower, upper, width in ((24, 30, 8), (32, 38, 10), (40, 44, 12),
                                (48, 50, 14), (55, 58, 16), (60, 70, 18),
                                (75, 85, 20)):
        if lower <= diameter <= upper:
            return width
    return None


def normalise_dimension_key(value: str) -> str:
    """Normalise uniquement les apostrophes typographiques des en-têtes PDF."""
    return value.replace("’", "'").replace("‘", "'")


def word_lines(page):
    """Regroupe les mots PDF par ligne visuelle sans dépendre des grilles PDF."""
    lines = []
    for word in sorted(page.extract_words(x_tolerance=2, y_tolerance=2), key=lambda item: (item["top"], item["x0"])):
        if not lines or abs(lines[-1][0] - word["top"]) > 2:
            lines.append((word["top"], [word]))
        else:
            lines[-1][1].append(word)
    return [(top, sorted(words, key=lambda item: item["x0"])) for top, words in lines]


def verify_header_coverage(pdf, pdf_page: int, allowed_keys: set[str]):
    """Étape 1 : contrôle de couverture d'en-tête.

    Toute colonne présente dans l'en-tête PDF d'une table et absente de la
    liste blanche lève une anomalie explicite pour éviter d'ignorer en silence
    une cote publiée.
    """
    all_possible_keys = FOOT_DIMENSION_KEYS | SHAFT_DIMENSION_KEYS
    lines = word_lines(pdf.pages[pdf_page - 1])
    header_index = next((
        i for i, (_, words) in enumerate(lines)
        if sum(normalise_dimension_key(w["text"]) in all_possible_keys for w in words) >= 4
    ), None)
    if header_index is None:
        raise ValueError(f"en-tete de table introuvable page {pdf_page}")
    _, header_words = lines[header_index]
    tokens = [normalise_dimension_key(w["text"]) for w in header_words]
    dim_tokens = [t for t in tokens if t not in IGNORED_HEADER_TEXTS]
    unhandled = [t for t in dim_tokens if t not in allowed_keys]
    if unhandled:
        raise ValueError(f"colonnes d'en-tete ignorees page {pdf_page}: {unhandled}")


def foot_rows_from_page(pdf, pdf_page: int):
    """Lit les lignes de la table A/AA/.../HA par leurs coordonnées imprimées.

    ``extract_tables`` sépare souvent les en-têtes de ces tableaux Innomotics
    de leurs valeurs. Les abscisses des mots restent, elles, communes : chaque
    valeur est donc associée seulement au libellé IEC à la même abscisse.
    """
    lines = word_lines(pdf.pages[pdf_page - 1])
    header_index = next((
        i for i, (_, words) in enumerate(lines)
        if any(w["text"] in {"Frame", "Fram"} for w in words)
        and sum(normalise_dimension_key(w["text"]) in FOOT_DIMENSION_KEYS for w in words) >= 5
    ), None)
    if header_index is None:
        raise ValueError(f"en-tete de table de pattes introuvable page {pdf_page}")
    _, header_words = lines[header_index]
    columns = [(word["x0"], normalise_dimension_key(word["text"])) for word in header_words
               if normalise_dimension_key(word["text"]) in FOOT_DIMENSION_KEYS]
    if not columns:
        raise ValueError(f"colonnes IEC de pattes introuvables page {pdf_page}")
    first_dimension_x = min(x for x, _ in columns)
    rows = {}
    current_frame = None
    for _, words in lines[header_index + 1:]:
        left = " ".join(word["text"] for word in words if word["x0"] < first_dimension_x - 2)
        frame_match = re.match(r"\s*(\d{2,3})", left)
        if frame_match:
            current_frame = int(frame_match.group(1))
        if current_frame is None:
            continue
        values = {}
        for word in words:
            if word["x0"] < first_dimension_x - 2:
                continue
            nearest = min(columns, key=lambda item: abs(item[0] - word["x0"]))
            if abs(nearest[0] - word["x0"]) > 4:
                # Ne pas deviner l'appartenance d'une cellule décalée.
                continue
            # Le tiret est une cellule absente, mais conserve son abscisse et
            # donc sa colonne. Ne jamais le supprimer avant l'association.
            if word["text"] in {"-", "–", "—"}:
                values.setdefault(nearest[1], None)
                continue
            value = to_float(word["text"])
            if value is not None:
                values[nearest[1]] = n(value)
        # Certaines pages s'arrêtent à CA et ne republient pas H/HA. A/B/C
        # identifie néanmoins une ligne de pattes complète; H reste alors nul,
        # jamais déduit de la hauteur d'axe.
        if all(values.get(key) is not None for key in ("A", "B", "C")):
            rows[current_frame] = values
    return rows


def extract_shaft_rows_from_page(pdf, pdf_page: int):
    """Lit les cotes d'arbre (HH, K, K', H, HA, Y, etc.) depuis la page arbre associée."""
    lines = word_lines(pdf.pages[pdf_page - 1])
    header_index = next((
        i for i, (_, words) in enumerate(lines)
        if sum(normalise_dimension_key(w["text"]) in SHAFT_DIMENSION_KEYS for w in words) >= 5
    ), None)
    if header_index is None:
        return {}
    _, header_words = lines[header_index]
    columns = [(word["x0"], normalise_dimension_key(word["text"])) for word in header_words
               if normalise_dimension_key(word["text"]) in SHAFT_DIMENSION_KEYS]
    first_dimension_x = min(x for x, _ in columns)
    rows = defaultdict(list)
    current_frame = None
    for _, words in lines[header_index + 1:]:
        left = " ".join(word["text"] for word in words if word["x0"] < first_dimension_x - 2)
        frame_match = re.match(r"\s*(\d{2,3})", left)
        if frame_match:
            current_frame = int(frame_match.group(1))
        values = {}
        for word in words:
            if word["x0"] < first_dimension_x - 2:
                continue
            nearest = min(columns, key=lambda item: abs(item[0] - word["x0"]))
            if abs(nearest[0] - word["x0"]) > 4:
                continue
            if word["text"] in {"-", "–", "—"}:
                values.setdefault(nearest[1], None)
                continue
            value = to_float(word["text"])
            if value is not None:
                values[nearest[1]] = n(value)

        target_frame = values.get("H") or current_frame
        if target_frame is not None and any(values.get(k) is not None for k in ("K", "K'", "H", "HA", "Y", "HH")):
            suffixes = set(re.findall(r"(?<![A-Z0-9])[0-3][A-Z]{2}\d(?![A-Z0-9])", left))
            rows[target_frame].append((suffixes, values))
    return rows


def published_suffixes_from_page(pdf, pdf_page: int):
    """Retourne les suffixes d'articles réellement listés pour chaque HA."""
    lines = word_lines(pdf.pages[pdf_page - 1])
    header_index = next((
        i for i, (_, words) in enumerate(lines)
        if any(w["text"] in {"Frame", "Fram"} for w in words)
        and sum(normalise_dimension_key(w["text"]) in FOOT_DIMENSION_KEYS for w in words) >= 5
    ), None)
    if header_index is None:
        raise ValueError(f"en-tete de references introuvable page {pdf_page}")
    first_dimension_x = min(
        word["x0"] for word in lines[header_index][1]
        if normalise_dimension_key(word["text"]) in FOOT_DIMENSION_KEYS
    )
    result = defaultdict(set)
    current_frame = None
    for _, words in lines[header_index + 1:]:
        left = " ".join(word["text"] for word in words if word["x0"] < first_dimension_x - 2)
        frame_match = re.match(r"\s*(\d{2,3})", left)
        if frame_match:
            current_frame = int(frame_match.group(1))
        if current_frame is None:
            continue
        result[current_frame].update(re.findall(r"(?<![A-Z0-9])[0-3][A-Z]{2}\d(?![A-Z0-9])", left))
    return result


def foot_dimensions_for(motors, sha):
    """Associe les cotes publiées (pattes et arbre) à la même série et hauteur d'axe uniquement.

    La page arbre complète la page de pattes pour K, K' et, si elles manquent sur
    la page pattes, H, HA et Y. Elle ne corrige jamais une valeur déjà obtenue.
    """
    pdf_path = PDF_DIR / PDF_NAME
    result = {}
    with pdfplumber.open(pdf_path) as pdf:
        for pdf_page, series_prefixes in FOOT_DIMENSION_PAGES:
            s_page = SHAFT_DIMENSION_PAGES[pdf_page]
            foot_rows = foot_rows_from_page(pdf, pdf_page)
            shaft_rows_by_frame = extract_shaft_rows_from_page(pdf, s_page)
            suffixes = published_suffixes_from_page(pdf, pdf_page) if pdf_page in FOOT_DIMENSION_SUFFIX_MATCH_PAGES else {}

            for frame, f_values in foot_rows.items():
                shaft_candidates = shaft_rows_by_frame.get(frame, [])
                for motor in motors:
                    if motor.get("frameSize") != frame or not motor["articleNo"].startswith(series_prefixes):
                        continue
                    # 1LE1604 est déjà publié sur 316 jusqu'à HA160. La page
                    # 412 ne complète cette série que pour HA180--225; éviter
                    # de fusionner deux familles de carcasse différentes.
                    if pdf_page == 412 and motor["articleNo"].startswith("1LE1604") and frame < 180:
                        continue
                    suffix = motor["articleNo"].split("-", 1)[-1]
                    if pdf_page in FOOT_DIMENSION_SUFFIX_MATCH_PAGES and suffix not in suffixes.get(frame, set()):
                        continue

                    # Sélection de la ligne arbre correspondant au suffixe si spécifié
                    s_values = {}
                    if shaft_candidates:
                        matched = next((v for suffs, v in shaft_candidates if suffix in suffs), None)
                        if matched is None:
                            matched = shaft_candidates[0][1]
                        s_values = matched

                    # Fusion déterministe : la page pattes prime, la page arbre complète
                    merged = dict(f_values)
                    for key in ("K", "K'", "HH", "H", "HA", "Y"):
                        if key in s_values and s_values[key] is not None:
                            if key in merged and merged[key] is not None and merged[key] != s_values[key]:
                                raise ValueError(
                                    f"Conflit de cote {key} pour {motor['articleNo']}: "
                                    f"pattes={merged[key]} vs arbre={s_values[key]}"
                                )
                            elif key not in merged or merged[key] is None:
                                merged[key] = s_values[key]

                    # Les pages de plages disjointes se complètent; si une même
                    # série/HA réapparaît, la source est ambiguë et reste nulle.
                    key = motor["articleNo"]
                    previous = result.get(key)
                    if previous is not None and previous["values"] != merged:
                        result[key] = {"values": {}, "pages": previous["pages"] + [pdf_page], "ambiguous": True}
                    elif previous is None:
                        result[key] = {"values": merged, "pages": [pdf_page], "ambiguous": False}
    return result


def main():
    sha = sha256_of(PDF_DIR / PDF_NAME)
    motors = json.loads((OUT_DIR / "innomotics.json").read_text(encoding="utf-8"))

    # Étape 1 : Garde de couverture des en-têtes sur toutes les pages de pattes et d'arbre
    allowed_keys = FOOT_DIMENSION_KEYS | SHAFT_DIMENSION_KEYS
    with pdfplumber.open(PDF_DIR / PDF_NAME) as pdf:
        for f_page, _ in FOOT_DIMENSION_PAGES:
            verify_header_coverage(pdf, f_page, allowed_keys)
        for s_page in SHAFT_DIMENSION_PAGES.values():
            verify_header_coverage(pdf, s_page, allowed_keys)

    foot_dimensions = foot_dimensions_for(motors, sha)
    rows = []
    for motor in motors:
        frame = motor.get("frameSize")
        shaft = shaft_for(motor)
        dims = {"D": shaft[0] if shaft else None, "E": shaft[1] if shaft else None,
                "F": shaft[2] if shaft else None, "L": None, "LB": None, "AC": None}
        foot = foot_dimensions.get(motor["articleNo"])
        if foot and not foot["ambiguous"]:
            dims.update(foot["values"])
        flanges = flanges_for(motor)
        sources = [make_provenance(PDF_NAME, sha, 66 if frame <= 180 else 67, "1/60" if frame <= 180 else "1/61", "pdfplumber-flange-table")]
        if shaft:
            sources.append(make_provenance(PDF_NAME, sha, shaft[3], catalog_page_for(shaft[3]), "pdfplumber-imb35-shaft"))
        if foot:
            sources.extend(make_provenance(PDF_NAME, sha, page, catalog_page_for(page), "pdfplumber-coordinate-foot-dimension-table") for page in foot["pages"])
        rows.append({"brand": "Innomotics", "designation": f"{motor['articleNo']} HA{frame} {motor.get('poles')}P",
                     "articleNo": motor["articleNo"], "frameSize": frame, "poles": motor.get("poles"),
                     "casingMaterial": motor.get("casingMaterial"), "dimensions": dims, "flanges": flanges,
                     "provenance": {"catalog": PDF_NAME, "catalogSha256": sha, "sources": sources}})
    write_json(OUT_DIR / "dimensions-innomotics.json", rows)
    # Controles bruts : couverture, completeur de bride, et norme FF/FT identique.
    missing = sorted({r["frameSize"] for r in rows if not r["flanges"]})
    incomplete = [r["articleNo"] for r in rows if any(x[k] is None for x in r["flanges"] for k in ("designation","M","N","P","S","T","holes"))]
    by_name = defaultdict(set)
    for r in rows:
        for x in r["flanges"]: by_name[x["designation"]].add((x["M"],x["N"],x["P"]))
    inconsistent = {name: sorted(values) for name, values in by_name.items() if len(values) != 1}
    print("[controle] moteurs:", len(rows))
    print("[controle] moteurs avec brides:", sum(bool(r["flanges"]) for r in rows))
    print("[controle] hauteurs sans brides:", missing)
    print("[controle] brides incompletes:", incomplete)
    print("[controle] incoherences M/N/P normalisees:", inconsistent)
    print("[controle] brides par role:", dict(sorted(Counter(x["role"] for r in rows for x in r["flanges"]).items())))
    print("[controle] D/E/F presents par hauteur:", dict(sorted(Counter(r["frameSize"] for r in rows if all(r["dimensions"][k] is not None for k in ("D", "E", "F"))).items())))
    h_mismatches = [(r["articleNo"], r["frameSize"], r["dimensions"].get("H")) for r in rows if r["dimensions"].get("H") is not None and r["dimensions"]["H"] != r["frameSize"]]
    print("[controle] ecarts H/hauteur d'axe:", h_mismatches)
    abc_coverage = {}
    missing_abc = []
    for frame in sorted({r["frameSize"] for r in rows}):
        scoped = [r for r in rows if r["frameSize"] == frame]
        complete = [r for r in scoped if all(r["dimensions"].get(key) is not None for key in ("A", "B", "C"))]
        abc_coverage[frame] = {"A/B/C": len(complete), "sans A/B/C": len(scoped) - len(complete)}
        missing_abc.extend(r["articleNo"] for r in scoped if r not in complete)
    print("[controle] couverture A/B/C par hauteur:", abc_coverage)
    print("[controle] moteurs sans cotes de fixation A/B/C:", sorted(missing_abc))
    ac_variants = {}
    for frame in sorted({r["frameSize"] for r in rows}):
        # B dépend de la longueur de carcasse S/M/L; A et C seuls doivent
        # rester invariants pour une même hauteur d'axe.
        for key in ("A", "C"):
            values = sorted({r["dimensions"].get(key) for r in rows if r["frameSize"] == frame and r["dimensions"].get(key) is not None})
            if len(values) > 1:
                ac_variants[(frame, key)] = values
    print("[controle] ecarts A/C pour une meme hauteur:", ac_variants)
    checked = [r for r in rows if r["dimensions"]["D"] is not None and expected_iec_f(r["dimensions"]["D"]) is not None]
    iec_mismatches = [(r["articleNo"], r["dimensions"]["D"], r["dimensions"]["F"], expected_iec_f(r["dimensions"]["D"]))
                      for r in checked if r["dimensions"]["F"] != expected_iec_f(r["dimensions"]["D"])]
    iec_mismatch_counts = Counter((d, f, expected) for _, d, f, expected in iec_mismatches)
    outside_iec_table = dict(sorted(Counter(r["dimensions"]["D"] for r in rows if r["dimensions"]["D"] is not None and expected_iec_f(r["dimensions"]["D"]) is None).items()))
    print("[controle] IEC D/F controles:", len(checked))
    print("[controle] IEC D/F ecarts:", dict(sorted(iec_mismatch_counts.items())))
    print("[controle] IEC D/F articles en ecart:", [article for article, *_ in iec_mismatches])
    print("[controle] IEC D hors plages fournies:", outside_iec_table)
    if incomplete or inconsistent or h_mismatches: raise SystemExit("controle bloquant echoue")

if __name__ == "__main__": main()
