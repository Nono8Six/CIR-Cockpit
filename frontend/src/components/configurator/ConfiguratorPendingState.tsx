import { formatElapsedSeconds, useElapsedSeconds } from '@/hooks/configurator/useElapsedSeconds';
import { cn } from '@/lib/utils';
import { TechLabel } from './TechLabel';

type ConfiguratorPendingStateProps = {
  /** Ce qui est réellement en cours, formulé côté métier. */
  label: string;
  /**
   * Secondes au-delà desquelles l'attente est annoncée comme normale.
   * Omettre pour une requête courte : un message serait alors du bruit.
   */
  longWaitThresholdSeconds?: number;
  longWaitHint?: string;
  /** Nombre de lignes de squelette structurel affichées sous le message. */
  skeletonRows?: number;
  className?: string;
};

/**
 * Attente longue rendue lisible, sans progression fictive.
 *
 * Les equivalences durent 5,7 a 7,1 s en runtime distant. On affiche donc ce qui
 * est en cours et le temps reellement ecoule, en gros chiffres monospace — la
 * lecture d'un chronometre d'atelier. Jamais de barre de progression, de
 * pourcentage ou d'estimation qu'aucune mesure ne fonde.
 *
 * L'indicateur d'activite est une bande de trois paves qui pulsent a tour de
 * role : la meme matiere que la mosaique de verdict, donc rien de nouveau a
 * apprendre, et rien qui suggere un avancement.
 */
export const ConfiguratorPendingState = ({
  label,
  longWaitThresholdSeconds,
  longWaitHint,
  skeletonRows = 3,
  className
}: ConfiguratorPendingStateProps) => {
  const elapsedSeconds = useElapsedSeconds(true);
  const isLongWait =
    longWaitThresholdSeconds != null && elapsedSeconds >= longWaitThresholdSeconds;

  return (
    <div className={cn('space-y-3', className)} aria-busy="true">
      <div className="flex items-center gap-4 border border-border bg-card px-4 py-3" role="status">
        <span aria-hidden="true" className="flex shrink-0 items-end gap-[3px]">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="h-4 w-1.5 animate-pulse bg-foreground/70 motion-reduce:animate-none"
              style={{ animationDelay: `${String(index * 180)}ms` }}
            />
          ))}
        </span>
        <div className="min-w-0 flex-1">
          <TechLabel as="p">En cours</TechLabel>
          <p className="mt-1 text-[13px] leading-snug text-foreground">{label}</p>
          {isLongWait && longWaitHint ? (
            <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{longWaitHint}</p>
          ) : null}
        </div>
        <span
          className="shrink-0 font-mono text-[20px] tabular-nums leading-none text-foreground"
          aria-label={`Temps écoulé : ${elapsedSeconds} secondes`}
        >
          {formatElapsedSeconds(elapsedSeconds)}
        </span>
      </div>
      {skeletonRows > 0 ? (
        <div aria-hidden="true" className="border-l border-t border-border">
          {Array.from({ length: skeletonRows }, (_unused, index) => (
            <div
              key={index}
              className="skeleton-shimmer tech-cell h-14 motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};
