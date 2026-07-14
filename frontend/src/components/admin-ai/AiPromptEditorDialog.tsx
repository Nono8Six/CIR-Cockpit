import { useState } from 'react';
import { CheckCircle2, Clock3, FileText, History } from 'lucide-react';

import type { AiPromptWithVersions } from '../../../../shared/schemas/ai.schema';
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
  featureLabels,
  featureSurfaces,
  formatDate,
  formatNumber,
} from './aiAdminUi';

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

export const AiPromptEditorDialog = ({
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
  const initialBody = template.draft_version?.body ??
    template.published_version?.body ?? '';
  const [body, setBody] = useState(initialBody);
  const [changeNote, setChangeNote] = useState('');
  const isArchived = template.archived_at !== null;
  const hasUnsavedChanges = body !== initialBody || changeNote.trim().length > 0;

  return (
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
          </div>
          <DialogDescription>
            {featureLabels[template.feature]} · {featureSurfaces[template.feature]}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_17rem]">
          <section className="space-y-4 p-6">
            <div className="grid grid-cols-3 divide-x divide-border rounded-md border border-border bg-surface-1/60">
              <div className="px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">Appels</p>
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
                <p className="mt-0.5 truncate text-xs font-medium" title={formatDate(template.usage.last_used_at)}>
                  {formatDate(template.usage.last_used_at)}
                </p>
              </div>
            </div>

            <label className="grid gap-1.5 text-xs font-medium text-foreground">
              Corps du prompt système
              <Textarea
                name="prompt_body"
                className="min-h-[44dvh] resize-y px-3 py-2 font-mono text-xs leading-5"
                value={body}
                disabled={isArchived}
                onChange={(event) => setBody(event.target.value)}
              />
              <span className="flex justify-between font-normal text-muted-foreground">
                <span>Injecté au modèle lors du prochain appel après publication.</span>
                <span className="font-mono tabular-nums">{formatNumber.format(body.length)} caractères</span>
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
          </section>

          <aside className="border-t border-border bg-surface-1/45 p-4 lg:border-l lg:border-t-0">
            <div className="mb-3 flex items-center gap-2">
              <History className="size-4 text-muted-foreground" aria-hidden="true" />
              <h3 className="text-xs font-semibold">Historique des versions</h3>
            </div>
            <div className="space-y-2">
              {template.versions.map((version) => (
                <div key={version.id} className="rounded-md border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold">Version {version.version}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock3 className="size-3" aria-hidden="true" />
                        {formatDate(version.created_at)}
                      </p>
                    </div>
                    <Badge
                      variant={version.status === 'published' ? 'success' : version.status === 'draft' ? 'warning' : 'secondary'}
                    >
                      {version.status === 'published' ? 'Publiée' : version.status === 'draft' ? 'Brouillon' : 'Archivée'}
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
                      onClick={() => onRestoreVersion(version.id)}
                    >
                      <FileText aria-hidden="true" />
                      Restaurer en brouillon
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </aside>
        </div>

        <DialogFooter className="border-t border-border bg-background px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Button
            variant="secondary"
            disabled={isArchived || !body.trim() || !hasUnsavedChanges || isSaving}
            onClick={() => onSave(body, changeNote.trim() || null)}
          >
            Enregistrer le brouillon
          </Button>
          <Button
            disabled={isArchived || !template.draft_version || isPublishing}
            onClick={onPublish}
          >
            <CheckCircle2 aria-hidden="true" />
            Publier le brouillon
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
