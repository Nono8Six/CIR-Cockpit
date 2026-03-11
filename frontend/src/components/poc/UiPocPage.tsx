import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import {
  Building2,
  LayoutDashboard,
  PenTool,
  Settings,
  Shield
} from 'lucide-react';

import { ROLE_LABELS } from '@/app/appConstants';
import { useProfileMenuDismiss } from '@/app/useProfileMenuDismiss';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import UiPocSidebar, {
  type UiPocNavItem,
  type UiPocSidebarSection
} from '@/components/poc/UiPocSidebar';
import UiPocTopbar from '@/components/poc/UiPocTopbar';
import UiPocWorkspace from '@/components/poc/UiPocWorkspace';
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
import type { UserProfile } from '@/services/auth/getProfile';
import type { AgencyMembershipSummary, UserRole } from '@/types';

const SIDEBAR_STORAGE_KEY = 'cir_ui_poc_sidebar_collapsed';
const NAV_QUERY_KEY = 'nav';

type UiPocNavItemId = UiPocNavItem['id'];

const VALID_NAV_ITEM_IDS: ReadonlySet<UiPocNavItemId> = new Set([
  'clients',
  'cockpit',
  'dashboard',
  'admin',
  'settings'
]);

const SECTION_LABELS: Record<UiPocSidebarSection['id'], string> = {
  clients: 'Clients',
  interactions: 'Interactions',
  admin: 'Admin'
};

const readCollapsedPreference = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1';
};

const isUiPocNavItemId = (value: unknown): value is UiPocNavItemId =>
  typeof value === 'string' && VALID_NAV_ITEM_IDS.has(value as UiPocNavItemId);

const getBestUserLabel = (profile: UserProfile | null, userEmail: string): string => {
  const firstName = profile?.first_name?.trim() ?? '';
  const lastName = profile?.last_name?.trim() ?? '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  if (fullName) return fullName;

  const displayName = profile?.display_name?.trim() ?? '';
  if (displayName) return displayName;

  return userEmail;
};

const getUserInitials = (profile: UserProfile | null, fullName: string, userEmail: string): string => {
  const firstName = profile?.first_name?.trim() ?? '';
  const lastName = profile?.last_name?.trim() ?? '';
  if (firstName || lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';
  }

  const words = fullName
    .replace(/@.*/, '')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length >= 2) {
    return `${words[0]?.charAt(0)}${words[1]?.charAt(0)}`.toUpperCase();
  }
  if (words.length === 1) {
    const firstWord = words[0] ?? '';
    return firstWord.slice(0, 2).toUpperCase() || 'U';
  }

  return userEmail.slice(0, 2).toUpperCase() || 'U';
};

type UiPocPageProps = {
  userEmail: string;
  userProfile: UserProfile | null;
  userRole: UserRole;
  activeAgencyId: string | null;
  agencyMemberships: AgencyMembershipSummary[];
  authReady: boolean;
  isAuthenticated: boolean;
  onAgencyChange: (agencyId: string) => Promise<void> | void;
  onOpenSearch: () => void;
  onSearchIntent?: () => void;
  onSignOut: () => void;
  onBackToCockpit: () => void;
};

const createSidebarSections = (canAccessAdmin: boolean): UiPocSidebarSection[] => {
  const sections: UiPocSidebarSection[] = [
    {
      id: 'clients',
      title: 'Clients',
      items: [
        {
          id: 'clients',
          sectionId: 'clients',
          label: 'Clients',
          icon: Building2,
          description: 'CRM'
        }
      ]
    },
    {
      id: 'interactions',
      title: 'Interactions',
      items: [
        {
          id: 'cockpit',
          sectionId: 'interactions',
          label: 'Saisie',
          icon: PenTool,
          description: 'Nouveau'
        },
        {
          id: 'dashboard',
          sectionId: 'interactions',
          label: 'Pilotage',
          icon: LayoutDashboard,
          description: 'Suivi'
        }
      ]
    }
  ];

  if (canAccessAdmin) {
    sections.push({
      id: 'admin',
      title: 'Admin',
      items: [
        {
          id: 'admin',
          sectionId: 'admin',
          label: 'Admin',
          icon: Shield,
          description: 'Utilisateurs'
        },
        {
          id: 'settings',
          sectionId: 'admin',
          label: 'Paramètres',
          icon: Settings,
          description: 'Agence'
        }
      ]
    });
  }

  return sections;
};

const UiPocPage = ({
  userEmail,
  userProfile,
  userRole,
  activeAgencyId,
  agencyMemberships,
  authReady,
  isAuthenticated,
  onAgencyChange,
  onOpenSearch,
  onSearchIntent,
  onSignOut,
  onBackToCockpit
}: UiPocPageProps) => {
  const navigate = useNavigate();
  const urlSearch = useRouterState({
    select: (state) => state.location.search as Record<string, unknown>
  });

  const canAccessAdmin = userRole !== 'tcs';
  const hasMultipleAgencies = agencyMemberships.length > 1;
  const sidebarSections = useMemo(
    () => createSidebarSections(canAccessAdmin),
    [canAccessAdmin]
  );
  const availableItemIds = useMemo<UiPocNavItemId[]>(
    () => sidebarSections.flatMap((section) => section.items.map((item) => item.id)),
    [sidebarSections]
  );
  const activeAgency = useMemo(
    () => agencyMemberships.find((agency) => agency.agency_id === activeAgencyId) ?? agencyMemberships[0] ?? null,
    [activeAgencyId, agencyMemberships]
  );

  const readNavFromUrl = useMemo(() => {
    const value = urlSearch[NAV_QUERY_KEY];
    return isUiPocNavItemId(value) ? value : null;
  }, [urlSearch]);

  const getSafeNavItem = useCallback(
    (itemId: UiPocNavItemId | null): UiPocNavItemId => {
      if (itemId && availableItemIds.includes(itemId)) {
        return itemId;
      }
      return availableItemIds[0] ?? 'clients';
    },
    [availableItemIds]
  );

  const [collapsed, setCollapsed] = useState<boolean>(readCollapsedPreference);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isAccountPanelOpen, setIsAccountPanelOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  useProfileMenuDismiss(profileMenuRef, isProfileMenuOpen, setIsProfileMenuOpen);

  const activeItemId = useMemo(
    () => getSafeNavItem(readNavFromUrl),
    [getSafeNavItem, readNavFromUrl]
  );
  const activeItem = useMemo(() => {
    const flattened = sidebarSections.flatMap((section) => section.items);
    return flattened.find((item) => item.id === activeItemId) ?? flattened[0];
  }, [activeItemId, sidebarSections]);
  const activeSectionLabel = activeItem ? SECTION_LABELS[activeItem.sectionId] : SECTION_LABELS.clients;
  const userFullName = useMemo(
    () => getBestUserLabel(userProfile, userEmail),
    [userProfile, userEmail]
  );
  const userInitials = useMemo(
    () => getUserInitials(userProfile, userFullName, userEmail),
    [userEmail, userFullName, userProfile]
  );
  const userRoleLabel = ROLE_LABELS[userRole];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    if (readNavFromUrl === activeItemId) {
      return;
    }

    void navigate({
      to: '/ui-poc',
      replace: true,
      search: (previous) => ({
        ...previous,
        [NAV_QUERY_KEY]: activeItemId
      })
    });
  }, [activeItemId, navigate, readNavFromUrl]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === '\\') {
        event.preventDefault();
        if (window.matchMedia('(max-width: 767px)').matches) {
          setMobileOpen((previous) => !previous);
          return;
        }
        setCollapsed((previous) => !previous);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenSettings = () => {
    setIsProfileMenuOpen(false);
    if (!canAccessAdmin) {
      return;
    }

    void navigate({
      to: '/ui-poc',
      search: (previous) => ({
        ...previous,
        [NAV_QUERY_KEY]: 'settings'
      })
    });
  };

  const mobileAccountSlot = (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary"
        >
          {userInitials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{userFullName}</p>
          <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
        </div>
      </div>

      <Badge variant="secondary" className="text-[10px] font-medium">
        {userRoleLabel}
      </Badge>

      {hasMultipleAgencies ? (
        <Select
          value={activeAgency?.agency_id ?? ''}
          onValueChange={(agencyId) => {
            void onAgencyChange(agencyId);
          }}
        >
          <SelectTrigger density="comfortable" className="h-9 rounded-xl text-xs font-semibold" aria-label="Agence active">
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
            handleOpenSettings();
            setMobileOpen(false);
          }}
          disabled={!canAccessAdmin}
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
            onSignOut();
          }}
        >
          Déconnexion
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-[hsl(220,15%,92%)] text-foreground">
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
                  {userInitials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{userFullName}</p>
                  <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
                </div>
              </div>

              <div className="grid gap-2">
                <p className="text-xs text-muted-foreground">Rôle</p>
                <Badge variant="secondary" className="w-fit text-[10px] font-medium">
                  {userRoleLabel}
                </Badge>
              </div>

              <div className="grid gap-2">
                <p className="text-xs text-muted-foreground">Agence active</p>
                {hasMultipleAgencies ? (
                  <Select
                    value={activeAgency?.agency_id ?? ''}
                    onValueChange={(agencyId) => {
                      void onAgencyChange(agencyId);
                    }}
                  >
                    <SelectTrigger
                      density="comfortable"
                      className="h-9 rounded-xl text-xs font-semibold"
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
                  <p className="rounded-xl border border-border/80 bg-card px-2.5 py-2 text-xs font-semibold text-foreground">
                    {activeAgency?.agency_name ?? 'Agence indisponible'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-h-[100dvh]">
        <UiPocSidebar
          sections={sidebarSections}
          activeItemId={activeItemId}
          onSelectItem={(itemId) => {
            const safeItemId = getSafeNavItem(itemId);
            if (safeItemId === activeItemId) {
              return;
            }
            void navigate({
              to: '/ui-poc',
              search: (previous) => ({
                ...previous,
                [NAV_QUERY_KEY]: safeItemId
              })
            });
          }}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((previous) => !previous)}
          mobileOpen={mobileOpen}
          onMobileOpenChange={setMobileOpen}
          mobileAccountSlot={mobileAccountSlot}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <UiPocTopbar
            activeSectionLabel={activeSectionLabel}
            activeLabel={activeItem?.label ?? 'Clients'}
            onOpenMobileMenu={() => setMobileOpen(true)}
            onBackToCockpit={onBackToCockpit}
            onOpenSearch={onOpenSearch}
            onSearchIntent={onSearchIntent}
            agencyMemberships={agencyMemberships}
            activeAgencyId={activeAgency?.agency_id ?? null}
            canSwitchAgency={hasMultipleAgencies}
            onAgencyChange={(agencyId) => {
              void onAgencyChange(agencyId);
            }}
            userEmail={userEmail}
            userFullName={userFullName}
            userInitials={userInitials}
            userRoleLabel={userRoleLabel}
            canAccessSettings={canAccessAdmin}
            profileMenuRef={profileMenuRef}
            isProfileMenuOpen={isProfileMenuOpen}
            onProfileMenuOpenChange={setIsProfileMenuOpen}
            onOpenAccountPanel={() => {
              setIsProfileMenuOpen(false);
              setIsAccountPanelOpen(true);
            }}
            onOpenSettings={handleOpenSettings}
            onSignOut={onSignOut}
          />

          <main className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
            <div className="rounded-lg border border-primary/20 bg-card px-3 py-2 text-xs text-muted-foreground">
              POC /ui-poc : navigation factuelle par sections réelles (Clients, Interactions, Admin) avec deep-link `nav`.
            </div>

            {activeItemId === 'clients' ? (
              <UiPocWorkspace
                activeAgencyId={activeAgency?.agency_id ?? activeAgencyId}
                userRole={userRole}
                agencyMemberships={agencyMemberships}
                authReady={authReady}
                isAuthenticated={isAuthenticated}
              />
            ) : (
              <section className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl border border-border/70 bg-card p-6 text-center">
                <p className="text-sm font-semibold text-foreground">
                  Vue “{activeItem?.label ?? 'Clients'}” non maquettée dans ce POC.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Le focus de cette itération est la navigation et l’UX de la page Clients.
                </p>
              </section>
            )}

            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={onBackToCockpit}>
                Quitter le POC
              </Button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default UiPocPage;
