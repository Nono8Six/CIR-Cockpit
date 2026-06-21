import type { AuditLogEntry } from '@/services/admin/getAuditLogs';

type AuditMetadataChange = {
  field: string;
  before: unknown;
  after: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const formatValue = (value: unknown): string => {
  if (typeof value === 'string') return value.trim() || 'Non renseigné';
  if (value === null || value === undefined) return 'Non renseigné';
  return String(value);
};

const parseChanges = (metadata: unknown): AuditMetadataChange[] => {
  if (!isRecord(metadata) || !Array.isArray(metadata.changes)) {
    return [];
  }

  return metadata.changes.flatMap((entry): AuditMetadataChange[] => {
    if (!isRecord(entry) || typeof entry.field !== 'string') {
      return [];
    }

    return [{
      field: entry.field,
      before: entry.before,
      after: entry.after
    }];
  });
};

export const formatAuditMetadata = (metadata: AuditLogEntry['metadata']) => {
  if (!metadata) return '';
  const changes = parseChanges(metadata);
  if (changes.length > 0) {
    return changes
      .map((change) => `${change.field}: ${formatValue(change.before)} -> ${formatValue(change.after)}`)
      .join(' | ');
  }

  try {
    return JSON.stringify(metadata);
  } catch {
    return String(metadata);
  }
};
