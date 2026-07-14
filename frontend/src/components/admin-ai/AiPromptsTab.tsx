import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  ArchiveRestore,
  Coins,
  FileText,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  Zap,
} from 'lucide-react';

import type { AiPromptWithVersions } from '../../../../shared/schemas/ai.schema';
import { AiPromptEditorDialog } from './AiPromptEditorDialog';
import { AiPromptLifecycleDialogs } from './AiPromptLifecycleDialogs';
import {
  featureLabels,
  featureSurfaces,
  formatCost,
  formatDate,
  formatNumber,
  protectedPromptFeatures,
  SectionState,
} from './aiAdminUi';
import { Badge } from '@/components/ui/data-display/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/data-display/Table';
import { Skeleton } from '@/components/ui/feedback/Skeleton';
import { Button } from '@/components/ui/inputs/basic/Button';
import { Input } from '@/components/ui/inputs/basic/Input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/navigation/DropdownMenu';
import {
  deleteAiPromptTemplate,
  listAiPrompts,
  publishAiPrompt,
  restoreAiPrompt,
  saveAiPromptDraft,
  setAiPromptTemplateArchived,
} from '@/services/ai';
import { handleUiError } from '@/services/errors/handleUiError';
import { aiPromptsKey } from '@/services/query/queryKeys';

type TemplateFilter = 'available' | 'archived' | 'all';

const PromptTableSkeleton = () => (
  <div className="space-y-2 rounded-md border border-border p-3" role="status" aria-label="Chargement des templates">
    {Array.from({ length: 4 }, (_, index) => (
      <Skeleton key={index} className="h-10 w-full" />
    ))}
  </div>
);

const PromptSummary = ({ prompts }: { prompts: AiPromptWithVersions[] }) => {
  const summary = prompts.reduce(
    (current, prompt) => ({
      available: current.available + (prompt.archived_at ? 0 : 1),
      calls: current.calls + prompt.usage.calls,
      tokens: current.tokens + prompt.usage.total_tokens,
      cost: current.cost + prompt.usage.cost_amount,
    }),
    { available: 0, calls: 0, tokens: 0, cost: 0 },
  );

  const metrics = [
    { label: 'Templates disponibles', value: formatNumber.format(summary.available), icon: FileText },
    { label: 'Appels enregistrés', value: formatNumber.format(summary.calls), icon: Zap },
    { label: 'Tokens consommés', value: formatNumber.format(summary.tokens), icon: Search },
    { label: 'Coût total', value: formatCost.format(summary.cost), icon: Coins },
  ] as const;

  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-border border-y border-border md:grid-cols-4 md:divide-y-0">
      {metrics.map(({ label, value, icon: Icon }) => (
        <div key={label} className="flex items-center gap-3 px-3 py-3 first:pl-0 md:px-4">
          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-[11px] text-muted-foreground">{label}</p>
            <p className="mt-0.5 truncate font-mono text-sm font-semibold tabular-nums" title={value}>{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export const AiPromptsTab = () => {
  const client = useQueryClient();
  const query = useQuery({ queryKey: aiPromptsKey(), queryFn: () => listAiPrompts() });
  const [filter, setFilter] = useState<TemplateFilter>('available');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<AiPromptWithVersions | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AiPromptWithVersions | null>(null);

  const refresh = async () => {
    await client.invalidateQueries({ queryKey: aiPromptsKey() });
  };
  const mutationError = (error: unknown, fallback: string) => {
    handleUiError(error, fallback);
  };
  const saveDraft = useMutation({
    mutationFn: saveAiPromptDraft,
    onSuccess: refresh,
    onError: (error) => mutationError(error, 'Impossible d’enregistrer le brouillon.'),
  });
  const publish = useMutation({
    mutationFn: publishAiPrompt,
    onSuccess: refresh,
    onError: (error) => mutationError(error, 'Impossible de publier le prompt.'),
  });
  const restoreVersion = useMutation({
    mutationFn: restoreAiPrompt,
    onSuccess: refresh,
    onError: (error) => mutationError(error, 'Impossible de restaurer cette version.'),
  });
  const setArchived = useMutation({
    mutationFn: setAiPromptTemplateArchived,
    onSuccess: async () => {
      setArchiveTarget(null);
      await refresh();
    },
    onError: (error) => mutationError(error, 'Impossible de modifier l’état du template.'),
  });
  const remove = useMutation({
    mutationFn: deleteAiPromptTemplate,
    onSuccess: async () => {
      setDeleteTarget(null);
      setSelectedId(null);
      await refresh();
    },
    onError: (error) => mutationError(error, 'Impossible de supprimer le template.'),
  });

  const prompts = useMemo(() => query.data?.prompts ?? [], [query.data?.prompts]);
  const selected = prompts.find((prompt) => prompt.id === selectedId) ?? null;
  const normalizedSearch = search.trim().toLocaleLowerCase('fr-FR');
  const filteredPrompts = useMemo(
    () => prompts.filter((prompt) => {
      const matchesFilter = filter === 'all' ||
        (filter === 'archived' ? prompt.archived_at !== null : prompt.archived_at === null);
      const matchesSearch = normalizedSearch.length === 0 ||
        `${prompt.label} ${featureLabels[prompt.feature]} ${featureSurfaces[prompt.feature]}`
          .toLocaleLowerCase('fr-FR')
          .includes(normalizedSearch);
      return matchesFilter && matchesSearch;
    }),
    [filter, normalizedSearch, prompts],
  );

  if (query.isPending) return <PromptTableSkeleton />;
  if (query.isError) {
    return (
      <SectionState>
        <p>Les templates de prompts n’ont pas pu être chargés.</p>
        <Button className="mt-3" variant="outline" onClick={() => void query.refetch()}>Réessayer</Button>
      </SectionState>
    );
  }
  if (prompts.length === 0) return <SectionState>Aucun template de prompt n’est configuré.</SectionState>;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Templates et consommation</h3>
          <p className="mt-1 max-w-[72ch] text-xs text-muted-foreground">
            Identifiez où chaque prompt est utilisé, suivez son coût et gérez son cycle de vie sans perdre l’audit.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label="Rechercher un template"
            className="pl-8"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un template"
          />
        </div>
      </header>

      <PromptSummary prompts={prompts} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center rounded-md border border-border bg-surface-1 p-0.5" aria-label="Filtrer les templates">
          {([
            ['available', 'Disponibles'],
            ['archived', 'Archivés'],
            ['all', 'Tous'],
          ] as const).map(([value, label]) => (
            <Button
              key={value}
              size="dataRow"
              variant={filter === value ? 'secondary' : 'ghost'}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {formatNumber.format(filteredPrompts.length)} sur {formatNumber.format(prompts.length)} templates
        </p>
      </div>

      {filteredPrompts.length === 0 ? (
        <SectionState>Aucun template ne correspond à ces filtres.</SectionState>
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-background">
          <Table className="min-w-[980px]">
            <TableHeader className="bg-surface-1/80">
              <TableRow>
                <TableHead className="w-[34%]">Template et utilisation</TableHead>
                <TableHead>État</TableHead>
                <TableHead className="text-right">Appels</TableHead>
                <TableHead className="text-right">30 jours</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead className="text-right">Coût</TableHead>
                <TableHead>Dernier usage</TableHead>
                <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPrompts.map((prompt) => {
                const isArchived = prompt.archived_at !== null;
                const isProtected = protectedPromptFeatures.has(prompt.feature);
                const canDelete = isArchived && prompt.usage.calls === 0 && !isProtected;
                return (
                  <TableRow key={prompt.id} className={isArchived ? 'opacity-65' : undefined}>
                    <TableCell>
                      <button className="group block w-full text-left" onClick={() => setSelectedId(prompt.id)}>
                        <span className="font-semibold text-foreground group-hover:text-primary">{prompt.label}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground" title={featureSurfaces[prompt.feature]}>
                          {featureLabels[prompt.feature]} · {featureSurfaces[prompt.feature]}
                        </span>
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={isArchived ? 'secondary' : 'success'}>
                          {isArchived ? 'Archivé' : 'Disponible'}
                        </Badge>
                        {prompt.usage.calls_last_30_days > 0 ? <Badge variant="outline">Utilisé</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatNumber.format(prompt.usage.calls)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatNumber.format(prompt.usage.calls_last_30_days)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatNumber.format(prompt.usage.total_tokens)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatCost.format(prompt.usage.cost_amount)}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(prompt.usage.last_used_at)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" aria-label={`Actions pour ${prompt.label}`}>
                            <MoreHorizontal aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel className="text-xs text-muted-foreground">Gestion du template</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setSelectedId(prompt.id)}>
                            <Pencil aria-hidden="true" />
                            Consulter et modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={isProtected}
                            onClick={() => setArchiveTarget(prompt)}
                          >
                            {isArchived ? <ArchiveRestore aria-hidden="true" /> : <Archive aria-hidden="true" />}
                            {isArchived ? 'Restaurer' : 'Archiver'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            disabled={!canDelete}
                            onClick={() => setDeleteTarget(prompt)}
                          >
                            <Trash2 aria-hidden="true" />
                            Supprimer définitivement
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {selected ? (
        <AiPromptEditorDialog
          key={selected.id}
          template={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelectedId(null);
          }}
          onSave={(body, changeNote) => {
            saveDraft.mutate({ template_id: selected.id, body, change_note: changeNote });
          }}
          onPublish={() => {
            if (selected.draft_version) {
              publish.mutate({ version_id: selected.draft_version.id });
            }
          }}
          onRestoreVersion={(versionId) => {
            restoreVersion.mutate({ version_id: versionId });
          }}
          isSaving={saveDraft.isPending}
          isPublishing={publish.isPending}
          isRestoring={restoreVersion.isPending}
        />
      ) : null}

      <AiPromptLifecycleDialogs
        archiveTarget={archiveTarget}
        deleteTarget={deleteTarget}
        onCloseArchive={() => setArchiveTarget(null)}
        onCloseDelete={() => setDeleteTarget(null)}
        onConfirmArchive={() => {
          if (archiveTarget) {
            setArchived.mutate({
              template_id: archiveTarget.id,
              archived: archiveTarget.archived_at === null,
            });
          }
        }}
        onConfirmDelete={() => {
          if (deleteTarget) remove.mutate({ template_id: deleteTarget.id });
        }}
        isArchiving={setArchived.isPending}
        isDeleting={remove.isPending}
      />
    </div>
  );
};
