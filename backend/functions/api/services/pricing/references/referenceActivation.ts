import { sql } from "drizzle-orm";

import {
  type PricingReferenceImportActivateInput,
  type PricingReferenceImportActivateResponse,
  pricingReferenceImportActivateResponseSchema,
  type PricingReferenceImportStatus,
} from "../../../../../../shared/schemas/pricing/references.schema.ts";
import { httpError } from "../../../middleware/errorHandler.ts";
import type { DbClient } from "../../../types.ts";
import { checkRateLimit } from "../../rate-limiting/rateLimit.ts";

type TargetImportRow = {
  id: string;
  status: PricingReferenceImportStatus;
};

type TargetSnapshotRow = {
  id: string;
  is_active: boolean;
};

type ActiveSnapshotRow = {
  id: string;
};

type ActivatedSnapshotRow = {
  id: string;
  activated_at: string;
};

type ArchivedSnapshotRow = {
  id: string;
  deactivated_at: string;
};

type RateLimitChecker = typeof checkRateLimit;

type ActivationOptions = {
  checkRateLimitFn?: RateLimitChecker;
};

const withTransaction = <T>(
  db: DbClient,
  operation: (tx: DbClient) => Promise<T>,
): Promise<T> => {
  const maybeTransactional = db as DbClient & {
    transaction?: <TResult>(
      callback: (tx: unknown) => Promise<TResult>,
    ) => Promise<TResult>;
  };
  if (typeof maybeTransactional.transaction !== "function") {
    return operation(db);
  }
  return maybeTransactional.transaction((tx) => operation(tx as DbClient));
};

const isHttpError = (
  error: unknown,
): error is Error & { status: number; code: string } =>
  error instanceof Error &&
  typeof (error as { status?: unknown }).status === "number" &&
  typeof (error as { code?: unknown }).code === "string";

const readErrorCode = (error: unknown): string | null => {
  if (!error || typeof error !== "object") return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
};

const activateSnapshotInTransaction = async (
  tx: DbClient,
  callerId: string,
  requestId: string,
  input: PricingReferenceImportActivateInput,
): Promise<PricingReferenceImportActivateResponse> => {
  const importRows = await tx.execute<TargetImportRow>(sql`
    select id, status
    from public.pricing_reference_imports
    where id = ${input.import_id}
    for update
  `);
  const importRow = importRows[0];
  if (!importRow) {
    throw httpError(
      404,
      "PRICING_REFERENCE_IMPORT_NOT_FOUND",
      "Import referentiel introuvable.",
    );
  }

  if (importRow.status !== "analyse_ok") {
    throw httpError(
      409,
      "PRICING_REFERENCE_SNAPSHOT_ACTIVATION_BLOCKED",
      "Seul un import analyse sans anomalie bloquante peut etre active.",
    );
  }

  const snapshotRows = await tx.execute<TargetSnapshotRow>(sql`
    select id, is_active
    from public.pricing_reference_snapshots
    where import_id = ${input.import_id}
    for update
  `);
  const snapshot = snapshotRows[0];
  if (!snapshot) {
    throw httpError(
      409,
      "PRICING_REFERENCE_SNAPSHOT_ACTIVATION_BLOCKED",
      "Aucun snapshot analyse n est disponible pour cet import.",
    );
  }

  if (snapshot.is_active) {
    throw httpError(
      409,
      "PRICING_REFERENCE_SNAPSHOT_ALREADY_ACTIVE",
      "Cette version referentiel est deja active.",
    );
  }

  const activeRows = await tx.execute<ActiveSnapshotRow>(sql`
    select id
    from public.pricing_reference_snapshots
    where is_active = true
    order by activated_at desc nulls last, created_at desc
    limit 1
    for update
  `);
  const activeSnapshot = activeRows[0] ?? null;
  let previousSnapshot: ArchivedSnapshotRow | null = null;

  if (activeSnapshot) {
    const previousRows = await tx.execute<ArchivedSnapshotRow>(sql`
      update public.pricing_reference_snapshots
      set
        is_active = false,
        status = 'archive',
        deactivated_at = now(),
        updated_at = now()
      where id = ${activeSnapshot.id}
      returning id, deactivated_at
    `);
    previousSnapshot = previousRows[0] ?? null;
  }

  const activatedRows = await tx.execute<ActivatedSnapshotRow>(sql`
    update public.pricing_reference_snapshots
    set
      is_active = true,
      status = 'actif',
      activated_at = now(),
      activated_by = ${callerId},
      deactivated_at = null,
      updated_at = now()
    where id = ${snapshot.id}
    returning id, activated_at
  `);
  const activated = activatedRows[0];
  if (!activated) {
    throw httpError(
      500,
      "DB_WRITE_FAILED",
      "Impossible d activer la version referentiel.",
    );
  }

  return pricingReferenceImportActivateResponseSchema.parse({
    ok: true,
    request_id: requestId,
    import_id: input.import_id,
    snapshot_id: activated.id,
    activated_at: activated.activated_at,
    previous_snapshot_id: previousSnapshot?.id ?? null,
    previous_deactivated_at: previousSnapshot?.deactivated_at ?? null,
  });
};

const toDbWriteError = (error: unknown) => {
  if (isHttpError(error)) return error;
  if (readErrorCode(error) === "23505") {
    return httpError(
      409,
      "PRICING_REFERENCE_SNAPSHOT_ACTIVATION_BLOCKED",
      "Une autre version referentiel est deja active. Rechargez puis reessayez.",
    );
  }

  return httpError(
    500,
    "DB_WRITE_FAILED",
    "Impossible d activer la version referentiel.",
    error instanceof Error ? error.message : undefined,
  );
};

export const activatePricingReferenceSnapshot = async (
  db: DbClient,
  callerId: string,
  requestId: string,
  input: PricingReferenceImportActivateInput,
  options: ActivationOptions = {},
): Promise<PricingReferenceImportActivateResponse> => {
  const checkRateLimitFn = options.checkRateLimitFn ?? checkRateLimit;
  const allowed = await checkRateLimitFn(
    "pricing-reference-imports:activate",
    callerId,
    {
      max: 10,
      windowSeconds: 300,
    },
  );
  if (!allowed) {
    throw httpError(
      429,
      "RATE_LIMITED",
      "Trop de requetes. Reessayez plus tard.",
    );
  }

  try {
    return await withTransaction(
      db,
      (tx) => activateSnapshotInTransaction(tx, callerId, requestId, input),
    );
  } catch (error) {
    throw toDbWriteError(error);
  }
};
