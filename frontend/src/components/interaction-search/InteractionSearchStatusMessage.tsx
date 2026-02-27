import { CommandEmpty } from '@/components/ui/command';

export type InteractionSearchStatus =
  | 'loading'
  | 'error'
  | 'idle'
  | 'empty'
  | 'results';

type InteractionSearchStatusMessageProps = {
  status: InteractionSearchStatus;
};

const InteractionSearchStatusMessage = ({
  status
}: InteractionSearchStatusMessageProps) => {
  if (status === 'loading') {
    return <CommandEmpty className="text-xs text-muted-foreground/80 py-5">Chargement...</CommandEmpty>;
  }

  if (status === 'error') {
    return (
      <CommandEmpty className="text-xs text-warning py-5">
        Recherche indisponible.
      </CommandEmpty>
    );
  }

  if (status === 'idle') {
    return (
      <CommandEmpty className="text-xs text-muted-foreground/80 py-5">
        Commencez a taper pour rechercher.
      </CommandEmpty>
    );
  }

  if (status === 'empty') {
    return <CommandEmpty className="text-xs text-muted-foreground/80 py-5">Aucun resultat.</CommandEmpty>;
  }

  return null;
};

export default InteractionSearchStatusMessage;
