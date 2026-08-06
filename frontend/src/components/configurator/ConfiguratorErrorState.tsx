import { RotateCw, ShieldAlert } from 'lucide-react';

import { Button } from '@/components/ui/inputs/basic/Button';
import { cn } from '@/lib/utils';
import { normalizeError } from '@/services/errors/normalizeError';

type ConfiguratorErrorStateProps = {
  error: unknown;
  fallbackMessage: string;
  onRetry?: () => void;
  className?: string;
};

/**
 * Echec d'une lecture Configurateurs.
 *
 * Le message public du catalogue d'erreurs CIR est affiche tel quel ; aucune
 * trace technique, aucun SQL et aucun diagnostic interne ne remonte a l'ecran.
 * Le `request_id` est conserve parce qu'il est la seule cle de correlation
 * utilisable au support.
 */
export const ConfiguratorErrorState = ({
  error,
  fallbackMessage,
  onRetry,
  className
}: ConfiguratorErrorStateProps) => {
  const appError = normalizeError(error, fallbackMessage);
  const isRetryable = appError.retryable !== false;

  return (
    <div
      className={cn(
        'rounded-md border border-destructive/30 bg-destructive/5 p-4',
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-2.5">
        <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-destructive">
            Lecture impossible
          </p>
          <p className="mt-0.5 text-[13px] leading-snug text-foreground">{appError.message}</p>
          <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">{appError.code}</p>
        </div>
      </div>
      {onRetry && isRetryable ? (
        <Button className="mt-3" variant="outline" size="sm" onClick={onRetry}>
          <RotateCw aria-hidden="true" />
          Réessayer
        </Button>
      ) : null}
    </div>
  );
};
