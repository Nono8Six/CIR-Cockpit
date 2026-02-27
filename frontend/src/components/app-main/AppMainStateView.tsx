import { Button } from '@/components/ui/button';
import type { AppMainViewState } from './AppMainContent.types';

type AppMainStateViewProps = {
  mainViewState: AppMainViewState;
  onReloadData: () => void;
};

const AppMainStateView = ({
  mainViewState,
  onReloadData
}: AppMainStateViewProps) => {
  if (mainViewState.kind === 'context-loading') {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground/80 text-sm">
        Chargement du contexte agence...
      </div>
    );
  }

  if (mainViewState.kind === 'data-loading') {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground/80 text-sm">
        Chargement des donnees...
      </div>
    );
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
