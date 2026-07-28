from __future__ import annotations

import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import PDF_DIR, sha256_of
from extract_bonfiglioli_dimensions import (
    EXACT_B_FIXTURES,
    PDF_NAME,
    Collector,
    assert_exact_b_fixtures,
    implausible_dimensions,
    parse_page,
)


class BonfiglioliDimensionExtractionTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.collector = Collector(sha256_of(PDF_DIR / PDF_NAME))
        parse_page(cls.collector, 58, "B3", None)

    def test_page_58_preserves_exact_b_values_from_merged_cells(self) -> None:
        rows = list(self.collector.items.values())
        assert_exact_b_fixtures(rows)
        observed = {
            designation: self.collector.items[designation]["dimensions"]["B"]
            for designation in EXACT_B_FIXTURES
        }
        self.assertEqual(observed, EXACT_B_FIXTURES)

    def test_implausibility_guard_reports_without_correcting(self) -> None:
        rows = [{
            "designation": "BY 280SCK",
            "frameSize": 280,
            "dimensions": {"B": 1968},
        }]
        self.assertEqual(rows[0]["dimensions"]["B"], 1968)
        self.assertEqual(
            implausible_dimensions(rows),
            [("BY 280SCK", "B", 1968, "maximum prudent 1500 mm")],
        )
        self.assertEqual(rows[0]["dimensions"]["B"], 1968)


if __name__ == "__main__":
    unittest.main()
