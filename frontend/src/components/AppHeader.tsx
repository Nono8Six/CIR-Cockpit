import { memo, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useReducedMotion } from 'motion/react';
import { getPathForTab } from '@/app/appRoutes';
import { ChevronDown, Menu, User } from 'lucide-react';

import type { AppHeaderProps } from '@/components/app-header/AppHeader.types';
import AppHeaderSearchButton from '@/components/app-header/AppHeaderSearchButton';
import AvatarInitials from '@/components/ui/avatar-initials';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { AppTab } from '@/types';

const AppHeader = ({
  sections,
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
  onAgencyChange,
  onOpenSearch,
  onSearchIntent,
  onProfileMenuOpenChange,
  onOpenSettings,
  onOpenAccountPanel,
  onSignOut,
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
  const safeSections = Array.isArray(sections) ? sections : [];
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
  const reducedMotion = useReducedMotion() ?? false;
  const currentSectionItems = safeSections.find((section) => section.items.some((item) => item.id === activeTab))?.items ?? [];

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
          <div className="flex min-w-0 items-center gap-2.5">
            {currentSectionItems && currentSectionItems.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="group inline-flex items-center gap-1 rounded-md px-1.5 py-1 -ml-1.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="truncate">{safeSectionLabel}</span>
                    <ChevronDown size={14} className="opacity-50 transition-transform group-data-[state=open]:rotate-180" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {currentSectionItems.map((item) => (
                    <DropdownMenuItem key={item.id} asChild>
                      <Link
                        to={getPathForTab(item.id)}
                        className={cn(
                          'flex w-full items-center gap-2 cursor-pointer',
                          activeTab === item.id && 'bg-muted font-medium text-foreground'
                        )}
                      >
                        <item.icon size={14} className="text-muted-foreground" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <p className="truncate text-sm font-medium text-muted-foreground">
                {safeSectionLabel}
              </p>
            )}
            <span className="text-muted-foreground/50 font-light select-none">/</span>
            <h1 className="truncate text-sm font-semibold text-foreground">
              {safeItemLabel}
            </h1>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 xl:flex">
             {statusLabel ? (
              <>
                <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                  {!reducedMotion ? (
                    <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping"></span>
                  ) : null}
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                </span>
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
                  {statusLabel}
                </span>
              </>
            ) : null}
          </div>

          <div className="w-px h-4 bg-border/60 hidden xl:block mx-1" />

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

            <DropdownMenu open={isProfileMenuOpen} onOpenChange={onProfileMenuOpenChange}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  data-testid="app-header-profile-button"
                  className={cn(
                    'relative inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/80 bg-muted shadow-sm transition-[opacity,transform,border-color,box-shadow,background-color]',
                    'hover:opacity-90 hover:scale-[0.98] active:scale-95 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    isProfileMenuOpen && 'ring-2 ring-primary/20 ring-offset-1 ring-offset-background border-primary/20'
                  )}
                  aria-label="Ouvrir le menu profil"
                >
                  {hasInitials ? (
                    <AvatarInitials name={safeFullName} size="lg" className="h-full w-full rounded-none" />
                  ) : (
                    <User size={16} className="text-muted-foreground" aria-hidden="true" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-1">
                <DropdownMenuLabel className="font-normal p-2">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold text-foreground truncate">{safeFullName}</p>
                    <p className="text-xs text-muted-foreground truncate">{safeEmail}</p>
                    <div className="pt-1">
                      <Badge variant="secondary" className="text-[10px] font-medium">
                        {safeRoleLabel}
                      </Badge>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onOpenAccountPanel} className="cursor-pointer">
                  Mon compte
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenSettings} disabled={isSettingsDisabled} className="cursor-pointer">
                  Paramètres
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onSignOut} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
