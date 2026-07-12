import { ChevronDown, Database } from 'lucide-react';

import type { AssistantChatMessage } from '../../hooks/useAssistantChat';

interface AssistantSourcesProps {
  message: AssistantChatMessage;
}

export const AssistantSources = ({ message }: AssistantSourcesProps) => {
  if (message.toolTrace.length === 0 && message.citations.length === 0) return null;

  return (
    <details className="group mt-2 border-t border-border-subtle pt-2">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-sm text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45">
        <Database className="size-3" aria-hidden="true" />
        Sources
        <span className="font-mono tabular-nums">
          {message.toolTrace.length || message.citations.length}
        </span>
        <ChevronDown className="ml-auto size-3 transition-transform duration-150 group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="mt-2 space-y-1.5">
        {message.toolTrace.map((trace, index) => (
          <div
            key={`${trace.name}-${index}`}
            className="flex items-center gap-2 rounded-md border border-border-subtle bg-surface-1 px-2 py-1.5 text-[11px]"
          >
            <span className={trace.ok ? 'size-1.5 rounded-full bg-success' : 'size-1.5 rounded-full bg-destructive'} aria-hidden="true" />
            <span className="min-w-0 truncate font-mono text-foreground">{trace.name}</span>
            <span className="ml-auto shrink-0 font-mono tabular-nums text-muted-foreground">
              {trace.row_count === null ? 'synthèse' : `${trace.row_count} lignes`} · {trace.duration_ms} ms
            </span>
          </div>
        ))}
        {message.citations.map((citation, index) => (
          <div key={`${citation.tool}-${index}`} className="truncate px-2 text-[11px] text-muted-foreground">
            {citation.label}
          </div>
        ))}
      </div>
    </details>
  );
};
