import { useMemo } from 'react';
import { CheckCircle2, FileDiff } from 'lucide-react';
import { calculateLineDiff } from './calculateLineDiff';

type AiPromptDiffViewerProps = {
  originalText: string;
  modifiedText: string;
  originalLabel?: string;
  modifiedLabel?: string;
};

export const AiPromptDiffViewer = ({
  originalText,
  modifiedText,
  originalLabel = 'Version publiée',
  modifiedLabel = 'Brouillon',
}: AiPromptDiffViewerProps) => {
  const diff = useMemo(
    () => calculateLineDiff(originalText, modifiedText),
    [originalText, modifiedText],
  );

  return (
    <div className="space-y-3" data-testid="ai-prompt-diff-viewer">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <FileDiff className="size-4 shrink-0" aria-hidden="true" />
          <span>
            Comparaison : <strong className="font-semibold text-foreground">{originalLabel}</strong> →{' '}
            <strong className="font-semibold text-foreground">{modifiedLabel}</strong>
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] tabular-nums">
          <span className="text-success-foreground font-semibold">
            +{diff.additionsCount} {diff.additionsCount > 1 ? 'ajouts' : 'ajout'}
          </span>
          <span className="text-destructive font-semibold">
            -{diff.deletionsCount} {diff.deletionsCount > 1 ? 'suppressions' : 'suppression'}
          </span>
        </div>
      </div>

      {diff.isIdentical ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface-1 p-4 text-xs text-muted-foreground">
          <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
          <span>Le brouillon est identique à la version publiée. Aucune modification détectée.</span>
        </div>
      ) : (
        <div className="max-h-[50dvh] overflow-y-auto rounded-md border border-border bg-surface-1/40 font-mono text-xs leading-5">
          <table className="w-full border-collapse">
            <tbody>
              {diff.lines.map((line, idx) => {
                const isAdd = line.type === 'add';
                const isDelete = line.type === 'delete';
                return (
                  <tr
                    key={idx}
                    className={
                      isAdd
                        ? 'border-l-2 border-success bg-success/10 text-foreground'
                        : isDelete
                          ? 'border-l-2 border-destructive bg-destructive/10 text-foreground'
                          : 'border-l-2 border-transparent hover:bg-surface-2/40'
                    }
                  >
                    <td className="w-10 select-none border-r border-border/50 px-2 py-0.5 text-right font-mono text-[11px] tabular-nums text-muted-foreground/70">
                      {line.originalLineNumber ?? ''}
                    </td>
                    <td className="w-10 select-none border-r border-border/50 px-2 py-0.5 text-right font-mono text-[11px] tabular-nums text-muted-foreground/70">
                      {line.modifiedLineNumber ?? ''}
                    </td>
                    <td className="w-6 select-none px-1 py-0.5 text-center font-mono text-xs font-semibold text-muted-foreground">
                      {isAdd ? '+' : isDelete ? '-' : ' '}
                    </td>
                    <td className="px-2 py-0.5 whitespace-pre-wrap break-all font-mono text-xs">
                      {line.content || '\u00A0'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
