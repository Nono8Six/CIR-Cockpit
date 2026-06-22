import { assertEquals } from 'std/assert';

import {
  PRICING_REFERENCE_MAX_FILE_SIZE_BYTES,
  pricingReferenceImportAnalyzeInputSchema,
  pricingReferenceImportsListInputSchema,
  pricingReferenceImportsPrepareInputSchema,
  pricingReferenceRowsListInputSchema
} from '../../../../shared/schemas/pricing/references.schema.ts';

const readObject = (record: Record<string, unknown>, key: string): Record<string, unknown> | null => {
  const value = record[key];
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
};

const readString = (record: Record<string, unknown>, key: string): string | null => {
  const value = record[key];
  return typeof value === 'string' ? value : null;
};

const readNumber = (record: Record<string, unknown>, key: string): number | null => {
  const value = record[key];
  return typeof value === 'number' ? value : null;
};

const readErrorData = async (response: Response): Promise<Record<string, unknown>> => {
  const payload = (await response.json()) as Record<string, unknown>;
  const error = readObject(payload, 'error');
  const data = error ? readObject(error, 'data') : null;
  assertEquals(Boolean(data), true);
  return data as Record<string, unknown>;
};

Deno.test('pricing reference payload contracts are strict and bounded', () => {
  const preparePayload = {
    files: {
      classification: {
        original_filename: 'classification.xlsx',
        size_bytes: 1024,
        sha256: 'a'.repeat(64),
        content_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      },
      segments_grids: {
        original_filename: 'segments.xlsx',
        size_bytes: PRICING_REFERENCE_MAX_FILE_SIZE_BYTES,
        sha256: 'b'.repeat(64)
      }
    }
  };

  assertEquals(pricingReferenceImportsPrepareInputSchema.safeParse(preparePayload).success, true);
  assertEquals(pricingReferenceImportsPrepareInputSchema.safeParse({ ...preparePayload, extra: true }).success, false);
  assertEquals(pricingReferenceImportsPrepareInputSchema.safeParse({
    files: {
      ...preparePayload.files,
      classification: {
        ...preparePayload.files.classification,
        original_filename: 'classification.xls'
      }
    }
  }).success, false);
  assertEquals(pricingReferenceImportsPrepareInputSchema.safeParse({
    files: {
      ...preparePayload.files,
      segments_grids: {
        ...preparePayload.files.segments_grids,
        size_bytes: PRICING_REFERENCE_MAX_FILE_SIZE_BYTES + 1
      }
    }
  }).success, false);
});

Deno.test('pricing reference list and analyze contracts reject unsupported fields', () => {
  assertEquals(pricingReferenceImportsListInputSchema.safeParse({ page: 1, page_size: 50 }).success, true);
  assertEquals(pricingReferenceImportsListInputSchema.safeParse({ page: 1, page_size: 101 }).success, false);
  assertEquals(pricingReferenceImportsListInputSchema.safeParse({ page: 1, page_size: 50, activate: true }).success, false);
  assertEquals(pricingReferenceRowsListInputSchema.safeParse({
    page: 1,
    page_size: 50,
    search: 'marque'
  }).success, true);
  assertEquals(pricingReferenceRowsListInputSchema.safeParse({
    page: 1,
    page_size: 50,
    search: 'x'.repeat(121)
  }).success, false);
  assertEquals(pricingReferenceImportAnalyzeInputSchema.safeParse({
    import_id: '11111111-1111-4111-8111-111111111111'
  }).success, true);
  assertEquals(pricingReferenceImportAnalyzeInputSchema.safeParse({
    import_id: '11111111-1111-4111-8111-111111111111',
    activate: true
  }).success, false);
});

Deno.test('pricing reference tRPC namespace is protected and activate is absent', async () => {
  const appModule = await import('../app.ts');
  const prepareResponse = await appModule.default.request('/trpc/pricing.references.imports.prepare', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      files: {
        classification: {
          original_filename: 'classification.xlsx',
          size_bytes: 1024,
          sha256: 'a'.repeat(64)
        },
        segments_grids: {
          original_filename: 'segments.xlsx',
          size_bytes: 1024,
          sha256: 'b'.repeat(64)
        }
      }
    })
  });

  const prepareError = await readErrorData(prepareResponse);
  assertEquals(prepareResponse.status, 401);
  assertEquals(readString(prepareError, 'appCode'), 'AUTH_REQUIRED');

  const healthResponse = await appModule.default.request('/trpc/pricing.references.health.get', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}'
  });
  const healthError = await readErrorData(healthResponse);
  assertEquals(healthResponse.status, 401);
  assertEquals(readString(healthError, 'appCode'), 'AUTH_REQUIRED');

  const activateResponse = await appModule.default.request('/trpc/pricing.references.imports.activate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}'
  });
  const activateError = await readErrorData(activateResponse);
  assertEquals(activateResponse.status, 404);
  assertEquals(readString(activateError, 'appCode'), 'NOT_FOUND');
  assertEquals(readNumber(activateError, 'httpStatus'), 404);
});
