import { AlertTriangle, Check, ChevronDown, Database } from 'lucide-react';

import type { AssistantChatMessage } from '../../hooks/useAssistantChat';

interface AssistantSourcesProps {
  message: AssistantChatMessage;
}

const TOOL_LABELS: Record<string, string> = {
  aggregate_segments: 'Comptage des catégories fabricant',
  aggregate_diffs: 'Synthèse des évolutions',
  describe_database_tables: 'Structure des données',
  execute_readonly_sql: 'Lecture des données',
  get_anomalies_summary: 'Synthèse des anomalies',
  get_database_catalog: 'Catalogue des données',
  get_diff_summary: 'Résumé des changements',
  get_health_report: 'État du référentiel',
  get_import_details: "Détail de l'import",
  list_anomalies: 'Liste des anomalies',
  list_diffs: 'Détail des changements',
  list_imports: 'Historique des imports'
};

const getToolLabel = (name: string): string => TOOL_LABELS[name] ?? name.replaceAll('_', ' ');

const getTraceDiagnostic = (name: string, args: Record<string, unknown>) => {
  if (name === 'aggregate_segments') {
    const marques = Array.isArray(args.marques)
      ? args.marques.filter((value): value is string => typeof value === 'string').join(', ')
      : '';
    return (
      <div className="mt-1 font-mono text-[10px] leading-relaxed text-muted-foreground">
        Métrique : CAT_FAB distincts · Filtre marque : {marques || 'aucun'}
      </div>
    );
  }
  if (name === 'execute_readonly_sql' && typeof args.sql === 'string') {
    return (
      <details className="mt-1">
        <summary className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground">
          Voir la requête exécutée
        </summary>
        <code className="mt-1 block max-h-28 overflow-auto whitespace-pre-wrap break-words rounded-sm bg-surface-2 p-1.5 text-[10px] leading-relaxed text-foreground">
          {args.sql}
        </code>
      </details>
    );
  }
  return null;
};

export const AssistantSources = ({ message }: AssistantSourcesProps) => {
  if (message.toolTrace.length === 0 && message.citations.length === 0) return null;

  const successfulTraces = message.toolTrace.filter((trace) => trace.ok);
  const failedTraces = message.toolTrace.filter((trace) => !trace.ok);
  const evidenceCount = successfulTraces.length || message.citations.length;

  return (
    <details className="group mt-2 border-t border-border-subtle pt-2">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-sm text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45">
        <Database className="size-3" aria-hidden="true" />
        Données consultées
        <span className="font-mono tabular-nums">{evidenceCount}</span>
        {failedTraces.length > 0 ? (
          <span className="ml-1 inline-flex items-center gap-1 text-warning">
            <AlertTriangle className="size-3" aria-hidden="true" />
            analyse incomplète
          </span>
        ) : null}
        <ChevronDown className="ml-auto size-3 transition-transform duration-150 group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="mt-2 space-y-1.5">
        {message.toolTrace.map((trace, index) => (
          <div
            key={`${trace.name}-${index}`}
            className="rounded-md border border-border-subtle bg-surface-1 px-2 py-1.5 text-[11px]"
          >
            <div className="flex items-center gap-2">
              {trace.ok ? (
                <Check className="size-3 shrink-0 text-success" aria-hidden="true" />
              ) : (
                <AlertTriangle className="size-3 shrink-0 text-warning" aria-hidden="true" />
              )}
              <span className="min-w-0 truncate text-foreground">{getToolLabel(trace.name)}</span>
              {!trace.ok ? <span className="shrink-0 text-warning">échec</span> : null}
              <span className="ml-auto shrink-0 font-mono tabular-nums text-muted-foreground">
                {trace.row_count === null ? 'synthèse' : `${trace.row_count} lignes`} · {trace.duration_ms} ms
              </span>
            </div>
            {getTraceDiagnostic(trace.name, trace.arguments)}
          </div>
        ))}
        {message.toolTrace.length === 0
          ? message.citations.map((citation, index) => (
            <div key={`${citation.tool}-${index}`} className="flex items-center gap-2 px-2 text-[11px] text-muted-foreground">
              <Check className="size-3 shrink-0 text-success" aria-hidden="true" />
              <span className="truncate">{getToolLabel(citation.tool)}</span>
            </div>
          ))
          : null}
      </div>
    </details>
  );
};
