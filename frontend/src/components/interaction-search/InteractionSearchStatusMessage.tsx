import { CommandEmpty } from '@/components/ui/command';

type InteractionSearchStatusMessageProps = {
  resolvedLoading: boolean;
  showSearchError: boolean;
  showResults: boolean;
  showRecents: boolean;
  hasResults: boolean;
};

const InteractionSearchStatusMessage = ({
  resolvedLoading,
  showSearchError,
  showResults,
  showRecents,
  hasResults
}: InteractionSearchStatusMessageProps) => {
  if (resolvedLoading) {
    return <CommandEmpty className="text-xs text-slate-400 py-5">Chargement...</CommandEmpty>;
  }

  if (showSearchError) {
    return (
      <CommandEmpty className="text-xs text-amber-600 py-5">
        Recherche indisponible.
      </CommandEmpty>
    );
  }

  if (!showResults && !showRecents) {
    return (
      <CommandEmpty className="text-xs text-slate-400 py-5">
        Commencez a taper pour rechercher.
      </CommandEmpty>
    );
  }

  if (showResults && !hasResults) {
    return <CommandEmpty className="text-xs text-slate-400 py-5">Aucun resultat.</CommandEmpty>;
  }

  return null;
};

export default InteractionSearchStatusMessage;
