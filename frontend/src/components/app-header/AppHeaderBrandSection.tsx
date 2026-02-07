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
  <div className="flex items-center gap-3 min-w-0">
    <div className="w-8 h-8 bg-cir-red rounded flex items-center justify-center text-white font-black tracking-tighter shadow-sm transform -skew-x-6">
      CIR
    </div>
    <div className="flex items-center gap-3 min-w-0">
      <h1 className="font-bold text-slate-900 text-sm leading-none tracking-tight">COCKPIT</h1>
      {agencyContext ? (
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-4 w-px bg-slate-200" />
          {hasMultipleAgencies ? (
            <div className="relative max-w-[160px]">
              <Select
                value={agencyContext.agency_id}
                onValueChange={onAgencyChange}
              >
                <SelectTrigger
                  className="h-auto rounded-full px-2.5 py-1 text-[11px] font-semibold text-slate-700 truncate shadow-sm"
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
            </div>
          ) : (
            <span className="max-w-[160px] truncate rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
              {agencyContext.agency_name}
            </span>
          )}
          <Badge className={`shadow-sm whitespace-nowrap ${roleBadgeStyles[userRole]}`}>
            {roleLabels[userRole]}
          </Badge>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Contexte…</span>
          <Badge className={`shadow-sm whitespace-nowrap ${roleBadgeStyles[userRole]}`}>
            {roleLabels[userRole]}
          </Badge>
        </div>
      )}
    </div>
  </div>
);

export default AppHeaderBrandSection;
