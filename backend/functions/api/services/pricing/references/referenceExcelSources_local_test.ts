import { assertEquals } from 'std/assert';

import { analyzePricingReferenceWorkbooks, computeSha256 } from './referenceExcelParser.ts';

const CLASSIFICATION_SOURCE = new URL(
  '../../../../../../docs/LOGIQUE_REMISE_CIR/Classification_produit_08-04-2026_09-46-26.xlsx',
  import.meta.url
);
const SEGMENTS_SOURCE = new URL(
  '../../../../../../docs/LOGIQUE_REMISE_CIR/SEG_GRI_HA_08-04-2026_09-03-28.xlsx',
  import.meta.url
);

const toLocalPath = (url: URL): string => decodeURIComponent(url.pathname).replace(/^\/([A-Za-z]:)/, '$1');

const canReadFile = async (path: string): Promise<boolean> => {
  const permission = await Deno.permissions.query({ name: 'read', path });
  if (permission.state !== 'granted') return false;
  try {
    const stat = await Deno.stat(path);
    return stat.isFile;
  } catch {
    return false;
  }
};

Deno.test('local CIR reference Excel sources produce the expected Tranche 1 counters', async () => {
  const classificationPath = toLocalPath(CLASSIFICATION_SOURCE);
  const segmentsPath = toLocalPath(SEGMENTS_SOURCE);
  const hasLocalSources = await canReadFile(classificationPath) && await canReadFile(segmentsPath);
  if (!hasLocalSources) return;

  const [classificationBytes, segmentsBytes] = await Promise.all([
    Deno.readFile(classificationPath),
    Deno.readFile(segmentsPath)
  ]);

  const result = await analyzePricingReferenceWorkbooks(
    {
      file_kind: 'classification',
      original_filename: 'Classification_produit_08-04-2026_09-46-26.xlsx',
      bytes: classificationBytes,
      sha256: await computeSha256(classificationBytes)
    },
    {
      file_kind: 'segments_grids',
      original_filename: 'SEG_GRI_HA_08-04-2026_09-03-28.xlsx',
      bytes: segmentsBytes,
      sha256: await computeSha256(segmentsBytes)
    }
  );

  assertEquals(result.health_report.classification.rows_count, 497);
  assertEquals(result.health_report.classification.columns_count, 6);
  assertEquals(result.health_report.classification.duplicate_cir_keys, 0);
  assertEquals(result.health_report.classification.mandatory_empty_rows, 0);
  assertEquals(result.health_report.segments_grids.rows_count, 12635);
  assertEquals(result.health_report.segments_grids.columns_count, 25);
  assertEquals(result.health_report.segments_grids.identity_incomplete_rows, 0);
  assertEquals(result.health_report.segments_grids.classification_incomplete_rows, 499);
  assertEquals(result.health_report.segments_grids.cir_keys_not_validated_rows, 500);
  assertEquals(result.health_report.segments_grids.purchase_grid_missing_rows, 101);
});
