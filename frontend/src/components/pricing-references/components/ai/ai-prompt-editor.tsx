import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileClock, RefreshCw, Save, UploadCloud } from 'lucide-react';

import type { AiPromptWithVersions } from '../../../../../../shared/schemas/ai.schema';

import { Badge } from '@/components/ui/data-display/Badge';
import { Button } from '@/components/ui/inputs/basic/Button';
import { cn } from '@/lib/utils';
import {
  listAiPrompts,
  publishAiPrompt,
  restoreAiPrompt,
  saveAiPromptDraft
} from '@/services/ai';
import { createAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';
import { aiPromptsKey } from '@/services/query/queryKeys';

const formatDate = (value: string | null): string => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
};

const getEditableVersion = (prompt: AiPromptWithVersions | null) =>
  prompt?.draft_version ?? prompt?.published_version ?? null;

interface AiPromptEditorProps {
  feature: 'pricing.references.diagnose.classification' | 'pricing.references.diagnose.segments';
}

/**
 * Premium AI Prompt configuration panel for super-admins.
 * Allows editing system directives, tracking draft status, publishing, and restoring versions.
 */
export const AiPromptEditor = ({ feature }: AiPromptEditorProps) => {
  const queryClient = useQueryClient();
  const [promptBodyOverride, setPromptBodyOverride] = useState<string | null>(null);
  const [changeNote, setChangeNote] = useState('');

  const promptsQuery = useQuery({
    queryKey: aiPromptsKey(feature),
    queryFn: () => listAiPrompts({ feature }),
    staleTime: 30_000
  });

  const prompt = promptsQuery.data?.prompts[0] ?? null;
  const editableVersion = getEditableVersion(prompt);
  const promptBody = promptBodyOverride ?? editableVersion?.body ?? '';
  const publishedVersion = prompt?.published_version ?? null;
  const draftVersion = prompt?.draft_version ?? null;

  const invalidatePrompt = async () => {
    await queryClient.invalidateQueries({ queryKey: aiPromptsKey(feature) });
  };

  const savePromptMutation = useMutation({
    mutationFn: () => {
      if (!prompt) {
        return Promise.reject(
          createAppError({
            code: 'AI_CONFIG_MISSING',
            message: 'Prompt IA introuvable.',
            source: 'client'
          })
        );
      }
      return saveAiPromptDraft({
        template_id: prompt.id,
        body: promptBody,
        change_note: changeNote.trim() || null
      });
    },
    onSuccess: async () => {
      setChangeNote('');
      setPromptBodyOverride(null);
      await invalidatePrompt();
    },
    onError: (error) => handleUiError(error, 'Impossible de sauvegarder le prompt IA.')
  });

  const publishPromptMutation = useMutation({
    mutationFn: () => {
      if (!draftVersion) {
        return Promise.reject(
          createAppError({
            code: 'AI_CONFIG_MISSING',
            message: 'Aucun brouillon IA à publier.',
            source: 'client'
          })
        );
      }
      return publishAiPrompt({ version_id: draftVersion.id });
    },
    onSuccess: invalidatePrompt,
    onError: (error) => handleUiError(error, 'Impossible de publier le prompt IA.')
  });

  const restorePromptMutation = useMutation({
    mutationFn: (versionId: string) => restoreAiPrompt({ version_id: versionId }),
    onSuccess: async () => {
      setPromptBodyOverride(null);
      await invalidatePrompt();
    },
    onError: (error) => handleUiError(error, 'Impossible de restaurer le prompt IA.')
  });

  const versionLabel = useMemo(() => {
    if (!publishedVersion) return 'Aucune version publiée';
    return `v${publishedVersion.version} publiée le ${formatDate(publishedVersion.published_at)}`;
  }, [publishedVersion]);

  return (
    <div
      className="flex flex-col gap-4 border border-border/40 bg-surface-2/15 p-5 rounded-2xl transition-all animate-in fade-in duration-200"
      data-testid="ai-prompt-editor"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/30 pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileClock className="size-4.5 text-primary" aria-hidden="true" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Directives Système IA :{' '}
              {feature === 'pricing.references.diagnose.classification'
                ? 'Classification'
                : 'Segments & Grilles'}
            </h3>
            {draftVersion ? (
              <Badge variant="warning" className="px-1.5 py-0.5 text-[9px] font-semibold leading-none">
                Brouillon en attente
              </Badge>
            ) : (
              <Badge variant="secondary" className="px-1.5 py-0.5 text-[9px] font-semibold leading-none">
                À jour
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-[60ch]">
            Ajustez le comportement de l&apos;intelligence artificielle spécifique à ce volet.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => promptsQuery.refetch()}
          disabled={promptsQuery.isFetching}
          className="h-8 text-xs font-semibold"
        >
          <RefreshCw
            className={cn('size-3.5 mr-1.5', promptsQuery.isFetching && 'animate-spin')}
            aria-hidden="true"
          />
          Actualiser
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-surface-2/30 px-3.5 py-2.5 rounded-lg border border-border/40">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground font-mono">
                Version active
              </p>
              <p className="mt-0.5 text-xs font-semibold text-foreground font-sans">
                {versionLabel}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => savePromptMutation.mutate()}
                disabled={!prompt || !promptBody.trim() || savePromptMutation.isPending}
                className="h-8 text-xs font-semibold active:scale-[0.98] transition-all"
              >
                <Save className="size-3.5 mr-1.5" aria-hidden="true" />
                Sauvegarder
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => publishPromptMutation.mutate()}
                disabled={!draftVersion || publishPromptMutation.isPending}
                className="h-8 text-xs font-semibold active:scale-[0.98] transition-all"
              >
                <UploadCloud className="size-3.5 mr-1.5" aria-hidden="true" />
                Publier
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="pricing-reference-ai-prompt"
              className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
            >
              Directives système (System Instructions)
            </label>
            <textarea
              id="pricing-reference-ai-prompt"
              value={promptBody}
              onChange={(event) => setPromptBodyOverride(event.target.value)}
              rows={10}
              className="w-full resize-y rounded-lg border border-border bg-background p-3 font-mono text-xs leading-relaxed text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary"
              placeholder={
                promptsQuery.isLoading ? 'Chargement du prompt...' : 'Saisir les instructions IA...'
              }
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="pricing-reference-ai-prompt-note"
              className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
            >
              Note de version
            </label>
            <input
              id="pricing-reference-ai-prompt-note"
              value={changeNote}
              onChange={(event) => setChangeNote(event.target.value)}
              placeholder="Description concise des modifications apportées..."
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary"
            />
          </div>
        </div>

        <aside className="flex flex-col gap-3 border border-border/40 bg-surface-2/30 p-4 rounded-xl">
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Historique des versions
            </h4>
            <p className="mt-0.5 text-[10px] text-muted-foreground leading-normal">
              Sélectionnez une version pour charger ses directives.
            </p>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[290px] pr-1">
            {(prompt?.versions ?? []).slice(0, 8).map((version) => (
              <button
                key={version.id}
                type="button"
                onClick={() => restorePromptMutation.mutate(version.id)}
                disabled={restorePromptMutation.isPending}
                className="w-full border border-border/50 bg-background px-3 py-2.5 text-left rounded-lg transition-all hover:border-primary/40 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs text-foreground">v{version.version}</span>
                  {version.status === 'published' ? (
                    <span className="text-[9px] text-success font-semibold px-1.5 py-0.2 bg-success/15 rounded border border-success/20">
                      Publiée
                    </span>
                  ) : (
                    <Badge variant="secondary" className="px-1 py-0 text-[9px] font-medium leading-none">
                      {version.status}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-[9px] text-muted-foreground font-mono">
                  {formatDate(version.created_at)}
                </p>
                <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground leading-relaxed">
                  {version.change_note ?? 'Sans note'}
                </p>
              </button>
            ))}
            {prompt && prompt.versions.length === 0 ? (
              <p className="border border-dashed border-border/60 rounded-lg px-3 py-5 text-center text-xs text-muted-foreground">
                Aucune version enregistrée.
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
};
