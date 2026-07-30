import fs from "node:fs";

const payload = JSON.parse(
  fs.readFileSync(
    "C:/GitHub/CIR_Cockpit/CIR-Cockpit/tmp/c2-review-final/payload/candidate-payload.json",
    "utf8",
  ),
);
const codes = ["A", "B", "C", "H", "K", "D", "E", "F"];
const found = new Map();
for (const dimension of payload.dimensions) {
  if (!dimension.canonical_code) continue;
  if (!found.has(dimension.model_key)) found.set(dimension.model_key, new Set());
  found.get(dimension.model_key).add(dimension.canonical_code);
}
const groups = new Map();
for (const model of payload.models) {
  const available = found.get(model.model_key) ?? new Set();
  const missing = codes.filter((code) => !available.has(code));
  if (!missing.length) continue;
  const key = `${model.brand}|${model.series}`;
  if (!groups.has(key)) groups.set(key, { brand: model.brand, series: model.series, models: 0, missing: {}, items: [] });
  const group = groups.get(key);
  group.models += 1;
  group.items.push({ designation: model.designation, modelKey: model.model_key, missing });
  const pattern = missing.join(" ");
  group.missing[pattern] = (group.missing[pattern] ?? 0) + 1;
}
console.log(JSON.stringify({
  totalModels: payload.models.length,
  completeCore: payload.models.length - [...groups.values()].reduce((sum, row) => sum + row.models, 0),
  remainingCoreMissing: [...groups.values()].reduce((sum, row) => sum + row.models, 0),
  groups: [...groups.values()],
}, null, 2));
