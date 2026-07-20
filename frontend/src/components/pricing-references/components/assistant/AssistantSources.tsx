import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronDown,
  Database,
} from "lucide-react";

import type { AssistantChatMessage } from "../../hooks/useAssistantChat";

interface AssistantSourcesProps {
  message: AssistantChatMessage;
}

const TOOL_LABELS: Record<string, string> = {
  aggregate_segments: "Comptage des catégories fabricant",
  check_brand_matches: "Vérification de la marque",
  count_supplier_brands: "Comptage des marques",
  aggregate_diffs: "Synthèse des évolutions",
  describe_database_tables: "Structure des données",
  execute_readonly_sql: "Lecture des données",
  get_anomalies_summary: "Synthèse des anomalies",
  get_database_catalog: "Catalogue des données",
  get_diff_summary: "Résumé des changements",
  get_health_report: "État du référentiel",
  get_import_details: "Détail de l'import",
  list_anomalies: "Liste des anomalies",
  list_diffs: "Détail des changements",
  list_imports: "Historique des imports",
  search_supplier_categories: "Recherche dans les catégories fabricant",
  search_product_candidates: "Recherche des groupes produit candidats",
  submit_product_qualification: "Qualification sémantique du produit",
  request_product_clarification: "Clarification du produit recherché",
};

const getToolLabel = (name: string): string =>
  TOOL_LABELS[name] ?? name.replaceAll("_", " ");

const formatValue = (value: unknown): string =>
  Array.isArray(value)
    ? value.join(", ")
    : typeof value === "boolean"
    ? value ? "Oui" : "Non"
    : String(value);

const STATUS = {
  verified: {
    label: "Résultat vérifié",
    icon: Check,
    className: "text-success",
  },
  qualified: {
    label: "Résultat qualifié",
    icon: Check,
    className: "text-success",
  },
  partial: {
    label: "Analyse partielle",
    icon: AlertTriangle,
    className: "text-warning",
  },
  failed: {
    label: "Échec de vérification",
    icon: AlertCircle,
    className: "text-destructive",
  },
} as const;

export const AssistantSources = ({ message }: AssistantSourcesProps) => {
  const { evidence } = message;
  if (evidence.executions.length === 0 && evidence.facts.length === 0) {
    return null;
  }
  const status = STATUS[evidence.status];
  const StatusIcon = status.icon;

  return (
    <details className="group mt-2 border-t border-border-subtle pt-2">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-sm text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45">
        <Database className="size-3" aria-hidden="true" />
        Preuves et diagnostic
        <span
          className={`ml-1 inline-flex items-center gap-1 ${status.className}`}
          role="status"
        >
          <StatusIcon className="size-3" aria-hidden="true" />
          {status.label}
        </span>
        <ChevronDown
          className="ml-auto size-3 transition-transform duration-150 group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="mt-2 space-y-1.5">
        {evidence.facts.map((fact, index) => (
          <div
            key={`${fact.tool}-${fact.result_field}-${index}`}
            className="rounded-md border border-border-subtle bg-surface-1 px-2 py-1.5 text-[11px]"
          >
            <div className="flex items-center gap-2">
              <Check
                className="size-3 shrink-0 text-success"
                aria-hidden="true"
              />
              <span className="min-w-0 truncate text-foreground">
                {fact.label}
              </span>
              <strong className="ml-auto font-mono font-medium tabular-nums">
                {formatValue(fact.displayed_value)}
              </strong>
            </div>
            <div className="mt-1 break-words text-[10px] text-muted-foreground">
              {getToolLabel(fact.tool)} · snapshot{" "}
              <span className="font-mono">{fact.snapshot_id}</span> · champ{" "}
              <span className="font-mono">{fact.result_field}</span>
              {fact.derivation === "count"
                ? " · dérivation : comptage de la liste source"
                : ""}
            </div>
          </div>
        ))}
        {evidence.executions.map((execution, index) => (
          <div
            key={`${execution.tool}-${index}`}
            className="border-t border-border-subtle px-2 pt-1.5 text-[10px] text-muted-foreground"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium text-foreground">
                {getToolLabel(execution.tool)}
              </span>
              <span>{execution.ok ? "exécuté" : "échec"}</span>
              <span className="font-mono tabular-nums">
                {execution.row_count === null
                  ? "synthèse"
                  : `${execution.row_count} ${
                    execution.row_count > 1 ? "lignes" : "ligne"
                  }`} · {execution.duration_ms} ms
              </span>
              {execution.sql_attempt
                ? <span>Tentative SQL {execution.sql_attempt}</span>
                : null}
            </div>
            {Object.keys(execution.requested_filters).length > 0
              ? (
                <p>
                  Filtres demandés :{" "}
                  {formatValue(Object.values(execution.requested_filters))}
                </p>
              )
              : null}
            {Object.keys(execution.canonical_filters).length > 0
              ? (
                <p>
                  Filtres canoniques :{" "}
                  {formatValue(Object.values(execution.canonical_filters))}
                </p>
              )
              : null}
            {Object.keys(execution.server_filters).length > 0
              ? (
                <p>
                  Filtres serveur :{" "}
                  {formatValue(Object.values(execution.server_filters))}
                </p>
              )
              : null}
            {execution.executed_sql
              ? (
                <details className="mt-1">
                  <summary className="cursor-pointer rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45">
                    Voir le SQL exécuté
                  </summary>
                  <code className="mt-1 block max-h-28 overflow-auto whitespace-pre-wrap break-words rounded-sm bg-surface-2 p-1.5 text-foreground">
                    {execution.executed_sql}
                  </code>
                </details>
              )
              : null}
          </div>
        ))}
      </div>
    </details>
  );
};
