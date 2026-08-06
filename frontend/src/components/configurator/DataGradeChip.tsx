import type { DataGrade } from 'shared/schemas/configurator/common.schema';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/feedback/Tooltip';
import { cn } from '@/lib/utils';
import { DATA_GRADE_DESCRIPTIONS, DATA_GRADE_LABELS } from './configuratorVocabulary';

type DataGradeChipProps = {
  /**
   * Grade documentaire d'une donnee **du catalogue technique constructeur**.
   * Ne jamais passer ici le grade d'une saisie utilisateur : une mesure terrain
   * n'a pas de grade documentaire.
   */
  catalogDataGrade: DataGrade;
  className?: string;
};

/**
 * Pave plein, angles vifs : le grade se lit comme un poincon de controle.
 * Aucun grade A n'existe encore dans la base, la nuance entre B et C porte donc
 * l'essentiel de l'information.
 */
const GRADE_STYLES: Record<DataGrade, string> = {
  A: 'bg-success text-success-foreground',
  B: 'bg-surface-3 text-foreground',
  C: 'bg-warning text-warning-foreground',
  D: 'bg-destructive text-destructive-foreground'
};

/**
 * Qualite documentaire de la donnee constructeur.
 *
 * Etat reel du catalogue : aucun grade A n'existe encore, la base est en grade B
 * et C. L'interface ne suppose donc jamais qu'un grade A confere une certitude.
 */
export const DataGradeChip = ({ catalogDataGrade, className }: DataGradeChipProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span
        className={cn(
          'inline-flex size-[18px] items-center justify-center font-mono text-[11px] font-semibold leading-none',
          GRADE_STYLES[catalogDataGrade],
          className
        )}
        data-data-grade={catalogDataGrade}
      >
        {catalogDataGrade}
        <span className="sr-only">
          {` ${DATA_GRADE_LABELS[catalogDataGrade]} — ${DATA_GRADE_DESCRIPTIONS[catalogDataGrade]}`}
        </span>
      </span>
    </TooltipTrigger>
    <TooltipContent className="max-w-xs text-[11px] leading-snug">
      <span className="font-semibold">{DATA_GRADE_LABELS[catalogDataGrade]}</span>
      {` — ${DATA_GRADE_DESCRIPTIONS[catalogDataGrade]}`}
      <span className="mt-1 block text-muted-foreground">
        Qualifie la donnée du catalogue constructeur, jamais une saisie utilisateur.
      </span>
    </TooltipContent>
  </Tooltip>
);
