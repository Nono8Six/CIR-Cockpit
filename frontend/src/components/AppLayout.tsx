import { useEffect, useState, type ReactNode } from 'react';

import { isSidebarToggleShortcut } from '@/app/appConstants';
import AppHeader from '@/components/AppHeader';
import type { AppHeaderProps } from '@/components/app-header/AppHeader.types';
import AppMainContent from '@/components/AppMainContent';
import type { AppMainContentProps } from '@/components/app-main/AppMainContent.types';
import AppSidebar from '@/components/AppSidebar';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';

const SIDEBAR_STORAGE_KEY = 'cir_shell_sidebar_collapsed';

const readCollapsedPreference = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1';
};

type AppLayoutProps = {
  headerProps: AppHeaderProps;
  mainContentProps: AppMainContentProps;
  children?: ReactNode;
};

const AppLayout = ({ headerProps, mainContentProps, children }: AppLayoutProps) => {
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsedPreference);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAccountPanelOpen, setIsAccountPanelOpen] = useState(false);
  const safeAgencyMemberships = Array.isArray(headerProps.agencyMemberships) ? headerProps.agencyMemberships : [];
  const safeUserInitials = typeof headerProps.userInitials === 'string' && headerProps.userInitials.trim().length > 0
    ? headerProps.userInitials
    : 'U';
  const safeUserFullName = typeof headerProps.userFullName === 'string' && headerProps.userFullName.trim().length > 0
    ? headerProps.userFullName
    : 'Utilisateur';
  const safeSessionEmail = typeof headerProps.sessionEmail === 'string' && headerProps.sessionEmail.trim().length > 0
    ? headerProps.sessionEmail
    : 'Email indisponible';
  const safeRoleLabel = typeof headerProps.userRoleLabel === 'string' && headerProps.userRoleLabel.trim().length > 0
    ? headerProps.userRoleLabel
    : 'Rôle indisponible';
  const activeAgency = headerProps.agencyContext ?? safeAgencyMemberships[0] ?? null;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isSidebarToggleShortcut(event)) {
        return;
      }

      event.preventDefault();

      const isMobileViewport = typeof window.matchMedia === 'function'
        && window.matchMedia('(max-width: 767px)').matches;
      if (isMobileViewport) {
        setMobileOpen((previous) => !previous);
        return;
      }

      setCollapsed((previous) => !previous);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const mobileAccountSlot = (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary"
        >
          {safeUserInitials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{safeUserFullName}</p>
          <p className="truncate text-xs text-muted-foreground">{safeSessionEmail}</p>
        </div>
      </div>

      <Badge variant="secondary" className="text-[10px] font-medium">
        {safeRoleLabel}
      </Badge>

      {headerProps.hasMultipleAgencies ? (
        <Select
          value={activeAgency?.agency_id ?? ''}
          onValueChange={headerProps.onAgencyChange}
        >
          <SelectTrigger density="comfortable" className="h-9 rounded-xl text-xs font-semibold" aria-label="Agence active">
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
        <p className="rounded-xl border border-border/80 bg-card px-2.5 py-2 text-xs font-semibold text-foreground">
          {activeAgency?.agency_name ?? 'Agence indisponible'}
        </p>
      )}

      <div className="grid grid-cols-1 gap-2">
        <Button
          type="button"
          variant="outline"
          size="dense"
          className="justify-start rounded-xl"
          onClick={() => {
            setIsAccountPanelOpen(true);
            setMobileOpen(false);
          }}
        >
          Mon compte
        </Button>
        <Button
          type="button"
          variant="outline"
          size="dense"
          className="justify-start rounded-xl"
          onClick={() => {
            headerProps.onOpenSettings();
            setMobileOpen(false);
          }}
          disabled={headerProps.isSettingsDisabled}
        >
          Paramètres
        </Button>
        <Button
          type="button"
          variant="outline"
          size="dense"
          className="justify-start rounded-xl"
          onClick={() => {
            setMobileOpen(false);
            headerProps.onSignOut();
          }}
        >
          Déconnexion
        </Button>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] w-screen overflow-hidden bg-surface-1/70 font-sans text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-xs focus:font-semibold focus:text-foreground focus:shadow-md"
      >
        Passer au contenu
      </a>

      <Sheet open={isAccountPanelOpen} onOpenChange={setIsAccountPanelOpen}>
        <SheetContent side="right" className="w-[min(92vw,380px)] p-0">
          <div className="h-full overflow-y-auto p-4">
            <SheetHeader className="pb-3">
              <SheetTitle>Mon compte</SheetTitle>
            </SheetHeader>

            <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary"
                >
                  {safeUserInitials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{safeUserFullName}</p>
                  <p className="truncate text-xs text-muted-foreground">{safeSessionEmail}</p>
                </div>
              </div>

              <div className="grid gap-2">
                <p className="text-xs text-muted-foreground">Rôle</p>
                <Badge variant="secondary" className="w-fit text-[10px] font-medium">
                  {safeRoleLabel}
                </Badge>
              </div>

              <div className="grid gap-2">
                <p className="text-xs text-muted-foreground">Agence active</p>
                {headerProps.hasMultipleAgencies ? (
                  <Select
                    value={activeAgency?.agency_id ?? ''}
                    onValueChange={headerProps.onAgencyChange}
                  >
                    <SelectTrigger
                      density="comfortable"
                      className="h-9 rounded-xl text-xs font-semibold"
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
                  <p className="rounded-xl border border-border/80 bg-card px-2.5 py-2 text-xs font-semibold text-foreground">
                    {activeAgency?.agency_name ?? 'Agence indisponible'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex h-full min-h-0">
        <AppSidebar
          sections={headerProps.sections ?? []}
          activeTab={headerProps.activeTab}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((previous) => !previous)}
          mobileOpen={mobileOpen}
          onMobileOpenChange={setMobileOpen}
          mobileAccountSlot={mobileAccountSlot}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader
            {...headerProps}
            onOpenMobileMenu={() => setMobileOpen(true)}
            onOpenAccountPanel={() => {
              headerProps.onProfileMenuOpenChange(false);
              setIsAccountPanelOpen(true);
            }}
          />
          <AppMainContent {...mainContentProps} />
        </div>
      </div>

      {children}
    </div>
  );
};

export default AppLayout;
