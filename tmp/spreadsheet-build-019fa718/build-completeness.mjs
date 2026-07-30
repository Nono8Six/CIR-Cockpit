import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const repoRoot = path.resolve("../..");
const payloadPath = path.join(repoRoot, "tmp", "c2-audit-full", "payload", "candidate-payload.json");
const outputDir = path.join(repoRoot, "outputs", "019fa718-45ae-79d2-8ddb-1507fbe1d079");
const outputPath = path.join(outputDir, "audit-exhaustif-completude-moteurs.xlsx");
const previewDir = path.join(repoRoot, "tmp", "spreadsheet-build-019fa718", "previews-completude");
const payload = JSON.parse(await fs.readFile(payloadPath, "utf8"));

const ACTIVE = {
  snapshot: "4ee230e7-47b0-4637-90b2-3c76b1607a73",
  motor_model: 1721,
  motor_operating_point: 2355,
  motor_dimension: 41759,
  motor_flange_option: 7926,
  motor_brake_option: 256,
  motor_validation_issue: 62,
};

const COLORS = {
  navy: "#19324D",
  blue: "#2F6B9A",
  white: "#FFFFFF",
  paleBlue: "#EAF2F8",
  paleGreen: "#E7F4E8",
  paleYellow: "#FFF4CC",
  paleRed: "#FBE4E6",
  paleGray: "#F3F5F7",
  grayText: "#5F6B76",
  line: "#D7DEE5",
};

const CORE_CODES = ["A", "B", "C", "H", "K", "D", "E", "F"];
const present = (value) => value !== null && value !== undefined && String(value).trim() !== "";
const xmlSafe = (value) => typeof value === "string"
  ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
  : value;
const safeRows = (rows) => rows.map((row) => row.map(xmlSafe));
const compact = (value) => {
  if (value == null) return "";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
  return String(value);
};
const uniqueSorted = (values) => [...new Set(values.filter(present))]
  .sort((a, b) => String(a).localeCompare(String(b), "fr", { numeric: true }));
const joinCompact = (values) => uniqueSorted(values.map(compact)).join(" | ");
const integrated = (model) => model.brand === "Bonfiglioli" && /^(M|ME|MX)$/i.test(model.series ?? "");

const modelsByKey = new Map(payload.models.map((model) => [model.model_key, model]));
const opsByModel = new Map();
const dimensionsByModel = new Map();
const flangesByModel = new Map();
const brakesByModel = new Map();
for (const row of payload.operating_points) {
  if (!opsByModel.has(row.model_key)) opsByModel.set(row.model_key, []);
  opsByModel.get(row.model_key).push(row);
}
for (const row of payload.dimensions) {
  if (!dimensionsByModel.has(row.model_key)) dimensionsByModel.set(row.model_key, []);
  dimensionsByModel.get(row.model_key).push(row);
}
for (const row of payload.flange_options) {
  if (!flangesByModel.has(row.model_key)) flangesByModel.set(row.model_key, []);
  flangesByModel.get(row.model_key).push(row);
}
for (const row of payload.brake_options) {
  if (!brakesByModel.has(row.model_key)) brakesByModel.set(row.model_key, []);
  brakesByModel.get(row.model_key).push(row);
}

function dimensionContext(row) {
  return [
    row.mounting && row.mounting !== "ANY" ? row.mounting : null,
    row.polarity != null ? `${row.polarity}P` : null,
    row.variant_context,
  ].filter(Boolean).join("/") || "commun";
}

function dimensionValues(modelKey, code) {
  return uniqueSorted((dimensionsByModel.get(modelKey) ?? [])
    .filter((row) => row.canonical_code === code)
    .map((row) => `${dimensionContext(row)}:${compact(row.value_mm ?? row.value_text)}`))
    .join(" | ");
}

function sourcePagesForModel(modelKey) {
  const rows = [
    ...(dimensionsByModel.get(modelKey) ?? []),
    ...(flangesByModel.get(modelKey) ?? []),
  ];
  return uniqueSorted(rows.map((row) => {
    const source = row.source_ref;
    return source?.document_filename && source?.pdf_page
      ? `${source.document_filename} p.${source.pdf_page}`
      : null;
  })).join(" | ");
}

function missingFields(row, fields) {
  return fields.filter(([key, value]) => !present(value)).map(([key]) => key);
}

const modelRows = payload.models.map((model) => {
  const ops = opsByModel.get(model.model_key) ?? [];
  const dimensions = dimensionsByModel.get(model.model_key) ?? [];
  const core = Object.fromEntries(CORE_CODES.map((code) => [code, dimensionValues(model.model_key, code)]));
  const nativeCodes = uniqueSorted(dimensions.filter((row) => !row.canonical_code).map((row) => row.published_code_verbatim));
  const identityMissing = missingFields(model, [
    ["marque", model.brand],
    ["série", model.series],
    ["désignation", model.designation],
    ["model_key", model.model_key],
    ["configuration de pôles", model.pole_config],
    ["technologie", model.motor_technology],
    ["provenance", model.source_ref_key],
  ]);
  const electricalCoreMissing = [];
  for (const op of ops) {
    for (const [label, value] of [
      ["pôles", op.poles], ["mode alimentation", op.supply_mode], ["fréquence", op.frequency_hz],
      ["puissance", op.power_kw], ["vitesse", op.rated_speed_rpm], ["tension", op.voltage_v],
      ["provenance point", op.source_ref_key],
    ]) {
      if (!present(value)) electricalCoreMissing.push(label);
    }
  }
  if (!ops.length) electricalCoreMissing.push("point de fonctionnement");
  const detailedFields = [
    ["classe IE", "efficiency_class"],
    ["couple nominal", "rated_torque_nm"],
    ["courant nominal", "rated_current_a"],
    ["cos phi", "cos_phi"],
    ["bruit", "noise_db"],
    ["courant maximal", "max_current_a"],
    ["couple démarrage", "starting_torque_ratio"],
    ["courant démarrage", "starting_current_ratio"],
    ["couple maximal", "breakdown_torque_ratio"],
  ];
  const detailedMissing = detailedFields
    .filter(([, field]) => ops.some((op) => !present(op[field])))
    .map(([label]) => label);
  const physicalMissing = missingFields(model, [
    ["matière carcasse", model.casing_material],
    ["indice IP", model.protection_ip],
    ["hauteur carcasse", model.frame_size],
    ["masse", model.mass_kg],
    ["inertie", model.inertia_kgm2],
  ]);
  const coreMissing = CORE_CODES.filter((code) => !present(core[code]));
  const mechanicalStatus = integrated(model)
    ? (dimensions.length ? "Interface native publiée" : "À vérifier : interface absente")
    : (coreMissing.length ? "À vérifier" : "IEC essentiel complet");
  return {
    ...model,
    construction: integrated(model) ? "Intégré motoréducteur – non IEC autonome" : "Moteur autonome / IEC",
    ops,
    dimensions,
    core,
    nativeCodes,
    identityMissing,
    electricalCoreMissing: uniqueSorted(electricalCoreMissing),
    detailedMissing,
    physicalMissing,
    coreMissing,
    mechanicalStatus,
    flangeCount: (flangesByModel.get(model.model_key) ?? []).length,
    brakeCount: (brakesByModel.get(model.model_key) ?? []).length,
  };
}).sort((a, b) =>
  a.brand.localeCompare(b.brand, "fr")
  || String(a.series ?? "").localeCompare(String(b.series ?? ""), "fr", { numeric: true })
  || a.designation.localeCompare(b.designation, "fr", { numeric: true })
  || a.model_key.localeCompare(b.model_key),
);

const modelHeaders = [
  "Marque", "Série", "Désignation", "Référence article", "model_key", "Discriminant identité",
  "Construction", "Technologie", "Configuration pôles", "Carcasse IEC", "Lettre carcasse",
  "Matière carcasse", "Indice IP", "Masse kg", "Inertie kg·m²", "Nb points",
  "Modes alimentation", "Puissances kW", "Pôles", "Fréquences Hz", "Tensions V", "Vitesses tr/min",
  "Courant nominal publié", "Couple nominal publié", "cos φ publié", "Classe IE publiée",
  "Nb côtes", "A", "B", "C", "H", "K", "D", "E", "F", "Codes natifs non canoniques",
  "Nb brides", "Nb freins", "Identité", "Électrique essentiel", "Performances détaillées",
  "Physique", "Mécanique", "Champs absents / à qualifier", "Pages dimensions", "Provenance modèle",
];

const modelValues = modelRows.map((row) => {
  const ops = row.ops;
  const allOpsHave = (field) => ops.length > 0 && ops.every((op) => present(op[field]));
  return [
    row.brand, row.series, row.designation, row.article_no, row.model_key, row.identity_discriminator,
    row.construction, row.motor_technology, row.pole_config, row.frame_size, row.frame_letter,
    row.casing_material, row.protection_ip, row.mass_kg, row.inertia_kgm2, ops.length,
    joinCompact(ops.map((op) => op.supply_mode)), joinCompact(ops.map((op) => op.power_kw)),
    joinCompact(ops.map((op) => op.poles)), joinCompact(ops.map((op) => op.frequency_hz)),
    joinCompact(ops.map((op) => op.voltage_v)), joinCompact(ops.map((op) => op.rated_speed_rpm)),
    allOpsHave("rated_current_a") ? "Oui" : "Partiel/absent",
    allOpsHave("rated_torque_nm") ? "Oui" : "Partiel/absent",
    allOpsHave("cos_phi") ? "Oui" : "Partiel/absent",
    allOpsHave("efficiency_class") ? "Oui" : "Partiel/absent",
    row.dimensions.length, ...CORE_CODES.map((code) => row.core[code]),
    row.nativeCodes.join(", "), row.flangeCount, row.brakeCount,
    row.identityMissing.length ? "Incomplète" : "Complète",
    row.electricalCoreMissing.length ? "Incomplet" : "Complet",
    row.detailedMissing.length ? "Partiel" : "Complet",
    row.physicalMissing.length ? "Partiel" : "Complet",
    row.mechanicalStatus,
    uniqueSorted([
      ...row.identityMissing,
      ...row.electricalCoreMissing,
      ...row.detailedMissing,
      ...row.physicalMissing,
      ...(integrated(row) ? [] : row.coreMissing.map((code) => `cote ${code}`)),
    ]).join(", "),
    sourcePagesForModel(row.model_key), row.source_ref_key,
  ];
});

const pointHeaders = [
  "Marque", "Série", "Désignation", "Référence article", "model_key", "Origine point",
  "Mode alimentation", "Pôles", "Fréquence Hz", "Puissance kW", "Vitesse tr/min", "Tension V",
  "Couplage", "Classe IE", "Norme rendement", "Couple nominal Nm", "Courant nominal A",
  "Courant maximal A", "Bruit dB", "cos φ", "Rapport couple démarrage", "Rapport courant démarrage",
  "Rapport couple décrochage", "variant_key", "Couple maximal Nm", "Électrique essentiel",
  "Performances détaillées", "Champs absents / à qualifier", "Provenance point",
];

const pointRows = payload.operating_points.map((op) => {
  const model = modelsByKey.get(op.model_key);
  const coreFields = [
    ["mode alimentation", op.supply_mode], ["pôles", op.poles], ["fréquence", op.frequency_hz],
    ["puissance", op.power_kw], ["vitesse", op.rated_speed_rpm], ["tension", op.voltage_v],
    ["provenance", op.source_ref_key],
  ];
  const detailFields = [
    ["couplage", op.coupling], ["classe IE", op.efficiency_class],
    ["norme rendement", op.efficiency_standard], ["couple nominal", op.rated_torque_nm],
    ["courant nominal", op.rated_current_a], ["courant maximal", op.max_current_a],
    ["bruit", op.noise_db], ["cos phi", op.cos_phi],
    ["rapport couple démarrage", op.starting_torque_ratio],
    ["rapport courant démarrage", op.starting_current_ratio],
    ["rapport couple décrochage", op.breakdown_torque_ratio],
    ["variant_key", op.variant_key], ["couple maximal", op.max_torque_nm],
  ];
  const coreMissing = missingFields(op, coreFields);
  const detailMissing = missingFields(op, detailFields);
  return [
    model?.brand, model?.series, model?.designation, model?.article_no, op.model_key, op.origin,
    op.supply_mode, op.poles, op.frequency_hz, op.power_kw, op.rated_speed_rpm, op.voltage_v,
    op.coupling, op.efficiency_class, op.efficiency_standard, op.rated_torque_nm,
    op.rated_current_a, op.max_current_a, op.noise_db, op.cos_phi, op.starting_torque_ratio,
    op.starting_current_ratio, op.breakdown_torque_ratio, op.variant_key, op.max_torque_nm,
    coreMissing.length ? "Incomplet" : "Complet", detailMissing.length ? "Partiel" : "Complet",
    [...coreMissing, ...detailMissing].join(", "), op.source_ref_key,
  ];
}).sort((a, b) =>
  String(a[0]).localeCompare(String(b[0]), "fr")
  || String(a[2]).localeCompare(String(b[2]), "fr", { numeric: true })
  || Number(a[7]) - Number(b[7])
  || Number(a[8]) - Number(b[8])
  || Number(a[9]) - Number(b[9]),
);

const modelFieldSpecs = [
  ["Identité", "Désignation", "Obligatoire universel", (m) => m.designation],
  ["Identité", "Série", "Obligatoire universel", (m) => m.series],
  ["Identité", "Référence article", "Selon publication fabricant", (m) => m.article_no],
  ["Identité", "Configuration de pôles", "Obligatoire universel", (m) => m.pole_config],
  ["Identité", "Technologie moteur", "Obligatoire universel", (m) => m.motor_technology],
  ["Physique", "Matière carcasse", "Selon publication fabricant", (m) => m.casing_material],
  ["Physique", "Indice de protection IP", "Selon publication fabricant", (m) => m.protection_ip],
  ["Physique", "Hauteur de carcasse", "Selon construction", (m) => m.frame_size],
  ["Physique", "Masse", "Selon publication fabricant", (m) => m.mass_kg],
  ["Physique", "Inertie", "Selon publication fabricant", (m) => m.inertia_kgm2],
  ["Provenance", "Référence source modèle", "Obligatoire universel", (m) => m.source_ref_key],
];

const opFieldSpecs = [
  ["Électrique essentiel", "Mode alimentation", "Obligatoire universel", "supply_mode"],
  ["Électrique essentiel", "Nombre de pôles", "Obligatoire universel", "poles"],
  ["Électrique essentiel", "Fréquence", "Obligatoire universel", "frequency_hz"],
  ["Électrique essentiel", "Puissance", "Obligatoire universel", "power_kw"],
  ["Électrique essentiel", "Vitesse nominale", "Obligatoire universel", "rated_speed_rpm"],
  ["Électrique essentiel", "Tension", "Obligatoire universel", "voltage_v"],
  ["Performances", "Couplage", "Selon publication/application", "coupling"],
  ["Performances", "Classe IE", "Selon publication/application", "efficiency_class"],
  ["Performances", "Norme de rendement", "Selon publication/application", "efficiency_standard"],
  ["Performances", "Couple nominal", "Selon publication/application", "rated_torque_nm"],
  ["Performances", "Courant nominal", "Selon publication/application", "rated_current_a"],
  ["Performances", "Courant maximal", "Selon publication/application", "max_current_a"],
  ["Performances", "Bruit", "Selon publication fabricant", "noise_db"],
  ["Performances", "cos φ", "Selon publication/application", "cos_phi"],
  ["Démarrage", "Rapport couple démarrage", "Réseau direct principalement", "starting_torque_ratio"],
  ["Démarrage", "Rapport courant démarrage", "Réseau direct principalement", "starting_current_ratio"],
  ["Démarrage", "Rapport couple décrochage", "Réseau direct principalement", "breakdown_torque_ratio"],
  ["Variante", "variant_key", "Selon source", "variant_key"],
  ["Variante", "Couple maximal", "Selon technologie/source", "max_torque_nm"],
  ["Provenance", "Référence source point", "Obligatoire universel", "source_ref_key"],
];

const coverageRows = [];
for (const brand of uniqueSorted(payload.models.map((m) => m.brand))) {
  const segment = payload.models.filter((m) => m.brand === brand);
  for (const [family, field, rule, getter] of modelFieldSpecs) {
    const populated = segment.filter((m) => present(getter(m))).length;
    coverageRows.push(["Modèle", brand, "", family, field, rule, segment.length, populated, segment.length - populated]);
  }
}
for (const segmentKey of uniqueSorted(payload.operating_points.map((op) => {
  const model = modelsByKey.get(op.model_key);
  return `${model?.brand}|||${op.supply_mode}`;
}))) {
  const [brand, supply] = segmentKey.split("|||");
  const segment = payload.operating_points.filter((op) =>
    modelsByKey.get(op.model_key)?.brand === brand && op.supply_mode === supply);
  for (const [family, field, rule, key] of opFieldSpecs) {
    const populated = segment.filter((op) => present(op[key])).length;
    coverageRows.push(["Point", brand, supply, family, field, rule, segment.length, populated, segment.length - populated]);
  }
}

const mechanicalRows = modelRows.filter((row) => row.coreMissing.length > 0).map((row) => [
  integrated(row) ? "Non applicable IEC – interface native" : "À vérifier dans le PDF",
  row.brand, row.series, row.designation, row.article_no, row.model_key, row.construction,
  row.coreMissing.join(", "), row.dimensions.length,
  uniqueSorted(row.dimensions.map((d) => d.published_code_verbatim)).join(", "),
  row.nativeCodes.join(", "), sourcePagesForModel(row.model_key),
]);

function columnName(indexOneBased) {
  let n = indexOneBased;
  let name = "";
  while (n > 0) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function styleDataSheet(sheet, title, subtitle, headers, rowCount) {
  const last = columnName(headers.length);
  sheet.showGridLines = false;
  sheet.getRange(`A1:${last}1`).merge();
  sheet.getRange("A1").values = [[title]];
  sheet.getRange(`A1:${last}1`).format = {
    fill: COLORS.navy, font: { bold: true, color: COLORS.white, size: 15 },
    verticalAlignment: "center",
  };
  sheet.getRange(`A2:${last}2`).merge();
  sheet.getRange("A2").values = [[subtitle]];
  sheet.getRange(`A2:${last}2`).format = {
    fill: COLORS.paleBlue, font: { color: COLORS.grayText, italic: true, size: 10 },
    wrapText: true, verticalAlignment: "center",
  };
  sheet.getRange(`A4:${last}4`).values = [headers];
  sheet.getRange(`A4:${last}4`).format = {
    fill: COLORS.blue, font: { bold: true, color: COLORS.white, size: 9 },
    wrapText: true, verticalAlignment: "center", horizontalAlignment: "center",
    borders: { preset: "outside", style: "thin", color: COLORS.line },
  };
  sheet.getRange("A1").format.rowHeight = 28;
  sheet.getRange("A2").format.rowHeight = 34;
  sheet.getRange("A4").format.rowHeight = 42;
  if (rowCount > 0) {
    sheet.getRange(`A5:${last}${rowCount + 4}`).format = {
      font: { size: 9 }, verticalAlignment: "top",
      borders: { insideHorizontal: { style: "thin", color: COLORS.line } },
    };
    sheet.tables.add(`A4:${last}${rowCount + 4}`, true, `${sheet.name.replace(/[^A-Za-z0-9]/g, "")}Table`);
  }
  sheet.freezePanes.freezeRows(4);
  sheet.freezePanes.freezeColumns(3);
}

const workbook = Workbook.create();

const summary = workbook.worksheets.add("Synthèse");
summary.showGridLines = false;
summary.getRange("A1:H1").merge();
summary.getRange("A1").values = [["Audit exhaustif de complétude du catalogue moteur"]];
summary.getRange("A1:H1").format = {
  fill: COLORS.navy, font: { bold: true, color: COLORS.white, size: 16 }, verticalAlignment: "center",
};
summary.getRange("A2:H2").merge();
summary.getRange("A2").values = [[
  "Comparaison en lecture seule du snapshot Supabase actif et du lot candidat local. Un champ vide reste « absent/à qualifier » tant que le PDF ne prouve pas « non publié » ou « non applicable ».",
]];
summary.getRange("A2:H2").format = {
  fill: COLORS.paleBlue, font: { color: COLORS.grayText, italic: true }, wrapText: true, verticalAlignment: "center",
};
summary.getRange("A4:D4").values = [["Indicateur", "Valeur", "Statut", "Interprétation"]];
summary.getRange("A4:D4").format = { fill: COLORS.blue, font: { bold: true, color: COLORS.white } };
summary.getRange("A5:D13").values = [
  ["Modèles du lot candidat", null, "Contrôlé", "Une ligne par model_key"],
  ["Points de fonctionnement", null, "Contrôlé", "Grain puissance/pôles/fréquence/alimentation"],
  ["Désignations présentes", null, "Complet", "Désignation non vide sur chaque modèle"],
  ["Identités modèle complètes", null, "Complet", "Marque, série, désignation, technologie, pôles, provenance"],
  ["Électrique essentiel complet", null, "Complet", "Puissance, pôles, fréquence, vitesse, tension, alimentation, provenance"],
  ["Moteurs IEC essentiels complets", null, "À finaliser", "A/B/C/H/K/D/E/F sur moteurs autonomes"],
  ["Références IEC à vérifier", null, "Action", "Hors moteurs intégrés non IEC"],
  ["Moteurs intégrés non IEC", null, "Qualifiés", "Interfaces natives distinctes des cotes IEC"],
  ["Anomalies bloquantes du dry-run", 0, "GO technique", "Aucune valeur inventée ni conflit silencieux"],
];
summary.getRange("B5:B12").formulas = [
  ["=COUNTA('Modèles'!$A$5:$A$1725)"],
  ["=COUNTA('Points'!$A$5:$A$2359)"],
  ["=COUNTA('Modèles'!$C$5:$C$1725)"],
  ["=COUNTIF('Modèles'!$AM$5:$AM$1725,\"Complète\")"],
  ["=COUNTIF('Modèles'!$AN$5:$AN$1725,\"Complet\")"],
  ["=COUNTIF('Modèles'!$AQ$5:$AQ$1725,\"IEC essentiel complet\")"],
  ["=COUNTIF('Mécanique à statuer'!$A$5:$A$122,\"À vérifier dans le PDF\")"],
  ["=COUNTIF('Mécanique à statuer'!$A$5:$A$122,\"Non applicable IEC – interface native\")"],
];
summary.getRange("A15:F15").values = [["Objet", "Snapshot actif", "Lot candidat", "Écart", "Lecture", "Source"]];
summary.getRange("A15:F15").format = { fill: COLORS.blue, font: { bold: true, color: COLORS.white } };
summary.getRange("A16:F21").values = [
  ["Modèles", ACTIVE.motor_model, payload.models.length, null, "Stable", "Supabase MCP + payload candidat"],
  ["Points de fonctionnement", ACTIVE.motor_operating_point, payload.operating_points.length, null, "Stable", "Supabase MCP + payload candidat"],
  ["Côtes", ACTIVE.motor_dimension, payload.dimensions.length, null, "Candidat enrichi", "Supabase MCP + payload candidat"],
  ["Brides", ACTIVE.motor_flange_option, payload.flange_options.length, null, "Candidat enrichi", "Supabase MCP + payload candidat"],
  ["Freins", ACTIVE.motor_brake_option, payload.brake_options.length, null, "Stable", "Supabase MCP + payload candidat"],
  ["Validations métier", ACTIVE.motor_validation_issue, payload.validation_issues.length, null, "Stable", "Supabase MCP + payload candidat"],
];
summary.getRange("D16").formulas = [["=C16-B16"]];
summary.getRange("D16:D21").fillDown();
summary.getRange("A23:H23").merge();
summary.getRange("A23").values = [["Conclusion : le socle identité et électrique essentiel est complet. Les performances détaillées et attributs physiques ne sont pas complets à 100 % ; leurs absences sont inventoriées dans « Couverture champs »."]];
summary.getRange("A23:H23").format = {
  fill: COLORS.paleYellow, font: { bold: true, color: "#7A5B00" }, wrapText: true, verticalAlignment: "center",
};
summary.getRange("A1").format.rowHeight = 30;
summary.getRange("A2").format.rowHeight = 42;
summary.getRange("A23").format.rowHeight = 48;
summary.getRange("A:A").format.columnWidth = 36;
summary.getRange("B:B").format.columnWidth = 18;
summary.getRange("C:C").format.columnWidth = 22;
summary.getRange("D:D").format.columnWidth = 54;
summary.getRange("E:E").format.columnWidth = 24;
summary.getRange("F:F").format.columnWidth = 34;
summary.getRange("G:H").format.columnWidth = 18;
summary.getRange("B5:B21").format.numberFormat = "#,##0";
summary.freezePanes.freezeRows(4);

const coverage = workbook.worksheets.add("Couverture champs");
const coverageHeaders = ["Grain", "Marque", "Alimentation", "Famille", "Champ", "Règle", "Population", "Présent", "Absent", "Couverture"];
styleDataSheet(
  coverage,
  "Couverture factuelle champ par champ",
  "La couverture mesure la présence dans le lot candidat. Une absence n’est qualifiée « non publiée » ou « non applicable » que par une preuve documentaire explicite.",
  coverageHeaders,
  coverageRows.length,
);
coverage.getRange(`A5:I${coverageRows.length + 4}`).values = safeRows(coverageRows);
coverage.getRange("J5").formulas = [["=IF(G5=0,0,H5/G5)"]];
coverage.getRange(`J5:J${coverageRows.length + 4}`).fillDown();
coverage.getRange(`G5:I${coverageRows.length + 4}`).format.numberFormat = "#,##0";
coverage.getRange(`J5:J${coverageRows.length + 4}`).format.numberFormat = "0.0%";
coverage.getRange(`J5:J${coverageRows.length + 4}`).conditionalFormats.add("colorScale", {
  colors: [COLORS.paleRed, COLORS.paleYellow, COLORS.paleGreen],
  thresholds: ["min", "50%", "max"],
});
coverage.getRange("A:A").format.columnWidth = 10;
coverage.getRange("B:C").format.columnWidth = 18;
coverage.getRange("D:E").format.columnWidth = 25;
coverage.getRange("F:F").format.columnWidth = 31;
coverage.getRange("G:J").format.columnWidth = 13;

const modelsSheet = workbook.worksheets.add("Modèles");
styleDataSheet(
  modelsSheet,
  "Audit des 1 721 modèles",
  "Une ligne par model_key. Les listes de valeurs agrègent les points publiés sans fusionner silencieusement leurs variantes.",
  modelHeaders,
  modelValues.length,
);
modelsSheet.getRange(`A5:${columnName(modelHeaders.length)}${modelValues.length + 4}`).values = safeRows(modelValues);
for (const range of ["AM5:AM1725", "AN5:AN1725", "AO5:AO1725", "AP5:AP1725", "AQ5:AQ1725"]) {
  modelsSheet.getRange(range).conditionalFormats.add("containsText", {
    text: "Complet", format: { fill: COLORS.paleGreen, font: { color: "#246B2E" } },
  });
}
modelsSheet.getRange("AR5:AR1725").conditionalFormats.add("notContainsBlanks", {
  format: { fill: COLORS.paleYellow, font: { color: "#7A5B00" } },
});
modelsSheet.getRange("A:E").format.columnWidth = 20;
modelsSheet.getRange("C:C").format.columnWidth = 25;
modelsSheet.getRange("E:E").format.columnWidth = 48;
modelsSheet.getRange("F:I").format.columnWidth = 22;
modelsSheet.getRange("J:P").format.columnWidth = 14;
modelsSheet.getRange("Q:Z").format.columnWidth = 20;
modelsSheet.getRange("AA:AI").format.columnWidth = 24;
modelsSheet.getRange("AJ:AL").format.columnWidth = 20;
modelsSheet.getRange("AM:AR").format.columnWidth = 18;
modelsSheet.getRange("AS:AT").format.columnWidth = 52;
modelsSheet.getRange("AU:AU").format.columnWidth = 28;
modelsSheet.getRange("N:O").format.numberFormat = "0.000000";

const pointsSheet = workbook.worksheets.add("Points");
styleDataSheet(
  pointsSheet,
  "Audit des 2 355 points de fonctionnement",
  "Chaque ligne conserve sa combinaison publiée puissance/pôles/fréquence/alimentation. Les champs absents restent visibles.",
  pointHeaders,
  pointRows.length,
);
pointsSheet.getRange(`A5:${columnName(pointHeaders.length)}${pointRows.length + 4}`).values = safeRows(pointRows);
pointsSheet.getRange("Z5:Z2359").conditionalFormats.add("containsText", {
  text: "Complet", format: { fill: COLORS.paleGreen, font: { color: "#246B2E" } },
});
pointsSheet.getRange("AB5:AB2359").conditionalFormats.add("notContainsBlanks", {
  format: { fill: COLORS.paleYellow, font: { color: "#7A5B00" } },
});
pointsSheet.getRange("A:F").format.columnWidth = 22;
pointsSheet.getRange("C:C").format.columnWidth = 25;
pointsSheet.getRange("E:F").format.columnWidth = 48;
pointsSheet.getRange("G:Y").format.columnWidth = 17;
pointsSheet.getRange("Z:AA").format.columnWidth = 20;
pointsSheet.getRange("AB:AC").format.columnWidth = 48;
pointsSheet.getRange("I:Y").format.numberFormat = "0.000";

const mechanical = workbook.worksheets.add("Mécanique à statuer");
const mechanicalHeaders = [
  "Statut", "Marque", "Série", "Désignation", "Référence article", "model_key",
  "Construction", "Cotes IEC absentes", "Nb cotes publiées", "Tous codes publiés",
  "Codes natifs non canoniques", "Pages source",
];
styleDataSheet(
  mechanical,
  "Mécanique : applicabilité et références restantes",
  "109 moteurs intégrés ne doivent pas recevoir de fausses cotes IEC de moteur autonome. Les 9 autres lignes demandent une vérification PDF.",
  mechanicalHeaders,
  mechanicalRows.length,
);
mechanical.getRange(`A5:L${mechanicalRows.length + 4}`).values = safeRows(mechanicalRows);
mechanical.getRange(`A5:A${mechanicalRows.length + 4}`).conditionalFormats.add("containsText", {
  text: "À vérifier", format: { fill: COLORS.paleRed, font: { bold: true, color: "#9C1C2A" } },
});
mechanical.getRange(`A5:A${mechanicalRows.length + 4}`).conditionalFormats.add("containsText", {
  text: "Non applicable", format: { fill: COLORS.paleBlue, font: { color: "#245A7A" } },
});
mechanical.getRange("A:A").format.columnWidth = 32;
mechanical.getRange("B:E").format.columnWidth = 20;
mechanical.getRange("F:F").format.columnWidth = 48;
mechanical.getRange("G:H").format.columnWidth = 32;
mechanical.getRange("I:I").format.columnWidth = 14;
mechanical.getRange("J:L").format.columnWidth = 52;

const sources = workbook.worksheets.add("Sources & règles");
sources.showGridLines = false;
sources.getRange("A1:G1").merge();
sources.getRange("A1").values = [["Sources, statuts et règles de lecture"]];
sources.getRange("A1:G1").format = { fill: COLORS.navy, font: { bold: true, color: COLORS.white, size: 15 } };
sources.getRange("A3:G3").values = [["Marque", "Fichier", "Édition", "Pages", "SHA-256", "Chemin local", "Usage"]];
sources.getRange("A3:G3").format = { fill: COLORS.blue, font: { bold: true, color: COLORS.white } };
const sourceRows = payload.documents.map((doc) => [
  doc.brand, doc.filename, doc.edition_label ?? "Non publiée", doc.page_count, doc.sha256,
  doc.physical_path, "Valeurs fabricant et provenance",
]);
sources.getRange(`A4:G${sourceRows.length + 3}`).values = safeRows(sourceRows);
sources.getRange("A12:D12").values = [["Statut", "Signification", "Action", "Interdit"]];
sources.getRange("A12:D12").format = { fill: COLORS.blue, font: { bold: true, color: COLORS.white } };
sources.getRange("A13:D16").values = [
  ["Publié / présent", "Valeur rattachée à une source PDF", "Conserver avec provenance", "Remplacer par une estimation"],
  ["Absent / à qualifier", "Aucune valeur dans le lot actuel", "Relire le PDF ou chercher une autre publication fabricant", "Conclure automatiquement « non publié »"],
  ["Non applicable", "La construction ou le mode rend la cote/mesure sans objet", "Conserver le motif explicite", "Créer une valeur IEC fictive"],
  ["Non publié", "Le document ou le fabricant indique explicitement l’absence", "Conserver NULL + preuve", "Calculer sauf champ dérivé autorisé et marqué"],
];
sources.getRange("A18:G18").merge();
sources.getRange("A18").values = [[
  `Snapshot Supabase actif audité en lecture seule : ${ACTIVE.snapshot}. Lot candidat : ${payload.fingerprint_sha256}. Aucun écrit distant effectué.`,
]];
sources.getRange("A18:G18").format = { fill: COLORS.paleYellow, font: { bold: true, color: "#7A5B00" }, wrapText: true };
sources.getRange("A:A").format.columnWidth = 18;
sources.getRange("B:B").format.columnWidth = 36;
sources.getRange("C:C").format.columnWidth = 34;
sources.getRange("D:D").format.columnWidth = 12;
sources.getRange("E:E").format.columnWidth = 68;
sources.getRange("F:F").format.columnWidth = 88;
sources.getRange("G:G").format.columnWidth = 28;
sources.getRange("F4:G9").format.wrapText = true;
sources.getRange("A4:G9").format.rowHeight = 28;
sources.getRange("A13:D16").format.wrapText = true;
sources.getRange("A13:D16").format.rowHeight = 42;
sources.getRange("A18").format.rowHeight = 36;

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(previewDir, { recursive: true });

const inspectSummary = await workbook.inspect({
  kind: "table",
  range: "Synthèse!A1:H23",
  include: "values,formulas",
  tableMaxRows: 30,
  tableMaxCols: 10,
  maxChars: 8000,
});
console.log(inspectSummary.ndjson);
const formulaErrors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
});
console.log(formulaErrors.ndjson);

for (const [sheetName, range, filename] of [
  ["Synthèse", "A1:H23", "synthese.png"],
  ["Couverture champs", "A1:J24", "couverture.png"],
  ["Modèles", "A1:R18", "modeles-a-r.png"],
  ["Modèles", "S1:AT18", "modeles-s-at.png"],
  ["Points", "A1:O18", "points-a-o.png"],
  ["Points", "P1:AC18", "points-p-ac.png"],
  ["Mécanique à statuer", "A1:L24", "mecanique.png"],
  ["Sources & règles", "A1:G18", "sources-regles.png"],
]) {
  const preview = await workbook.render({ sheetName, range, scale: 1, format: "png" });
  await fs.writeFile(path.join(previewDir, filename), new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(JSON.stringify({
  outputPath,
  previews: previewDir,
  models: payload.models.length,
  points: payload.operating_points.length,
  coverageRows: coverageRows.length,
  mechanicalRows: mechanicalRows.length,
}, null, 2));
