import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/inputs/basic/Button';
import { cn } from '@/lib/utils';
import { formatDateTime } from '../../utils/pricing-references-formatters';

interface ActivationConfirmProps {
  /** Date de création de l'import de la version à activer, si connue de la page. */
  targetCreatedAt: string | null;
  /** Date de création de l'import de la version actuellement active, si connue de la page. */
  activeVersionCreatedAt: string | null;
  /** Réactivation d'une version antérieure (snapshot archivé) plutôt que première activation. */
  isRollback: boolean;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
}

/**
 * Confirmation d'activation intégrée au dialog centré (jamais de window.confirm) :
 * énonce explicitement le sens de la bascule — la version qui devient la
 * référence et l'archivage consultable de la version actuellement active.
 */
export const ActivationConfirm = ({
  targetCreatedAt,
  activeVersionCreatedAt,
  isRollback,
  isPending,
  onConfirm,
  onCancel,
  className
}: ActivationConfirmProps) => {
  const targetDate = targetCreatedAt ? (
    <span className="font-medium text-stone-950">{formatDateTime(targetCreatedAt)}</span>
  ) : null;
  const confirmLabel = isRollback ? 'Réactiver' : 'Activer';

  return (
    <div className={cn('space-y-3', className)}>
      <p className="text-xs leading-relaxed text-stone-600">
        {isRollback ? (
          <>
            Vous réactivez une version antérieure :{' '}
            {targetDate ? <>la version du {targetDate}</> : <>cette version</>} redeviendra la
            référence pour toute l&apos;application.
          </>
        ) : (
          <>
            {targetDate ? <>La version du {targetDate}</> : <>Cette version</>} deviendra la
            référence pour toute l&apos;application.
          </>
        )}{' '}
        {activeVersionCreatedAt ? (
          <>
            La version actuellement active (
            <span className="font-medium text-stone-950">
              {formatDateTime(activeVersionCreatedAt)}
            </span>
            ) sera archivée mais restera consultable pour audit.
          </>
        ) : (
          <>Si une version est actuellement active, elle sera archivée mais restera consultable pour audit.</>
        )}
      </p>
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isPending}
          className="h-8 rounded-md px-3 text-xs font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-950"
        >
          Annuler
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onConfirm}
          disabled={isPending}
          aria-label={
            isRollback
              ? "Confirmer la réactivation de cette version"
              : "Confirmer l'activation de cette version"
          }
          className="h-8 gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/95 active:scale-[0.98]"
        >
          {isPending ? <RefreshCw className="size-3.5 animate-spin" aria-hidden="true" /> : null}
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
};
