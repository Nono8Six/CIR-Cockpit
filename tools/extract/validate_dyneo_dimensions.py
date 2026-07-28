"""Controles bruts de la sortie de cotes Dyneo+ (sans completer le PDF)."""
from __future__ import annotations

import json
from collections import Counter

from common import OUT_DIR

IEC_F = {42: 12, 48: 14, 55: 16, 60: 18, 65: 18, 75: 20, 80: 22, 95: 25}


def main() -> None:
    rows = json.loads((OUT_DIR / "dimensions-dyneo.json").read_text(encoding="utf-8"))
    electrical = json.loads((OUT_DIR / "dyneo.json").read_text(encoding="utf-8"))
    expected = {row["type"] for row in electrical}
    actual = {row["designation"] for row in rows}
    missing = sorted(expected - actual)
    extra = sorted(actual - expected)
    no_dimensions = sorted(row["designation"] for row in rows if not any(value is not None for value in row["dimensions"].values()))
    h_mismatches = sorted((row["designation"], row["frameSize"], row["dimensions"].get("H")) for row in rows if row["dimensions"].get("H") is not None and row["frameSize"] != row["dimensions"]["H"])
    iec_checked = [row for row in rows if row["dimensions"].get("D") in IEC_F]
    iec_mismatches = sorted((row["designation"], row["dimensions"]["D"], row["dimensions"].get("F"), IEC_F[row["dimensions"]["D"]]) for row in iec_checked if row["dimensions"].get("F") != IEC_F[row["dimensions"]["D"]])
    incomplete_flanges = sorted(row["designation"] for row in rows if any(f.get(key) is None for f in row["flanges"] for key in ("designation", "M", "N", "P", "T", "S", "holes")))
    reference = next(row for row in rows if row["designation"] == "LSHRM 160MR1")
    print("[controle] couverture attendue/extraite:", len(expected), len(actual))
    print("[controle] par serie:", dict(sorted(Counter(row["series"] for row in rows).items())))
    print("[controle] par version:", dict(sorted(Counter(row["version"] for row in rows).items())))
    print("[controle] sans cotes:", no_dimensions)
    print("[controle] dyneo sans cotes:", missing)
    print("[controle] cotes hors dyneo:", extra)
    print("[controle] ecarts H/frame:", h_mismatches)
    print("[controle] IEC D/F controles:", len(iec_checked))
    print("[controle] IEC D/F ecarts:", iec_mismatches)
    print("[controle] brides incompletes:", incomplete_flanges)
    print("[controle] reference LSHRM 160MR1:", {key: reference["dimensions"].get(key) for key in ("D", "DPublished", "E", "F", "GD", "G")})
    if missing or extra or no_dimensions or h_mismatches or iec_mismatches or incomplete_flanges:
        raise SystemExit("controle bloquant echoue")
    print("OK")


if __name__ == "__main__":
    main()
