import { assertEquals, assertThrows } from 'std/assert';
import * as XLSX from 'xlsx';

import {
  PRICING_REFERENCE_MAX_FILE_SIZE_BYTES,
  pricingReferenceHealthReportSchema
} from '../../../../../../shared/schemas/pricing/references.schema.ts';
import {
  analyzePricingReferenceWorkbooks,
  CLASSIFICATION_EXPECTED_COLUMNS,
  computeSha256,
  ensurePricingReferenceFileAccepted,
  inspectPricingReferenceWorkbook,
  SEGMENTS_EXPECTED_COLUMNS
} from './referenceExcelParser.ts';
import {
  assertPricingReferenceCurrentMappingsConfirmed,
  resolvePricingReferenceAnalysisStatus
} from './referenceImports.ts';

type SheetJsTestModule = {
  utils: {
    aoa_to_sheet: (rows: string[][]) => unknown;
    book_append_sheet: (workbook: unknown, worksheet: unknown, sheetName: string) => void;
    book_new: () => unknown;
  };
  write: (workbook: unknown, options: Record<string, unknown>) => ArrayBuffer | Uint8Array;
};

const SHEET_JS = XLSX as unknown as SheetJsTestModule;

const workbookBytes = (sheetName: string, rows: string[][]): Uint8Array => {
  const workbook = SHEET_JS.utils.book_new();
  const worksheet = SHEET_JS.utils.aoa_to_sheet(rows);
  SHEET_JS.utils.book_append_sheet(workbook, worksheet, sheetName);
  const output = SHEET_JS.write(workbook, { bookType: 'xlsx', type: 'array' });
  return output instanceof Uint8Array ? output : new Uint8Array(output);
};

const readErrorProperty = (error: unknown, key: string): unknown =>
  error && typeof error === 'object' ? Reflect.get(error, key) : undefined;

type SegmentRowOptions = {
  segment: string;
  idnumerique: string;
  marque: string;
  catFab: string;
  mega: string;
  fam: string;
  sfa: string;
  numFour?: string;
};

const segmentRow = ({
  segment,
  idnumerique,
  marque,
  catFab,
  mega,
  fam,
  sfa,
  numFour = 'FOUR1'
}: SegmentRowOptions): string[] => [
  segment,
  idnumerique,
  marque,
  catFab,
  `Lib ${catFab}`,
  'O',
  'FAIR',
  'TARIF',
  numFour,
  '10',
  'A',
  '1',
  'STANDARD',
  '2026-01-01',
  '2026-12-31',
  '0',
  '1',
  mega,
  fam,
  sfa,
  'Mega',
  'Fam',
  'Sous-famille',
  '0.9',
  '1.1'
];

Deno.test('ensurePricingReferenceFileAccepted rejects invalid extension and size with app codes', () => {
  const invalidExtension = assertThrows(() => {
    ensurePricingReferenceFileAccepted('classification', 'classification.xls', 1024);
  });
  assertEquals(readErrorProperty(invalidExtension, 'code'), 'PRICING_REFERENCE_IMPORT_INVALID_FILE');
  assertEquals(readErrorProperty(invalidExtension, 'status'), 400);

  const tooLarge = assertThrows(() => {
    ensurePricingReferenceFileAccepted(
      'segments_grids',
      'SEG_GRI_HA.xlsx',
      PRICING_REFERENCE_MAX_FILE_SIZE_BYTES + 1
    );
  });
  assertEquals(readErrorProperty(tooLarge, 'code'), 'PRICING_REFERENCE_IMPORT_TOO_LARGE');
  assertEquals(readErrorProperty(tooLarge, 'status'), 413);
});

Deno.test('computeSha256 returns the expected metadata hash', async () => {
  assertEquals(
    await computeSha256(new TextEncoder().encode('abc')),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
  );
});

Deno.test('analyzePricingReferenceWorkbooks computes deterministic counters and French anomalies', async () => {
  const classificationBytes = workbookBytes('Classification', [
    [...CLASSIFICATION_EXPECTED_COLUMNS],
    ['1', '2', '3', 'Mega', 'Fam', 'Sous-famille'],
    ['1', '2', '3', 'Mega', 'Fam', 'Sous-famille duplicate'],
    ['', '2', '4', 'Mega vide', 'Fam', 'Sous-famille']
  ]);
  const segmentsBytes = workbookBytes('SEG_GRI_HA', [
    [...SEGMENTS_EXPECTED_COLUMNS],
    segmentRow({ segment: 'S1', idnumerique: '100', marque: 'MARQUE1', catFab: 'CAT1', mega: '1', fam: '2', sfa: '3' }),
    segmentRow({ segment: 'S2', idnumerique: '200', marque: 'MARQUE2', catFab: 'CAT2', mega: '1', fam: '2', sfa: '', numFour: '' }),
    segmentRow({ segment: 'S3', idnumerique: '300', marque: 'MARQUE3', catFab: 'CAT3', mega: '9', fam: '9', sfa: '9' }),
    segmentRow({ segment: 'S4', idnumerique: '400', marque: 'MARQUE4', catFab: 'CAT4', mega: '', fam: '', sfa: '' }),
    segmentRow({ segment: 'S5', idnumerique: '500', marque: '', catFab: 'CAT5', mega: '1', fam: '2', sfa: '3' })
  ]);

  const result = await analyzePricingReferenceWorkbooks(
    {
      file_kind: 'classification',
      original_filename: 'Classification.xlsx',
      bytes: classificationBytes,
      sha256: await computeSha256(classificationBytes)
    },
    {
      file_kind: 'segments_grids',
      original_filename: 'SEG_GRI_HA.xlsx',
      bytes: segmentsBytes,
      sha256: await computeSha256(segmentsBytes)
    }
  );

  assertEquals(pricingReferenceHealthReportSchema.safeParse(result.health_report).success, true);
  assertEquals(result.health_report.classification.rows_count, 3);
  assertEquals(result.health_report.classification.columns_count, 6);
  assertEquals(result.health_report.classification.duplicate_cir_keys, 1);
  assertEquals(result.health_report.classification.mandatory_empty_rows, 1);
  assertEquals(result.classification_rows.length, 1);
  assertEquals(result.health_report.segments_grids.rows_count, 5);
  assertEquals(result.health_report.segments_grids.columns_count, 25);
  assertEquals(result.health_report.segments_grids.identity_incomplete_rows, 1);
  assertEquals(result.health_report.segments_grids.classification_incomplete_rows, 2);
  assertEquals(result.health_report.segments_grids.cir_keys_not_validated_rows, 3);
  assertEquals(result.health_report.segments_grids.purchase_grid_missing_rows, 1);
  assertEquals(
    result.anomalies.some((anomaly) => anomaly.message === 'Champ grille achat structurel manquant.'),
    true
  );
  assertEquals(
    result.anomalies.some((anomaly) => anomaly.message.includes('Cle CIR non reconnue')),
    true
  );
  assertEquals(resolvePricingReferenceAnalysisStatus(result), 'analyse_erreur');
});

Deno.test('inspectPricingReferenceWorkbook detects exact canonical columns automatically', () => {
  const classificationBytes = workbookBytes('Classification', [
    [...CLASSIFICATION_EXPECTED_COLUMNS],
    ['1', '2', '3', 'Mega', 'Fam', 'Sous-famille']
  ]);

  const inspection = inspectPricingReferenceWorkbook({
    file_kind: 'classification',
    original_filename: 'Classification.xlsx',
    bytes: classificationBytes
  });

  assertEquals(inspection.mapping_status, 'auto');
  assertEquals(inspection.candidates.every((candidate) => candidate.status === 'auto'), true);
  assertEquals(inspection.proposed_mapping.MEGA, 'MEGA');
  assertEquals(inspection.row_count, 1);
});

Deno.test('inspectPricingReferenceWorkbook reuses saved aliases when source columns changed', () => {
  const classificationBytes = workbookBytes('Classification', [
    ['MEGA', 'FAM', 'SFA', 'Libelle mega produit', 'Libelle famille produit', 'Libelle sous famille produit'],
    ['1', '2', '3', 'Mega', 'Fam', 'Sous-famille']
  ]);

  const inspection = inspectPricingReferenceWorkbook(
    {
      file_kind: 'classification',
      original_filename: 'Classification.xlsx',
      bytes: classificationBytes
    },
    {
      MEGA_LIB: ['Libelle mega produit'],
      FAM_LIB: ['Libelle famille produit'],
      SFA_LIB: ['Libelle sous famille produit']
    }
  );

  assertEquals(inspection.mapping_status, 'auto');
  assertEquals(inspection.candidates.find((candidate) => candidate.canonical_column === 'MEGA_LIB')?.status, 'alias');
  assertEquals(inspection.proposed_mapping.FAM_LIB, 'LIBELLE FAMILLE PRODUIT');
});

Deno.test('analyzePricingReferenceWorkbooks accepts manual column mapping when classification headers changed', async () => {
  const classificationBytes = workbookBytes('Classification', [
    ['Mega code', 'Famille code', 'Sous famille code', 'Mega texte', 'Famille texte', 'Sous famille texte'],
    ['1', '2', '3', 'Mega', 'Fam', 'Sous-famille']
  ]);
  const segmentsBytes = workbookBytes('SEG_GRI_HA', [
    [...SEGMENTS_EXPECTED_COLUMNS],
    segmentRow({ segment: 'S1', idnumerique: '100', marque: 'MARQUE1', catFab: 'CAT1', mega: '1', fam: '2', sfa: '3' })
  ]);

  const result = await analyzePricingReferenceWorkbooks(
    {
      file_kind: 'classification',
      original_filename: 'Classification.xlsx',
      bytes: classificationBytes,
      sha256: await computeSha256(classificationBytes),
      column_mapping: {
        MEGA: 'MEGA CODE',
        FAM: 'FAMILLE CODE',
        SFA: 'SOUS FAMILLE CODE',
        MEGA_LIB: 'MEGA TEXTE',
        FAM_LIB: 'FAMILLE TEXTE',
        SFA_LIB: 'SOUS FAMILLE TEXTE'
      }
    },
    {
      file_kind: 'segments_grids',
      original_filename: 'SEG_GRI_HA.xlsx',
      bytes: segmentsBytes,
      sha256: await computeSha256(segmentsBytes)
    }
  );

  assertEquals(result.classification_rows[0]?.cir_key, '1_2_3');
  assertEquals(result.classification_rows[0]?.mega_lib, 'Mega');
  assertEquals(result.health_report.files.classification.columns.missing, []);
  assertEquals(resolvePricingReferenceAnalysisStatus(result), 'analyse_ok');
});

Deno.test('assertPricingReferenceCurrentMappingsConfirmed refuses newly uploaded files without confirmed mapping', () => {
  const error = assertThrows(() => {
    assertPricingReferenceCurrentMappingsConfirmed({
      classification: {
        original_filename: 'Classification.xlsx',
        mapping_status: 'a_confirmer'
      } as never
    });
  });

  assertEquals(readErrorProperty(error, 'code'), 'PRICING_REFERENCE_MAPPING_REQUIRED');
  assertEquals(readErrorProperty(error, 'status'), 400);
});

Deno.test('analyzePricingReferenceWorkbooks preserves raw values and normalizes controlled CIR fields', async () => {
  const classificationBytes = workbookBytes('Classification', [
    [...CLASSIFICATION_EXPECTED_COLUMNS],
    [' a ', ' b ', ' c ', '  Mega   texte ', ' Fam texte ', ' Sous famille ']
  ]);
  const segmentsBytes = workbookBytes('SEG_GRI_HA', [
    [...SEGMENTS_EXPECTED_COLUMNS],
    segmentRow({
      segment: ' seg 1 ',
      idnumerique: ' 100 ',
      marque: ' marque a ',
      catFab: ' cat 1 ',
      mega: ' a ',
      fam: ' b ',
      sfa: ' c ',
      numFour: ' four1 '
    })
  ]);

  const result = await analyzePricingReferenceWorkbooks(
    {
      file_kind: 'classification',
      original_filename: 'Classification.xlsx',
      bytes: classificationBytes,
      sha256: await computeSha256(classificationBytes)
    },
    {
      file_kind: 'segments_grids',
      original_filename: 'SEG_GRI_HA.xlsx',
      bytes: segmentsBytes,
      sha256: await computeSha256(segmentsBytes)
    }
  );

  assertEquals(result.classification_rows[0]?.raw_values.MEGA, ' a ');
  assertEquals(result.classification_rows[0]?.mega, 'A');
  assertEquals(result.classification_rows[0]?.mega_lib, 'Mega texte');
  assertEquals(result.segment_rows[0]?.marque, 'MARQUE A');
  assertEquals(result.segment_rows[0]?.cat_fab, 'CAT 1');
  assertEquals(result.link_rows[0]?.classification_cir_key, 'A_B_C');
  assertEquals(result.purchase_grid_rows[0]?.num_four, 'FOUR1');
  assertEquals(result.purchase_grid_rows[0]?.date_debut_normalized, '2026-01-01');
  assertEquals(result.purchase_grid_rows[0]?.date_fin_normalized, '2026-12-31');
  assertEquals(resolvePricingReferenceAnalysisStatus(result), 'analyse_ok');
});

Deno.test('analyzePricingReferenceWorkbooks flags unknown CIR date formats without inventing dates', async () => {
  const classificationBytes = workbookBytes('Classification', [
    [...CLASSIFICATION_EXPECTED_COLUMNS],
    ['1', '2', '3', 'Mega', 'Fam', 'Sous-famille']
  ]);
  const invalidDateRow = segmentRow({
    segment: 'S1',
    idnumerique: '100',
    marque: 'MARQUE1',
    catFab: 'CAT1',
    mega: '1',
    fam: '2',
    sfa: '3'
  });
  invalidDateRow[13] = 'date inconnue';

  const segmentsBytes = workbookBytes('SEG_GRI_HA', [
    [...SEGMENTS_EXPECTED_COLUMNS],
    invalidDateRow
  ]);

  const result = await analyzePricingReferenceWorkbooks(
    {
      file_kind: 'classification',
      original_filename: 'Classification.xlsx',
      bytes: classificationBytes,
      sha256: await computeSha256(classificationBytes)
    },
    {
      file_kind: 'segments_grids',
      original_filename: 'SEG_GRI_HA.xlsx',
      bytes: segmentsBytes,
      sha256: await computeSha256(segmentsBytes)
    }
  );

  assertEquals(result.purchase_grid_rows[0]?.date_debut_raw, 'date inconnue');
  assertEquals(result.purchase_grid_rows[0]?.date_debut_normalized, null);
  assertEquals(
    result.anomalies.some((anomaly) =>
      anomaly.type === 'parse_failed'
      && anomaly.columns.includes('DATE_DEBUT')
      && anomaly.message === 'Date CIR invalide dans la colonne DATE_DEBUT.'
    ),
    true
  );
  assertEquals(resolvePricingReferenceAnalysisStatus(result), 'analyse_ok');
});
