

import ProspectDetailContactsSection from './prospect-detail/ProspectDetailContactsSection';
import ProspectDetailEmptyState from './prospect-detail/ProspectDetailEmptyState';
import ProspectDetailHeader from './prospect-detail/ProspectDetailHeader';
import ProspectDetailInfoGrid from './prospect-detail/ProspectDetailInfoGrid';
import type { ProspectDetailPanelProps } from './prospect-detail/ProspectDetailPanel.types';

const ProspectDetailPanel = ({
  prospect,
  contacts,
  isContactsLoading,
  agencies,
  focusedContactId,
  canDeleteProspect,
  onRequestConvert,
  onEditProspect,
  onDeleteProspect,
  onAddContact,
  onEditContact,
  onDeleteContact
}: ProspectDetailPanelProps) => {
  if (!prospect) {
    return <ProspectDetailEmptyState />;
  }

  const agencyName = agencies.find((agency) => agency.id === prospect.agency_id)?.name ?? 'Sans agence';
  const addressLine = [
    prospect.address,
    [prospect.postal_code, prospect.city].filter(Boolean).join(' ')
  ].filter(Boolean).join(', ');

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden rounded-lg border border-border bg-card p-6 shadow-sm">
      <ProspectDetailHeader
        prospect={prospect}
        agencyName={agencyName}
        addressLine={addressLine}
        canDeleteProspect={canDeleteProspect}
        onRequestConvert={onRequestConvert}
        onEditProspect={onEditProspect}
        onDeleteProspect={onDeleteProspect}
      />
      <ProspectDetailInfoGrid prospect={prospect} />
      <ProspectDetailContactsSection
        contacts={contacts}
        focusedContactId={focusedContactId}
        isContactsLoading={isContactsLoading}
        onAddContact={onAddContact}
        onEditContact={onEditContact}
        onDeleteContact={onDeleteContact}
      />
    </div>
  );
};

export default ProspectDetailPanel;
