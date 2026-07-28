"""Tests des cotes Innomotics : garde de couverture d'en-tete et fixtures K/K'/H.

Mission C2c. Les cotes K et K' sont publiees sur les pages arbre, jamais sur les
pages de pattes; H, HA et Y manquent aux pages de pattes des grandes carcasses.
Ces tests figent les valeurs relevees a la main sur le PDF et verifient que la
garde d'en-tete refuse toute colonne publiee non traitee.

`CIR_MOTEUR_ROOT` doit etre renseignee dans l'environnement, comme pour les
extracteurs eux-memes. Aucune valeur par defaut n'est codee ici.
"""
from __future__ import annotations

import json
import unittest

import pdfplumber

from common import OUT_DIR, PDF_DIR, sha256_of
from extract_innomotics_dimensions import (
    FOOT_DIMENSION_KEYS,
    FOOT_DIMENSION_PAGES,
    PDF_NAME,
    SHAFT_DIMENSION_KEYS,
    SHAFT_DIMENSION_PAGES,
    foot_dimensions_for,
    verify_header_coverage,
)

PDF_PATH = PDF_DIR / PDF_NAME

# Valeurs relevees a la main sur les tables imprimees, article par article.
# Un article nomme, jamais « le premier modele de la carcasse » : l'ordre du JSON
# ne doit pas pouvoir changer silencieusement ce que le test verifie.
# K' est toujours distinct de K : l'assertion garde contre une fusion des deux.
DIMENSION_FIXTURES = (
    # (article, frame, K, K', H)
    ("1LE1003-0BA2", 63, 7, 10, 63),
    ("1LE1003-0CA2", 71, 7, 10, 71),
    ("1LE1003-0DA2", 80, 9.5, 13.5, 80),
    ("1LE1003-0EA0", 90, 10, 14, 90),
    ("1LE1503-1EA2", 180, 15, 19, 180),
    ("1LE1503-3AA0", 315, 28, 35, 315),
)


class InnomoticsHeaderCoverageTest(unittest.TestCase):
    """La garde doit refuser une colonne publiee absente de la liste blanche."""

    def test_guard_raises_for_uncovered_columns(self):
        restricted = {"A", "AA", "AB", "B", "C", "H", "HA"}
        with pdfplumber.open(PDF_PATH) as pdf:
            with self.assertRaises(ValueError) as caught:
                verify_header_coverage(pdf, 297, restricted)
        message = str(caught.exception)
        self.assertIn("colonnes d'en-tete ignorees", message)
        self.assertIn("K", message)

    def test_all_read_pages_are_fully_covered(self):
        allowed = FOOT_DIMENSION_KEYS | SHAFT_DIMENSION_KEYS
        with pdfplumber.open(PDF_PATH) as pdf:
            for foot_page, _ in FOOT_DIMENSION_PAGES:
                with self.subTest(page=foot_page, kind="pattes"):
                    verify_header_coverage(pdf, foot_page, allowed)
            for shaft_page in SHAFT_DIMENSION_PAGES.values():
                with self.subTest(page=shaft_page, kind="arbre"):
                    verify_header_coverage(pdf, shaft_page, allowed)


class InnomoticsDimensionFixturesTest(unittest.TestCase):
    """Fixtures exactes des cotes reprises des pages arbre."""

    @classmethod
    def setUpClass(cls):
        motors = json.loads((OUT_DIR / "innomotics.json").read_text(encoding="utf-8"))
        cls.dimensions = foot_dimensions_for(motors, sha256_of(PDF_PATH))

    def values_for(self, article: str) -> dict:
        entry = self.dimensions.get(article)
        self.assertIsNotNone(entry, f"article absent des cotes lues : {article}")
        self.assertFalse(entry["ambiguous"], f"cotes ambigues pour {article}")
        return entry["values"]

    def test_published_fixtures(self):
        for article, frame, expected_k, expected_k_prime, expected_h in DIMENSION_FIXTURES:
            with self.subTest(article=article, frame=frame):
                values = self.values_for(article)
                self.assertEqual(values.get("K"), expected_k, "cote K")
                self.assertEqual(values.get("K'"), expected_k_prime, "cote K'")
                self.assertEqual(values.get("H"), expected_h, "cote H")
                self.assertNotEqual(
                    values.get("K"), values.get("K'"),
                    "K et K' doivent rester deux faits distincts",
                )

    def test_k_stays_within_published_bounds(self):
        found = [v["values"]["K"] for v in self.dimensions.values()
                 if not v["ambiguous"] and v["values"].get("K") is not None]
        self.assertGreater(len(found), 0, "aucune cote K lue")
        self.assertGreaterEqual(min(found), 6, "K sous la plage publiee")
        self.assertLessEqual(max(found), 35, "K au-dessus de la plage publiee")


if __name__ == "__main__":
    unittest.main()
