import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/inputs/basic/Button';
import { ConfiguratorPageShell } from '../ConfiguratorPageShell';
import { TechLabel } from '../TechLabel';

/**
 * Configurations sauvegardees, tous domaines confondus.
 *
 * La page est transverse par construction : elle ne depend d'aucun domaine et
 * accueillera aussi bien les configurations moteur que celles des futurs
 * configurateurs. Son contenu est livre par la tranche C8.
 */
const SavedConfigurationsPage = () => (
  <ConfiguratorPageShell
    breadcrumbs={[
      { label: 'Configurateurs', to: '/configurateurs' },
      { label: 'Mes configurations' }
    ]}
    title="Mes configurations,"
    titleContinuation="personnelles ou partagées avec votre agence."
    actions={
      <Button asChild variant="outline" size="sm" className="rounded-none">
        <Link to="/configurateurs/moteurs">
          <ArrowLeft aria-hidden="true" />
          Configurateur moteurs
        </Link>
      </Button>
    }
  >
    <div className="mx-auto max-w-3xl">
      <section className="flex border border-border bg-card">
        <span aria-hidden="true" className="tech-hatch w-1 shrink-0 bg-surface-3" />
        <div className="min-w-0 flex-1 p-5">
          <TechLabel>Enregistrement non ouvert</TechLabel>
          <p className="mt-3 max-w-prose text-[13px] leading-snug text-muted-foreground">
            Livré par la tranche{' '}
            <span className="bg-surface-3 px-1 py-0.5 font-mono text-[11px] font-semibold text-foreground">
              C8
            </span>
            , avec deux portées : personnelle et partagée avec l’agence. Aucune configuration
            n’est enregistrée aujourd’hui : rien n’est perdu, rien n’est en attente.
          </p>
        </div>
      </section>
    </div>
  </ConfiguratorPageShell>
);

export default SavedConfigurationsPage;
