import type { AgencyContext, AgencyMembershipSummary, UserRole } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type AppHeaderBrandSectionProps = {
  agencyContext: AgencyContext | null;
  agencyMemberships: AgencyMembershipSummary[];
  hasMultipleAgencies: boolean;
  userRole: UserRole;
  roleLabels: Record<UserRole, string>;
  roleBadgeStyles: Record<UserRole, string>;
  onAgencyChange: (agencyId: string) => void;
};

const AppHeaderBrandSection = ({
  agencyContext,
  agencyMemberships,
  hasMultipleAgencies,
  userRole,
  roleLabels,
  roleBadgeStyles,
  onAgencyChange
}: AppHeaderBrandSectionProps) => (
  <div className="flex min-w-0 items-center gap-2 sm:gap-3">
    <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-xs font-black tracking-tighter text-white shadow-sm -skew-x-6 sm:h-8 sm:w-8 sm:text-sm">
      CIR
    </div>
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      <h1 className="hidden text-sm font-bold leading-none tracking-tight text-foreground sm:block">COCKPIT</h1>
      {agencyContext ? (
        <div className="hidden min-w-0 items-center gap-2 md:flex">
          <div className="h-4 w-px bg-muted" />
          <div className="min-w-0">
            {hasMultipleAgencies ? (
              <Select
                value={agencyContext.agency_id}
                onValueChange={onAgencyChange}
              >
                <SelectTrigger
                  className="h-7 max-w-[130px] rounded-full px-2.5 text-xs font-semibold text-foreground shadow-sm lg:max-w-[170px]"
                  aria-label="Agence active"
                >
                  <SelectValue placeholder="Agence active" />
                </SelectTrigger>
                <SelectContent>
                  {agencyMemberships.map((membership) => (
                    <SelectItem key={membership.agency_id} value={membership.agency_id}>
                      {membership.agency_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="inline-flex h-7 max-w-[130px] items-center truncate rounded-full border border-border bg-card px-2.5 text-xs font-semibold text-foreground shadow-sm lg:max-w-[170px]">
                {agencyContext.agency_name}
              </span>
            )}
          </div>
          <Badge className={`hidden whitespace-nowrap shadow-sm lg:inline-flex ${roleBadgeStyles[userRole]}`}>
            {roleLabels[userRole]}
          </Badge>
        </div>
      ) : (
        <div className="hidden items-center gap-2 md:flex">
          <span className="text-xs text-muted-foreground/80 font-medium uppercase tracking-widest">Contexte…</span>
          <Badge className={`hidden whitespace-nowrap shadow-sm lg:inline-flex ${roleBadgeStyles[userRole]}`}>
            {roleLabels[userRole]}
          </Badge>
        </div>
      )}
    </div>
  </div>
);

export default AppHeaderBrandSection;
