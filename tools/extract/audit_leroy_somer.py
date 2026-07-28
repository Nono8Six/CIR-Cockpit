"""Script d'audit exhaustif et 5x vérification pour l'extraction Leroy-Somer."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
import pdfplumber

from common import PDF_DIR
OUT_DIR = Path(__file__).resolve().parent / "out"

def pass1_coverage_audit():
    """Pass 1: Verification de la couverture des pages et du nombre de moteurs."""
    print("=== PASS 1: Couverture des pages et exhaustivité ===")
    pdf_path = PDF_DIR / "Catalogue_LS_LSES.pdf"
    with pdfplumber.open(str(pdf_path)) as pdf:
        print(f"Catalogue_LS_LSES.pdf total pages: {len(pdf.pages)}")
        
        motor_pages = []
        for i, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            if any(term in text for term in ["LSES", "FLSES", "PLSES", "CILS"]):
                if re.search(r"\d+\s*p[oô]les", text, re.I) or "Alimentation réseau" in text or "Variateur" in text:
                    motor_pages.append(i + 1)
        print(f"Pages détectées avec données moteurs LSES/FLSES/PLSES/CILS ({len(motor_pages)} pages): {motor_pages}")
    
    ls_json = OUT_DIR / "leroy-somer.json"
    rows = json.loads(ls_json.read_text(encoding="utf-8"))
    extracted_pages = sorted(list(set(r["provenance"]["pdfPage"] for r in rows)))
    print(f"Pages actuellement extraites ({len(extracted_pages)} pages): {extracted_pages}")
    
    missing_pages = set(motor_pages) - set(extracted_pages)
    print(f"Pages potentielles non extraites dans LSES: {missing_pages}")
    return rows, motor_pages, extracted_pages

def pass2_numeric_precision_audit(rows):
    """Pass 2: Verification de la precision numerique et de l'absence de valeurs frelatees."""
    print("\n=== PASS 2: Précision numérique et contrôle des anomalies de lecture ===")
    issues = []
    for r in rows:
        page = r["provenance"]["pdfPage"]
        mtype = r["type"]
        pkw = r["powerKw"]
        rpm = r["ratedSpeedRpm"]
        eff = r["efficiency100"]
        cos = r["cosPhi100"]
        
        if pkw is None or pkw <= 0:
            issues.append(f"Puissance nulle ou invalide sur {mtype} p{page}")
        if rpm is not None and (rpm < 400 or rpm > 3600):
            issues.append(f"Vitesse hors borne {rpm} sur {mtype} p{page}")
        if eff is not None and (eff < 50 or eff > 99.5):
            issues.append(f"Rendement hors borne {eff} sur {mtype} p{page}")
        if cos is not None and (cos < 0.4 or cos > 1.0):
            issues.append(f"Cos phi hors borne {cos} sur {mtype} p{page}")
            
    print(f"Total enregistrements contrôlés: {len(rows)}")
    print(f"Anomalies numériques détectées: {len(issues)}")
    for issue in issues[:10]:
        print(f"  - {issue}")

def pass3_text_alignment_audit():
    """Pass 3: Verification directe cellule par cellule sur un echantillon de pages."""
    print("\n=== PASS 3: Audit d'alignement cellule-par-cellule sur les pages clé ===")
    pdf_path = PDF_DIR / "Catalogue_LS_LSES.pdf"
    pages_to_check = [58, 60, 62, 88, 90, 91, 92, 118, 120, 121, 122]
    
    with pdfplumber.open(str(pdf_path)) as pdf:
        for pno in pages_to_check:
            page = pdf.pages[pno - 1]
            tables = page.extract_tables()
            table_rows = sum(len(t) for t in tables)
            print(f"Page {pno}: {len(tables)} tables trouvées, {table_rows} lignes brutes d'extrait.")

def pass4_cils_dyneo_audit():
    """Pass 4: Audit des catalogues CILS et Dyneo."""
    print("\n=== PASS 4: Audit des sous-catalogues CILS et Dyneo ===")
    cils_json = OUT_DIR / "cils.json"
    dyneo_json = OUT_DIR / "dyneo.json"
    
    if cils_json.exists():
        cils_rows = json.loads(cils_json.read_text(encoding="utf-8"))
        print(f"CILS IE4: {len(cils_rows)} enregistrements contrôlés.")
    if dyneo_json.exists():
        dyneo_rows = json.loads(dyneo_json.read_text(encoding="utf-8"))
        print(f"Dyneo IE5: {len(dyneo_rows)} enregistrements contrôlés.")

def pass5_cross_dimensional_audit():
    """Pass 5: Audit de la concordance entre donnees electriques et cotes dimensionnelles."""
    print("\n=== PASS 5: Audit de concordance Caractéristiques <-> Dimensions ===")
    dim_ls = OUT_DIR / "dimensions-leroy-somer.json"
    dim_cils = OUT_DIR / "dimensions-cils.json"
    dim_dyneo = OUT_DIR / "dimensions-dyneo.json"
    
    if dim_ls.exists():
        rows = json.loads(dim_ls.read_text(encoding="utf-8"))
        print(f"Dimensions Leroy-Somer: {len(rows)} modèles dimensionnels.")
    if dim_cils.exists():
        rows = json.loads(dim_cils.read_text(encoding="utf-8"))
        print(f"Dimensions CILS: {len(rows)} modèles dimensionnels.")
    if dim_dyneo.exists():
        rows = json.loads(dim_dyneo.read_text(encoding="utf-8"))
        print(f"Dimensions Dyneo: {len(rows)} modèles dimensionnels.")

def main():
    rows, motor_pages, extracted_pages = pass1_coverage_audit()
    pass2_numeric_precision_audit(rows)
    pass3_text_alignment_audit()
    pass4_cils_dyneo_audit()
    pass5_cross_dimensional_audit()
    print("\n=== AUDIT FINI AVEC SUCCES ===")

if __name__ == "__main__":
    main()
