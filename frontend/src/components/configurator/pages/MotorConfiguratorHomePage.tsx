import { useCallback } from 'react';
import { Link } from '@tanstack/react-router';
import { FolderOpen } from 'lucide-react';

import { Button } from '@/components/ui/inputs/basic/Button';
import { useMotorCatalogList } from '@/hooks/configurator/useMotorCatalogList';
import { ConfiguratorErrorState } from '../ConfiguratorErrorState';
import { ConfiguratorPageShell, ConfiguratorSection } from '../ConfiguratorPageShell';
import { MotorJourneyCard } from '../MotorJourneyCard';
import { MOTOR_JOURNEYS } from '../motorJourneys';
import { SnapshotIdentity } from '../SnapshotIdentity';
import { VerdictLegend } from '../VerdictLegend';

/**
 * Une seule ligne suffit a etablir l'identite du catalogue actif : le bandeau
 * n'a pas besoin de la liste, seulement du snapshot que le backend a resolu.
 */
const SNAPSHOT_PROBE_INPUT = { limit: 1 } as const;

const SnapshotBanner = () => {
  const catalogQuery = useMotorCatalogList(SNAPSHOT_PROBE_INPUT);
  const handleRetry = useCallback(() => {
    void catalogQuery.refetch();
  }, [catalogQuery]);

  if (catalogQuery.isPending) {
    return (
      <div
        className="skeleton-shimmer h-[58px] rounded-xl motion-reduce:animate-none"
        role="status"
        aria-label="Lecture du catalogue technique en cours"
      />
    );
  }

  if (catalogQuery.isError) {
    return (
      <ConfiguratorErrorState
        error={catalogQuery.error}
        fallbackMessage="Impossible de lire le catalogue technique moteur."
        onRetry={handleRetry}
      />
    );
  }

  return <SnapshotIdentity snapshot={catalogQuery.data.snapshot} />;
};

/**
 * Accueil du configurateur moteur.
 *
 * Trois questions, dans cet ordre : sur quel catalogue je travaille, par quelle
 * entree je commence, et ce que l'outil est capable de conclure. Rien d'autre
 * n'est affiche a ce niveau.
 */
const MotorConfiguratorHomePage = () => (
  <ConfiguratorPageShell
    breadcrumbs={[
      { label: 'Configurateurs', to: '/configurateurs' },
      { label: 'Moteurs' }
    ]}
    title="Le moteur qui remplace celui-ci,"
    titleContinuation="critère par critère, preuve par preuve."
    actions={
      <Button asChild variant="outline" size="sm">
        <Link to="/configurateurs/mes-configurations">
          <FolderOpen aria-hidden="true" />
          Mes configurations
        </Link>
      </Button>
    }
    banner={<SnapshotBanner />}
  >
    <div className="mx-auto max-w-6xl space-y-10">
      <ConfiguratorSection
        id="configurator-motor-journeys"
        label="Par où commencer"
        aside={
          <span className="text-[12px] text-muted-foreground">
            Choisissez selon ce que vous avez déjà en main.
          </span>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MOTOR_JOURNEYS.map((journey) => (
            <MotorJourneyCard key={journey.id} journey={journey} />
          ))}
        </div>
      </ConfiguratorSection>

      <ConfiguratorSection id="configurator-verdict-legend" label="Ce que l’outil établit">
        <VerdictLegend />
      </ConfiguratorSection>
    </div>
  </ConfiguratorPageShell>
);

export default MotorConfiguratorHomePage;
