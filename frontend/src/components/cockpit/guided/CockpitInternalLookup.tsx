import { useMemo, useState } from 'react';
import type { UseFormSetValue } from 'react-hook-form';
import { Search, UserRound } from 'lucide-react';

import { INTERNAL_COMPANY_NAME } from '@/constants/relations';
import { useCockpitAgencyMembers } from '@/hooks/useCockpitAgencyMembers';
import { Input } from '@/components/ui/input';
import type { InteractionFormValues } from 'shared/schemas/interaction.schema';
import type { CockpitAgencyMember } from 'shared/schemas/cockpit.schema';

type CockpitInternalLookupProps = {
  activeAgencyId: string | null;
  setValue: UseFormSetValue<InteractionFormValues>;
  onComplete: () => void;
};

const getMemberDisplayName = (member: CockpitAgencyMember): string => {
  const fullName = [member.first_name ?? '', member.last_name].filter(Boolean).join(' ').trim();
  return member.display_name?.trim() || fullName || member.email;
};

const CockpitInternalLookup = ({
  activeAgencyId,
  setValue,
  onComplete
}: CockpitInternalLookupProps) => {
  const [query, setQuery] = useState('');
  const membersQuery = useCockpitAgencyMembers(activeAgencyId, true);
  const members = membersQuery.data?.members;

  const filteredMembers = useMemo(() => {
    const sourceMembers = members ?? [];
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return sourceMembers.slice(0, 8);

    return sourceMembers.filter((member) => {
      const searchValue = [
        getMemberDisplayName(member),
        member.first_name ?? '',
        member.last_name,
        member.email
      ].join(' ').toLowerCase();
      return searchValue.includes(normalizedQuery);
    }).slice(0, 8);
  }, [members, query]);

  const selectMember = (member: CockpitAgencyMember) => {
    const displayName = getMemberDisplayName(member);
    setValue('company_name', INTERNAL_COMPANY_NAME, { shouldDirty: true, shouldValidate: true });
    setValue('contact_first_name', member.first_name ?? '', { shouldDirty: true, shouldValidate: true });
    setValue('contact_last_name', member.last_name, { shouldDirty: true, shouldValidate: true });
    setValue('contact_name', displayName, { shouldDirty: true, shouldValidate: true });
    setValue('contact_email', member.email, { shouldDirty: true, shouldValidate: true });
    setValue('contact_phone', '', { shouldDirty: true, shouldValidate: true });
    onComplete();
  };

  return (
    <div className="space-y-3" data-testid="cockpit-internal-lookup">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Membre CIR, email…"
          className="h-10 pl-9"
          autoComplete="off"
        />
      </div>
      <div className="grid gap-2">
        {filteredMembers.map((member) => (
          <button
            key={member.profile_id}
            type="button"
            onClick={() => selectMember(member)}
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-left transition-colors hover:border-ring/35 hover:bg-surface-1"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface-1 text-muted-foreground">
                <UserRound size={15} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">{getMemberDisplayName(member)}</span>
                <span className="block truncate text-xs text-muted-foreground">{member.email}</span>
              </span>
            </span>
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {member.role}
            </span>
          </button>
        ))}
      </div>
      {membersQuery.isLoading ? (
        <p className="text-xs text-muted-foreground" role="status">Chargement…</p>
      ) : null}
      {!membersQuery.isLoading && filteredMembers.length === 0 ? (
        <p className="text-xs text-muted-foreground" role="status">Aucun membre trouvé.</p>
      ) : null}
    </div>
  );
};

export default CockpitInternalLookup;
