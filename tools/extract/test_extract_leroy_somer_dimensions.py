from __future__ import annotations

import sys
import unittest
from pathlib import Path

import pdfplumber

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import PDF_DIR, sha256_of
from extract_leroy_somer_dimensions import (
    PDF_NAME,
    Collector,
    parse_b3,
    parse_shafts,
)


class LeroySomerDimensionExtractionTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.collector = Collector(sha256_of(PDF_DIR / PDF_NAME))
        with pdfplumber.open(str(PDF_DIR / PDF_NAME)) as pdf:
            parse_shafts(cls.collector, pdf.pages[93], 94)
            parse_b3(cls.collector, pdf.pages[124], 125)

    def test_cils_280_m_preserves_pole_specific_shaft_dimensions(self) -> None:
        shafts = self.collector.items["CILS 280 M"]["shaftByPoles"]
        self.assertEqual(shafts["2"], {"F": 18, "D": 65, "E": 140})
        self.assertEqual(shafts["4"], {"F": 20, "D": 75, "E": 140})
        self.assertEqual(shafts["6"], {"F": 20, "D": 75, "E": 140})

    def test_flses_250_m_preserves_pole_specific_shaft_dimensions(self) -> None:
        shafts = self.collector.items["FLSES 250 M"]["shaftByPoles"]
        self.assertEqual(shafts["2"], {"F": 18, "D": 60, "E": 140})
        self.assertEqual(shafts["4"], {"F": 18, "D": 65, "E": 140})
        self.assertEqual(shafts["6"], {"F": 18, "D": 65, "E": 140})

    def test_plses_280_mgu_preserves_published_dual_b_dimension(self) -> None:
        dimensions = self.collector.items["PLSES 280 MGU"]["dimensions"]
        self.assertEqual(dimensions["B"], "368/419")


if __name__ == "__main__":
    unittest.main()
