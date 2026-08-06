import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/inputs/basic/Button';
import { ConfiguratorPageShell } from '../ConfiguratorPageShell';
import { TechLabel } from '../TechLabel';
import { getMotorJourney, type MotorJourneyId } from '../motorJourneys';

type MotorJourneyPageProps = {
  journeyId: MotorJourneyId;
};

/**
 * Page d'un parcours moteur.
 *
 * En C5 le socle est pose mais aucun parcours n'est ouvert : la page declare
 * donc son etat de livraison plutot que d'afficher une coquille muette. Chaque
 * tranche suivante remplace ce corps par son propre contenu, sans toucher a
 * l'entete, au fil d'Ariane ni a la route.
 */
const MotorJourneyPage = ({ journeyId }: MotorJourneyPageProps) => {
  const journey = getMotorJourney(journeyId);
  const Icon = journey.icon;

  return (
    <ConfiguratorPageShell
      breadcrumbs={[
        { label: 'Configurateurs', to: '/configurateurs' },
        { label: 'Moteurs', to: '/configurateurs/moteurs' },
        { label: journey.label }
      ]}
      title={journey.label}
      titleContinuation={journey.output}
      actions={
        <Button asChild variant="outline" size="sm" className="rounded-none">
          <Link to="/configurateurs/moteurs">
            <ArrowLeft aria-hidden="true" />
            Retour aux entrées
          </Link>
        </Button>
      }
    >
      <div className="mx-auto max-w-3xl">
        <section className="flex border border-border bg-card">
          <span aria-hidden="true" className="tech-hatch w-1 shrink-0 bg-surface-3" />
          <div className="min-w-0 flex-1 p-5">
            <TechLabel>Parcours non ouvert</TechLabel>
            <h2 className="mt-3 flex items-center gap-2.5 text-[17px] font-semibold tracking-[-0.01em] text-foreground">
              <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              {journey.label}
            </h2>
            {journey.availability.state === 'planned' ? (
              <p className="mt-2 max-w-prose text-[13px] leading-snug text-muted-foreground">
                Livré par la tranche{' '}
                <span className="bg-surface-3 px-1 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                  {journey.availability.slice}
                </span>{' '}
                — {journey.availability.sliceLabel}. Le socle technique et les routes sont en
                place ; le contenu métier reste à construire.
              </p>
            ) : null}
            <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 border-t border-border-subtle pt-4 text-[13px] leading-snug">
              <dt className="text-[12px] font-medium text-muted-foreground">Entrée</dt>
              <dd className="text-foreground">{journey.input}</dd>

              <dt className="text-[12px] font-medium text-muted-foreground">Sortie</dt>
              <dd className="text-foreground">{journey.output}</dd>
            </dl>
          </div>
        </section>
      </div>
    </ConfiguratorPageShell>
  );
};

export default MotorJourneyPage;
