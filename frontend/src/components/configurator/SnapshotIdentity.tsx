import { RefreshCw } from 'lucide-react';

import type { z } from 'zod/v4';
import type { motorCatalogSnapshotSchema } from 'shared/schemas/configurator/motor.schema';

import { Button } from '@/components/ui/inputs/basic/Button';
import { cn } from '@/lib/utils';

export type MotorCatalogSnapshot = z.infer<typeof motorCatalogSnapshotSchema>;

const formatActivatedAt = (activatedAt: string): string => {
  const parsed = new Date(activatedAt);
  if (Number.isNaN(parsed.getTime())) {
    return activatedAt;
  }
  return parsed.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

type SnapshotIdentityProps = {
  snapshot: MotorCatalogSnapshot;
  className?: string;
};

const FIELD_LABEL = 'row-start-1 text-[11px] font-medium text-muted-foreground';
const FIELD_VALUE = 'row-start-2 truncate text-[13px] text-foreground';

/**
 * Identite du catalogue technique sur lequel tout resultat est fonde.
 *
 * Sans elle, deux resultats obtenus a deux moments differents ne sont pas
 * comparables. Elle est donc affichee la ou l'utilisateur commence, en bandeau
 * a champs separes : la lecture d'un cartouche, pas d'une phrase.
 */
export const SnapshotIdentity = ({ snapshot, className }: SnapshotIdentityProps) => (
  <dl
    className={cn(
      'tech-raised grid grid-flow-col auto-cols-max gap-x-10 gap-y-0.5 rounded-xl bg-card px-4 py-2.5',
      className
    )}
  >
    <dt className={FIELD_LABEL}>Catalogue actif</dt>
    <dd className={FIELD_VALUE}>{snapshot.label}</dd>

    <dt className={FIELD_LABEL}>Activé le</dt>
    <dd className={FIELD_VALUE}>{formatActivatedAt(snapshot.activated_at)}</dd>

    <dt className={FIELD_LABEL}>Empreinte</dt>
    <dd className={cn(FIELD_VALUE, 'font-mono')} title={snapshot.id}>
      {snapshot.id.slice(0, 8)}
    </dd>
  </dl>
);

type SnapshotConflictNoticeProps = {
  /** Snapshot sur lequel le travail en cours a commencé. */
  expectedSnapshotId: string;
  /** Snapshot renvoyé par la dernière réponse. */
  currentSnapshotId: string;
  onReload: () => void;
  className?: string;
};

/**
 * Conflit de catalogue : un nouveau snapshot a ete active pendant le travail.
 *
 * Les resultats deja affiches ne sont plus comparables a ceux qui suivront. On
 * l'annonce explicitement au lieu de melanger silencieusement deux referentiels.
 */
export const SnapshotConflictNotice = ({
  expectedSnapshotId,
  currentSnapshotId,
  onReload,
  className
}: SnapshotConflictNoticeProps) => {
  if (expectedSnapshotId === currentSnapshotId) {
    return null;
  }

  return (
    <div
      className={cn('rounded-xl border border-warning/35 bg-warning/[0.07] p-4', className)}
      role="alert"
    >
      <p className="text-[13px] font-semibold text-warning-strong">
        Catalogue technique modifié
      </p>
      <p className="mt-1 text-[13px] leading-snug text-foreground">
        Un nouveau catalogue a été activé pendant votre travail. Les résultats affichés
        proviennent du catalogue{' '}
        <span className="font-mono">{expectedSnapshotId.slice(0, 8)}</span> et ne sont plus
        comparables à ceux du catalogue actif{' '}
        <span className="font-mono">{currentSnapshotId.slice(0, 8)}</span>.
      </p>
      <Button className="mt-3" variant="solid" size="sm" onClick={onReload}>
        <RefreshCw aria-hidden="true" />
        Recharger sur le catalogue actif
      </Button>
    </div>
  );
};
