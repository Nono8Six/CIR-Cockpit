import { memo, type ReactNode } from 'react';
import { ArrowLeft, Menu, User } from 'lucide-react';

import type { AppHeaderProps } from '@/components/app-header/AppHeader.types';
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
import type { AppTab } from '@/types';

const AppHeader = ({
  activeTab,
  activeSectionLabel,
  activeItemLabel,
  agencyContext,
  agencyMemberships,
  hasMultipleAgencies,
  sessionEmail,
  userFullName,
  userInitials,
  userRoleLabel,
  profileLoading,
  isContextRefreshing,
  isSettingsDisabled,
  isProfileMenuOpen,
  profileMenuRef,
  onAgencyChange,
  onOpenSearch,
  onSearchIntent,
  onProfileMenuOpenChange,
  onOpenSettings,
  onOpenAccountPanel,
  onSignOut,
  onBackToCockpit,
  onOpenMobileMenu
}: AppHeaderProps) => {
  const statusLabel = profileLoading ? 'Synchronisation profil…' : isContextRefreshing ? 'Synchronisation agence…' : null;
  const safeInitials = typeof userInitials === 'string' ? userInitials.trim() : '';
  const safeFullName = typeof userFullName === 'string' && userFullName.trim().length > 0
    ? userFullName
    : 'Utilisateur';
  const safeEmail = typeof sessionEmail === 'string' && sessionEmail.trim().length > 0
    ? sessionEmail
    : 'Email indisponible';
  const safeRoleLabel = typeof userRoleLabel === 'string' && userRoleLabel.trim().length > 0
    ? userRoleLabel
    : 'Rôle indisponible';
  const safeSectionLabel = typeof activeSectionLabel === 'string' && activeSectionLabel.trim().length > 0
    ? activeSectionLabel
    : 'Navigation';
  const safeItemLabel = typeof activeItemLabel === 'string' && activeItemLabel.trim().length > 0
    ? activeItemLabel
    : 'Vue';
  const safeAgencyMemberships = Array.isArray(agencyMemberships) ? agencyMemberships : [];
  const hasInitials = safeInitials.length > 0;
  const activeAgency = agencyContext ?? safeAgencyMemberships[0] ?? null;
  const activeAgencyName = activeAgency?.agency_name ?? 'Agence indisponible';

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4 lg:px-6">
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

        <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {safeSectionLabel}
            </p>
            <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">
              {safeItemLabel}
            </h1>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          {statusLabel ? (
            <span className="hidden text-[11px] uppercase tracking-widest text-muted-foreground xl:inline">
              {statusLabel}
            </span>
          ) : null}

          <AppHeaderSearchButton onOpenSearch={onOpenSearch} onSearchIntent={onSearchIntent} />

          <div className="hidden items-center gap-2 md:flex">
            {hasMultipleAgencies ? (
              <Select
                value={activeAgency?.agency_id ?? ''}
                onValueChange={onAgencyChange}
              >
                <SelectTrigger
                  className="h-9 min-w-[170px] rounded-md border-border bg-card text-xs font-semibold"
                  density="comfortable"
                  aria-label="Agence active"
                >
                  <SelectValue placeholder="Agence active" />
                </SelectTrigger>
                <SelectContent>
                  {safeAgencyMemberships.map((membership) => (
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
                data-testid="app-header-profile-button"
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
                    {safeInitials}
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
                    <p className="truncate text-sm font-semibold text-foreground">{safeFullName}</p>
                    <p className="truncate text-xs text-muted-foreground">{safeEmail}</p>
                    <Badge variant="secondary" className="mt-1 text-[10px] font-medium">
                      {safeRoleLabel}
                    </Badge>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start text-sm"
                    role="menuitem"
                    onClick={() => {
                      onProfileMenuOpenChange(false);
                      onOpenAccountPanel();
                    }}
                  >
                    Mon compte
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start text-sm"
                    role="menuitem"
                    disabled={isSettingsDisabled}
                    onClick={() => {
                      onProfileMenuOpenChange(false);
                      onOpenSettings();
                    }}
                  >
                    Paramètres
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start text-sm"
                    role="menuitem"
                    onClick={() => {
                      onProfileMenuOpenChange(false);
                      onSignOut();
                    }}
                  >
                    Déconnexion
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          {activeTab !== 'cockpit' ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden gap-2 rounded-md border-border/80 lg:inline-flex"
              onClick={onBackToCockpit}
            >
              <ArrowLeft size={14} />
              Retour cockpit
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default memo(AppHeader);

export type NavigationTab = {
  value: AppTab;
  icon: ReactNode;
  label: ReactNode;
  ariaLabel: string;
  badge?: ReactNode | null;
};
