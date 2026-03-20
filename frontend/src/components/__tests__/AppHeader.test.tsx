import { fireEvent, render, screen } from '@testing-library/react';
import {
  useState,
  type AnchorHTMLAttributes,
  type ReactElement,
  type ReactNode
} from 'react';
import { describe, expect, it, vi } from 'vitest';

import { buildShellNavigation } from '@/app/appConstants';
import AppHeader from '@/components/AppHeader';

type MockLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  activeProps?: AnchorHTMLAttributes<HTMLAnchorElement>;
  children: ReactNode;
  to: string;
};

vi.mock('@tanstack/react-router', () => ({
  Link: ({ activeProps, children, to, ...props }: MockLinkProps) => (
    <a href={to} {...props} {...activeProps}>
      {children}
    </a>
  )
}));

vi.mock('@/components/app-header/AppHeaderSearchButton', () => ({
  default: () => <button type="button">Recherche</button>
}));

vi.mock('@/components/ui/dropdown-menu', async () => {
  const React = await import('react');
  type MockMenuChildProps = {
    className?: string;
    onClick?: () => void;
    role?: string;
    'aria-expanded'?: boolean;
    'aria-haspopup'?: string;
    'data-state'?: 'closed' | 'open';
  };

  const DropdownMenuContext = React.createContext<{
    open: boolean;
    setOpen: (open: boolean) => void;
  } | null>(null);

  const useDropdownMenu = () => {
    const context = React.useContext(DropdownMenuContext);
    if (!context) {
      throw new Error('DropdownMenu components must be rendered within DropdownMenu');
    }
    return context;
  };

  const DropdownMenu = ({
    children,
    open: controlledOpen,
    onOpenChange
  }: {
    children: ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
    const open = controlledOpen ?? uncontrolledOpen;
    const setOpen = (nextOpen: boolean) => {
      if (controlledOpen === undefined) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    };

    return (
      <DropdownMenuContext.Provider value={{ open, setOpen }}>
        {children}
      </DropdownMenuContext.Provider>
    );
  };

  const DropdownMenuTrigger = ({
    children
  }: {
    asChild?: boolean;
    children: ReactElement<MockMenuChildProps>;
  }) => {
    const { open, setOpen } = useDropdownMenu();

    return React.cloneElement(children, {
      'aria-expanded': open,
      'aria-haspopup': 'menu',
      'data-state': open ? 'open' : 'closed',
      onClick: () => {
        children.props.onClick?.();
        setOpen(!open);
      }
    });
  };

  const DropdownMenuContent = ({
    children,
    className
  }: {
    align?: 'start' | 'end';
    children: ReactNode;
    className?: string;
  }) => {
    const { open } = useDropdownMenu();

    if (!open) {
      return null;
    }

    return (
      <div role="menu" className={className}>
        {children}
      </div>
    );
  };

  const DropdownMenuItem = ({
    asChild,
    children,
    className,
    disabled,
    onClick
  }: {
    asChild?: boolean;
    className?: string;
    children: ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) => {
    const { setOpen } = useDropdownMenu();

    if (asChild) {
      const child = React.Children.only(children) as ReactElement<MockMenuChildProps>;

      return React.cloneElement(child, {
        className,
        onClick: () => {
          child.props.onClick?.();
          if (!disabled) {
            setOpen(false);
          }
        },
        role: 'menuitem'
      });
    }

    return (
      <button
        type="button"
        role="menuitem"
        className={className}
        data-disabled={disabled ? '' : undefined}
        disabled={disabled}
        onClick={() => {
          if (disabled) {
            return;
          }
          onClick?.();
          setOpen(false);
        }}
      >
        {children}
      </button>
    );
  };

  return {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel: ({ children, className }: { children: ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
    DropdownMenuSeparator: () => <div role="separator" />,
    DropdownMenuTrigger
  };
});

const openDropdown = (trigger: HTMLElement) => {
  fireEvent.click(trigger);
};

const renderHeader = ({
  isSettingsDisabled = false
}: {
  isSettingsDisabled?: boolean;
} = {}) => {
  const onAgencyChange = vi.fn();
  const onOpenAccountPanel = vi.fn();
  const onOpenSearch = vi.fn();
  const onOpenSettings = vi.fn();
  const onSignOut = vi.fn();

  const Wrapper = () => {
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

    return (
      <AppHeader
        sections={buildShellNavigation(true, 1)}
        activeTab="dashboard"
        activeSectionLabel="Interactions"
        activeItemLabel="Pilotage"
        agencyContext={{ agency_id: 'agency-1', agency_name: 'Agence Alpha' }}
        agencyMemberships={[{ agency_id: 'agency-1', agency_name: 'Agence Alpha' }]}
        hasMultipleAgencies={false}
        sessionEmail="a.ferron@cir.fr"
        userFullName="Arnaud Ferron"
        userInitials="AF"
        userRoleLabel="Admin agence"
        profileLoading={false}
        isContextRefreshing={false}
        isSettingsDisabled={isSettingsDisabled}
        isProfileMenuOpen={isProfileMenuOpen}
        onAgencyChange={onAgencyChange}
        onOpenSearch={onOpenSearch}
        onProfileMenuOpenChange={setIsProfileMenuOpen}
        onOpenSettings={onOpenSettings}
        onOpenAccountPanel={onOpenAccountPanel}
        onSignOut={onSignOut}
        onOpenMobileMenu={vi.fn()}
      />
    );
  };

  render(<Wrapper />);

  return {
    onAgencyChange,
    onOpenAccountPanel,
    onOpenSearch,
    onOpenSettings,
    onSignOut
  };
};

describe('AppHeader', () => {
  it('derives the current section navigation from sections and active tab', async () => {
    renderHeader();

    openDropdown(screen.getByRole('button', { name: /interactions/i }));

    expect(await screen.findByText('Saisie')).toBeInTheDocument();
    expect(screen.getAllByText('Pilotage').length).toBeGreaterThan(0);
  });

  it('opens the profile menu and wires account, settings and sign-out actions', async () => {
    const {
      onOpenAccountPanel,
      onOpenSettings,
      onSignOut
    } = renderHeader();

    const profileButton = screen.getByRole('button', { name: /ouvrir le menu profil/i });

    openDropdown(profileButton);
    fireEvent.click(await screen.findByText(/mon compte/i));
    expect(onOpenAccountPanel).toHaveBeenCalledTimes(1);

    openDropdown(profileButton);
    fireEvent.click(await screen.findByText(/paramètres/i));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);

    openDropdown(profileButton);
    fireEvent.click(await screen.findByText(/déconnexion/i));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('keeps the settings action disabled when the header is locked', async () => {
    renderHeader({ isSettingsDisabled: true });

    openDropdown(screen.getByRole('button', { name: /ouvrir le menu profil/i }));

    const settingsLabel = await screen.findByText(/paramètres/i);
    expect(settingsLabel.closest('[data-disabled]')).not.toBeNull();
  });
});
