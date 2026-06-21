import { useMemo, useState } from 'react';
import type { AuditLogEntry } from '@/services/admin/getAuditLogs';
import { ChevronLeft, ChevronRight, FileClock, RefreshCcw } from 'lucide-react';

import { Button } from '../ui/inputs/basic/Button';

type AuditMetadataChange = {
  field: string;
  before: unknown;
  after: unknown;
};

type AuditMetadata = {
  source?: string;
  changes?: AuditMetadataChange[];
  context?: AuditMetadataChange[];
  hasStructuredChanges: boolean;
};

type ClientDirectoryRecordHistoryPanelProps = {
  logs: AuditLogEntry[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
};

const FIELD_LABELS: Record<string, string> = {
  name: 'Nom',
  client_number: 'Numéro client',
  supplier_code: 'Code fournisseur',
  supplier_number: 'N° fournisseur',
  account_type: 'Type de compte',
  agency_id: 'Agence',
  cir_commercial_id: 'Commercial CIR',
  address: 'Adresse',
  postal_code: 'Code postal',
  department: 'Département',
  city: 'Ville',
  siret: 'SIRET',
  siren: 'SIREN',
  naf_code: 'Code NAF',
  official_name: 'Nom officiel',
  official_data_source: 'Source officielle',
  official_data_synced_at: 'Date de synchronisation',
  notes: 'Notes',
  first_name: 'Prénom',
  last_name: 'Nom',
  email: 'Email',
  phone: 'Téléphone',
  position: 'Fonction',
  service_label: 'Service',
  is_primary: 'Contact principal',
  primary_phone: 'Téléphone principal',
  primary_email: 'Email principal'
};

const METADATA_LABELS: Record<string, string> = {
  agency_id: 'Agence liée',
  contact_service: 'Service contact',
  entity_id: 'Identifiant fiche',
  entity_type: 'Type de fiche',
  label: 'Libellé',
  name: 'Nom',
  status: 'Statut',
  status_before: 'Statut avant',
  status_after: 'Statut après'
};

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

const SOURCE_LABELS: Record<string, string> = {
  manual_edit: 'Modification manuelle',
  official_resync: 'Resynchro officielle'
};

const ACTION_LABELS: Record<string, string> = {
  INSERT: 'Création',
  UPDATE: 'Modification',
  DELETE: 'Suppression'
};

const ENTITY_TABLE_LABELS: Record<string, string> = {
  entities: 'Fiche',
  entity_contacts: 'Contact',
  interactions: 'Interaction'
};

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short'
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeDisplayValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim().length > 0 ? value : 'Non renseigné';
  }
  if (typeof value === 'boolean') {
    return value ? 'Oui' : 'Non';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (value == null) {
    return 'Non renseigné';
  }
  return JSON.stringify(value);
};

const toDisplayLabel = (field: string): string =>
  FIELD_LABELS[field] ?? METADATA_LABELS[field] ?? field;

const parseBeforeAfterMetadata = (metadata: Record<string, unknown>): AuditMetadataChange[] => {
  const changes: AuditMetadataChange[] = [];
  Object.keys(metadata)
    .filter((key) => key.endsWith('_before'))
    .forEach((beforeKey) => {
      const field = beforeKey.slice(0, -'_before'.length);
      const afterKey = `${field}_after`;
      changes.push({
        field,
        before: metadata[beforeKey],
        after: metadata[afterKey] ?? null
      });
    });

  Object.keys(metadata)
    .filter((key) => key.endsWith('_after') && metadata[`${key.slice(0, -'_after'.length)}_before`] === undefined)
    .forEach((afterKey) => {
      const field = afterKey.slice(0, -'_after'.length);
      changes.push({
        field,
        before: null,
        after: metadata[afterKey]
      });
    });

  return changes;
};

const parseContextMetadata = (metadata: Record<string, unknown>): AuditMetadataChange[] => {
  const ignoredKeys = new Set(['changes', 'source']);
  return Object.entries(metadata).flatMap(([field, value]): AuditMetadataChange[] => {
    if (ignoredKeys.has(field) || field.endsWith('_before') || field.endsWith('_after')) {
      return [];
    }
    if (value == null) {
      return [];
    }
    if (Array.isArray(value) || isRecord(value)) {
      return [];
    }
    return [{ field, before: null, after: value ?? null }];
  });
};

const parseAuditMetadata = (metadata: unknown): AuditMetadata => {
  if (!isRecord(metadata)) {
    return { hasStructuredChanges: false };
  }

  const source = typeof metadata.source === 'string' ? metadata.source : undefined;
  const hasStructuredChanges = Array.isArray(metadata.changes);
  const changes = Array.isArray(metadata.changes)
    ? metadata.changes.flatMap((entry): AuditMetadataChange[] => {
      if (!isRecord(entry) || typeof entry.field !== 'string') {
        return [];
      }

      return [{
        field: entry.field,
        before: entry.before ?? null,
        after: entry.after ?? null
      }];
    })
    : undefined;

  const parsedChanges = changes && changes.length > 0 ? changes : parseBeforeAfterMetadata(metadata);
  return {
    source,
    changes: parsedChanges.length > 0 ? parsedChanges : undefined,
    context: parseContextMetadata(metadata),
    hasStructuredChanges
  };
};

const getActionLabel = (action: string): string =>
  ACTION_LABELS[action.toUpperCase()] ?? action;

const getEntityTableLabel = (entityTable: string): string =>
  ENTITY_TABLE_LABELS[entityTable] ?? entityTable;

const getMissingDetailsMessage = (metadata: AuditMetadata, action: string): string => {
  if (metadata.hasStructuredChanges) {
    return action.toUpperCase() === 'UPDATE'
      ? 'Aucun champ métier suivi n’a changé sur cet événement.'
      : 'Événement enregistré avec les informations disponibles au moment de l’action.';
  }

  return 'Ancien format d’audit : les valeurs avant/après n’étaient pas encore enregistrées pour cet événement.';
};

const ClientDirectoryRecordHistoryPanel = ({
  logs,
  isLoading,
  isError,
  onRetry
}: ClientDirectoryRecordHistoryPanelProps) => {
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(logs.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safePage - 1) * pageSize;
  const pageEndIndex = Math.min(logs.length, pageStartIndex + pageSize);
  const paginatedLogs = useMemo(
    () => logs.slice(pageStartIndex, pageEndIndex),
    [logs, pageEndIndex, pageStartIndex]
  );

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
            Journal fiche & contacts
          </h3>
          <p className="mt-0.5 text-xs font-medium text-neutral-500">
            {logs.length} événement{logs.length > 1 ? 's' : ''} enregistré{logs.length > 1 ? 's' : ''}
          </p>
        </div>

        {!isLoading && !isError && logs.length > 0 ? (
          <label className="flex items-center gap-2 text-xs font-semibold text-neutral-600">
            Afficher
            <select
              aria-label="Nombre d'événements par page"
              className="h-8 rounded-md border border-neutral-200 bg-white px-2 text-xs font-bold text-neutral-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={pageSize}
              onChange={(event) => {
                const nextPageSize = Number(event.target.value);
                setPageSize(PAGE_SIZE_OPTIONS.includes(nextPageSize as (typeof PAGE_SIZE_OPTIONS)[number])
                  ? nextPageSize as (typeof PAGE_SIZE_OPTIONS)[number]
                  : 10);
                setCurrentPage(1);
              }}
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {isError ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 border-neutral-200 text-xs font-semibold"
            onClick={onRetry}
          >
            <RefreshCcw size={12} strokeWidth={1.5} />
            Réessayer
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-2" aria-busy="true">
          <div className="h-16 rounded-lg border border-neutral-200 bg-neutral-50/80" />
          <div className="h-16 rounded-lg border border-neutral-200 bg-neutral-50/60" />
        </div>
      ) : null}

      {!isLoading && isError ? (
        <div className="rounded-lg border border-destructive/25 bg-destructive/[0.02] p-4 text-xs text-destructive">
          Impossible de charger le journal de cette fiche. Les interactions restent consultables séparément.
        </div>
      ) : null}

      {!isLoading && !isError && logs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50/40 px-4 py-8 text-center text-xs text-neutral-500">
          Aucun événement fiche ou contact enregistré.
        </div>
      ) : null}

      {!isLoading && logs.length > 0 ? (
        <div className="relative space-y-3 before:absolute before:bottom-2 before:left-3 before:top-2 before:w-px before:bg-neutral-200">
          {paginatedLogs.map((log) => {
            const metadata = parseAuditMetadata(log.metadata);
            const actorLabel = log.actor?.display_name ?? log.actor?.email ?? 'Acteur non capturé';
            const actorDetails = [
              log.actor?.email,
              log.actor_is_super_admin ? 'Super admin' : null,
              log.agency?.name,
              !log.actor ? 'actor_id absent dans audit_logs' : null
            ].filter(Boolean).join(' · ');
            let sourceLabel = 'Modification manuelle';
            if (metadata.source) {
              sourceLabel = SOURCE_LABELS[metadata.source] ?? metadata.source;
            }

            return (
              <article key={log.id} className="relative ml-8 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm">
                <span className="absolute -left-[31px] top-3 flex size-6 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 shadow-sm">
                  <FileClock size={12} strokeWidth={1.5} />
                </span>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-900">
                      {getActionLabel(log.action)} · {sourceLabel}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-neutral-500">
                      Par {actorLabel} · {dateTimeFormatter.format(new Date(log.created_at))}
                    </p>
                    {actorDetails ? (
                      <p className="mt-0.5 text-[11px] font-medium text-neutral-400">
                        {actorDetails}
                      </p>
                    ) : null}
                    <p className="mt-0.5 font-mono text-[10px] text-neutral-400">
                      ID audit {log.id}
                    </p>
                  </div>
                  <span className="inline-flex w-fit rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    {getEntityTableLabel(log.entity_table)}
                  </span>
                </div>

                {metadata.changes && metadata.changes.length > 0 ? (
                  <ul className="mt-3 space-y-1.5">
                    {metadata.changes.map((change) => (
                      <li key={`${log.id}-${change.field}`} className="grid gap-1 rounded-md bg-neutral-50/80 px-2 py-1.5 text-xs sm:grid-cols-[120px_1fr]">
                        <span className="font-bold text-neutral-600">
                          {toDisplayLabel(change.field)}
                        </span>
                        <span className="min-w-0 break-words text-neutral-700">
                          {normalizeDisplayValue(change.before)} {'->'} {normalizeDisplayValue(change.after)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-3 space-y-1.5 rounded-md bg-neutral-50/80 px-2 py-1.5 text-xs text-neutral-500">
                    <p>{getMissingDetailsMessage(metadata, log.action)}</p>
                    {metadata.context && metadata.context.length > 0 ? (
                      <p className="font-semibold text-neutral-600">
                        Valeurs connues enregistrées avec l’événement :
                      </p>
                    ) : null}
                    {metadata.context && metadata.context.length > 0 ? (
                      <ul className="grid gap-1 sm:grid-cols-2">
                        {metadata.context.map((entry) => (
                          <li key={`${log.id}-${entry.field}`} className="min-w-0">
                            <span className="font-bold text-neutral-600">{toDisplayLabel(entry.field)} : </span>
                            <span className="break-words">{normalizeDisplayValue(entry.after)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : null}

      {!isLoading && !isError && logs.length > 0 ? (
        <div className="flex flex-col gap-3 border-t border-neutral-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[11px] font-medium text-neutral-500">
            {pageStartIndex + 1}-{pageEndIndex} sur {logs.length} · Page {safePage}/{totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-7 rounded-md border-neutral-200 text-neutral-700"
              aria-label="Page précédente de l'historique"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              <ChevronLeft size={13} strokeWidth={1.5} />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-7 rounded-md border-neutral-200 text-neutral-700"
              aria-label="Page suivante de l'historique"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            >
              <ChevronRight size={13} strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default ClientDirectoryRecordHistoryPanel;
