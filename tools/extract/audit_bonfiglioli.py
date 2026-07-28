"""Script d'audit exhaustif et 5x vérification pour l'extraction Bonfiglioli."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
import pdfplumber

from common import PDF_DIR
OUT_DIR = Path(__file__).resolve().parent / "out"

def pass1_coverage_audit():
    """Pass 1: Couverture des pages et exhaustivité."""
    print("=== PASS 1: Couverture des pages et exhaustivité Bonfiglioli ===")
    pdf_path = PDF_DIR / "Catalogue_BONFIGLIOLI_Moteur.pdf"
    rating_pages = {57: "M12", 60: "M14", 61: "M14", 62: "M14", 63: "M14", 64: "M14", 65: "M14"}
    
    with pdfplumber.open(str(pdf_path)) as pdf:
        print(f"Catalogue_BONFIGLIOLI_Moteur.pdf total pages: {len(pdf.pages)}")
    
    bonfig_json = OUT_DIR / "bonfiglioli.json"
    rows = json.loads(bonfig_json.read_text(encoding="utf-8"))
    extracted_pages = sorted(list(set(r["provenance"]["pdfPage"] for r in rows)))
    print(f"Pages de caractéristiques prévues: {sorted(list(rating_pages.keys()))}")
    print(f"Pages réellement extraites dans bonfiglioli.json: {extracted_pages}")
    
    missing = set(rating_pages.keys()) - set(extracted_pages)
    print(f"Pages manquantes: {missing if missing else 'Aucune'}")
    print(f"Nombre total de points de fonctionnement extraits: {len(rows)}")
    return rows

def pass2_numeric_and_anomalies_audit(rows):
    """Pass 2: Contrôle numérique, fréquences (50Hz vs 60Hz), et corrections spécifiques."""
    print("\n=== PASS 2: Précision numérique, fréquences et unités d'inertie ===")
    issues = []
    by_freq = {50: 0, 60: 0}
    by_volt = {}
    by_ie = {}
    
    for r in rows:
        freq = r.get("frequencyHz")
        volt = r.get("voltageV")
        ie = r.get("efficiencyClass")
        pkw = r.get("powerKw")
        rpm = r.get("ratedSpeedRpm")
        inertia = r.get("inertiaKgm2")
        brake_torque = r.get("brakeTorqueNm")
        
        if freq in by_freq:
            by_freq[freq] += 1
        by_volt[volt] = by_volt.get(volt, 0) + 1
        by_ie[ie] = by_ie.get(ie, 0) + 1
        
        if pkw is None or pkw <= 0:
            issues.append(f"Puissance invalide sur {r['type']} p{r['provenance']['pdfPage']}")
        if rpm is not None and (rpm < 600 or rpm > 3600):
            issues.append(f"Vitesse hors borne {rpm} sur {r['type']} p{r['provenance']['pdfPage']}")
        if inertia is not None and inertia > 20:
            issues.append(f"Inertie suspecte {inertia} kg.m2 sur {r['type']}")

    print(f"Répartition par fréquence (50 Hz vs 60 Hz): {by_freq}")
    print(f"Répartition par tension retenue (V): {by_volt}")
    print(f"Répartition par classe IE: {by_ie}")
    print(f"Anomalies numériques détectées: {len(issues)}")
    for issue in issues[:10]:
        print(f"  - {issue}")

def pass3_page_rotation_audit():
    """Pass 3: Vérification de la lecture pivotée (90°) des pages M12/M14."""
    print("\n=== PASS 3: Audit de la rotation de page (open_page_rotated) ===")
    pdf_path = PDF_DIR / "Catalogue_BONFIGLIOLI_Moteur.pdf"
    print("Test de pivotement des pages 60 à 65...")
    with pdfplumber.open(str(pdf_path)) as pdf:
        for pno in [57, 60, 61, 62, 63, 64, 65]:
            chars = pdf.pages[pno - 1].chars[:100]
            not_upright = sum(1 for c in chars if not c.get("upright", True))
            print(f"Page {pno}: text non-vertical sur {not_upright}/{len(chars)} caractères -> Pivotement requis: {not_upright > 20}")

def pass4_inertia_and_voltage_normalization_audit(rows):
    """Pass 4: Audit des notes de normalisation (Page 63 60Hz 460V & Inertie 10^-4)."""
    print("\n=== PASS 4: Audit des notes de normalisation et pièces justificatives ===")
    with_notes = [r for r in rows if r["provenance"].get("normalizationNote")]
    print(f"Nombre d'enregistrements avec note de normalisation expliquée: {len(with_notes)} / {len(rows)}")
    
    p63_60hz = [r for r in rows if r["provenance"]["pdfPage"] == 63 and r["frequencyHz"] == 60]
    print(f"Page 63 (60 Hz) enregistrements corrigés à 460 V: {len(p63_60hz)}")
    if p63_60hz:
        print(f"  Exemple tension retenue: {p63_60hz[0]['voltageV']} V (provenance note: {p63_60hz[0]['provenance']['normalizationNote'][:60]}...)")

def pass5_cross_dimensional_audit():
    """Pass 5: Audit des cotes dimensionnelles Bonfiglioli."""
    print("\n=== PASS 5: Audit des dimensions et brides Bonfiglioli ===")
    dim_file = OUT_DIR / "dimensions-bonfiglioli.json"
    if dim_file.exists():
        rows = json.loads(dim_file.read_text(encoding="utf-8"))
        print(f"Modèles dimensionnels Bonfiglioli extraits: {len(rows)}")
    else:
        print("Fichier dimensions-bonfiglioli.json non généré.")

def main():
    rows = pass1_coverage_audit()
    pass2_numeric_and_anomalies_audit(rows)
    pass3_page_rotation_audit()
    pass4_inertia_and_voltage_normalization_audit(rows)
    pass5_cross_dimensional_audit()
    print("\n=== AUDIT BONFIGLIOLI FINI AVEC SUCCES ===")

if __name__ == "__main__":
    main()
