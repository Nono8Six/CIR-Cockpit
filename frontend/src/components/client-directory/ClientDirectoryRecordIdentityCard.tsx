import { MapPin } from 'lucide-react';

import type { DirectoryRecord } from 'shared/schemas/directory.schema';

import { Badge } from '@/components/ui/badge';
import StatusDot from '@/components/ui/status-dot';
import type { EntityContact } from '@/types';
import { formatDate } from '@/utils/date/formatDate';
import { formatRelativeTime } from '@/utils/date/formatRelativeTime';
import { formatClientNumber } from '@/utils/clients/formatClientNumber';

import { getDirectoryTypeLabel } from './clientDirectorySearch';

export interface ClientDirectoryRecordIdentityCardProps {
  record: DirectoryRecord;
  isProspect: boolean;
  addressLine: string;
  primaryContact: EntityContact | null;
}

const ClientDirectoryRecordIdentityCard = ({
  record,
  isProspect,
  addressLine,
  primaryContact,
}: ClientDirectoryRecordIdentityCardProps) => (
  <section className="rounded-xl border border-border/50 bg-card/95 p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusDot
              entityType={record.entity_type === 'Client' ? 'Client' : 'Prospect'}
              archivedAt={record.archived_at ?? null}
            />
            <Badge variant="outline">{getDirectoryTypeLabel(record.entity_type)}</Badge>
            {record.client_kind === 'individual' ? <Badge variant="outline">Particulier</Badge> : null}
            {record.archived_at ? <Badge variant="outline">Archivé</Badge> : null}
            {!isProspect && record.account_type ? (
              <Badge variant="outline">
                {record.account_type === 'cash' ? 'Comptant' : 'Compte à terme'}
              </Badge>
            ) : null}
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{record.name}</h1>
            <p className="text-[13px] text-muted-foreground">
              {isProspect || !record.client_number ? 'Prospect' : `N° ${formatClientNumber(record.client_number)}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[13px] text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <MapPin size={14} />
              {addressLine || 'Adresse non renseignée'}
            </span>
            <span>Agence: {record.agency_name ?? 'Non rattaché'}</span>
            {record.client_kind === 'individual' ? (
              <span>
                Contact principal:{' '}
                {[primaryContact?.first_name, primaryContact?.last_name]
                  .filter(Boolean)
                  .join(' ') || 'Non renseigné'}
              </span>
            ) : (
              <span>Commercial CIR: {record.cir_commercial_name ?? 'Non affecté'}</span>
            )}
          </div>
        </div>
      </div>
      <div className="grid gap-1 text-right text-xs text-muted-foreground">
        <span>Créé le {formatDate(record.created_at)}</span>
        <span>Mis à jour {formatRelativeTime(record.updated_at)}</span>
      </div>
    </div>
  </section>
);

export default ClientDirectoryRecordIdentityCard;
