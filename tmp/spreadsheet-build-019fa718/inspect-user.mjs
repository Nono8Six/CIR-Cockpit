import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath =
  "C:/GitHub/CIR_Cockpit/CIR-Cockpit/outputs/019fa718-45ae-79d2-8ddb-1507fbe1d079/tableau-verification-dimensions-moteurs.xlsx";

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));
const sheetNames = ["Innomotics", "Leroy-Somer", "Bonfiglioli"];
const editableColumns = [
  [0, "Statut"],
  [11, "A vérifiée"],
  [13, "B vérifiée"],
  [15, "C vérifiée"],
  [17, "H vérifiée"],
  [19, "K vérifiée"],
  [21, "D vérifiée"],
  [23, "E vérifiée"],
  [25, "F vérifiée"],
  [33, "Brides"],
  [34, "Applicabilité IEC"],
  [35, "PDF utilisé"],
  [36, "Page vérifiée"],
  [37, "Commentaire"],
];

for (const sheetName of sheetNames) {
  const sheet = workbook.worksheets.getItem(sheetName);
  const used = sheet.getUsedRange();
  const values = used.values;
  const rows = [];
  for (let r = 4; r < values.length; r += 1) {
    const row = values[r] ?? [];
    const edits = {};
    for (const [columnIndex, label] of editableColumns) {
      const value = row[columnIndex];
      const isDefaultStatus = label === "Statut" && value === "À vérifier";
      const isDefaultApplicability = label === "Applicabilité IEC" && value === "À confirmer";
      if (
        value !== null &&
        value !== undefined &&
        String(value).trim() !== "" &&
        !isDefaultStatus &&
        !isDefaultApplicability
      ) {
        edits[label] = value;
      }
    }
    if (Object.keys(edits).length > 0) {
      rows.push({
        excelRow: r + 1,
        series: row[1],
        designation: row[2],
        discriminator: row[3],
        poles: row[4],
        frame: row[6],
        sourcedPages: row[8],
        suggestedPages: row[9],
        db: {
          A: row[10],
          B: row[12],
          C: row[14],
          H: row[16],
          K: row[18],
          D: row[20],
          E: row[22],
          F: row[24],
          M: row[27],
          N: row[28],
          P: row[29],
          S: row[30],
          T: row[31],
          Z: row[32],
        },
        edits,
        modelKey: row[38],
      });
    }
  }
  console.log(JSON.stringify({ sheet: sheetName, usedRows: values.length, editedRows: rows }, null, 2));
}
