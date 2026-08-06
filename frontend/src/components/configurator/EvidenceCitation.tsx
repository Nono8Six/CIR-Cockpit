import type { ConfiguratorEvidence } from 'shared/schemas/configurator/common.schema';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/navigation/Popover';
import { cn } from '@/lib/utils';
import { EvidenceList } from './EvidenceList';

type EvidenceCitationProps = {
  /** Rang du marqueur dans le texte, à partir de 1. */
  index: number;
  evidence: readonly ConfiguratorEvidence[];
  className?: string;
};

/**
 * Marqueur de citation en exposant, pose directement dans l'explication.
 *
 * La provenance cesse d'etre un bouton en bas de bloc pour devenir un renvoi
 * a l'endroit exact du texte qu'elle fonde — la meme mecanique qu'une note de
 * bas de page. C'est la seule forme qui reponde vraiment a « d'ou vient cette
 * affirmation ? », parce qu'elle repond phrase par phrase et non par critere.
 *
 * Le marqueur est un vrai bouton : atteignable au clavier, Escape referme, et
 * le focus revient au marqueur.
 */
export const EvidenceCitation = ({ index, evidence, className }: EvidenceCitationProps) => {
  if (evidence.length === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'ml-0.5 inline-flex h-[15px] min-w-[15px] items-center justify-center rounded bg-surface-3 px-1 align-super font-mono text-[10px] font-semibold leading-none text-muted-foreground',
            'transition-colors duration-150 hover:bg-foreground hover:text-background motion-reduce:transition-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
            className
          )}
          aria-label={`Provenance ${index} : ${String(evidence.length)} preuve${evidence.length > 1 ? 's' : ''}`}
        >
          {index}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(26rem,calc(100vw-2rem))] p-3"
      >
        <p className="mb-2 text-[11px] font-medium text-muted-foreground">
          Provenance de cette affirmation
        </p>
        <EvidenceList evidence={evidence} />
      </PopoverContent>
    </Popover>
  );
};

type CitedTextProps = {
  children: string;
  evidence: readonly ConfiguratorEvidence[];
  /** Rang du marqueur, à partir de 1. */
  index: number;
  className?: string;
};

/**
 * Fragment de texte suivi de son marqueur de provenance. Sert a fonder une
 * phrase produite par le backend sans jamais la reecrire.
 */
export const CitedText = ({ children, evidence, index, className }: CitedTextProps) => (
  <span className={className}>
    {children}
    <EvidenceCitation index={index} evidence={evidence} />
  </span>
);
