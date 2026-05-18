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
    return (
      <CommandEmpty className="py-3" aria-live="polite">
        <div className="space-y-2 px-3" role="status" aria-label="Recherche en cours">
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex h-11 items-center gap-3 rounded-md border border-border/60 px-3">
              <span className="h-7 w-7 rounded-md bg-muted/70 animate-pulse" />
              <span className="min-w-0 flex-1 space-y-1.5">
                <span className="block h-2.5 w-2/3 rounded bg-muted/70 animate-pulse" />
                <span className="block h-2 w-1/2 rounded bg-muted/60 animate-pulse" />
              </span>
            </div>
          ))}
        </div>
      </CommandEmpty>
    );
  }

  if (status === 'error') {
    return (
      <CommandEmpty className="text-xs text-warning py-5" aria-live="polite">
        Recherche indisponible. Réessayez ou continuez en création rapide.
      </CommandEmpty>
    );
  }

  if (status === 'idle') {
    return (
      <CommandEmpty className="text-xs text-muted-foreground/80 py-5" aria-live="polite">
        Nom, téléphone, email, n° client, SIRET…
      </CommandEmpty>
    );
  }

  if (status === 'empty') {
    return (
      <CommandEmpty className="text-xs text-muted-foreground/80 py-5" aria-live="polite">
        Aucun tiers trouvé. Créez une entrée pour cette interaction.
      </CommandEmpty>
    );
  }

  return null;
};

export default InteractionSearchStatusMessage;
