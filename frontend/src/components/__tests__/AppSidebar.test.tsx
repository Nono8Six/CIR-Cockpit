import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

import { buildShellNavigation, SIDEBAR_TOGGLE_SHORTCUT_ARIA } from '@/app/appConstants';
import AppSidebar from '@/components/AppSidebar';

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

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <div role="tooltip">{children}</div>
}));

describe('AppSidebar', () => {
  it('renders the pending meta label and shortcut in expanded mode', () => {
    render(
      <AppSidebar
        sections={buildShellNavigation(true, 1)}
        activeTab="dashboard"
        collapsed={false}
        onToggleCollapsed={vi.fn()}
        mobileOpen={false}
        onMobileOpenChange={vi.fn()}
      />
    );

    const dashboardLink = screen.getByTestId('app-shell-nav-dashboard');
    expect(dashboardLink).toHaveTextContent('Pilotage');
    expect(dashboardLink).toHaveTextContent('1');
    expect(dashboardLink).toHaveTextContent('F4');

    expect(screen.getByRole('button', { name: /réduire le menu/i })).toHaveAttribute(
      'aria-keyshortcuts',
      SIDEBAR_TOGGLE_SHORTCUT_ARIA
    );
  });

  it('keeps collapsed navigation labels and tooltips descriptive', () => {
    render(
      <AppSidebar
        sections={buildShellNavigation(true, 1)}
        activeTab="dashboard"
        collapsed
        onToggleCollapsed={vi.fn()}
        mobileOpen={false}
        onMobileOpenChange={vi.fn()}
      />
    );

    const dashboardLink = screen.getByRole('link', {
      name: /interactions - pilotage - 1 - f4/i
    });

    expect(dashboardLink).toBeInTheDocument();

    const dashboardTooltip = screen.getByText('1').closest('[role="tooltip"]');
    expect(dashboardTooltip).not.toBeNull();

    const tooltip = dashboardTooltip as HTMLElement;

    expect(within(tooltip).getByText('Interactions')).toBeInTheDocument();
    expect(within(tooltip).getByText('Pilotage')).toBeInTheDocument();
    expect(within(tooltip).getByText('F4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /déplier le menu/i })).toHaveAttribute(
      'aria-keyshortcuts',
      SIDEBAR_TOGGLE_SHORTCUT_ARIA
    );
  });
});
