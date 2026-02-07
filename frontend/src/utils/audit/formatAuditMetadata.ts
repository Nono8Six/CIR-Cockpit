import type { AuditLogEntry } from '@/services/admin/getAuditLogs';

export const formatAuditMetadata = (metadata: AuditLogEntry['metadata']) => {
  if (!metadata) return '';
  try {
    return JSON.stringify(metadata);
  } catch {
    return String(metadata);
  }
};
