

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
  onRequestConvert,
  onEditProspect,
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
    <div className="h-full bg-white border border-slate-200 rounded-lg shadow-sm p-6 flex flex-col gap-6">
      <ProspectDetailHeader
        prospect={prospect}
        agencyName={agencyName}
        addressLine={addressLine}
        onRequestConvert={onRequestConvert}
        onEditProspect={onEditProspect}
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
