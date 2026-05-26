import { Inbox, Loader2, TriangleAlert } from 'lucide-react';

import { AuditLogEntry } from '@/services/admin/getAuditLogs';
import { Button } from '../ui/inputs/basic/Button';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/data-display/Table';
import AuditLogsRow from './AuditLogsRow';

type AuditLogsTableProps = {
  logs: AuditLogEntry[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
};

const AuditLogsTable = ({ logs, isLoading, isError, onRetry }: AuditLogsTableProps) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-[0_8px_30px_rgba(0,0,0,0.015)]" data-testid="admin-audit-table">
      {isLoading && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground bg-muted/20">
          <span className="inline-flex flex-col items-center gap-3">
            <Loader2 size={24} className="animate-spin text-primary" />
            <span>Chargement des journaux d&apos;audit...</span>
          </span>
        </div>
      )}

      {isError && !isLoading && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center text-sm text-destructive">
          <p className="inline-flex flex-col items-center gap-2 font-medium">
            <TriangleAlert size={24} className="text-destructive" />
            <span>La liste des journaux d&apos;audit est temporairement indisponible.</span>
          </p>
          <div className="mt-4">
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Réessayer le chargement
            </Button>
          </div>
        </div>
      )}

      {!isLoading && !isError && logs.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground bg-muted/10">
          <span className="inline-flex flex-col items-center gap-2">
            <Inbox size={24} className="text-muted-foreground/60" />
            <span>Aucun journal d&apos;audit trouvé.</span>
          </span>
        </div>
      )}

      {!isLoading && !isError && logs.length > 0 && (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader className="bg-muted/5 border-b border-border/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-3 pl-6 font-semibold text-[10px] tracking-wider uppercase text-muted-foreground/80">Date</TableHead>
                  <TableHead className="py-3 font-semibold text-[10px] tracking-wider uppercase text-muted-foreground/80">Action</TableHead>
                  <TableHead className="py-3 font-semibold text-[10px] tracking-wider uppercase text-muted-foreground/80">Table</TableHead>
                  <TableHead className="py-3 font-semibold text-[10px] tracking-wider uppercase text-muted-foreground/80">Agence</TableHead>
                  <TableHead className="py-3 font-semibold text-[10px] tracking-wider uppercase text-muted-foreground/80">Acteur</TableHead>
                  <TableHead className="py-3 font-semibold text-[10px] tracking-wider uppercase text-muted-foreground/80">Détails / Métadonnées</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <AuditLogsRow key={log.id} log={log} variant="table" />
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-3 p-4 md:hidden bg-muted/5">
            {logs.map((log) => (
              <AuditLogsRow key={log.id} log={log} variant="card" />
            ))}
          </div>
        </>
      )}
      <div className="sr-only" aria-live="polite">
        {isLoading ? 'Chargement des audits.' : `${logs.length} audits affichés.`}
      </div>
    </div>
  );
};

export default AuditLogsTable;
