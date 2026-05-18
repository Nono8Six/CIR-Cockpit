import { UserRound } from 'lucide-react';

import type { CockpitAgencyMember } from 'shared/schemas/cockpit.schema';

type CockpitInternalMemberListItem = CockpitAgencyMember & { agencyName?: string };

type CockpitInternalMembersListProps = {
  members: CockpitInternalMemberListItem[];
  isLoading: boolean;
  onSelect: (member: CockpitInternalMemberListItem) => void;
};

export const getCockpitInternalMemberDisplayName = (member: CockpitAgencyMember): string => {
  const fullName = [member.first_name ?? '', member.last_name].filter(Boolean).join(' ').trim();
  return member.display_name?.trim() || fullName || member.email;
};

const CockpitInternalMembersList = ({
  members,
  isLoading,
  onSelect
}: CockpitInternalMembersListProps) => {
  return (
    <>
      {isLoading ? (
        <div className="space-y-2" aria-live="polite" role="status" aria-label="Recherche membre interne en cours">
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex h-12 items-center gap-3 rounded-md border border-border/60 px-3">
              <span className="h-8 w-8 rounded-md bg-muted/70 animate-pulse" />
              <span className="min-w-0 flex-1 space-y-1.5">
                <span className="block h-2.5 w-2/3 rounded bg-muted/70 animate-pulse" />
                <span className="block h-2 w-1/2 rounded bg-muted/60 animate-pulse" />
              </span>
            </div>
          ))}
        </div>
      ) : null}
      <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
        {members.map((member) => (
          <button
            key={member.profile_id}
            type="button"
            onClick={() => onSelect(member)}
            className="flex w-full items-center justify-between gap-3 rounded-md border border-border/80 bg-card px-3 py-2 text-left shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-[background-color,border-color,box-shadow] hover:border-primary/25 hover:bg-primary/5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-1 text-muted-foreground ring-1 ring-border/70">
                <UserRound size={15} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">
                  {getCockpitInternalMemberDisplayName(member)}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {member.agencyName ? `${member.email} · ${member.agencyName}` : member.email}
                </span>
              </span>
            </span>
            <span className="shrink-0 rounded-full border border-border bg-surface-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {member.role}
            </span>
          </button>
        ))}
      </div>
      {!isLoading && members.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-surface-1/60 px-3 py-2.5" role="status" aria-live="polite">
          <p className="text-xs font-medium text-foreground">Aucun membre trouvé</p>
          <p className="text-[11px] text-muted-foreground">Ajoutez un contact ponctuel si besoin.</p>
        </div>
      ) : null}
    </>
  );
};

export default CockpitInternalMembersList;
