import { memo, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useReducedMotion } from 'motion/react';
import { getPathForShellNavItem, isShellNavItemActive } from '@/app/appRoutes';
import { Bell, ChevronDown, Menu, User } from 'lucide-react';

import type { AppHeaderProps } from '@/components/app-header/AppHeader.types';
import { APP_SHELL_CLASSES, APP_SHELL_DIMENSIONS } from '@/components/app-shell/appShellTokens';
import AppHeaderSearchButton from '@/components/app-header/AppHeaderSearchButton';
import AvatarInitials from './ui/data-display/AvatarInitials';
import { Badge } from './ui/data-display/Badge';
import { Button } from './ui/inputs/basic/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from './ui/navigation/DropdownMenu';
import { cn } from '@/lib/utils';
import type { AppTab } from '@/types';

const AppHeader = ({
  sections,
  activeTab,
  activePath,
  activeSectionLabel,
  activeItemLabel,
  sessionEmail,
  userFullName,
  userInitials,
  userRoleLabel,
  profileLoading,
  isContextRefreshing,
  isSettingsDisabled,
  isProfileMenuOpen,
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
  const hasInitials = safeInitials.length > 0;
  const reducedMotion = useReducedMotion() ?? false;
  const currentSectionItems = safeSections.find((section) => section.items.some((item) => item.id === activeTab))?.items ?? [];

  return (
    <header className="sticky top-0 z-20 bg-background/95 backdrop-blur">
      <div className={cn('flex items-center gap-2 px-3 sm:px-4', APP_SHELL_DIMENSIONS.headerHeightClass)}>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={cn(APP_SHELL_CLASSES.control, 'md:hidden')}
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
                    className="inline-flex h-8 max-w-[12rem] items-center gap-1 rounded-lg px-2 text-[12.5px] font-medium text-muted-foreground transition-[background-color,color,box-shadow] duration-150 hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <span className="truncate">{safeSectionLabel}</span>
                    <ChevronDown size={14} className="opacity-50 transition-transform group-data-[state=open]:rotate-180" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {currentSectionItems.map((item) => (
                    <DropdownMenuItem key={item.id} asChild>
                      <Link
                        to={getPathForShellNavItem(item)}
                        className={cn(
                          'flex w-full items-center gap-2 cursor-pointer',
                          isShellNavItemActive(item, activeTab, activePath) && 'bg-muted font-medium text-foreground'
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
            <span className="select-none text-muted-foreground/50">/</span>
            <h1 className="truncate text-[12.5px] font-semibold text-foreground">
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

          <div className="mx-1 hidden h-4 w-px bg-border/60 xl:block" />

          <AppHeaderSearchButton
            onOpenSearch={onOpenSearch}
            onSearchIntent={onSearchIntent}
          />

          <button
            type="button"
            aria-label="Notifications"
            className={cn(APP_SHELL_CLASSES.control, 'hidden md:inline-flex')}
          >
            <Bell size={14} aria-hidden="true" />
          </button>

          <div className="hidden items-center gap-2 md:flex">
            <DropdownMenu open={isProfileMenuOpen} onOpenChange={onProfileMenuOpenChange}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  data-testid="app-header-profile-button"
                  className={cn(
                    'relative inline-flex shrink-0 items-center justify-center overflow-hidden',
                    APP_SHELL_CLASSES.controlRound,
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
