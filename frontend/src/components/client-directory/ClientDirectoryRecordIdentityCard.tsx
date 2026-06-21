import { Mail, MapPin, Phone } from 'lucide-react';

import type { DirectoryRecord } from '../../../../shared/schemas/system/directory.schema';

import { Badge } from '../ui/data-display/Badge';
import StatusDot from '../ui/data-display/StatusDot';
import type { EntityContact } from '@/types';
import { formatClientNumber } from '@/utils/clients/formatClientNumber';
import { getDirectoryTypeLabel } from './clientDirectorySearch';

export interface ClientDirectoryRecordIdentityCardProps {
  record: DirectoryRecord;
  isProspect: boolean;
  isSupplier: boolean;
  addressLine: string;
  primaryContact: EntityContact | null;
}

/**
 * Renders the identity header block of a client or prospect record.
 * Displays breadcrumbs, entity name, status dot, quick badges, and primary contact details inline.
 * Properties like agency, commercial, and dates are delegated to the details sidebar.
 *
 * @param props - The component properties.
 * @param props.record - The client or prospect directory record.
 * @param props.isProspect - True if the record represents a prospect.
 * @param props.addressLine - Formatted address text.
 * @param props.primaryContact - The primary contact object.
 * @returns The rendered JSX element.
 */
const ClientDirectoryRecordIdentityCard = ({
  record,
  isProspect,
  isSupplier,
  addressLine,
  primaryContact,
}: ClientDirectoryRecordIdentityCardProps) => {
  const contactEmail = record.primary_email ?? primaryContact?.email ?? null;
  const contactPhone = record.primary_phone ?? primaryContact?.phone ?? null;
  const statusEntityType = isSupplier
    ? 'Fournisseur'
    : record.entity_type === 'Client' ? 'Client' : 'Prospect';
  const supplierIdentifier = record.supplier_code
    ? `Code ${record.supplier_code}`
    : record.supplier_number ? `N° fournisseur ${record.supplier_number}` : 'Fiche fournisseur';

  return (
    <div className="min-w-0 flex-1 space-y-2.5">
      {/* Breadcrumbs */}
      <nav aria-label="Fil d'ariane" className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 font-bold">
        {isSupplier ? (
          <span className="flex items-center gap-1.5">
            <span>Fournisseurs</span>
            <span className="text-neutral-300">/</span>
            <span className="font-mono text-neutral-700 font-semibold">
              {supplierIdentifier}
            </span>
          </span>
        ) : isProspect ? (
          <span>Prospects</span>
        ) : (
          <span className="flex items-center gap-1.5">
            <span>Clients</span>
            <span className="text-neutral-300">/</span>
            <span className="font-mono text-neutral-700 font-semibold">
              N° {record.client_number ? formatClientNumber(record.client_number) : '—'}
            </span>
          </span>
        )}
      </nav>

      {/* Name and Badges */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <StatusDot
            entityType={statusEntityType}
            archivedAt={record.archived_at ?? null}
          />
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">
            {record.name}
          </h1>
          <div className="flex flex-wrap items-center gap-1 ml-1.5">
            <Badge variant="outline" className="border-neutral-200 text-neutral-600 bg-neutral-50/50 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide">
              {getDirectoryTypeLabel(record.entity_type)}
            </Badge>
            {record.client_kind === 'individual' ? (
              <Badge variant="outline" className="border-neutral-200 text-neutral-600 bg-neutral-50/50 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide">
                Particulier
              </Badge>
            ) : null}
            {record.archived_at ? (
              <Badge variant="outline" className="border-destructive/20 text-destructive bg-destructive/[0.02] rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide">
                Archivé
              </Badge>
            ) : null}
            {!isProspect && !isSupplier && record.account_type ? (
              <Badge variant="outline" className="border-neutral-200 text-neutral-600 bg-neutral-50/50 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide">
                {record.account_type === 'cash' ? 'Comptant' : 'Compte à terme'}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      {/* Quick Contact Info */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-neutral-500 font-medium">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <MapPin size={13} className="shrink-0 text-neutral-400" />
          <span className="truncate text-neutral-700 font-medium">{addressLine || 'Adresse non renseignée'}</span>
        </span>
        {contactPhone ? (
          <span className="inline-flex items-center gap-1.5">
            <Phone size={13} className="shrink-0 text-neutral-400" />
            <span className="font-mono text-[11px] font-semibold tracking-tight text-neutral-700">{contactPhone}</span>
          </span>
        ) : null}
        {contactEmail ? (
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Mail size={13} className="shrink-0 text-neutral-400" />
            <span className="truncate text-neutral-700 font-medium">{contactEmail}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
};

export default ClientDirectoryRecordIdentityCard;
