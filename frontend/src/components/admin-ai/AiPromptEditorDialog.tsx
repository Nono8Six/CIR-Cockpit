import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Braces,
  CheckCircle2,
  Clock3,
  FileDiff,
  FileText,
  History,
  Pencil,
} from 'lucide-react';

import type {
  AiPromptVersion,
  AiPromptWithVersions,
} from '../../../../shared/schemas/ai.schema';
import { Badge } from '@/components/ui/data-display/Badge';
import { Button } from '@/components/ui/inputs/basic/Button';
import { Input } from '@/components/ui/inputs/basic/Input';
import { Textarea } from '@/components/ui/inputs/basic/Textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/feedback/Dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/feedback/AlertDialog';
import {
  featureLabels,
  featureSurfaces,
  formatDate,
  formatNumber,
} from './aiAdminUi';
import { AiPromptDiffViewer } from './diff/AiPromptDiffViewer';

type EditorTab = 'draft' | 'published' | 'diff';

type AiPromptEditorDialogProps = {
  template: AiPromptWithVersions;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (body: string, changeNote: string | null) => void;
  onPublish: () => void;
  onRestoreVersion: (versionId: string) => void;
  isSaving: boolean;
  isPublishing: boolean;
  isRestoring: boolean;
};

/**
 * Extrait les jetons {{nom}} présents dans le corps du prompt.
 */
const extractVariableTokens = (text: string): string[] => {
  const matches = text.match(/\{\{([^}]+)\}\}/g);
  if (!matches) return [];
  const set = new Set<string>();
  for (const match of matches) {
    const varName = match.slice(2, -2).trim();
    if (varName.length > 0) {
      set.add(varName);
    }
  }
  return Array.from(set);
};

const AiPromptEditorDialogContent = ({
  template,
  open,
  onOpenChange,
  onSave,
  onPublish,
  onRestoreVersion,
  isSaving,
  isPublishing,
  isRestoring,
}: AiPromptEditorDialogProps) => {
  const initialBody =
    template.draft_version?.body ?? template.published_version?.body ?? '';
  const initialChangeNote = template.draft_version?.change_note ?? '';

  const [body, setBody] = useState(initialBody);
  const [changeNote, setChangeNote] = useState(initialChangeNote);
  const [activeTab, setActiveTab] = useState<EditorTab>('draft');
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [restoreConfirmVersion, setRestoreConfirmVersion] =
    useState<AiPromptVersion | null>(null);

  const isArchived = template.archived_at !== null;
  const hasUnsavedChanges =
    body !== initialBody || changeNote !== initialChangeNote;

  const allowedVariablesSet = useMemo(
    () => new Set(template.allowed_variables),
    [template.allowed_variables],
  );

  const bodyTokens = useMemo(() => extractVariableTokens(body), [body]);
  const unallowedVariables = useMemo(
    () => bodyTokens.filter((token) => !allowedVariablesSet.has(token)),
    [bodyTokens, allowedVariablesSet],
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92dvh] max-w-5xl overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-6 py-5 pr-14">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle>{template.label}</DialogTitle>
              <Badge variant={isArchived ? 'secondary' : 'success'}>
                {isArchived ? 'Archivé' : 'Disponible'}
              </Badge>
              {template.published_version ? (
                <Badge variant="outline">
                  Version {template.published_version.version} publiée
                </Badge>
              ) : null}
              {template.draft_version ? (
                <Badge variant="warning">
                  Brouillon v{template.draft_version.version}
                </Badge>
              ) : null}
            </div>
            <DialogDescription>
              {featureLabels[template.feature]} · {featureSurfaces[template.feature]}
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_18rem]">
            <section className="space-y-4 p-6">
              <div className="grid grid-cols-3 divide-x divide-border rounded-md border border-border bg-surface-1/60">
                <div className="px-3 py-2.5">
                  <p className="text-[11px] text-muted-foreground">Appels totaux</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                    {formatNumber.format(template.usage.calls)}
                  </p>
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-[11px] text-muted-foreground">30 derniers jours</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                    {formatNumber.format(template.usage.calls_last_30_days)}
                  </p>
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-[11px] text-muted-foreground">Dernier usage</p>
                  <p
                    className="mt-0.5 truncate text-xs font-medium"
                    title={formatDate(template.usage.last_used_at)}
                  >
                    {formatDate(template.usage.last_used_at)}
                  </p>
                </div>
              </div>

              {template.published_version ? (
                <div className="flex items-center gap-1 border-b border-border pb-2">
                  <Button
                    size="dataRow"
                    variant={activeTab === 'draft' ? 'secondary' : 'ghost'}
                    aria-pressed={activeTab === 'draft'}
                    onClick={() => setActiveTab('draft')}
                  >
                    <Pencil className="mr-1.5 size-3.5" aria-hidden="true" />
                    Brouillon
                  </Button>
                  <Button
                    size="dataRow"
                    variant={activeTab === 'published' ? 'secondary' : 'ghost'}
                    aria-pressed={activeTab === 'published'}
                    onClick={() => setActiveTab('published')}
                  >
                    <FileText className="mr-1.5 size-3.5" aria-hidden="true" />
                    Version {template.published_version.version} publiée
                  </Button>
                  <Button
                    size="dataRow"
                    variant={activeTab === 'diff' ? 'secondary' : 'ghost'}
                    aria-pressed={activeTab === 'diff'}
                    onClick={() => setActiveTab('diff')}
                  >
                    <FileDiff className="mr-1.5 size-3.5" aria-hidden="true" />
                    Différences
                  </Button>
                </div>
              ) : null}

              {activeTab === 'draft' && (
                <div className="space-y-4">
                  {unallowedVariables.length > 0 && (
                    <div
                      className="flex items-start gap-2.5 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning-foreground"
                      role="alert"
                    >
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                      <div>
                        <p className="font-semibold">
                          Variables non déclarées dans allowed_variables :
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {unallowedVariables.map((variable) => (
                            <code
                              key={variable}
                              className="rounded bg-warning/20 px-1 py-0.5 font-mono text-[11px] font-semibold"
                            >
                              {`{{${variable}}}`}
                            </code>
                          ))}
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Ces jetons sont absents de la liste des variables autorisées sur ce template.
                        </p>
                      </div>
                    </div>
                  )}

                  <label className="grid gap-1.5 text-xs font-medium text-foreground">
                    Corps du prompt système
                    <Textarea
                      name="prompt_body"
                      className="min-h-[40dvh] resize-y px-3 py-2 font-mono text-xs leading-5"
                      value={body}
                      disabled={isArchived}
                      onChange={(event) => setBody(event.target.value)}
                    />
                    <span className="flex justify-between font-normal text-muted-foreground">
                      <span>Injecté au modèle lors du prochain appel après publication.</span>
                      <span className="font-mono tabular-nums">
                        {formatNumber.format(body.length)} caractères
                      </span>
                    </span>
                  </label>

                  <label className="grid gap-1.5 text-xs font-medium text-foreground">
                    Note de changement
                    <Input
                      name="change_note"
                      value={changeNote}
                      disabled={isArchived}
                      onChange={(event) => setChangeNote(event.target.value)}
                      placeholder="Expliquer précisément la modification"
                    />
                  </label>

                  {isArchived ? (
                    <p className="rounded-md border border-warning/35 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
                      Ce template est archivé. Restaurez-le depuis le tableau pour pouvoir le modifier.
                    </p>
                  ) : null}
                </div>
              )}

              {activeTab === 'published' && template.published_version && (
                <div className="space-y-4" data-testid="published-version-view">
                  <div className="rounded-md border border-border bg-surface-1 p-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">
                        Version {template.published_version.version}
                      </span>
                      <span className="text-muted-foreground">
                        Publiée le {formatDate(template.published_version.published_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {template.published_version.change_note ?? 'Sans note de changement'}
                    </p>
                  </div>

                  <div className="grid gap-1.5 text-xs font-medium text-foreground">
                    <span>Contenu publié</span>
                    <pre className="max-h-[44dvh] overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-surface-1/40 p-3 font-mono text-xs leading-5">
                      {template.published_version.body}
                    </pre>
                    <span className="font-mono text-right text-[11px] tabular-nums text-muted-foreground">
                      {formatNumber.format(template.published_version.body.length)} caractères
                    </span>
                  </div>
                </div>
              )}

              {activeTab === 'diff' && template.published_version && (
                <AiPromptDiffViewer
                  originalText={template.published_version.body}
                  modifiedText={body}
                  originalLabel={`v${template.published_version.version} (publiée)`}
                  modifiedLabel="Brouillon (en cours)"
                />
              )}
            </section>

            <aside className="space-y-5 border-t border-border bg-surface-1/45 p-4 lg:border-l lg:border-t-0">
              <section>
                <div className="mb-2.5 flex items-center gap-2">
                  <Braces className="size-4 text-muted-foreground" aria-hidden="true" />
                  <h3 className="text-xs font-semibold">Variables autorisées</h3>
                </div>
                {template.allowed_variables.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Aucune variable déclarée sur ce template.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap gap-1">
                      {template.allowed_variables.map((variable) => (
                        <span
                          key={variable}
                          className="inline-flex items-center rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground"
                        >
                          {`{{${variable}}}`}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Variables persistées sur le template.
                    </p>
                  </div>
                )}
              </section>

              <section className="border-t border-border pt-4">
                <div className="mb-3 flex items-center gap-2">
                  <History className="size-4 text-muted-foreground" aria-hidden="true" />
                  <h3 className="text-xs font-semibold">Historique des versions</h3>
                </div>
                <div className="space-y-2">
                  {template.versions.map((version) => (
                    <div
                      key={version.id}
                      className="rounded-md border border-border bg-background p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold">Version {version.version}</p>
                          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock3 className="size-3" aria-hidden="true" />
                            {formatDate(version.created_at)}
                          </p>
                        </div>
                        <Badge
                          variant={
                            version.status === 'published'
                              ? 'success'
                              : version.status === 'draft'
                                ? 'warning'
                                : 'secondary'
                          }
                        >
                          {version.status === 'published'
                            ? 'Publiée'
                            : version.status === 'draft'
                              ? 'Brouillon'
                              : 'Archivée'}
                        </Badge>
                      </div>
                      <p className="mt-2 line-clamp-3 text-[11px] leading-4 text-muted-foreground">
                        {version.change_note ?? 'Sans note de changement'}
                      </p>
                      {version.status === 'archived' && !isArchived ? (
                        <Button
                          className="mt-2 w-full"
                          size="dataRow"
                          variant="ghost"
                          disabled={isRestoring}
                          onClick={() => setRestoreConfirmVersion(version)}
                        >
                          <FileText aria-hidden="true" />
                          Restaurer en brouillon
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>

          <DialogFooter className="border-t border-border bg-background px-6 py-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
            <Button
              variant="secondary"
              disabled={isArchived || !body.trim() || !hasUnsavedChanges || isSaving}
              onClick={() => onSave(body, changeNote.trim() || null)}
            >
              Enregistrer le brouillon
            </Button>
            <Button
              disabled={isArchived || !template.draft_version || isPublishing}
              onClick={() => setPublishConfirmOpen(true)}
            >
              <CheckCircle2 aria-hidden="true" />
              Publier le brouillon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de confirmation de publication */}
      <AlertDialog open={publishConfirmOpen} onOpenChange={setPublishConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Publier le brouillon (Version {template.draft_version?.version}) ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette version remplacera la version active{' '}
              {template.published_version
                ? `(Version ${template.published_version.version})`
                : ''}{' '}
              et sera injectée lors des prochains appels de cette capacité par le backend.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {template.draft_version?.change_note ? (
            <div className="rounded-md border border-border bg-surface-1 p-3 text-xs">
              <p className="font-semibold text-foreground">Note de version :</p>
              <p className="mt-1 text-muted-foreground">
                {template.draft_version.change_note}
              </p>
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPublishing}
              onClick={() => {
                setPublishConfirmOpen(false);
                onPublish();
              }}
            >
              Confirmer la publication
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog de confirmation de restauration */}
      <AlertDialog
        open={restoreConfirmVersion !== null}
        onOpenChange={(openState) => {
          if (!openState) setRestoreConfirmVersion(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Restaurer la version {restoreConfirmVersion?.version} en brouillon ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Le contenu de la version {restoreConfirmVersion?.version} écrasera le brouillon
              actuel. Vous pourrez ensuite le modifier avant de le publier.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={isRestoring}
              onClick={() => {
                if (restoreConfirmVersion) {
                  onRestoreVersion(restoreConfirmVersion.id);
                  setRestoreConfirmVersion(null);
                }
              }}
            >
              Restaurer la version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export const AiPromptEditorDialog = (props: AiPromptEditorDialogProps) => {
  const { template } = props;
  const editorRevision = JSON.stringify([
    template.id,
    template.draft_version?.id,
    template.draft_version?.version,
    template.draft_version?.body,
    template.draft_version?.change_note,
    template.published_version?.id,
    template.published_version?.version,
    template.published_version?.body,
  ]);

  return <AiPromptEditorDialogContent key={editorRevision} {...props} />;
};
