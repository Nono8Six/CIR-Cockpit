import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const repoRoot = path.resolve("../..");
const payloadPath = path.join(repoRoot, "tmp", "c2-audit-full", "payload", "candidate-payload.json");
const outputDir = path.join(repoRoot, "outputs", "019fa718-45ae-79d2-8ddb-1507fbe1d079");
const outputPath = path.join(outputDir, "tableau-exemples-donnees-incompletes.xlsx");
const previewDir = path.join(repoRoot, "tmp", "spreadsheet-build-019fa718", "previews-incomplete-examples");
const payload = JSON.parse(await fs.readFile(payloadPath, "utf8"));

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

const present = (value) => value !== null && value !== undefined && String(value).trim() !== "";
const xmlSafe = (value) => typeof value === "string"
  ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
  : value;
const safeRows = (rows) => rows.map((row) => row.map(xmlSafe));
const uniqueSorted = (values) => [...new Set(values.filter(present))]
  .sort((a, b) => String(a).localeCompare(String(b), "fr", { numeric: true }));
const compact = (value) => value == null ? "" : String(value);
const integrated = (model) => model.brand === "Bonfiglioli" && /^(M|ME|MX)$/i.test(model.series ?? "");
const modelsByKey = new Map(payload.models.map((model) => [model.model_key, model]));

const dimensionsByModel = new Map();
for (const row of payload.dimensions) {
  if (!dimensionsByModel.has(row.model_key)) dimensionsByModel.set(row.model_key, []);
  dimensionsByModel.get(row.model_key).push(row);
}

const CORE_CODES = ["A", "B", "C", "H", "K", "D", "E", "F"];

function dimensionValue(modelKey, code) {
  return uniqueSorted((dimensionsByModel.get(modelKey) ?? [])
    .filter((row) => row.canonical_code === code)
    .map((row) => {
      const context = [
        row.mounting && row.mounting !== "ANY" ? row.mounting : null,
        row.polarity != null ? `${row.polarity}P` : null,
        row.variant_context,
      ].filter(Boolean).join("/") || "commun";
      return `${context}:${compact(row.value_mm ?? row.value_text)}`;
    })).join(" | ");
}

function sourcePages(modelKey) {
  return uniqueSorted((dimensionsByModel.get(modelKey) ?? []).map((row) => {
    const source = row.source_ref;
    return source?.document_filename && source?.pdf_page
      ? `${source.document_filename} p.${source.pdf_page}`
      : null;
  })).join(" | ");
}

const MODEL_FIELDS = [
  { key: "article_no", label: "Référence article / code fabricant", family: "Identité" },
  { key: "casing_material", label: "Matière de carcasse", family: "Physique" },
  { key: "protection_ip", label: "Indice de protection IP", family: "Physique" },
  { key: "frame_size", label: "Hauteur de carcasse / frame", family: "Physique" },
  { key: "mass_kg", label: "Masse", family: "Physique" },
  { key: "inertia_kgm2", label: "Inertie rotor", family: "Physique" },
];

const POINT_FIELDS = [
  { key: "coupling", label: "Couplage", family: "Électrique" },
  { key: "efficiency_class", label: "Classe de rendement IE", family: "Rendement" },
  { key: "efficiency_standard", label: "Norme de rendement", family: "Rendement" },
  { key: "rated_torque_nm", label: "Couple nominal", family: "Performance" },
  { key: "rated_current_a", label: "Courant nominal", family: "Électrique" },
  { key: "max_current_a", label: "Courant maximal", family: "Électrique" },
  { key: "noise_db", label: "Niveau sonore", family: "Physique" },
  { key: "cos_phi", label: "Facteur de puissance cos φ", family: "Électrique" },
  { key: "starting_torque_ratio", label: "Rapport couple de démarrage", family: "Démarrage" },
  { key: "starting_current_ratio", label: "Rapport courant de démarrage", family: "Démarrage" },
  { key: "breakdown_torque_ratio", label: "Rapport couple de décrochage", family: "Démarrage" },
  { key: "variant_key", label: "Clé de variante fabricant", family: "Identité point" },
  { key: "max_torque_nm", label: "Couple maximal", family: "Performance" },
];

function methodFor(field, grain, supplyMode = "") {
  if (grain === "Mécanique") return "Relecture du tableau dimensionnel puis extraction de toutes les lignes";
  if (["mass_kg", "inertia_kgm2", "rated_torque_nm", "rated_current_a", "max_current_a", "noise_db", "cos_phi", "max_torque_nm", "variant_key", "article_no", "frame_size"].includes(field)) {
    return "Extraction ligne par ligne — l’exemple sert à localiser la bonne table";
  }
  if (["starting_torque_ratio", "starting_current_ratio", "breakdown_torque_ratio"].includes(field) && supplyMode === "vfd") {
    return "Qualifier l’applicabilité VFD ; ne pas créer une valeur réseau fictive";
  }
  if (["protection_ip", "casing_material", "efficiency_standard"].includes(field)) {
    return "Règle de gamme possible uniquement si le catalogue la déclare, puis contrôle des exceptions";
  }
  if (field === "coupling") {
    return supplyMode === "vfd"
      ? "Qualifier la combinaison variateur/moteur puis extraire les valeurs publiées"
      : "Chercher le tableau tension/couplage et extraire les lignes";
  }
  if (field === "efficiency_class") {
    return "Lire la classe par ligne ou par bloc publié ; contrôler les exceptions";
  }
  return "Relecture source et extraction factuelle";
}

function priorityFor(field, grain) {
  if (grain === "Mécanique") return "P1";
  if (["article_no", "protection_ip", "casing_material", "efficiency_class", "rated_torque_nm", "rated_current_a", "cos_phi"].includes(field)) return "P1";
  return "P2";
}

function exampleNeed(field, grain, supplyMode = "") {
  if (grain === "Mécanique") return "Plan/tableau coté montrant les colonnes absentes et la ligne exacte de la désignation";
  if (["protection_ip", "casing_material", "efficiency_standard"].includes(field)) {
    return "Une page d’introduction de gamme + une ligne produit permettant de confirmer la portée de la règle";
  }
  if (["starting_torque_ratio", "starting_current_ratio", "breakdown_torque_ratio"].includes(field) && supplyMode === "vfd") {
    return "Une page indiquant explicitement si la grandeur est non applicable ou publiée avec variateur";
  }
  return "Une ou deux lignes complètes avec en-tête de tableau, unité, page et désignation";
}

function addGroup(map, key, seed, item) {
  if (!map.has(key)) map.set(key, { ...seed, items: [] });
  map.get(key).items.push(item);
}

const modelGroups = new Map();
for (const model of payload.models) {
  for (const field of MODEL_FIELDS) {
    if (present(model[field.key])) continue;
    if (field.key === "frame_size" && integrated(model)) continue;
    const key = [model.brand, model.motor_technology, field.key].join("|||");
    addGroup(modelGroups, key, {
      grain: "Modèle",
      brand: model.brand,
      series: "",
      technology: model.motor_technology,
      supplyMode: "",
      field,
    }, model);
  }
}

const pointGroups = new Map();
for (const point of payload.operating_points) {
  const model = modelsByKey.get(point.model_key);
  for (const field of POINT_FIELDS) {
    if (present(point[field.key])) continue;
    const key = [
      model?.brand ?? "", model?.motor_technology ?? "", point.supply_mode, field.key,
    ].join("|||");
    addGroup(pointGroups, key, {
      grain: "Point",
      brand: model?.brand ?? "",
      series: "",
      technology: model?.motor_technology ?? "",
      supplyMode: point.supply_mode,
      field,
    }, { ...point, model });
  }
}

for (const group of modelGroups.values()) {
  group.series = uniqueSorted(group.items.map((item) => item.series)).join(", ");
}
for (const group of pointGroups.values()) {
  group.series = uniqueSorted(group.items.map((item) => item.model.series)).join(", ");
}

const mechanicalGroups = new Map();
for (const model of payload.models) {
  if (integrated(model)) continue;
  const missing = CORE_CODES.filter((code) => !present(dimensionValue(model.model_key, code)));
  if (!missing.length) continue;
  const key = [model.brand, model.series ?? "", model.designation, missing.join(",")].join("|||");
  addGroup(mechanicalGroups, key, {
    grain: "Mécanique",
    brand: model.brand,
    series: model.series ?? "",
    technology: model.motor_technology,
    supplyMode: "",
    field: { key: `dimensions:${missing.join(",")}`, label: `Cotes IEC ${missing.join(", ")}`, family: "Mécanique" },
    missingCodes: missing,
  }, model);
}

function selectExamples(items, grain) {
  const sorted = [...items].sort((a, b) => {
    const ad = grain === "Point" ? a.model.designation : a.designation;
    const bd = grain === "Point" ? b.model.designation : b.designation;
    return String(ad).localeCompare(String(bd), "fr", { numeric: true })
      || Number(a.power_kw ?? 0) - Number(b.power_kw ?? 0);
  });
  const first = sorted[0];
  const last = sorted.findLast((item) => {
    const designation = grain === "Point" ? item.model.designation : item.designation;
    const firstDesignation = grain === "Point" ? first.model.designation : first.designation;
    return designation !== firstDesignation || (grain === "Point" && item.power_kw !== first.power_kw);
  }) ?? sorted.at(-1);
  return [first, last];
}

function sampleLabel(item, grain) {
  if (!item) return "";
  if (grain === "Point") {
    return `${item.model.designation} — ${item.supply_mode}, ${item.poles}P, ${item.frequency_hz} Hz, ${item.power_kw} kW, ${item.rated_speed_rpm} tr/min`;
  }
  return `${item.designation}${item.article_no ? ` — ${item.article_no}` : ""}`;
}

function sampleKey(item, grain) {
  if (!item) return "";
  return grain === "Point" ? `${item.model_key} | ${item.origin}` : item.model_key;
}

const sortedGroups = (groups) => [...groups.values()].sort((a, b) =>
  priorityFor(a.field.key, a.grain).localeCompare(priorityFor(b.field.key, b.grain))
  || a.brand.localeCompare(b.brand, "fr")
  || a.series.localeCompare(b.series, "fr", { numeric: true })
  || a.field.label.localeCompare(b.field.label, "fr"),
);

function assignIds(groups, prefix) {
  return sortedGroups(groups).map((group, index) => ({ ...group, caseId: `${prefix}-${String(index + 1).padStart(3, "0")}` }));
}

const modelCases = assignIds(modelGroups, "MOD");
const pointCases = assignIds(pointGroups, "PT");
const mechanicalCases = assignIds(mechanicalGroups, "MEC");

function caseRow(group) {
  const [example1, example2] = selectExamples(group.items, group.grain);
  return [
    group.caseId,
    priorityFor(group.field.key, group.grain),
    group.brand,
    group.series,
    group.technology,
    group.supplyMode,
    group.field.family,
    group.field.label,
    group.items.length,
    methodFor(group.field.key, group.grain, group.supplyMode),
    exampleNeed(group.field.key, group.grain, group.supplyMode),
    sampleLabel(example1, group.grain),
    sampleKey(example1, group.grain),
    "", "", "", "",
    sampleLabel(example2, group.grain),
    sampleKey(example2, group.grain),
    "", "", "", "",
    "", "À documenter",
  ];
}

const CASE_HEADERS = [
  "ID cas", "Priorité", "Marque", "Série", "Technologie", "Alimentation",
  "Famille", "Champ absent / à qualifier", "Nb éléments affectés", "Méthode de reprise sûre",
  "Ce que l’exemple doit montrer",
  "Exemple 1 proposé", "Clé exemple 1", "PDF exemple 1", "Page exemple 1",
  "Valeur ou statut exemple 1", "En-tête / colonne exemple 1",
  "Exemple 2 proposé", "Clé exemple 2", "PDF exemple 2", "Page exemple 2",
  "Valeur ou statut exemple 2", "En-tête / colonne exemple 2",
  "Règle / conclusion après exemples", "Statut",
];

const modelCaseRows = modelCases.map(caseRow);
const pointCaseRows = pointCases.map(caseRow);
const mechanicalCaseRows = mechanicalCases.map((group) => {
  const row = caseRow(group);
  row[10] = `${row[10]}. Pages déjà rattachées : ${uniqueSorted(group.items.map((item) => sourcePages(item.model_key))).join(" | ")}`;
  return row;
});

const modelCaseIds = new Map();
for (const group of modelCases) {
  for (const item of group.items) {
    if (!modelCaseIds.has(item.model_key)) modelCaseIds.set(item.model_key, []);
    modelCaseIds.get(item.model_key).push(group.caseId);
  }
}
const pointCaseIds = new Map();
for (const group of pointCases) {
  for (const item of group.items) {
    const key = `${item.model_key}|||${item.origin}`;
    if (!pointCaseIds.has(key)) pointCaseIds.set(key, []);
    pointCaseIds.get(key).push(group.caseId);
  }
}

const modelReferenceRows = payload.models
  .filter((model) => modelCaseIds.has(model.model_key))
  .sort((a, b) => a.brand.localeCompare(b.brand, "fr")
    || String(a.series ?? "").localeCompare(String(b.series ?? ""), "fr", { numeric: true })
    || a.designation.localeCompare(b.designation, "fr", { numeric: true }))
  .map((model) => {
    const missing = MODEL_FIELDS
      .filter((field) => !present(model[field.key]) && !(field.key === "frame_size" && integrated(model)))
      .map((field) => field.label);
    return [
      uniqueSorted(modelCaseIds.get(model.model_key)).join(", "),
      model.brand, model.series, model.designation, model.article_no, model.model_key,
      model.motor_technology, model.pole_config, model.frame_size, model.casing_material,
      model.protection_ip, model.mass_kg, model.inertia_kgm2, missing.join(", "),
      model.source_ref_key,
    ];
  });

const pointReferenceRows = payload.operating_points
  .filter((point) => pointCaseIds.has(`${point.model_key}|||${point.origin}`))
  .sort((a, b) => {
    const am = modelsByKey.get(a.model_key);
    const bm = modelsByKey.get(b.model_key);
    return String(am?.brand).localeCompare(String(bm?.brand), "fr")
      || String(am?.series).localeCompare(String(bm?.series), "fr", { numeric: true })
      || String(am?.designation).localeCompare(String(bm?.designation), "fr", { numeric: true })
      || a.supply_mode.localeCompare(b.supply_mode)
      || a.poles - b.poles || a.frequency_hz - b.frequency_hz || a.power_kw - b.power_kw;
  })
  .map((point) => {
    const model = modelsByKey.get(point.model_key);
    const missing = POINT_FIELDS.filter((field) => !present(point[field.key])).map((field) => field.label);
    return [
      uniqueSorted(pointCaseIds.get(`${point.model_key}|||${point.origin}`)).join(", "),
      model?.brand, model?.series, model?.designation, model?.article_no,
      point.model_key, point.origin, point.supply_mode, point.poles, point.frequency_hz,
      point.power_kw, point.rated_speed_rpm, point.voltage_v, missing.join(", "), point.source_ref_key,
    ];
  });

function columnName(indexOneBased) {
  let n = indexOneBased;
  let name = "";
  while (n > 0) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function styleSheet(sheet, title, subtitle, headers, rowCount, freezeColumns = 2) {
  const last = columnName(headers.length);
  sheet.showGridLines = false;
  sheet.getRange(`A1:${last}1`).merge();
  sheet.getRange("A1").values = [[title]];
  sheet.getRange(`A1:${last}1`).format = {
    fill: COLORS.navy, font: { bold: true, color: COLORS.white, size: 15 }, verticalAlignment: "center",
  };
  sheet.getRange(`A2:${last}2`).merge();
  sheet.getRange("A2").values = [[subtitle]];
  sheet.getRange(`A2:${last}2`).format = {
    fill: COLORS.paleBlue, font: { color: COLORS.grayText, italic: true }, wrapText: true, verticalAlignment: "center",
  };
  sheet.getRange(`A4:${last}4`).values = [headers];
  sheet.getRange(`A4:${last}4`).format = {
    fill: COLORS.blue, font: { bold: true, color: COLORS.white, size: 9 },
    wrapText: true, verticalAlignment: "center", horizontalAlignment: "center",
    borders: { preset: "outside", style: "thin", color: COLORS.line },
  };
  sheet.getRange("A1").format.rowHeight = 28;
  sheet.getRange("A2").format.rowHeight = 38;
  sheet.getRange("A4").format.rowHeight = 48;
  if (rowCount) {
    sheet.getRange(`A5:${last}${rowCount + 4}`).format = {
      font: { size: 9 }, verticalAlignment: "top",
      borders: { insideHorizontal: { style: "thin", color: COLORS.line } },
    };
    sheet.tables.add(`A4:${last}${rowCount + 4}`, true, `${sheet.name.replace(/[^A-Za-z0-9]/g, "")}Table`);
  }
  sheet.freezePanes.freezeRows(4);
  sheet.freezePanes.freezeColumns(freezeColumns);
}

function setupCaseSheet(sheet, rows) {
  const lastRow = rows.length + 4;
  sheet.getRange(`A5:Y${lastRow}`).values = safeRows(rows);
  for (const range of [`N5:Q${lastRow}`, `T5:X${lastRow}`]) {
    sheet.getRange(range).format = { fill: COLORS.paleYellow, wrapText: true, verticalAlignment: "top" };
  }
  sheet.getRange(`Y5:Y${lastRow}`).dataValidation = {
    rule: { type: "list", values: ["À documenter", "Exemple fourni", "Prêt à extraire", "Non applicable", "Non publié"] },
  };
  sheet.getRange(`Y5:Y${lastRow}`).conditionalFormats.add("containsText", {
    text: "Prêt à extraire", format: { fill: COLORS.paleGreen, font: { color: "#246B2E", bold: true } },
  });
  sheet.getRange(`Y5:Y${lastRow}`).conditionalFormats.add("containsText", {
    text: "À documenter", format: { fill: COLORS.paleRed, font: { color: "#9C1C2A" } },
  });
  sheet.getRange(`B5:B${lastRow}`).conditionalFormats.add("containsText", {
    text: "P1", format: { fill: COLORS.paleRed, font: { color: "#9C1C2A", bold: true } },
  });
  sheet.getRange("A:B").format.columnWidth = 12;
  sheet.getRange("C:F").format.columnWidth = 18;
  sheet.getRange("G:H").format.columnWidth = 25;
  sheet.getRange("I:I").format.columnWidth = 14;
  sheet.getRange("J:K").format.columnWidth = 48;
  sheet.getRange("L:M").format.columnWidth = 46;
  sheet.getRange("N:Q").format.columnWidth = 24;
  sheet.getRange("R:S").format.columnWidth = 46;
  sheet.getRange("T:X").format.columnWidth = 24;
  sheet.getRange("Y:Y").format.columnWidth = 18;
}

const workbook = Workbook.create();

const summary = workbook.worksheets.add("Mode d’emploi");
summary.showGridLines = false;
summary.getRange("A1:H1").merge();
summary.getRange("A1").values = [["Exemples à fournir pour compléter le catalogue moteur"]];
summary.getRange("A1:H1").format = {
  fill: COLORS.navy, font: { bold: true, color: COLORS.white, size: 16 }, verticalAlignment: "center",
};
summary.getRange("A2:H2").merge();
summary.getRange("A2").values = [[
  "Remplis une ou deux lignes jaunes par cas. Les exemples servent à identifier la structure du catalogue ; ils ne servent jamais à recopier une valeur variable sur les autres moteurs.",
]];
summary.getRange("A2:H2").format = {
  fill: COLORS.paleBlue, font: { color: COLORS.grayText, italic: true }, wrapText: true, verticalAlignment: "center",
};
summary.getRange("A4:D4").values = [["Feuille", "Nombre de cas", "Ce que tu dois remplir", "Ce que je ferai ensuite"]];
summary.getRange("A4:D4").format = { fill: COLORS.blue, font: { bold: true, color: COLORS.white } };
summary.getRange("A5:D7").values = [
  ["Cas modèles", modelCases.length, "PDF, page, valeur/statut et en-tête pour 1 ou 2 références", "Localiser les tables et extraire toutes les références affectées"],
  ["Cas électriques", pointCases.length, "Même chose au niveau du point puissance/pôles/fréquence", "Extraire chaque ligne ou qualifier l’applicabilité"],
  ["Cas mécanique", mechanicalCases.length, "Plan coté et ligne exacte de la désignation", "Compléter les 9 références IEC sans extrapolation"],
];
summary.getRange("A9:H9").merge();
summary.getRange("A9").values = [["Règle fondamentale"]];
summary.getRange("A9:H9").format = { fill: COLORS.blue, font: { bold: true, color: COLORS.white } };
summary.getRange("A10:H13").values = [
  ["1", "IP, matière ou norme", "Une règle de gamme peut être reprise seulement si sa portée est imprimée clairement.", "", "", "", "", ""],
  ["2", "Masse, inertie, courant, couple, bruit", "Extraction ligne par ligne obligatoire ; les exemples servent uniquement à comprendre le tableau.", "", "", "", "", ""],
  ["3", "Données VFD", "Distinguer valeur publiée, valeur dépendante du variateur et grandeur non applicable au réseau direct.", "", "", "", "", ""],
  ["4", "Dimensions", "Aucune cote voisine, normative ou calculée ne remplace une cote fabricant manquante.", "", "", "", "", ""],
];
summary.getRange("A15:H15").merge();
summary.getRange("A15").values = [[
  "Commence par les cas P1. Tu peux filtrer par marque/série et ne renseigner qu’un ou deux exemples jaunes par ID de cas.",
]];
summary.getRange("A15:H15").format = {
  fill: COLORS.paleYellow, font: { bold: true, color: "#7A5B00" }, wrapText: true, verticalAlignment: "center",
};
summary.getRange("A:A").format.columnWidth = 22;
summary.getRange("B:B").format.columnWidth = 30;
summary.getRange("C:D").format.columnWidth = 58;
summary.getRange("E:H").format.columnWidth = 16;
summary.getRange("A1").format.rowHeight = 30;
summary.getRange("A2").format.rowHeight = 42;
summary.getRange("A10:H13").format.wrapText = true;
summary.getRange("A10:H13").format.rowHeight = 46;
summary.getRange("A15").format.rowHeight = 36;

const modelCasesSheet = workbook.worksheets.add("Cas modèles");
styleSheet(modelCasesSheet, "Cas incomplets au niveau modèle",
  "Les cellules jaunes sont à compléter. Une ligne correspond à un champ manquant dans une famille fabricant homogène.",
  CASE_HEADERS, modelCaseRows.length);
setupCaseSheet(modelCasesSheet, modelCaseRows);

const pointCasesSheet = workbook.worksheets.add("Cas électriques");
styleSheet(pointCasesSheet, "Cas incomplets au niveau point de fonctionnement",
  "Les exemples sont contextualisés par alimentation, pôles, fréquence et puissance afin d’éviter toute propagation entre points différents.",
  CASE_HEADERS, pointCaseRows.length);
setupCaseSheet(pointCasesSheet, pointCaseRows);

const mechanicalCasesSheet = workbook.worksheets.add("Cas mécanique");
styleSheet(mechanicalCasesSheet, "Références mécaniques IEC à documenter",
  "Seulement les moteurs autonomes réellement incomplets. Les moteurs intégrés non IEC ne figurent pas dans cette liste.",
  CASE_HEADERS, mechanicalCaseRows.length);
setupCaseSheet(mechanicalCasesSheet, mechanicalCaseRows);

const modelRefsSheet = workbook.worksheets.add("Références modèles");
const modelRefHeaders = [
  "ID cas concernés", "Marque", "Série", "Désignation", "Référence article", "model_key",
  "Technologie", "Configuration pôles", "Frame", "Matière", "IP", "Masse kg",
  "Inertie kg·m²", "Champs absents", "Provenance actuelle",
];
styleSheet(modelRefsSheet, "Toutes les références modèle affectées",
  "Cette feuille est la liste exhaustive permettant de reprendre le reste après validation des exemples.",
  modelRefHeaders, modelReferenceRows.length, 3);
modelRefsSheet.getRange(`A5:O${modelReferenceRows.length + 4}`).values = safeRows(modelReferenceRows);
modelRefsSheet.getRange("A:A").format.columnWidth = 30;
modelRefsSheet.getRange("B:E").format.columnWidth = 20;
modelRefsSheet.getRange("F:F").format.columnWidth = 48;
modelRefsSheet.getRange("G:N").format.columnWidth = 22;
modelRefsSheet.getRange("N:O").format.columnWidth = 52;
modelRefsSheet.getRange(`L5:M${modelReferenceRows.length + 4}`).format.numberFormat = "0.000000";

const pointRefsSheet = workbook.worksheets.add("Références points");
const pointRefHeaders = [
  "ID cas concernés", "Marque", "Série", "Désignation", "Référence article", "model_key",
  "Origine point", "Alimentation", "Pôles", "Fréquence Hz", "Puissance kW",
  "Vitesse tr/min", "Tension V", "Champs absents", "Provenance actuelle",
];
styleSheet(pointRefsSheet, "Tous les points de fonctionnement affectés",
  "Chaque ligne garde son grain exact. Les champs variables devront être extraits ligne par ligne après localisation du tableau.",
  pointRefHeaders, pointReferenceRows.length, 3);
pointRefsSheet.getRange(`A5:O${pointReferenceRows.length + 4}`).values = safeRows(pointReferenceRows);
pointRefsSheet.getRange("A:A").format.columnWidth = 46;
pointRefsSheet.getRange("B:E").format.columnWidth = 20;
pointRefsSheet.getRange("F:G").format.columnWidth = 48;
pointRefsSheet.getRange("H:M").format.columnWidth = 16;
pointRefsSheet.getRange("N:O").format.columnWidth = 52;
pointRefsSheet.getRange(`I5:M${pointReferenceRows.length + 4}`).format.numberFormat = "0.000";

const sourcesSheet = workbook.worksheets.add("Sources");
const sourceHeaders = ["Marque", "Fichier", "Édition", "Pages", "SHA-256", "Chemin local", "Usage"];
styleSheet(sourcesSheet, "Catalogues actuellement disponibles",
  "Tu peux renseigner un autre PDF dans les cellules jaunes des feuilles de cas si la donnée n’existe pas dans ces documents.",
  sourceHeaders, payload.documents.length, 2);
const sourceRows = payload.documents.map((doc) => [
  doc.brand, doc.filename, doc.edition_label ?? "Non publiée", doc.page_count,
  doc.sha256, doc.physical_path, "Source fabricant actuelle",
]);
sourcesSheet.getRange(`A5:G${sourceRows.length + 4}`).values = safeRows(sourceRows);
sourcesSheet.getRange("A:A").format.columnWidth = 18;
sourcesSheet.getRange("B:B").format.columnWidth = 38;
sourcesSheet.getRange("C:C").format.columnWidth = 34;
sourcesSheet.getRange("D:D").format.columnWidth = 12;
sourcesSheet.getRange("E:E").format.columnWidth = 68;
sourcesSheet.getRange("F:F").format.columnWidth = 88;
sourcesSheet.getRange("G:G").format.columnWidth = 28;

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(previewDir, { recursive: true });

const inspect = await workbook.inspect({
  kind: "table",
  range: "Mode d’emploi!A1:H15",
  include: "values,formulas",
  tableMaxRows: 20,
  tableMaxCols: 10,
  maxChars: 6000,
});
console.log(inspect.ndjson);
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

for (const [sheetName, range, filename] of [
  ["Mode d’emploi", "A1:H15", "mode-emploi.png"],
  ["Cas modèles", `A1:Y${Math.min(modelCaseRows.length + 4, 18)}`, "cas-modeles.png"],
  ["Cas électriques", `A1:Y${Math.min(pointCaseRows.length + 4, 18)}`, "cas-electriques.png"],
  ["Cas mécanique", `A1:Y${Math.min(mechanicalCaseRows.length + 4, 18)}`, "cas-mecanique.png"],
  ["Références modèles", "A1:O18", "references-modeles.png"],
  ["Références points", "A1:O18", "references-points.png"],
  ["Sources", "A1:G12", "sources.png"],
]) {
  const preview = await workbook.render({ sheetName, range, scale: 1, format: "png" });
  await fs.writeFile(path.join(previewDir, filename), new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(JSON.stringify({
  outputPath,
  modelCases: modelCases.length,
  pointCases: pointCases.length,
  mechanicalCases: mechanicalCases.length,
  affectedModels: modelReferenceRows.length,
  affectedPoints: pointReferenceRows.length,
}, null, 2));
