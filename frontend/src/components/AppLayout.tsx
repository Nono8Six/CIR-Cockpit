import type { ReactNode } from 'react';

import AppHeader from '@/components/AppHeader';
import type { AppHeaderProps } from '@/components/app-header/AppHeader.types';
import AppMainContent from '@/components/AppMainContent';
import type { AppMainContentProps } from '@/components/app-main/AppMainContent.types';

type AppLayoutProps = {
  headerProps: AppHeaderProps;
  mainContentProps: AppMainContentProps;
  children?: ReactNode;
};

const AppLayout = ({ headerProps, mainContentProps, children }: AppLayoutProps) => (
  <div className="h-[100dvh] w-screen flex flex-col bg-surface-1/70 overflow-hidden text-foreground font-sans">
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-xs focus:font-semibold focus:text-foreground focus:shadow-md"
    >
      Passer au contenu
    </a>
    <AppHeader {...headerProps} />
    <AppMainContent {...mainContentProps} />
    {children}
  </div>
);

export default AppLayout;
