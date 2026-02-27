import { Inbox, Loader2, TriangleAlert } from 'lucide-react';

import { AuditLogEntry } from '@/services/admin/getAuditLogs';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import AuditLogsRow from './AuditLogsRow';

type AuditLogsTableProps = {
  logs: AuditLogEntry[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
};

const AuditLogsTable = ({ logs, isLoading, isError, onRetry }: AuditLogsTableProps) => {
  return (
    <div className="overflow-hidden rounded-lg border border-border" data-testid="admin-audit-table">
      {isLoading && (
        <div className="p-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Chargement des audits...
          </span>
        </div>
      )}
      {isError && !isLoading && (
        <div className="border-b border-warning/35 bg-warning/15 p-4 text-sm text-warning-foreground">
          <p className="inline-flex items-center gap-2 font-medium">
            <TriangleAlert size={16} /> La liste des audits est indisponible.
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
            Reessayer
          </Button>
        </div>
      )}
      {!isLoading && !isError && logs.length === 0 && (
        <div className="p-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <Inbox size={16} /> Aucun audit.
          </span>
        </div>
      )}
      {!isLoading && !isError && logs.length > 0 && (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Agence</TableHead>
                  <TableHead>Acteur</TableHead>
                  <TableHead>Metadata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <AuditLogsRow key={log.id} log={log} variant="table" />
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-2 p-3 md:hidden">
            {logs.map((log) => (
              <AuditLogsRow key={log.id} log={log} variant="card" />
            ))}
          </div>
        </>
      )}
      <div className="sr-only" aria-live="polite">
        {isLoading ? 'Chargement des audits.' : `${logs.length} audits affiches.`}
      </div>
    </div>
  );
};

export default AuditLogsTable;
