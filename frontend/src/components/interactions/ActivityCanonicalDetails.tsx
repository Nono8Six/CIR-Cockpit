import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useContext, useState } from 'react';

import { Button } from '@/components/ui/inputs/basic/Button';
import { Input } from '@/components/ui/inputs/basic/Input';
import { Textarea } from '@/components/ui/inputs/basic/Textarea';
import { correctActivityV2 } from '@/services/interactions/correctActivityV2';
import { getActivityV2 } from '@/services/interactions/getActivityV2';
import { normalizeError } from '@/services/errors/normalizeError';
import { interactionsRootKey } from '@/services/query/queryKeys';
import TaskContextPanel from '@/components/tasks/TaskContextPanel';
import { AppSessionStateContext } from '@/components/AppSessionProvider';

const queryKey = (legacyId: string) => ['activity-v2', legacyId] as const;

type Props = { legacyInteractionId: string };

const ActivityCanonicalDetails = ({ legacyInteractionId }: Props) => {
  const session = useContext(AppSessionStateContext);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKey(legacyInteractionId),
    queryFn: () => getActivityV2(legacyInteractionId),
  });
  const [subjectOverride, setSubjectOverride] = useState<string | null>(null);
  const [reportOverride, setReportOverride] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const correction = useMutation({
    mutationFn: async () => {
      if (!query.data) return null;
      const changes: { subject?: string; report?: string | null } = {};
      const subject = subjectOverride ?? query.data.subject;
      const report = reportOverride ?? (query.data.report ?? '');
      if (subject.trim() !== query.data.subject) changes.subject = subject.trim();
      if (report.trim() !== (query.data.report ?? '')) changes.report = report.trim() || null;
      return correctActivityV2({
        legacy_interaction_id: legacyInteractionId,
        expected_version: query.data.version,
        reason,
        changes,
      });
    },
    onSuccess: (activity) => {
      if (!activity) return;
      queryClient.setQueryData(queryKey(legacyInteractionId), activity);
      void queryClient.invalidateQueries({ queryKey: interactionsRootKey() });
      setReason('');
      setSubjectOverride(null);
      setReportOverride(null);
      setErrorMessage(null);
    },
    onError: (error) => setErrorMessage(normalizeError(error, "Correction impossible.").message),
  });

  if (query.isPending) {
    return <div role="status" className="border-b border-border px-5 py-3 text-sm text-muted-foreground">Chargement de l’activité…</div>;
  }
  if (query.isError || !query.data) {
    return (
      <div role="alert" className="flex items-center justify-between gap-3 border-b border-border px-5 py-3 text-sm">
        <span>Le détail canonique de l’activité est indisponible.</span>
        <Button type="button" variant="outline" size="sm" onClick={() => void query.refetch()}>Réessayer</Button>
      </div>
    );
  }

  const activity = query.data;
  const subject = subjectOverride ?? activity.subject;
  const report = reportOverride ?? (activity.report ?? '');
  const hasChanges = subject.trim() !== activity.subject || report.trim() !== (activity.report ?? '');

  return (
    <section aria-label="Données canoniques de l’activité" className="space-y-3 border-b border-border bg-muted/20 px-5 py-4">
      <div className="grid gap-3 text-xs sm:grid-cols-3">
        <div><span className="text-muted-foreground">Cycle</span><div className="font-medium">{activity.lifecycle_status}</div></div>
        <div><span className="text-muted-foreground">Participants</span><div className="font-medium">{activity.participants.length}</div></div>
        <div><span className="text-muted-foreground">Source</span><div className="font-medium">{activity.sources[0]?.source_label ?? activity.sources[0]?.source_type ?? 'Non renseignée'}</div></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input aria-label="Objet de l’activité" value={subject} onChange={(event) => setSubjectOverride(event.target.value)} />
        <Input aria-label="Motif de correction" placeholder="Motif de correction" value={reason} onChange={(event) => setReason(event.target.value)} />
      </div>
      <Textarea aria-label="Compte rendu de l’activité" value={report} onChange={(event) => setReportOverride(event.target.value)} />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {activity.history.length} événement(s) · {activity.corrections.length} correction(s) · {activity.attachments.length} pièce(s) jointe(s)
        </p>
        <Button
          type="button"
          size="sm"
          disabled={!hasChanges || !reason.trim() || correction.isPending}
          onClick={() => { setErrorMessage(null); correction.mutate(); }}
        >
          {correction.isPending ? 'Correction…' : 'Corriger'}
        </Button>
      </div>
      {errorMessage ? <p role="alert" className="text-xs text-destructive">{errorMessage} Rechargez l’activité puis réessayez.</p> : null}
      <details className="text-xs">
        <summary className="cursor-pointer font-medium">Participants et sources</summary>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div>
            <div className="font-medium text-foreground">Participants</div>
            <ul className="mt-1 space-y-1 text-muted-foreground">
              {activity.participants.map((participant) => (
                <li key={participant.id}>
                  {participant.participant_role} · {participant.participant_kind === 'internal' ? 'interne' : 'externe'}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-medium text-foreground">Sources</div>
            <ul className="mt-1 space-y-1 text-muted-foreground">
              {activity.sources.map((source) => (
                <li key={source.id}>
                  {source.source_label ?? source.source_type} · {source.source_reference}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </details>
      {session?.activeAgencyId && session.session ? <div className="border-t border-border pt-3">
        <TaskContextPanel
          agencyId={activity.agency_id}
          userId={session.session.user.id}
          userRole={session.profile?.role ?? 'tcs'}
          organizationId={activity.organization_id ?? undefined}
          contactId={activity.contact_id ?? undefined}
          activityId={activity.id}
          context={{ organizationId: activity.organization_id ?? undefined, contactId: activity.contact_id ?? undefined, activityId: activity.id, contextLabel: activity.subject }}
        />
      </div> : null}
      <details className="text-xs">
        <summary className="cursor-pointer font-medium">Historique de l’activité</summary>
        <ol className="mt-2 space-y-1 text-muted-foreground">
          {activity.history.map((event) => (
            <li key={event.id}>#{event.event_order} · {event.event_type} · {event.content}</li>
          ))}
        </ol>
      </details>
      {activity.attachments.length > 0 ? (
        <details className="text-xs">
          <summary className="cursor-pointer font-medium">Pièces jointes</summary>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {activity.attachments.map((attachment) => (
              <li key={attachment.id}>
                {attachment.file_name} · {attachment.mime_type ?? 'type inconnu'} · {attachment.byte_size === null ? 'taille inconnue' : `${attachment.byte_size} octets`}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {activity.corrections.length > 0 ? (
        <details className="text-xs">
          <summary className="cursor-pointer font-medium">Historique des corrections</summary>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {activity.corrections.map((item) => (
              <li key={item.id}>v{item.activity_version} · {item.field_name} · {item.reason ?? 'Motif non renseigné'}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
};

export default ActivityCanonicalDetails;
