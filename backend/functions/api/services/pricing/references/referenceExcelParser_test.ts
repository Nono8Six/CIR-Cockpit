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
  SEGMENTS_EXPECTED_COLUMNS
} from './referenceExcelParser.ts';

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
});
