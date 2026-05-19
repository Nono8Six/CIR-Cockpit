import { useMemo, useState } from 'react';
import type { UseFormSetValue } from 'react-hook-form';
import { ChevronDown, Search } from 'lucide-react';

import { INTERNAL_COMPANY_NAME } from '@/constants/relations';
import { useCockpitAgencyMembersByAgencyIds } from '../../../hooks/admin/agencies/core/useCockpitAgencyMembers';
import { Button } from '../../ui/inputs/basic/Button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '../../ui/navigation/DropdownMenu';
import { Input } from '../../ui/inputs/basic/Input';
import type { Agency } from '@/types';
import type { InteractionFormValues } from '../../../../../shared/schemas/interaction/interaction.schema';
import CockpitInternalMembersList, {
  getCockpitInternalMemberDisplayName
} from './CockpitInternalMembersList';
import CockpitInternalQuickCreate from './CockpitInternalQuickCreate';
import GuidedTierSearchShell from './GuidedTierSearchShell';

type CockpitInternalLookupProps = {
  activeAgencyId: string | null;
  agencies: Agency[];
  setValue: UseFormSetValue<InteractionFormValues>;
  onComplete: () => void;
};

const getAgencyOptions = (agencies: Agency[], activeAgencyId: string | null) => {
  if (agencies.length > 0) return agencies.map((agency) => ({ id: agency.id, name: agency.name }));
  return activeAgencyId ? [{ id: activeAgencyId, name: 'Agence active' }] : [];
};

const getAgencyFilterLabel = (
  selectedAgencyIds: string[],
  agencyOptions: ReturnType<typeof getAgencyOptions>
) => {
  if (selectedAgencyIds.length === 0) return 'Toutes les agences';
  if (selectedAgencyIds.length === 1) {
    return agencyOptions.find((agency) => agency.id === selectedAgencyIds[0])?.name ?? '1 agence';
  }
  return `${selectedAgencyIds.length} agences`;
};

const CockpitInternalLookup = ({
  activeAgencyId,
  agencies,
  setValue,
  onComplete
}: CockpitInternalLookupProps) => {
  const [query, setQuery] = useState('');
  const agencyOptions = getAgencyOptions(agencies, activeAgencyId);
  const [selectedAgencyIds, setSelectedAgencyIds] = useState<string[]>([]);
  const selectedAgencyIdsSet = useMemo(() => new Set(selectedAgencyIds), [selectedAgencyIds]);
  const queriedAgencies = selectedAgencyIds.length === 0
    ? agencyOptions
    : agencyOptions.filter((agency) => selectedAgencyIdsSet.has(agency.id));
  const agencyFilterLabel = getAgencyFilterLabel(selectedAgencyIds, agencyOptions);
  const defaultQuickCreateAgencyId = selectedAgencyIds.length === 1
    ? selectedAgencyIds[0]
    : (activeAgencyId ?? agencyOptions[0]?.id ?? '');
  const membersQuery = useCockpitAgencyMembersByAgencyIds(queriedAgencies, agencyOptions.length > 0);

  const toggleAgency = (agencyId: string) => {
    setSelectedAgencyIds((current) => (
      current.includes(agencyId)
        ? current.filter((id) => id !== agencyId)
        : [...current, agencyId]
    ));
  };

  const filteredMembers = useMemo(() => {
    const sourceMembers = membersQuery.members;
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return sourceMembers.slice(0, 8);

    return sourceMembers.filter((member) => {
      const searchValue = [
        getCockpitInternalMemberDisplayName(member),
        member.first_name ?? '',
        member.last_name,
        member.email,
        member.agencyName
      ].join(' ').toLowerCase();
      return searchValue.includes(normalizedQuery);
    }).slice(0, 8);
  }, [membersQuery.members, query]);

  const applyInternalContact = (values: {
    firstName: string;
    lastName: string;
    displayName: string;
    email: string;
    phone: string;
    role?: string;
    agencyName?: string;
  }) => {
    setValue('entity_id', '', { shouldDirty: true, shouldValidate: true });
    setValue('contact_id', '', { shouldDirty: true, shouldValidate: true });
    setValue('company_name', INTERNAL_COMPANY_NAME, { shouldDirty: true, shouldValidate: true });
    setValue('company_city', values.agencyName ?? '', { shouldDirty: true, shouldValidate: true });
    setValue('contact_first_name', values.firstName, { shouldDirty: true, shouldValidate: true });
    setValue('contact_last_name', values.lastName, { shouldDirty: true, shouldValidate: true });
    setValue('contact_position', values.role ?? '', { shouldDirty: true, shouldValidate: true });
    setValue('contact_name', values.displayName, { shouldDirty: true, shouldValidate: true });
    setValue('contact_email', values.email, { shouldDirty: true, shouldValidate: true });
    setValue('contact_phone', values.phone, { shouldDirty: true, shouldValidate: true });
    onComplete();
  };

  const selectMember = (member: Parameters<typeof getCockpitInternalMemberDisplayName>[0] & { agencyName?: string }) => {
    applyInternalContact({
      firstName: member.first_name ?? '',
      lastName: member.last_name,
      displayName: getCockpitInternalMemberDisplayName(member),
      email: member.email,
      phone: '',
      role: member.role,
      agencyName: member.agencyName
    });
  };

  return (
    <GuidedTierSearchShell
      archiveSupport="hidden"
      contentClassName="min-h-[220px] p-2"
    >
      <div className="space-y-2" data-testid="cockpit-internal-lookup">
        <div className="grid items-stretch gap-2 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              aria-label="Recherche contact interne"
              name="internal-contact-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nom, téléphone ou email…"
              className="h-10 pl-9 text-[13px] leading-none"
              autoComplete="off"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="comfortable"
                className="h-10 justify-between px-3 text-[13px] leading-none shadow-sm"
                aria-label="Filtrer par agence"
              >
                <span className="truncate">{agencyFilterLabel}</span>
                <ChevronDown size={14} aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {agencyOptions.map((agency) => (
                <DropdownMenuCheckboxItem
                  key={agency.id}
                  checked={selectedAgencyIdsSet.has(agency.id)}
                  onCheckedChange={() => toggleAgency(agency.id)}
                  onSelect={(event) => event.preventDefault()}
                >
                  {agency.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CockpitInternalQuickCreate
          agencies={agencyOptions}
          defaultAgencyId={defaultQuickCreateAgencyId}
          onUseContact={(contact) => {
            const firstName = contact.firstName.trim();
            const lastName = contact.lastName.trim();
            applyInternalContact({
              firstName,
              lastName,
              displayName: [firstName, lastName].join(' ').trim(),
              email: contact.email.trim(),
              phone: contact.phone.trim(),
              agencyName: contact.agencyName
            });
          }}
        />
        <CockpitInternalMembersList
          members={filteredMembers}
          isLoading={membersQuery.isLoading}
          onSelect={selectMember}
        />
      </div>
    </GuidedTierSearchShell>
  );
};

export default CockpitInternalLookup;
