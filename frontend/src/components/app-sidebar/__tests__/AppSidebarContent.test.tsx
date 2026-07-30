import { fireEvent, render, screen } from '@testing-library/react';
import type { AnchorHTMLAttributes, ReactElement, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { buildShellNavigation } from '@/app/appConstants';
import AppSidebarContent from '@/components/app-sidebar/AppSidebarContent';

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

vi.mock('@/components/ui/navigation/DropdownMenu', async () => {
  const React = await import('react');

  const OpenContext = React.createContext<{
    open: boolean;
    setOpen: (open: boolean) => void;
  } | null>(null);
  const RadioContext = React.createContext<{
    value?: string;
    onValueChange?: (value: string) => void;
  } | null>(null);

  const useOpen = () => {
    const context = React.useContext(OpenContext);
    if (!context) {
      throw new Error('DropdownMenu components must be rendered within DropdownMenu');
    }
    return context;
  };

  const DropdownMenu = ({ children }: { children: ReactNode }) => {
    const [open, setOpen] = React.useState(false);
    return <OpenContext.Provider value={{ open, setOpen }}>{children}</OpenContext.Provider>;
  };

  const DropdownMenuTrigger = ({
    children
  }: {
    asChild?: boolean;
    children: ReactElement<{ onClick?: () => void }>;
  }) => {
    const { open, setOpen } = useOpen();
    return React.cloneElement(children, { onClick: () => setOpen(!open) });
  };

  const DropdownMenuContent = ({ children }: { children: ReactNode; align?: string; className?: string }) => {
    const { open } = useOpen();
    return open ? <div role="menu">{children}</div> : null;
  };

  return {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuLabel: ({ children }: { children: ReactNode; className?: string }) => <div>{children}</div>,
    DropdownMenuSeparator: () => <div role="separator" />,
    DropdownMenuRadioGroup: ({
      children,
      value,
      onValueChange
    }: {
      children: ReactNode;
      value?: string;
      onValueChange?: (value: string) => void;
    }) => (
      <RadioContext.Provider value={{ value, onValueChange }}>{children}</RadioContext.Provider>
    ),
    DropdownMenuRadioItem: ({
      children,
      value
    }: {
      children: ReactNode;
      value: string;
      className?: string;
    }) => {
      const group = React.useContext(RadioContext);
      return (
        <button
          type="button"
          role="menuitemradio"
          aria-checked={group?.value === value}
          onClick={() => group?.onValueChange?.(value)}
        >
          {children}
        </button>
      );
    }
  };
});

const baseProps = {
  sections: buildShellNavigation(true, 0),
  activeTab: 'dashboard' as const,
  activePath: '/dashboard',
  agencyName: 'Agence Alpha',
  collapsed: false
};

describe('AppSidebarContent — sélecteur d\'agence', () => {
  it('permet de changer d\'agence quand l\'utilisateur en a plusieurs', async () => {
    const onAgencyChange = vi.fn();

    render(
      <AppSidebarContent
        {...baseProps}
        agencyMemberships={[
          { agency_id: 'agency-1', agency_name: 'Agence Alpha' },
          { agency_id: 'agency-2', agency_name: 'Agence Beta' }
        ]}
        activeAgencyId="agency-1"
        onAgencyChange={onAgencyChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: "Changer d'agence" }));
    fireEvent.click(await screen.findByRole('menuitemradio', { name: 'Agence Beta' }));

    expect(onAgencyChange).toHaveBeenCalledWith('agency-2');
  });

  it("rend un affichage non interactif quand l'utilisateur n'a qu'une agence", () => {
    render(
      <AppSidebarContent
        {...baseProps}
        agencyMemberships={[{ agency_id: 'agency-1', agency_name: 'Agence Alpha' }]}
        activeAgencyId="agency-1"
        onAgencyChange={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: "Changer d'agence" })).toBeNull();
    expect(screen.getByText('Agence Alpha')).toBeInTheDocument();
  });
});
