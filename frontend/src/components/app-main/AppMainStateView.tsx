import { Button } from '@/components/ui/button';
import type { AppTab } from '@/types';
import type { AppMainViewState } from './AppMainContent.types';

type AppMainStateViewProps = {
  mainViewState: AppMainViewState;
  activeTab: AppTab;
  onReloadData: () => void;
};

const CockpitSkeleton = () => (
  <div className="flex h-full min-h-0 flex-col rounded-lg border border-border bg-card shadow-sm">
    {/* Header stepper */}
    <div className="flex items-center gap-6 border-b border-border px-6 py-3">
      {[120, 96, 100, 88, 140].map((w, i) => (
        <div key={i} className="skeleton-shimmer h-4 rounded" style={{ width: w }} />
      ))}
    </div>
    {/* Body : gauche + droite */}
    <div className="flex flex-1 min-h-0">
      <div className="flex flex-col gap-4 border-r border-border p-6 w-[55%]">
        <div className="skeleton-shimmer h-3 w-14 rounded mb-1" />
        <div className="flex gap-2">
          {[80, 72, 84, 64].map((w, i) => (
            <div key={i} className="skeleton-shimmer h-9 rounded-lg" style={{ width: w }} />
          ))}
        </div>
        <div className="skeleton-shimmer h-3 w-[72px] rounded mt-2" />
        <div className="flex gap-2 flex-wrap">
          {[72, 120, 96, 108, 120].map((w, i) => (
            <div key={i} className="skeleton-shimmer h-9 rounded-lg" style={{ width: w }} />
          ))}
        </div>
        <div className="skeleton-shimmer h-10 w-full rounded-lg mt-2" />
      </div>
      <div className="flex flex-col gap-4 p-6 flex-1">
        <div className="skeleton-shimmer h-24 w-full rounded-lg" />
        <div className="skeleton-shimmer h-3 w-16 rounded" />
        <div className="flex gap-2">
          {[96, 104, 112, 80].map((w, i) => (
            <div key={i} className="skeleton-shimmer h-9 rounded-lg" style={{ width: w }} />
          ))}
        </div>
        <div className="skeleton-shimmer mt-auto h-14 w-full rounded-xl" />
      </div>
    </div>
  </div>
);

const DashboardSkeleton = () => (
  <div className="flex h-full min-h-0 flex-col rounded-lg border border-border bg-card shadow-sm">
    {/* Toolbar */}
    <div className="flex items-center gap-3 border-b border-border px-4 py-3">
      <div className="skeleton-shimmer h-8 w-56 rounded-lg" />
      <div className="skeleton-shimmer h-8 w-48 rounded-lg" />
      <div className="ml-auto skeleton-shimmer h-8 w-56 rounded-lg" />
    </div>
    {/* 3 colonnes */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0 p-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="skeleton-shimmer h-4 w-36 rounded" />
          {[1, 2].map((j) => (
            <div key={j} className="skeleton-shimmer rounded-xl" style={{ height: 88 }} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

const AppMainStateView = ({
  mainViewState,
  activeTab,
  onReloadData
}: AppMainStateViewProps) => {
  if (mainViewState.kind === 'context-loading' || mainViewState.kind === 'data-loading') {
    if (activeTab === 'dashboard') return <DashboardSkeleton />;
    return <CockpitSkeleton />;
  }

  if (mainViewState.kind === 'data-error') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm text-center max-w-md">
          <p className="text-sm text-muted-foreground">
            Impossible de charger les donnees. Verifiez votre connexion puis reessayez.
          </p>
          <Button className="mt-4 w-full" onClick={onReloadData}>
            Recharger
          </Button>
        </div>
      </div>
    );
  }

  if (mainViewState.kind === 'missing-agency') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm text-center max-w-md">
          <h2 className="text-sm font-semibold text-foreground">Aucune agence active</h2>
          <p className="text-sm text-muted-foreground mt-2">
            {mainViewState.contextError ?? "Vous n'etes associe a aucune agence. Contactez un administrateur."}
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default AppMainStateView;
