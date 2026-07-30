import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const repoRoot = path.resolve("../..");
const payloadPath = path.join(repoRoot, "tmp", "c2-review-final", "payload", "candidate-payload.json");
const outputDir = path.join(
  repoRoot,
  "outputs",
  "019fa718-45ae-79d2-8ddb-1507fbe1d079",
);
const outputPath = path.join(outputDir, "tableau-verification-dimensions-moteurs-v2.xlsx");
const previewDir = path.join(repoRoot, "tmp", "spreadsheet-build-019fa718", "previews");

const payload = JSON.parse(await fs.readFile(payloadPath, "utf8"));
const workbook = Workbook.create();

const COLORS = {
  navy: "#19324D",
  blue: "#2F6B9A",
  paleBlue: "#EAF2F8",
  paleYellow: "#FFF4CC",
  paleGreen: "#E7F4E8",
  paleRed: "#FBE4E6",
  paleGray: "#F3F5F7",
  grayText: "#5F6B76",
  white: "#FFFFFF",
  line: "#D7DEE5",
};

const CORE_CODES = ["A", "B", "C", "H", "K", "D", "E", "F"];
const FLANGE_CODES = ["M", "N", "P", "S", "T", "Z"];
const BRAND_SHEETS = ["Innomotics", "Leroy-Somer", "Bonfiglioli"];

function uniqueSorted(values) {
  return [...new Set(values.filter((value) => value != null && value !== ""))]
    .sort((a, b) => String(a).localeCompare(String(b), "fr", { numeric: true }));
}

function compactValue(value) {
  if (value == null) return "";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
  return String(value);
}

function dimensionContext(row) {
  const context = [];
  if (row.mounting && row.mounting !== "ANY") context.push(row.mounting);
  if (row.polarity != null) context.push(`${row.polarity}P`);
  if (row.variant_context) context.push(row.variant_context);
  return context.length ? context.join("/") : "commun";
}

const dimensionsByModel = new Map();
for (const row of payload.dimensions) {
  if (!dimensionsByModel.has(row.model_key)) dimensionsByModel.set(row.model_key, []);
  dimensionsByModel.get(row.model_key).push(row);
}

const flangesByModel = new Map();
for (const row of payload.flange_options) {
  if (!flangesByModel.has(row.model_key)) flangesByModel.set(row.model_key, []);
  flangesByModel.get(row.model_key).push(row);
}

function valuesForDimension(modelKey, code) {
  const rows = (dimensionsByModel.get(modelKey) ?? []).filter((row) => row.canonical_code === code);
  return uniqueSorted(
    rows.map((row) => `${dimensionContext(row)}:${compactValue(row.value_mm ?? row.value_text)}`),
  ).join(" | ");
}

function valuesForPublishedDimension(modelKey, code) {
  const rows = (dimensionsByModel.get(modelKey) ?? []).filter(
    (row) => row.published_code_verbatim === code,
  );
  return uniqueSorted(
    rows.map((row) => `${dimensionContext(row)}:${compactValue(row.value_mm ?? row.value_text)}`),
  ).join(" | ");
}

function flangeValue(modelKey, code) {
  const keyByCode = {
    M: "dim_m_mm",
    N: "dim_n_mm",
    P: "dim_p_mm",
    S: "dim_s_mm",
    T: "dim_t_mm",
    Z: "holes",
  };
  const key = keyByCode[code];
  const values = [];
  for (const row of flangesByModel.get(modelKey) ?? []) {
    let value = row[key];
    if (code === "S" && row.dim_s_thread) value = row.dim_s_thread;
    if (value == null) continue;
    const context = [row.mounting, row.role, row.flange_ref].filter(Boolean).join("/");
    values.push(`${context}:${compactValue(value)}`);
  }
  return uniqueSorted(values).join(" | ");
}

function mountingSummary(modelKey) {
  const dimensions = dimensionsByModel.get(modelKey) ?? [];
  const flanges = flangesByModel.get(modelKey) ?? [];
  return uniqueSorted([
    ...dimensions.map((row) => row.mounting).filter((value) => value && value !== "ANY"),
    ...flanges.map((row) => row.mounting),
  ]).join(", ");
}

function sourcePages(modelKey) {
  const dimensions = dimensionsByModel.get(modelKey) ?? [];
  const flanges = flangesByModel.get(modelKey) ?? [];
  return uniqueSorted(
    [...dimensions, ...flanges].map((row) => {
      const source = row.source_ref;
      if (!source?.document_filename || !source?.pdf_page) return null;
      return `${source.document_filename} p.${source.pdf_page}`;
    }),
  ).join(" | ");
}

function suggestedPages(model) {
  if (model.brand === "Innomotics") {
    const exact = {
      "1LE1003-0CA6": "PDF 162 produit ; PDF 296-301 dimensions",
      "1LE1003-1BC6": "PDF 162 produit ; PDF 298-301 dimensions",
      "1LE1003-1BD2": "PDF 161 produit ; PDF 298-299 dimensions",
      "1LE1003-1CB6": "PDF 162 produit ; PDF 298-301 dimensions",
      "1LE5584-3BC2": "PDF 362 produit ; PDF 419-421 dimensions",
    };
    return exact[model.article_no] ?? "Catalogue D 81.1 : section dimensions de la série";
  }
  if (model.brand === "Leroy-Somer") {
    const bySeries = {
      LSES: "Catalogue_LS_LSES.pdf : p.64 arbre ; p.65-69 montages",
      FLSES: "Catalogue_LS_LSES.pdf : p.94 arbre ; p.95-99 montages",
      PLSES: "Catalogue_LS_LSES.pdf : p.124 arbre ; p.125-127 montages",
      CILS: "6154c_fr_CILS_IE4.pdf p.11-15 ; ancien catalogue p.64-69",
      LSHRM: "LSHRM_Leroy-Somer.pdf p.50-53",
      FLSHRM: "LSHRM_Leroy-Somer.pdf p.50-53",
      PLSHRM: "LSHRM_Leroy-Somer.pdf p.50-53",
    };
    return bySeries[model.series] ?? "Catalogue Leroy-Somer : section dimensions de la série";
  }
  const bySeries = {
    BY: "Catalogue_BONFIGLIOLI_Moteur.pdf p.58-59",
    BX: "Catalogue_BONFIGLIOLI_Moteur.pdf p.66-79",
    MX: "Catalogue_BONFIGLIOLI_Moteur.pdf p.66-79 ; interface intégrée",
    BE: "Catalogue_BONFIGLIOLI_Moteur.pdf p.90-97",
    ME: "Catalogue_BONFIGLIOLI_Moteur.pdf p.90-97 ; interface intégrée",
    BN: "Catalogue_BONFIGLIOLI_Moteur.pdf p.108-115",
    M: "Catalogue_BONFIGLIOLI_Moteur.pdf p.108-115 ; interface intégrée",
  };
  return bySeries[model.series] ?? "Catalogue Bonfiglioli : section dimensions de la série";
}

const reviewRows = payload.models
  .map((model) => {
    const core = Object.fromEntries(CORE_CODES.map((code) => [code, valuesForDimension(model.model_key, code)]));
    const flange = Object.fromEntries(FLANGE_CODES.map((code) => [code, flangeValue(model.model_key, code)]));
    return {
      ...model,
      core,
      flange,
      mountings: mountingSummary(model.model_key),
      pagesDb: sourcePages(model.model_key),
      pagesSuggested: suggestedPages(model),
    };
  })
  .filter((row) => CORE_CODES.some((code) => !row.core[code]))
  .sort((a, b) =>
    a.brand.localeCompare(b.brand, "fr") ||
    String(a.series ?? "").localeCompare(String(b.series ?? ""), "fr", { numeric: true }) ||
    a.designation.localeCompare(b.designation, "fr", { numeric: true }) ||
    a.model_key.localeCompare(b.model_key),
  );

const headers = [
  "Statut",
  "Série",
  "Désignation / produit",
  "Réf. article / discriminant DB",
  "Pôles",
  "Technologie",
  "Carcasse",
  "Montages DB",
  "Pages déjà sourcées",
  "Pages suggérées à vérifier",
  "A DB (mm)",
  "A vérifiée",
  "B DB (mm)",
  "B vérifiée",
  "C DB (mm)",
  "C vérifiée",
  "H DB (mm)",
  "H vérifiée",
  "K DB (mm)",
  "K vérifiée",
  "D DB (mm)",
  "D vérifiée",
  "E DB (mm)",
  "E vérifiée",
  "F DB (mm)",
  "F vérifiée",
  "Cotes absentes en DB",
  "M DB",
  "N DB",
  "P DB",
  "S DB",
  "T DB",
  "Z DB",
  "Brides : vérification / correction",
  "Applicabilité IEC",
  "PDF utilisé",
  "Page vérifiée",
  "Commentaire",
  "model_key",
];

function columnName(indexOneBased) {
  let n = indexOneBased;
  let name = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

const lastColumn = columnName(headers.length);

function setBaseSheetStyle(sheet) {
  sheet.showGridLines = false;
  sheet.getRange(`A1:${lastColumn}1`).merge();
  sheet.getRange(`A1:${lastColumn}1`).format = {
    fill: COLORS.navy,
    font: { bold: true, color: COLORS.white, size: 16 },
    verticalAlignment: "center",
  };
  sheet.getRange(`A2:${lastColumn}2`).merge();
  sheet.getRange(`A2:${lastColumn}2`).format = {
    fill: COLORS.paleBlue,
    font: { color: COLORS.grayText, italic: true, size: 10 },
    wrapText: true,
    verticalAlignment: "center",
  };
  sheet.getRange(`A4:${lastColumn}4`).format = {
    fill: COLORS.blue,
    font: { bold: true, color: COLORS.white, size: 10 },
    wrapText: true,
    verticalAlignment: "center",
    horizontalAlignment: "center",
    borders: { preset: "outside", style: "thin", color: COLORS.line },
  };
  sheet.getRange("A1").format.rowHeight = 30;
  sheet.getRange("A2").format.rowHeight = 38;
  sheet.getRange("A4").format.rowHeight = 42;
  sheet.freezePanes.freezeRows(4);
  sheet.freezePanes.freezeColumns(4);
}

function createBrandSheet(brand) {
  const sheet = workbook.worksheets.add(brand);
  const rows = reviewRows.filter((row) => row.brand === brand);
  setBaseSheetStyle(sheet);
  sheet.getRange("A1").values = [[`Contrôle des dimensions IEC - ${brand}`]];
  sheet.getRange("A2").values = [[
    "Une ligne = un modèle technique du candidat C2c présentant au moins une cote IEC A/B/C/H/K/D/E/F absente. Les colonnes jaunes sont à renseigner depuis le PDF. Ne jamais recopier une valeur d’un modèle voisin sans preuve documentaire.",
  ]];
  sheet.getRange(`A4:${lastColumn}4`).values = [headers];

  const values = rows.map((row) => {
    const isIntegrated =
      row.brand === "Bonfiglioli" && ["M", "ME", "MX"].includes(row.series);
    return [
    isIntegrated ? "Non applicable" : "À vérifier",
    row.series ?? "",
    row.designation,
    row.article_no ?? row.identity_discriminator,
    row.pole_config,
    row.motor_technology,
    row.frame_size,
    row.mountings,
    row.pagesDb,
    row.pagesSuggested,
    row.core.A,
    "",
    row.core.B,
    "",
    row.core.C,
    "",
    row.core.H,
    "",
    row.core.K,
    "",
    row.core.D,
    "",
    row.core.E,
    "",
    row.core.F,
    "",
    "",
    row.flange.M,
    row.flange.N,
    row.flange.P,
    row.flange.S,
    row.flange.T,
    row.flange.Z,
    "",
    isIntegrated ? "Interface constructeur" : "À confirmer",
    "",
    "",
    isIntegrated
      ? "Les cotes IEC autonomes ne s’appliquent pas ; voir la feuille Interfaces intégrées."
      : "",
    row.model_key,
    ];
  });

  const firstDataRow = 5;
  const lastDataRow = firstDataRow + values.length - 1;
  if (values.length) {
    sheet.getRange(`A${firstDataRow}:${lastColumn}${lastDataRow}`).values = values;
    const missingFormulas = rows.map((_, index) => {
      const r = firstDataRow + index;
      return [
        `=TRIM(IF(K${r}="","A ","")&IF(M${r}="","B ","")&IF(O${r}="","C ","")&IF(Q${r}="","H ","")&IF(S${r}="","K ","")&IF(U${r}="","D ","")&IF(W${r}="","E ","")&IF(Y${r}="","F",""))`,
      ];
    });
    sheet.getRange(`AA${firstDataRow}:AA${lastDataRow}`).formulas = missingFormulas;

    sheet.getRange(`A${firstDataRow}:${lastColumn}${lastDataRow}`).format = {
      font: { size: 9, color: "#24313D" },
      verticalAlignment: "top",
      borders: {
        insideHorizontal: { style: "thin", color: COLORS.line },
        bottom: { style: "thin", color: COLORS.line },
      },
    };
    sheet.getRange(`H${firstDataRow}:J${lastDataRow}`).format.wrapText = true;
    sheet.getRange(`K${firstDataRow}:AG${lastDataRow}`).format.wrapText = true;
    for (const col of ["L", "N", "P", "R", "T", "V", "X", "Z", "AH", "AI", "AJ", "AK", "AL"]) {
      sheet.getRange(`${col}${firstDataRow}:${col}${lastDataRow}`).format.fill = COLORS.paleYellow;
    }
    sheet.getRange(`AM${firstDataRow}:AM${lastDataRow}`).format.fill = COLORS.paleGray;
    sheet.getRange(`AA${firstDataRow}:AA${lastDataRow}`).format.fill = COLORS.paleRed;
    sheet.getRange(`A${firstDataRow}:A${lastDataRow}`).dataValidation = {
      rule: {
        type: "list",
        values: ["À vérifier", "Confirmé", "Corrigé", "Non applicable", "Catalogue manquant"],
      },
    };
    sheet.getRange(`AI${firstDataRow}:AI${lastDataRow}`).dataValidation = {
      rule: {
        type: "list",
        values: ["À confirmer", "Applicable", "Non applicable", "Interface constructeur", "Dépend du montage"],
      },
    };
    const statusRange = sheet.getRange(`A${firstDataRow}:A${lastDataRow}`);
    statusRange.conditionalFormats.add("containsText", {
      text: "Confirmé",
      format: { fill: COLORS.paleGreen, font: { color: "#285B2D", bold: true } },
    });
    statusRange.conditionalFormats.add("containsText", {
      text: "Corrigé",
      format: { fill: COLORS.paleBlue, font: { color: COLORS.blue, bold: true } },
    });
    statusRange.conditionalFormats.add("containsText", {
      text: "Catalogue manquant",
      format: { fill: COLORS.paleRed, font: { color: "#8B2635", bold: true } },
    });
    const table = sheet.tables.add(`A4:${lastColumn}${lastDataRow}`, true, `${brand.replace(/[^A-Za-z]/g, "")}ReviewTable`);
    table.style = "TableStyleMedium2";
    table.showBandedColumns = false;
    table.showFilterButton = true;
  }

  const widths = {
    A: 16, B: 12, C: 24, D: 22, E: 10, F: 15, G: 10, H: 16, I: 34, J: 38,
    K: 15, L: 13, M: 15, N: 13, O: 15, P: 13, Q: 15, R: 13, S: 15, T: 13,
    U: 15, V: 13, W: 15, X: 13, Y: 15, Z: 13, AA: 20,
    AB: 23, AC: 23, AD: 23, AE: 23, AF: 23, AG: 23, AH: 28, AI: 20,
    AJ: 28, AK: 14, AL: 32, AM: 42,
  };
  for (const [column, width] of Object.entries(widths)) {
    sheet.getRange(`${column}:${column}`).format.columnWidth = width;
  }
  return { sheet, rows, lastDataRow };
}

const brandMeta = BRAND_SHEETS.map(createBrandSheet);

const validated = workbook.worksheets.add("Apports validés");
validated.showGridLines = false;
validated.getRange("A1:N1").merge();
validated.getRange("A1").values = [["Relevés utilisateur contrôlés dans les catalogues fabricant"]];
validated.getRange("A1:N1").format = {
  fill: COLORS.navy,
  font: { bold: true, color: COLORS.white, size: 16 },
};
validated.getRange("A2:N2").merge();
validated.getRange("A2").values = [[
  "Ces lignes ont déclenché les corrections d’extraction. Les valeurs confirmées restent rattachées à la page PDF exacte ; 1LE1003-1BD2 demeure volontairement non renseigné.",
]];
validated.getRange("A2:N2").format = {
  fill: COLORS.paleBlue,
  font: { italic: true, color: COLORS.grayText },
  wrapText: true,
};
validated.getRange("A4:N4").values = [[
  "Marque", "Produit", "Pôles", "A", "B", "C", "H", "K", "D", "E", "F",
  "PDF", "Page(s)", "Conclusion",
]];
validated.getRange("A4:N4").format = {
  fill: COLORS.blue,
  font: { bold: true, color: COLORS.white },
};
const validatedRows = [
  ["Innomotics", "1LE1003-0CA6", 2, 112, 90, 45, 71, 7, 14, 30, 5, "Catalogue_Moteur_Innomotics.pdf", "296-297", "Confirmé et intégré au candidat"],
  ["Innomotics", "1LE1003-1BC6", 6, 190, 140, 70, 112, 12, 28, 60, 8, "Catalogue_Moteur_Innomotics.pdf", "298-299", "Confirmé et intégré au candidat"],
  ["Innomotics", "1LE1003-1BD2", 8, null, null, null, null, null, 28, 60, 8, "Catalogue_Moteur_Innomotics.pdf", "298-299", "Référence mécanique exacte non retrouvée ; aucune cote de pieds propagée"],
  ["Innomotics", "1LE1003-1CB6", 4, 216, 178, 89, 132, 12, 38, 80, 10, "Catalogue_Moteur_Innomotics.pdf", "298-299", "Confirmé pour la ligne 132 M et intégré"],
  ["Innomotics", "1LE5584-3BC2", 6, 610, 630, 254, 355, 35, 95, 170, 25, "Catalogue_Moteur_Innomotics.pdf", "419", "Confirmé et intégré au candidat"],
  ["Leroy-Somer", "CILS 280 M", 2, 457, 419, 190, 280, 24, 65, 140, 18, "6154c_fr_CILS_IE4.pdf / Catalogue_LS_LSES.pdf", "14 / 94", "Arbre 2 pôles confirmé et extraction par polarité corrigée"],
  ["Leroy-Somer", "CILS 280 M", 4, 457, 419, 190, 280, 24, 75, 140, 20, "6154c_fr_CILS_IE4.pdf / Catalogue_LS_LSES.pdf", "14 / 94", "Arbre 4 pôles confirmé et extraction par polarité corrigée"],
  ["Leroy-Somer", "CILS 315 L", 2, 508, 508, 216, 315, 28, 65, 140, 18, "6154c_fr_CILS_IE4.pdf / Catalogue_LS_LSES.pdf", "14 / 94", "Confirmé et intégré au candidat"],
  ["Leroy-Somer", "FLSES 250 M", 2, 406, 349, 168, 250, 24, 60, 140, 18, "Catalogue_LS_LSES.pdf", "94-95", "Confirmé et intégré au candidat"],
  ["Leroy-Somer", "FLSES 315 LA", 2, 508, 508, 216, 315, 28, 70, 140, 20, "Catalogue_LS_LSES.pdf", "94-95", "Confirmé et intégré au candidat"],
  ["Bonfiglioli", "BE 63A", 4, 100, 80, 40, 63, 7, 11, 23, 4, "Catalogue_BONFIGLIOLI_Moteur.pdf", "90-93", "Confirmé ; en-têtes doubles D/DA et E/EA corrigés"],
  ["Bonfiglioli", "BN 63A", 2, 100, 80, 40, 63, 7, 11, 23, 4, "Catalogue_BONFIGLIOLI_Moteur.pdf", "108-115", "Confirmé ; rattachement à la géométrie publiée BN 63"],
];
validated.getRange(`A5:N${4 + validatedRows.length}`).values = validatedRows;
validated.getRange(`A4:N${4 + validatedRows.length}`).format.borders = {
  insideHorizontal: { style: "thin", color: COLORS.line },
  outside: { style: "thin", color: COLORS.line },
};
validated.getRange(`L5:N${4 + validatedRows.length}`).format.wrapText = true;
for (const [column, width] of Object.entries({
  A: 18, B: 24, C: 9, D: 9, E: 9, F: 9, G: 9, H: 9, I: 9, J: 9, K: 9,
  L: 42, M: 14, N: 52,
})) validated.getRange(`${column}:${column}`).format.columnWidth = width;
validated.freezePanes.freezeRows(4);

const integratedSeries = new Set(["M", "ME", "MX"]);
const integratedModels = payload.models.filter(
  (model) => model.brand === "Bonfiglioli" && integratedSeries.has(model.series),
);
const integratedCodes = uniqueSorted(
  integratedModels.flatMap((model) =>
    (dimensionsByModel.get(model.model_key) ?? [])
      .map((row) => row.published_code_verbatim)
      .filter(Boolean),
  ),
);
const integrated = workbook.worksheets.add("Interfaces intégrées");
integrated.showGridLines = false;
const integratedHeaders = [
  "Série", "Produit", "Discriminant DB", "Pôles", "Nature mécanique",
  "Pages source", ...integratedCodes, "model_key",
];
const integratedLastColumn = columnName(integratedHeaders.length);
integrated.getRange(`A1:${integratedLastColumn}1`).merge();
integrated.getRange("A1").values = [["Moteurs Bonfiglioli intégrés - cotes constructeur publiées"]];
integrated.getRange(`A1:${integratedLastColumn}1`).format = {
  fill: COLORS.navy,
  font: { bold: true, color: COLORS.white, size: 16 },
};
integrated.getRange(`A2:${integratedLastColumn}2`).merge();
integrated.getRange("A2").values = [[
  "Les séries M, ME et MX n’ont pas de géométrie IEC autonome A/B/C/H/K/D/E/F. Le tableau conserve leurs cotes d’interface et d’encombrement exactement comme publiées par Bonfiglioli ; une absence IEC est donc non applicable, pas une donnée à inventer.",
]];
integrated.getRange(`A2:${integratedLastColumn}2`).format = {
  fill: COLORS.paleYellow,
  font: { bold: true, color: "#6B5510" },
  wrapText: true,
};
integrated.getRange(`A4:${integratedLastColumn}4`).values = [integratedHeaders];
integrated.getRange(`A4:${integratedLastColumn}4`).format = {
  fill: COLORS.blue,
  font: { bold: true, color: COLORS.white },
  wrapText: true,
};
const integratedRows = integratedModels.map((model) => [
  model.series,
  model.designation,
  model.article_no ?? model.identity_discriminator,
  model.pole_config,
  "Moteur intégré pour motoréducteur - interface constructeur non IEC",
  sourcePages(model.model_key),
  ...integratedCodes.map((code) => valuesForPublishedDimension(model.model_key, code)),
  model.model_key,
]);
integrated.getRange(`A5:${integratedLastColumn}${4 + integratedRows.length}`).values = integratedRows;
integrated.getRange(`A4:${integratedLastColumn}${4 + integratedRows.length}`).format.borders = {
  insideHorizontal: { style: "thin", color: COLORS.line },
  outside: { style: "thin", color: COLORS.line },
};
integrated.getRange(`E5:F${4 + integratedRows.length}`).format.wrapText = true;
integrated.getRange("A:A").format.columnWidth = 10;
integrated.getRange("B:B").format.columnWidth = 20;
integrated.getRange("C:C").format.columnWidth = 22;
integrated.getRange("D:D").format.columnWidth = 9;
integrated.getRange("E:E").format.columnWidth = 44;
integrated.getRange("F:F").format.columnWidth = 34;
for (let index = 0; index < integratedCodes.length; index += 1) {
  const column = columnName(7 + index);
  integrated.getRange(`${column}:${column}`).format.columnWidth = 14;
}
integrated.getRange(`${integratedLastColumn}:${integratedLastColumn}`).format.columnWidth = 42;
integrated.freezePanes.freezeRows(4);
integrated.freezePanes.freezeColumns(6);
const integratedTable = integrated.tables.add(
  `A4:${integratedLastColumn}${4 + integratedRows.length}`,
  true,
  "IntegratedInterfacesTable",
);
integratedTable.style = "TableStyleMedium2";
integratedTable.showFilterButton = true;

const summary = workbook.worksheets.add("Synthèse");
summary.showGridLines = false;
summary.getRange("A1:H1").merge();
summary.getRange("A1").values = [["Suivi de vérification des dimensions moteurs"]];
summary.getRange("A1:H1").format = {
  fill: COLORS.navy,
  font: { bold: true, color: COLORS.white, size: 18 },
  verticalAlignment: "center",
};
summary.getRange("A2:H2").merge();
summary.getRange("A2").values = [[
  `Candidat régénéré - empreinte ${payload.fingerprint_sha256}. 47 369 cotes sont proposées contre 41 759 dans l’actif actuel ; aucune donnée Supabase n’a été modifiée.`,
]];
summary.getRange("A2:H2").format = {
  fill: COLORS.paleBlue,
  font: { italic: true, color: COLORS.grayText },
  wrapText: true,
};
summary.getRange("A4:G4").values = [[
  "Marque",
  "Modèles à contrôler",
  "À vérifier",
  "Confirmés",
  "Corrigés",
  "Non applicables",
  "Catalogue manquant",
]];
summary.getRange("A4:G4").format = {
  fill: COLORS.blue,
  font: { bold: true, color: COLORS.white },
  horizontalAlignment: "center",
};

for (let index = 0; index < brandMeta.length; index += 1) {
  const row = 5 + index;
  const { sheet, rows, lastDataRow } = brandMeta[index];
  summary.getRange(`A${row}`).values = [[sheet.name]];
  summary.getRange(`B${row}`).values = [[rows.length]];
  const range = rows.length ? `'${sheet.name}'!$A$5:$A$${lastDataRow}` : `'${sheet.name}'!$A$5:$A$5`;
  summary.getRange(`C${row}:G${row}`).formulas = [[
    `=COUNTIF(${range},"À vérifier")`,
    `=COUNTIF(${range},"Confirmé")`,
    `=COUNTIF(${range},"Corrigé")`,
    `=COUNTIF(${range},"Non applicable")`,
    `=COUNTIF(${range},"Catalogue manquant")`,
  ]];
}
summary.getRange("A8").values = [["TOTAL"]];
summary.getRange("B8:G8").formulas = [[
  "=SUM(B5:B7)",
  "=SUM(C5:C7)",
  "=SUM(D5:D7)",
  "=SUM(E5:E7)",
  "=SUM(F5:F7)",
  "=SUM(G5:G7)",
]];
summary.getRange("A8:G8").format = {
  fill: COLORS.paleGray,
  font: { bold: true },
  borders: { top: { style: "medium", color: COLORS.navy } },
};
summary.getRange("A11:H11").merge();
summary.getRange("A11").values = [["Mode d’emploi"]];
summary.getRange("A11:H11").format = {
  fill: COLORS.navy,
  font: { bold: true, color: COLORS.white },
};
summary.getRange("A12:H16").values = [
  ["1.", "Filtrer une feuille par série, désignation ou cote absente.", null, null, null, null, null, null],
  ["2.", "Comparer la valeur DB à la ligne exacte du PDF, avec la bonne polarité et le bon montage.", null, null, null, null, null, null],
  ["3.", "Saisir la valeur vérifiée dans la colonne jaune adjacente, sans modifier la colonne DB.", null, null, null, null, null, null],
  ["4.", "Renseigner le PDF, la page et un commentaire si la valeur diffère ou n’est pas applicable.", null, null, null, null, null, null],
  ["5.", "Passer le statut à Confirmé, Corrigé, Non applicable ou Catalogue manquant.", null, null, null, null, null, null],
];
for (let row = 12; row <= 16; row += 1) summary.getRange(`B${row}:H${row}`).merge();
summary.getRange("A12:H16").format = { wrapText: true, verticalAlignment: "top" };
summary.getRange("A1").format.rowHeight = 34;
summary.getRange("A2").format.rowHeight = 34;
summary.getRange("A:A").format.columnWidth = 18;
summary.getRange("B:G").format.columnWidth = 18;
summary.getRange("H:H").format.columnWidth = 18;
summary.freezePanes.freezeRows(4);

const glossary = workbook.worksheets.add("Glossaire IEC");
glossary.showGridLines = false;
glossary.getRange("A1:E1").merge();
glossary.getRange("A1").values = [["Glossaire des cotes utilisées dans le classeur"]];
glossary.getRange("A1:E1").format = {
  fill: COLORS.navy,
  font: { bold: true, color: COLORS.white, size: 16 },
};
glossary.getRange("A2:E2").merge();
glossary.getRange("A2").values = [[
  "Convention géométrique confirmée visuellement : A est transversal aux pieds et B longitudinal, parallèle à l’arbre. Les anciens libellés DB A/B doivent être corrigés.",
]];
glossary.getRange("A2:E2").format = {
  fill: COLORS.paleRed,
  font: { bold: true, color: "#7A2530" },
  wrapText: true,
};
glossary.getRange("A4:E4").values = [["Code", "Famille", "Définition", "Unité/format", "Règle de fiabilité"]];
glossary.getRange("A4:E4").format = {
  fill: COLORS.blue,
  font: { bold: true, color: COLORS.white },
};
const glossaryRows = [
  ["A", "Pieds", "Entraxe transversal des trous de fixation des pieds", "mm", "Ne pas confondre avec B"],
  ["B", "Pieds", "Entraxe longitudinal des trous de fixation, parallèle à l’arbre", "mm", "Peut varier avec S/M/L"],
  ["C", "Pieds", "Distance axiale entre le plan de référence côté arbre et la première ligne de fixation", "mm", "Lire sur le plan du montage"],
  ["H", "Pieds", "Hauteur entre le plan d’appui et l’axe de l’arbre", "mm", "Hauteur d’axe IEC"],
  ["K", "Pieds", "Diamètre publié du trou de fixation du pied", "mm", "Ce n’est pas le diamètre réel du boulon"],
  ["D", "Arbre DE", "Diamètre du bout d’arbre principal", "mm", "Dépend parfois de la polarité"],
  ["E", "Arbre DE", "Longueur utile du bout d’arbre principal depuis l’épaulement", "mm", "Dépend parfois de la polarité"],
  ["F", "Arbre DE", "Largeur de clavette du bout d’arbre principal", "mm", "Dépend parfois de la polarité"],
  ["M", "Bride", "Diamètre du cercle d’entraxe des trous de bride", "mm", "Toujours associer au montage et au rôle"],
  ["N", "Bride", "Diamètre de centrage ou d’emboîtement", "mm", "Ne pas déduire depuis la hauteur d’axe"],
  ["P", "Bride", "Diamètre extérieur de la bride", "mm", "Ne pas déduire depuis la hauteur d’axe"],
  ["S", "Bride", "Diamètre du trou traversant ou désignation du filetage", "mm ou filetage", "Conserver M5/M6/etc. comme texte"],
  ["T", "Bride", "Épaisseur ou profondeur publiée de la bride", "mm", "Respecter la définition du catalogue"],
  ["Z", "Bride", "Nombre de trous de fixation", "entier", "Ne pas confondre avec le diamètre"],
];
glossary.getRange(`A5:E${4 + glossaryRows.length}`).values = glossaryRows;
glossary.getRange(`A4:E${4 + glossaryRows.length}`).format.borders = {
  insideHorizontal: { style: "thin", color: COLORS.line },
  outside: { style: "thin", color: COLORS.line },
};
glossary.getRange(`C5:E${4 + glossaryRows.length}`).format.wrapText = true;
glossary.getRange("A:A").format.columnWidth = 10;
glossary.getRange("B:B").format.columnWidth = 16;
glossary.getRange("C:C").format.columnWidth = 56;
glossary.getRange("D:D").format.columnWidth = 18;
glossary.getRange("E:E").format.columnWidth = 42;
glossary.getRange("A2").format.rowHeight = 42;
glossary.freezePanes.freezeRows(4);

const sources = workbook.worksheets.add("Sources");
sources.showGridLines = false;
sources.getRange("A1:F1").merge();
sources.getRange("A1").values = [["Documents fabricant du lot C2c"]];
sources.getRange("A1:F1").format = {
  fill: COLORS.navy,
  font: { bold: true, color: COLORS.white, size: 16 },
};
sources.getRange("A3:F3").values = [["Marque", "Fichier", "Édition", "Pages", "SHA-256", "Chemin local"]];
sources.getRange("A3:F3").format = {
  fill: COLORS.blue,
  font: { bold: true, color: COLORS.white },
};
const sourceRows = payload.documents.map((doc) => [
  doc.brand,
  doc.filename,
  doc.edition_label ?? "Non publiée",
  doc.page_count,
  doc.sha256,
  doc.filename === "6154c_fr_CILS_IE4.pdf"
    ? `C:\\GitHub\\CIR_Moteur\\Catalogue fabricant\\Leroy_Somer_catalogues_moteurs\\${doc.filename}`
    : `C:\\GitHub\\CIR_Moteur\\Catalogue fabricant\\${doc.filename}`,
]);
sources.getRange(`A4:F${3 + sourceRows.length}`).values = sourceRows;
sources.getRange(`A3:F${3 + sourceRows.length}`).format.borders = {
  insideHorizontal: { style: "thin", color: COLORS.line },
  outside: { style: "thin", color: COLORS.line },
};
sources.getRange("A:A").format.columnWidth = 18;
sources.getRange("B:B").format.columnWidth = 38;
sources.getRange("C:C").format.columnWidth = 28;
sources.getRange("D:D").format.columnWidth = 10;
sources.getRange("E:E").format.columnWidth = 68;
sources.getRange("F:F").format.columnWidth = 68;
sources.getRange(`B4:F${3 + sourceRows.length}`).format.wrapText = true;
sources.freezePanes.freezeRows(3);

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(previewDir, { recursive: true });

const inspection = await workbook.inspect({
  kind: "table",
  range: "Synthèse!A1:H16",
  include: "values,formulas",
  tableMaxRows: 20,
  tableMaxCols: 10,
});
console.log(inspection.ndjson);

const formulaErrors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
});
console.log(formulaErrors.ndjson);

const previewSpecs = [
  ["Synthèse", "A1:H16"],
  ["Innomotics", "A1:M18"],
  ["Leroy-Somer", "A1:M18"],
  ["Bonfiglioli", "A1:M18"],
  ["Apports validés", "A1:N16"],
  ["Interfaces intégrées", "A1:L18"],
  ["Glossaire IEC", "A1:E18"],
  ["Sources", "A1:F10"],
];
for (const [sheetName, range] of previewSpecs) {
  const preview = await workbook.render({ sheetName, range, scale: 1.2, format: "png" });
  const safeName = sheetName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  await fs.writeFile(
    path.join(previewDir, `${safeName}.png`),
    new Uint8Array(await preview.arrayBuffer()),
  );
}

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);

console.log(JSON.stringify({
  outputPath,
  counts: Object.fromEntries(BRAND_SHEETS.map((brand) => [
    brand,
    reviewRows.filter((row) => row.brand === brand).length,
  ])),
  total: reviewRows.length,
  previews: previewSpecs.map(([sheetName]) =>
    path.join(previewDir, `${sheetName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`)),
}));
