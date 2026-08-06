import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { MotorJourney } from './motorJourneys';

type MotorJourneyCardProps = {
  journey: MotorJourney;
  className?: string;
};

/**
 * Une entree du configurateur moteur.
 *
 * La carte enonce d'abord ce que l'utilisateur a deja en main — c'est le seul
 * critere de choix reel : quelqu'un qui arrive avec une plaque signaletique doit
 * reconnaitre son cas sans lire les quatre cartes. Le libelle du parcours vient
 * ensuite, et la sortie en gris.
 *
 * Un parcours non ouvert reste navigable et annonce sa tranche, plutot que
 * d'etre grise sans explication : une porte fermee sans ecriteau est pire qu'une
 * porte ouverte sur une piece vide.
 */
export const MotorJourneyCard = ({ journey, className }: MotorJourneyCardProps) => {
  const Icon = journey.icon;
  const isOpen = journey.availability.state === 'open';

  return (
    <Link
      to={journey.path}
      className={cn(
        'tech-raised tech-raised-hover group flex flex-col gap-3 rounded-xl bg-card p-4',
        'hover:-translate-y-px motion-reduce:transform-none motion-reduce:transition-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className
      )}
      data-journey={journey.id}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2">
          <Icon aria-hidden="true" className="size-4 text-foreground" />
        </span>
        {isOpen ? (
          <ArrowRight
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
          />
        ) : (
          <span className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted-foreground">
            {journey.availability.state === 'planned' ? journey.availability.slice : ''}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Vous avez
        </p>
        <p className="text-[13px] font-medium leading-snug text-foreground">{journey.input}</p>
      </div>
      <div className="mt-auto space-y-1 border-t border-border-subtle pt-3">
        <p className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
          {journey.label}
        </p>
        <p className="text-[12px] leading-snug text-muted-foreground">{journey.output}</p>
      </div>
    </Link>
  );
};
