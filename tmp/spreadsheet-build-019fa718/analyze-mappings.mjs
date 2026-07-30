import fs from "node:fs";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbookPath =
  "C:/GitHub/CIR_Cockpit/CIR-Cockpit/outputs/019fa718-45ae-79d2-8ddb-1507fbe1d079/tableau-verification-dimensions-moteurs.xlsx";
const sourceRoot = "C:/GitHub/CIR_Moteur/tools/extract/out";
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));

function source(name) {
  return JSON.parse(fs.readFileSync(`${sourceRoot}/${name}`, "utf8"));
}

function rowsFor(sheetName) {
  const sheet = workbook.worksheets.getItem(sheetName);
  return sheet
    .getUsedRange()
    .values.slice(4)
    .map((row, index) => ({
      excelRow: index + 5,
      series: row[1],
      designation: row[2],
      discriminator: row[3],
      poles: row[4],
      frame: row[6],
      missing: row[26],
      modelKey: row[38],
    }));
}

for (const sheetName of ["Innomotics", "Leroy-Somer", "Bonfiglioli"]) {
  const rows = rowsFor(sheetName);
  const grouped = new Map();
  for (const row of rows) {
    const key = row.series;
    if (!grouped.has(key)) grouped.set(key, { rows: 0, designations: new Set(), missing: new Map() });
    const group = grouped.get(key);
    group.rows += 1;
    group.designations.add(row.designation);
    for (const code of String(row.missing ?? "").split(",").map((x) => x.trim()).filter(Boolean)) {
      group.missing.set(code, (group.missing.get(code) ?? 0) + 1);
    }
  }
  console.log(`\n${sheetName}`);
  for (const [series, group] of grouped) {
    console.log(JSON.stringify({
      series,
      rows: group.rows,
      distinctDesignations: group.designations.size,
      missing: Object.fromEntries([...group.missing].sort()),
      designations: [...group.designations].sort(),
    }));
  }
}

const bonfigSource = source("dimensions-bonfiglioli.json");
console.log("\nBonfiglioli source designations");
console.log(JSON.stringify(bonfigSource.map((row) => row.designation).sort()));

const cilsSource = source("dimensions-cils.json");
console.log("\nCILS source designations");
console.log(JSON.stringify(cilsSource.map((row) => row.designation).sort()));
