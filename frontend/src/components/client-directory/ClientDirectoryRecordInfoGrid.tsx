import type { ReactNode } from 'react';
import type { DirectoryRecord } from 'shared/schemas/directory.schema';

import type { Interaction } from '@/types';
import { formatRelativeTime } from '@/utils/date/formatRelativeTime';

export interface ClientDirectoryRecordInfoGridProps {
  record: DirectoryRecord;
  contactsSection: ReactNode;
  interactions: Interaction[];
}

const ClientDirectoryRecordInfoGrid = ({
  record,
  contactsSection,
  interactions,
}: ClientDirectoryRecordInfoGridProps) => (
  <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
    <section className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground/80">Informations</p>
          <div className="mt-3 space-y-2 text-sm">
            <p>
              <span className="font-medium text-foreground">SIRET:</span>{' '}
              {record.siret ?? 'Non renseigné'}
            </p>
            <p>
              <span className="font-medium text-foreground">Département:</span>{' '}
              {record.department ?? 'Non renseigné'}
            </p>
            <p>
              <span className="font-medium text-foreground">Pays:</span> {record.country}
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground/80">Notes</p>
          <p
            className={`mt-3 text-sm ${
              record.notes ? 'text-muted-foreground' : 'italic text-muted-foreground/60'
            }`}
          >
            {record.notes || 'Aucune note enregistrée.'}
          </p>
        </div>
      </div>

      {contactsSection}
    </section>

    <section className="rounded-xl border border-border/50 bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground/80">Activité récente</p>
      <div className="mt-3 space-y-3">
        {interactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune interaction récente.</p>
        ) : (
          interactions.map((interaction) => (
            <div
              key={interaction.id}
              className="rounded-xl border border-border/50 px-3 py-3 text-sm"
            >
              <p className="font-medium text-foreground">{interaction.subject}</p>
              <p className="mt-1 text-muted-foreground">{interaction.status}</p>
              <p className="mt-1 text-xs text-muted-foreground/80">
                {formatRelativeTime(interaction.last_action_at)}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  </div>
);

export default ClientDirectoryRecordInfoGrid;
