import type { RefObject } from 'react';
import { Building2, Check, ChevronDown, Users } from 'lucide-react';

import AvatarInitials from '@/components/ui/data-display/AvatarInitials';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/navigation/DropdownMenu';
import { cn } from '@/lib/utils';
import type {
  DashboardScope,
  DashboardScopeMember
} from '@/hooks/dashboard-state/useDashboardScope';
import {
  OVERVIEW_PERIODS,
  type OverviewPeriodKey
} from '@/utils/dashboard/dashboardOverview';
import DashboardSearchInput from '../toolbar/DashboardSearchInput';

type DashboardOverviewHeaderProps = {
  scope: DashboardScope;
  onScopeChange: (scope: DashboardScope) => void;
  members: DashboardScopeMember[];
  viewerMember: DashboardScopeMember | null;
  selectedMember: DashboardScopeMember | null;
  scopeLabel: string;
  isConsolidated: boolean;
  period: OverviewPeriodKey;
  onPeriodChange: (period: OverviewPeriodKey) => void;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  searchRef?: RefObject<HTMLInputElement | null>;
};

// Ex : "mardi 21 juillet" — la date du jour ancre la vue d'ensemble.
const todayFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long'
});

const capitalize = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

const segmentClass = (active: boolean): string =>
  cn(
    'rounded-md px-3 py-1.5 text-[11.5px] transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
    active
      ? 'bg-card font-semibold text-foreground shadow-soft'
      : 'font-medium text-muted-foreground hover:text-foreground'
  );

const DashboardOverviewHeader = ({
  scope,
  onScopeChange,
  members,
  viewerMember,
  selectedMember,
  scopeLabel,
  isConsolidated,
  period,
  onPeriodChange,
  searchTerm,
  onSearchTermChange,
  searchRef
}: DashboardOverviewHeaderProps) => {
  const colleagues = members.filter((member) => !member.isViewer);
  const pickerLabel = selectedMember?.name ?? (isConsolidated ? 'Agence' : 'Ma vue');

  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-border-subtle pb-3"
      data-testid="dashboard-overview-header"
    >
      <div className="flex min-w-0 flex-col leading-tight">
        <h1 className="text-base font-bold tracking-tight text-foreground">{"Vue d'ensemble"}</h1>
        <span className="text-[11.5px] text-muted-foreground" data-testid="dashboard-scope-caption">
          {capitalize(todayFormatter.format(new Date()))} · {scopeLabel}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex rounded-lg border border-border bg-surface-2 p-0.5"
          role="group"
          aria-label="Périmètre du pilotage"
        >
          <button
            type="button"
            className={segmentClass(scope.kind === 'me' || scope.kind === 'member')}
            aria-pressed={scope.kind === 'me' || scope.kind === 'member'}
            onClick={() => onScopeChange({ kind: 'me' })}
          >
            Ma vue
          </button>
          <button
            type="button"
            className={segmentClass(scope.kind === 'agency')}
            aria-pressed={scope.kind === 'agency'}
            onClick={() => onScopeChange({ kind: 'agency' })}
          >
            Agence
          </button>
        </div>

        {members.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex h-8 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground transition-colors hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-label="Choisir le périmètre d'un collègue"
              data-testid="dashboard-scope-picker"
            >
              {selectedMember ? (
                <AvatarInitials name={selectedMember.name} className="size-5 rounded-md text-[11px]" />
              ) : (
                <span className="inline-flex size-5 items-center justify-center rounded-md bg-surface-2 text-muted-foreground">
                  <Building2 size={12} aria-hidden="true" />
                </span>
              )}
              <span className="max-w-[130px] truncate font-semibold">{pickerLabel}</span>
              <ChevronDown size={12} className="text-muted-foreground" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60">
              <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Voir le périmètre de
              </DropdownMenuLabel>
              {viewerMember ? (
                <DropdownMenuItem onSelect={() => onScopeChange({ kind: 'me' })}>
                  <AvatarInitials name={viewerMember.name} className="size-5 rounded-md text-[11px]" />
                  <span className="flex-1 truncate text-xs font-semibold">
                    {viewerMember.name} <span className="font-normal text-muted-foreground">(moi)</span>
                  </span>
                  {scope.kind === 'me' ? <Check size={13} aria-hidden="true" /> : null}
                </DropdownMenuItem>
              ) : null}
              {colleagues.map((member) => (
                <DropdownMenuItem
                  key={member.profileId}
                  onSelect={() => onScopeChange({ kind: 'member', profileId: member.profileId })}
                >
                  <AvatarInitials name={member.name} className="size-5 rounded-md text-[11px]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">{member.name}</span>
                    <span className="block truncate text-[10.5px] text-muted-foreground">
                      {member.roleLabel}
                    </span>
                  </span>
                  {scope.kind === 'member' && scope.profileId === member.profileId ? (
                    <Check size={13} aria-hidden="true" />
                  ) : null}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onScopeChange({ kind: 'agency' })}>
                <span className="inline-flex size-5 items-center justify-center rounded-md bg-surface-2 text-muted-foreground">
                  <Building2 size={12} aria-hidden="true" />
                </span>
                <span className="flex-1 truncate text-xs font-semibold">
                  Agence{' '}
                  <span className="font-normal text-muted-foreground">
                    · {members.length} membre{members.length > 1 ? 's' : ''}
                  </span>
                </span>
                {scope.kind === 'agency' ? <Check size={13} aria-hidden="true" /> : null}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        {isConsolidated ? (
          <span
            className="inline-flex h-6 items-center gap-1.5 rounded-md bg-accent px-2 text-[10.5px] font-semibold text-accent-foreground"
            data-testid="dashboard-consolidated-badge"
          >
            <Users size={11} aria-hidden="true" />
            Vue consolidée
          </span>
        ) : null}
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2.5">
        <div
          className="flex rounded-lg border border-border bg-surface-2 p-0.5"
          role="group"
          aria-label="Période d'analyse"
        >
          {OVERVIEW_PERIODS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              className={segmentClass(period === entry.key)}
              aria-pressed={period === entry.key}
              onClick={() => onPeriodChange(entry.key)}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <div className="w-56">
          <DashboardSearchInput
            ref={searchRef}
            searchTerm={searchTerm}
            onSearchTermChange={onSearchTermChange}
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardOverviewHeader;
