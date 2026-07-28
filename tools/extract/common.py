"""Utilitaires partagés par les trois extracteurs."""
from __future__ import annotations

import hashlib
import io
import json
import os
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

import pdfplumber
from pypdf import PdfReader, PdfWriter


def _pdf_dir() -> Path:
    """Racine des catalogues fabricant, hors depot.

    Les PDF pesent 168 Mo et restent la propriete des constructeurs : ils ne
    sont pas versionnes. Le chemin est donc fourni par `CIR_MOTEUR_ROOT`, sans
    valeur par defaut codee en dur. L'absence de variable est une erreur
    explicite, jamais un repli silencieux sur un dossier vide.
    """
    raw = os.environ.get("CIR_MOTEUR_ROOT", "").strip()
    if not raw:
        raise RuntimeError(
            "CIR_MOTEUR_ROOT n'est pas definie. Renseigner la racine contenant "
            "le dossier « Catalogue fabricant » avant de lancer un extracteur."
        )
    directory = Path(raw).expanduser().resolve() / "Catalogue fabricant"
    if not directory.is_dir():
        raise RuntimeError(
            f"Dossier « Catalogue fabricant » introuvable sous {raw}. "
            "Verifier CIR_MOTEUR_ROOT."
        )
    return directory


ROOT = Path(__file__).resolve().parents[2]
PDF_DIR = _pdf_dir()
RAW_DIR = Path(__file__).resolve().parent / "raw"
OUT_DIR = Path(__file__).resolve().parent / "out"


def sha256_of(path: Path) -> str:
    """Empreinte du PDF : permet de détecter une réédition du catalogue."""
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def to_float(value: Any) -> float | None:
    """Convertit une cellule en nombre. Retourne None si non convertible.

    NE JAMAIS remplacer None par une valeur par défaut : une donnée absente
    du PDF doit rester absente de la base.
    """
    if value is None:
        return None
    text = str(value).strip().replace(" ", "").replace(",", ".")
    text = text.replace("\u00a0", "")
    if not text or text in {"-", "--", "—"}:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def to_int(value: Any) -> int | None:
    f = to_float(value)
    return int(f) if f is not None else None


def write_json(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[ecrit] {path.name} : {len(rows)} lignes")


def bonfiglioli_frame_size(designation: str, vendor_code_series: set[str]) -> tuple[int | None, str | None]:
    """Retourne une hauteur IEC seulement lorsqu'elle est codée par la désignation.

    Les gammes intégrées M, ME et MX emploient des codes constructeur (ex.
    ``4LA``), pas une hauteur d'axe IEC : ne jamais convertir leur préfixe
    numérique en ``frameSize``.
    """
    series, _, suffix = designation.partition(" ")
    if series in vendor_code_series:
        return None, suffix or None
    frame = re.search(r"\d{1,3}", designation)
    return (int(frame.group()) if frame else None), None


def validate_frame_sizes(rows: list[dict], designation_key: str, label: str) -> None:
    """Affiche la répartition et bloque toute hauteur d'axe invalide.

    Une valeur absente est acceptable; une valeur numérique sous 56 ne l'est
    jamais et doit être corrigée dans la logique d'extraction, pas masquée ici.
    """
    distribution: dict[str, Counter[int | None]] = defaultdict(Counter)
    invalid: list[tuple[str, int | float]] = []
    for row in rows:
        designation = str(row[designation_key])
        series = designation.split()[0]
        frame = row.get("frameSize")
        distribution[series][frame] += 1
        if isinstance(frame, (int, float)) and frame < 56:
            invalid.append((designation, frame))

    formatted = {
        series: {str(frame) if frame is not None else "null": count
                 for frame, count in sorted(values.items(), key=lambda item: (item[0] is None, item[0] or 0))}
        for series, values in sorted(distribution.items())
    }
    print(f"[controle] frameSize par serie ({label}):", formatted)
    print(f"[controle] frameSize null ({label}):", sum(values[None] for values in distribution.values()))
    if invalid:
        raise SystemExit(f"controle bloquant frameSize < 56 ({label}): {invalid}")


def make_provenance(catalog: str, sha: str, pdf_page: int,
                    catalog_page: str | None, method: str) -> dict:
    """Bloc de provenance attaché à CHAQUE enregistrement extrait."""
    return {
        "catalog": catalog,
        "catalogSha256": sha,
        "pdfPage": pdf_page,
        "catalogPage": catalog_page,
        "extractionMethod": method,
    }


def open_page_rotated(pdf_path: Path, page_index_0based: int, degrees: int = 90):
    """Ouvre UNE page en la faisant pivoter, et retourne un objet page pdfplumber.

    Nécessaire pour les pages Bonfiglioli M12/M14 dont le texte est écrit à 90°.
    Sans cette correction, pdfplumber lit le texte à l'envers ('ekarb .c.d').

    Renvoie un tuple (page, contexte) : le contexte DOIT rester ouvert
    tant que la page est utilisée.
    """
    reader = PdfReader(str(pdf_path))
    writer = PdfWriter()
    page = reader.pages[page_index_0based]
    page.rotate(degrees)
    writer.add_page(page)
    buf = io.BytesIO()
    writer.write(buf)
    buf.seek(0)
    ctx = pdfplumber.open(buf)
    return ctx.pages[0], ctx


def group_rows(words: list[dict], tolerance: float = 2.5) -> list[list[dict]]:
    """Regroupe les mots en lignes par ordonnée, puis les trie par abscisse.

    Le regroupement est fait par écart entre ordonnées consécutives, jamais par
    tranches fixes : deux cellules d'une même ligne peuvent encadrer une borne
    de tranche et se retrouver dans deux lignes différentes.
    """
    if not words:
        return []
    ordered = sorted(words, key=lambda w: (w["top"], w["x0"]))
    groups: list[list[dict]] = [[ordered[0]]]
    for word in ordered[1:]:
        if word["top"] - groups[-1][-1]["top"] <= tolerance:
            groups[-1].append(word)
        else:
            groups.append([word])
    return [sorted(group, key=lambda w: w["x0"]) for group in groups]


def build_bands(rows: list[list[dict]], gap: float = 0.0) -> list[tuple[float, float]]:
    """Colonnes d'un tableau : intervalles d'abscisses fusionnés.

    Une colonne est un intervalle d'abscisses stable d'une ligne à l'autre. Le
    paramètre ``gap`` autorise la fusion de cellules séparées par un très
    faible blanc : il sert aux catalogues français, où le séparateur de
    milliers est une espace et où ``1 026`` est un seul nombre.

    ``gap`` doit rester très inférieur au blanc réel entre deux colonnes,
    sinon deux colonnes voisines fusionnent silencieusement.
    """
    intervals = sorted((word["x0"], word["x1"]) for row in rows for word in row)
    bands: list[list[float]] = []
    for x0, x1 in intervals:
        if bands and x0 <= bands[-1][1] + gap:
            bands[-1][1] = max(bands[-1][1], x1)
        else:
            bands.append([x0, x1])
    return [(x0, x1) for x0, x1 in bands]


def cells_by_band(row: list[dict], bands: list[tuple[float, float]]) -> dict[int, str]:
    """Rattache chaque cellule à sa colonne par le centre de son abscisse.

    Une cellule absente ne décale rien : elle laisse simplement sa colonne
    vide. C'est la seule façon de lire un tableau imprimé à trous sans
    fabriquer de valeur.
    """
    cells: dict[int, str] = {}
    for word in row:
        center = (word["x0"] + word["x1"]) / 2
        for index, (x0, x1) in enumerate(bands):
            if x0 <= center <= x1:
                cells[index] = f"{cells[index]} {word['text']}" if index in cells else word["text"]
                break
    return cells


def minimum_band_gap(bands: list[tuple[float, float]]) -> float:
    """Plus petit blanc entre deux colonnes : contrôle du paramètre ``gap``."""
    if len(bands) < 2:
        return float("inf")
    return min(nxt[0] - cur[1] for cur, nxt in zip(bands, bands[1:]))


def page_is_rotated(pdf_path: Path, page_index_0based: int) -> bool:
    """Détecte si une page contient majoritairement du texte pivoté."""
    with pdfplumber.open(str(pdf_path)) as pdf:
        chars = pdf.pages[page_index_0based].chars[:300]
        if not chars:
            return False
        not_upright = sum(1 for c in chars if not c.get("upright", True))
        return not_upright > len(chars) * 0.3
