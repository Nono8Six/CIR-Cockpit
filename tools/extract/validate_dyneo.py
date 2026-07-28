"""Contrôles déterministes des sorties T05b/T05c."""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path


OUT = Path(__file__).resolve().parent / "out"


def main() -> None:
    thresholds = json.loads((OUT / "iec-30-2-thresholds.json").read_text(encoding="utf-8"))
    dyneo = json.loads((OUT / "dyneo.json").read_text(encoding="utf-8"))
    ie5 = {r["powerKw"]: r["minEfficiency"] for r in thresholds if r["efficiencyClass"] == "IE5"}
    controls = {11.0: 93.2, 15.0: 93.7, 22.0: 94.4, 55.0: 95.7}
    print("THRESHOLDS", len(thresholds), "IE5 controls", {k: ie5.get(k) for k in controls})
    assert all(ie5.get(k) == v for k, v in controls.items())
    assert all(r["motorTechnology"] == "PMaSynRM" and r["supplyMode"] == "vfd" for r in dyneo)
    assert {"IE4", "IE5"}.issubset({r["efficiencyClass"] for r in dyneo})
    assert all(r["provenance"]["pdfPage"] not in {14, 15, 16} for r in dyneo)
    assert all(len(r["torquePoints"]) == 5 for r in dyneo)
    assert all(all(point["torqueNm"] is not None for point in r["torquePoints"]) for r in dyneo)
    assert all(all(r[field] is not None for field in ("maxTorqueNm", "inertiaKgm2", "massKg")) for r in dyneo)
    assert all(r["cosPhi100"] is None for r in dyneo)
    assert len(dyneo) == 254
    assert all(r["noiseDb"] is not None and 0 < r["noiseDb"] <= 150 for r in dyneo)
    assert all(r["maxCurrentA"] is not None and r["maxCurrentA"] > 0 for r in dyneo)
    reference = [r for r in dyneo if r["type"] == "LSHRM 160MR1" and r["ratedSpeedRpm"] in {1500, 1800, 2600} and r["powerKw"] in {11.0, 12.7, 19.1}]
    reference.sort(key=lambda r: (r["ratedSpeedRpm"], r["voltageV"], r["powerKw"]))
    print("REFERENCE", [(r["ratedSpeedRpm"], r["powerKw"], r["efficiencyClass"], r["maxTorqueNm"], r["inertiaKgm2"], r["massKg"], r["efficiency50"], r["efficiency75"], r["efficiency100"]) for r in reference])
    assert len(reference) == 4
    assert [r["efficiencyClass"] for r in reference] == ["IE4", "IE5", "IE5", "IE5"]
    assert all((r["maxTorqueNm"], r["inertiaKgm2"], r["massKg"]) == (105.0, .0262, 72.0) for r in reference)
    first = reference[0]
    assert (first["powerKw"], first["efficiency50"], first["efficiency75"], first["efficiency100"]) == (11.0, 94.1, 94.1, 94.1)
    reconciled = [r for r in dyneo if r["type"] == "LSHRM 315MN1" and r["ratedSpeedRpm"] == 3600 and r["powerKw"] == 132.0]
    print("RECONCILED", [(r["type"], r["ratedSpeedRpm"], r["voltageV"], r["powerKw"], r["coupling"], r["provenance"]["pdfPage"]) for r in reconciled])
    assert len(reconciled) == 1 and reconciled[0]["coupling"] == "Y"
    inline = [
        r for r in dyneo
        if r["type"] == "LSHRM 280SC"
        and r["ratedSpeedRpm"] == 3600
        and r["powerKw"] == 75.0
    ]
    print("INLINE", [(r["maxTorqueNm"], r["maxCurrentA"], r["noiseDb"]) for r in inline])
    assert len(inline) == 1
    assert (
        inline[0]["maxTorqueNm"],
        inline[0]["maxCurrentA"],
        inline[0]["noiseDb"],
    ) == (358.0, 214.0, 81.0)
    variants_160mr1 = Counter(
        (r["maxTorqueNm"], r["inertiaKgm2"], r["massKg"])
        for r in dyneo
        if r["type"] == "LSHRM 160MR1"
    )
    print("VARIANTS LSHRM 160MR1", dict(variants_160mr1))
    assert variants_160mr1 == Counter({
        (105.0, 0.0262, 72.0): 4,
        (53.0, 0.0293, 46.0): 4,
        (72.0, 0.0217, 54.0): 4,
    })
    print("DISTRIBUTION", "points", len(dyneo), "version", dict(Counter(r["version"] for r in dyneo)), "casing", dict(Counter(r["casingMaterial"] for r in dyneo)), "series", dict(Counter(r["series"] for r in dyneo)), "IE", dict(Counter(r["efficiencyClass"] for r in dyneo)))
    print("OK")


if __name__ == "__main__":
    main()
