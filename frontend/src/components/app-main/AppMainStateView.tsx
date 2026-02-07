import { Button } from '@/components/ui/button';

type AppMainStateViewProps = {
  isContextBlocking: boolean;
  isDataLoading: boolean;
  hasDataError: boolean;
  isInteractionTab: boolean;
  activeAgencyId: string | null;
  contextError: string | null;
  onReloadData: () => void;
};

const AppMainStateView = ({
  isContextBlocking,
  isDataLoading,
  hasDataError,
  isInteractionTab,
  activeAgencyId,
  contextError,
  onReloadData
}: AppMainStateViewProps) => {
  if (isContextBlocking && isInteractionTab) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 text-sm">
        Chargement du contexte agence...
      </div>
    );
  }

  if (!isContextBlocking && isDataLoading && isInteractionTab) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 text-sm">
        Chargement des donnees...
      </div>
    );
  }

  if (!isContextBlocking && !isDataLoading && hasDataError && isInteractionTab) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-center max-w-md">
          <p className="text-sm text-slate-600">
            Impossible de charger les donnees. Verifiez votre connexion puis reessayez.
          </p>
          <Button className="mt-4 w-full" onClick={onReloadData}>
            Recharger
          </Button>
        </div>
      </div>
    );
  }

  if (!isContextBlocking && !isDataLoading && isInteractionTab && !activeAgencyId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-center max-w-md">
          <h2 className="text-sm font-semibold text-slate-900">Aucune agence active</h2>
          <p className="text-sm text-slate-600 mt-2">
            {contextError ?? "Vous n'etes associe a aucune agence. Contactez un administrateur."}
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default AppMainStateView;
