import type { RefObject } from 'react';
import { ArrowLeft, Menu, User } from 'lucide-react';

import AppHeaderSearchButton from '@/components/app-header/AppHeaderSearchButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { AgencyMembershipSummary } from '@/types';

type UiPocTopbarProps = {
  activeSectionLabel: string;
  activeLabel: string;
  onOpenMobileMenu: () => void;
  onBackToCockpit: () => void;
  onOpenSearch: () => void;
  onSearchIntent?: () => void;
  agencyMemberships: AgencyMembershipSummary[];
  activeAgencyId: string | null;
  canSwitchAgency: boolean;
  onAgencyChange: (agencyId: string) => void;
  userEmail: string;
  userFullName: string;
  userInitials: string;
  userRoleLabel: string;
  canAccessSettings: boolean;
  profileMenuRef: RefObject<HTMLDivElement | null>;
  isProfileMenuOpen: boolean;
  onProfileMenuOpenChange: (open: boolean) => void;
  onOpenAccountPanel: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
};

const UiPocTopbar = ({
  activeSectionLabel,
  activeLabel,
  onOpenMobileMenu,
  onBackToCockpit,
  onOpenSearch,
  onSearchIntent,
  agencyMemberships,
  activeAgencyId,
  canSwitchAgency,
  onAgencyChange,
  userEmail,
  userFullName,
  userInitials,
  userRoleLabel,
  canAccessSettings,
  profileMenuRef,
  isProfileMenuOpen,
  onProfileMenuOpenChange,
  onOpenAccountPanel,
  onOpenSettings,
  onSignOut
}: UiPocTopbarProps) => {
  const activeAgency =
    agencyMemberships.find((membership) => membership.agency_id === activeAgencyId)
    ?? agencyMemberships[0]
    ?? null;
  const activeAgencyName = activeAgency?.agency_name ?? 'Agence indisponible';
  const activeAgencySelectValue = activeAgency?.agency_id ?? '';
  const hasInitials = userInitials.trim().length > 0;

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-9 w-9 rounded-md border-border/80 md:hidden"
          onClick={onOpenMobileMenu}
          aria-label="Ouvrir le menu"
        >
          <Menu size={16} />
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {activeSectionLabel}
            </p>
            <h1 className="truncate text-base font-semibold text-foreground">
              {activeLabel}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AppHeaderSearchButton onOpenSearch={onOpenSearch} onSearchIntent={onSearchIntent} />

          <div className="hidden items-center gap-2 md:flex">
            {canSwitchAgency ? (
              <Select value={activeAgencySelectValue} onValueChange={onAgencyChange}>
                <SelectTrigger
                  className="h-9 min-w-[170px] rounded-md border-border bg-card text-xs font-semibold"
                  density="comfortable"
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
              <div className="inline-flex h-9 min-w-[170px] items-center rounded-md border border-border bg-card px-3 text-xs font-semibold text-foreground">
                <span className="truncate">{activeAgencyName}</span>
              </div>
            )}

            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                className={cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground transition-colors',
                  'hover:bg-surface-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                )}
                onClick={() => onProfileMenuOpenChange(!isProfileMenuOpen)}
                aria-haspopup="menu"
                aria-expanded={isProfileMenuOpen}
                aria-label="Ouvrir le menu profil"
              >
                {hasInitials ? (
                  <span aria-hidden="true" className="text-[11px] font-semibold text-foreground">
                    {userInitials}
                  </span>
                ) : (
                  <User size={14} aria-hidden="true" />
                )}
                <span className="sr-only">Menu profil</span>
              </button>

              {isProfileMenuOpen ? (
                <div
                  className="absolute right-0 z-30 mt-2 w-56 rounded-lg border border-border bg-card p-1 shadow-lg"
                  role="menu"
                >
                  <div className="m-1 rounded-md border border-border/80 bg-surface-1/80 px-2 py-2">
                    <p className="truncate text-sm font-semibold text-foreground">{userFullName}</p>
                    <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
                    <Badge variant="secondary" className="mt-1 text-[10px] font-medium">
                      {userRoleLabel}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start text-sm"
                    role="menuitem"
                    onClick={onOpenAccountPanel}
                  >
                    Mon compte
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start text-sm"
                    role="menuitem"
                    disabled={!canAccessSettings}
                    onClick={onOpenSettings}
                  >
                    Paramètres
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start text-sm"
                    role="menuitem"
                    onClick={onSignOut}
                  >
                    Déconnexion
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="hidden gap-2 rounded-md border-border/80 md:inline-flex"
          onClick={onBackToCockpit}
        >
          <ArrowLeft size={14} />
          Retour cockpit
        </Button>
      </div>
    </header>
  );
};

export default UiPocTopbar;
