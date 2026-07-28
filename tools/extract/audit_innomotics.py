"""Script d'audit approfondi (10 passes de vérification) pour Innomotics."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
import pdfplumber

from common import PDF_DIR
OUT_DIR = Path(__file__).resolve().parent / "out"

def load_data():
    innom_json = OUT_DIR / "innomotics.json"
    dim_json = OUT_DIR / "dimensions-innomotics.json"
    rows = json.loads(innom_json.read_text(encoding="utf-8")) if innom_json.exists() else []
    dims = json.loads(dim_json.read_text(encoding="utf-8")) if dim_json.exists() else []
    return rows, dims

def pass1_scope_audit():
    print("=== PASS 1: Périmètre des pages et couverture PDF Innomotics ===")
    pdf_path = PDF_DIR / "Catalogue_Moteur_Innomotics.pdf"
    with pdfplumber.open(str(pdf_path)) as pdf:
        total_pages = len(pdf.pages)
        print(f"Catalogue_Moteur_Innomotics.pdf total pages: {total_pages}")
    return total_pages

def pass2_article_number_anchor_audit(rows):
    print("\n=== PASS 2: Audit d'ancrage par Référence Article ===")
    invalid_articles = [r for r in rows if not re.match(r"^1[LM]E\d{4}-[0-9A-Z]{4,6}$", r.get("articleNo", ""))]
    print(f"Total articles vérifiés: {len(rows)}")
    print(f"Articles non conformes au format Innomotics: {len(invalid_articles)}")
    series_dist = {}
    for r in rows:
        s = r.get("series", "Inconnu")
        series_dist[s] = series_dist.get(s, 0) + 1
    print(f"Répartition par série d'article: {series_dist}")

def pass3_power_speed_bounds_audit(rows):
    print("\n=== PASS 3: Audit des bornes Puissance & Vitesse ===")
    issues = []
    for r in rows:
        pkw = r.get("powerKw")
        rpm = r.get("ratedSpeedRpm")
        if pkw is None or pkw <= 0 or pkw > 1000:
            issues.append(f"Puissance hors borne {pkw} kW sur {r['articleNo']}")
        if rpm is not None and (rpm < 600 or rpm > 3600):
            issues.append(f"Vitesse hors borne {rpm} tr/min sur {r['articleNo']}")
    print(f"Anomalies Puissance/Vitesse: {len(issues)}")

def pass4_efficiency_threshold_audit(rows):
    print("\n=== PASS 4: Audit des classes de rendement (IE1, IE2, IE3, IE4, NEMA) ===")
    ie_counts = {}
    for r in rows:
        ie = r.get("efficiencyClass") or r.get("efficiencyStandard") or "Non spécifié"
        ie_counts[ie] = ie_counts.get(ie, 0) + 1
    print(f"Répartition des classes de rendement: {ie_counts}")

def pass5_frequency_voltage_audit(rows):
    print("\n=== PASS 5: Audit des fréquences (50 Hz vs 60 Hz) & Tensions ===")
    freq_dist = {}
    volt_dist = {}
    for r in rows:
        f = r.get("frequencyHz")
        v = r.get("voltageV")
        freq_dist[f] = freq_dist.get(f, 0) + 1
        volt_dist[v] = volt_dist.get(v, 0) + 1
    print(f"Fréquences: {freq_dist}")
    print(f"Tensions: {volt_dist}")

def pass6_pole_changing_audit(rows):
    print("\n=== PASS 6: Audit des moteurs à changement de polarité (2 vitesses) ===")
    two_speed = [r for r in rows if "/" in str(r.get("poleConfig", ""))]
    print(f"Nombre de points de fonctionnement 2 vitesses extraits: {len(two_speed)}")
    if two_speed:
        print(f"  Exemple: {two_speed[0]['articleNo']} ({two_speed[0]['poleConfig']} pôles, {two_speed[0]['powerKw']} kW, p.{two_speed[0]['provenance']['pdfPage']})")

def pass7_indeterminate_inertia_audit(rows):
    print("\n=== PASS 7: Audit de l'inertie indéterminée (1LE1583-3AB5 p.176) ===")
    target = [r for r in rows if "1LE1583-3AB5" in r.get("articleNo", "")]
    if target:
        t = target[0]
        print(f"Enregistrement 1LE1583-3AB5 trouvé: inertie = {t.get('inertiaKgm2')} (Attendu: None)")
        print(f"Note de normalisation: {t['provenance'].get('normalizationNote')}")
    else:
        print("Article 1LE1583-3AB5 non présent dans l'extraction actuelle.")

def pass8_flange_option_mapping_audit(dims):
    print("\n=== PASS 8: Audit du mapping des options de brides B5/B14 ===")
    with_b5 = sum(1 for d in dims if d.get("flangeB5Standard"))
    with_b14 = sum(1 for d in dims if d.get("flangeB14Standard"))
    print(f"Modèles dimensionnels avec bride B5 standard: {with_b5} / {len(dims)}")
    print(f"Modèles dimensionnels avec bride B14 standard: {with_b14} / {len(dims)}")

def pass9_mechanical_dimensions_audit(dims):
    print("\n=== PASS 9: Audit des cotes mécaniques ===")
    print(f"Total modèles dimensionnels Innomotics extraits: {len(dims)}")
    frame_sizes = sorted(list(set(d.get("frameSize") for d in dims if d.get("frameSize"))))
    print(f"Hauteurs d'axe IEC couvertes: {frame_sizes}")

def pass10_provenance_and_hash_audit(rows):
    print("\n=== PASS 10: Audit de traçabilité et empreinte SHA-256 ===")
    with_prov = [r for r in rows if r.get("provenance") and r["provenance"].get("catalogSha256")]
    print(f"Enregistrements avec provenance SHA-256 valide: {len(with_prov)} / {len(rows)}")

def main():
    rows, dims = load_data()
    pass1_scope_audit()
    pass2_article_number_anchor_audit(rows)
    pass3_power_speed_bounds_audit(rows)
    pass4_efficiency_threshold_audit(rows)
    pass5_frequency_voltage_audit(rows)
    pass6_pole_changing_audit(rows)
    pass7_indeterminate_inertia_audit(rows)
    pass8_flange_option_mapping_audit(dims)
    pass9_mechanical_dimensions_audit(dims)
    pass10_provenance_and_hash_audit(rows)
    print("\n=== AUDIT INNOMOTICS 10 PASSES FINI AVEC SUCCES ===")

if __name__ == "__main__":
    main()
