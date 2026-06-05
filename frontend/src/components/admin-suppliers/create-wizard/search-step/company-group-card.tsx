import { ChevronsRight, MapPin } from 'lucide-react';

import { cn } from '@/lib/utils';
import { EntityRecordWizardRecordRow } from '@/components/entity-record-wizard/EntityRecordWizardRows';
import type { CompanySearchGroup } from '../../../entity-onboarding/entityOnboarding.types';
import { Badge } from '../../../ui/data-display/Badge';

interface CompanyGroupCardProps {
  group: CompanySearchGroup;
  isActive: boolean;
  onSelect: () => void;
}

/**
 * Renders a clickable header card for a company search result group.
 * @param {CompanyGroupCardProps} props - The component props.
 * @returns {JSX.Element} The rendered group card.
 */
const CompanyGroupCard = ({ group, isActive, onSelect }: CompanyGroupCardProps) => {
  const hiddenOfficialCount = Math.max(group.totalEstablishmentCount - group.establishments.length, 0);
  const cities = Array.from(new Set(group.establishments.map((company) => company.city).filter(Boolean))).slice(0, 3);

  return (
    <EntityRecordWizardRecordRow active={isActive}>
    <button
      type="button"
      aria-expanded={isActive}
      className={cn(
        'group/grp relative flex w-full flex-col items-start gap-3 px-4 py-4 text-left transition-[background-color,color] duration-200 cursor-pointer',
        isActive ? 'font-bold' : 'text-muted-foreground hover:bg-surface-1/55',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-inset'
      )}
      onClick={onSelect}
    >
      <span className="flex w-full items-start justify-between gap-4">
        <span className="min-w-0 space-y-2">
          <span className="flex flex-wrap items-center gap-2">
            <span className={cn(
              'truncate text-base font-bold transition-colors',
              isActive ? 'text-foreground font-black' : 'text-foreground/90 group-hover/grp:text-foreground'
            )}>
              {group.label}
            </span>
            {group.siren ? (
              <Badge variant="outline" className="font-mono tabular-nums text-[10px] px-1.5 py-0.5 bg-background/50">
                SIREN {group.siren}
              </Badge>
            ) : null}
          </span>
          {group.subtitle ? (
            <span className="block text-xs text-muted-foreground/80 font-medium">
              {group.subtitle}
            </span>
          ) : null}
          <span className="flex flex-wrap gap-2 pt-1">
            <Badge variant="outline" className="text-[10px] bg-background/40">
              {group.totalEstablishmentCount} site{group.totalEstablishmentCount > 1 ? 's' : ''}
            </Badge>
            <Badge variant="outline" className="text-[10px] border-success/20 bg-success/5 text-success font-medium">
              {group.openEstablishmentCount} actif{group.openEstablishmentCount > 1 ? 's' : ''}
            </Badge>
            {group.closedEstablishmentCount > 0 ? (
              <Badge variant="outline" className="text-[10px] border-destructive/20 bg-destructive/5 text-destructive font-medium">
                {group.closedEstablishmentCount} fermé{group.closedEstablishmentCount > 1 ? 's' : ''}
              </Badge>
            ) : null}
            {group.unknownEstablishmentCount > 0 ? (
              <Badge variant="outline" className="text-[10px] bg-background/40">
                {group.unknownEstablishmentCount} inconnu{group.unknownEstablishmentCount > 1 ? 's' : ''}
              </Badge>
            ) : null}
          </span>
        </span>
        <ChevronsRight
          className={cn(
            'mt-1 size-5 shrink-0 text-muted-foreground/60 transition-transform duration-200',
            isActive && 'rotate-90 text-primary'
          )}
          aria-hidden="true"
        />
      </span>
      {cities.length > 0 && !isActive ? (
        <span className="flex flex-wrap gap-3 text-xs font-medium text-muted-foreground/90 pt-1">
          {cities.map((cityName) => (
            <span key={cityName} className="inline-flex items-center gap-1 bg-surface-2 px-2 py-0.5 rounded">
              <MapPin className="size-3 text-muted-foreground/75" aria-hidden="true" />
              {cityName}
            </span>
          ))}
        </span>
      ) : null}
      {hiddenOfficialCount > 0 ? (
        <span className="text-xs text-muted-foreground/85 font-medium">
          {hiddenOfficialCount} autre{hiddenOfficialCount > 1 ? 's' : ''} site{hiddenOfficialCount > 1 ? 's' : ''} officiel{hiddenOfficialCount > 1 ? 's' : ''} hors de la liste actuelle.
        </span>
      ) : null}
    </button>
    </EntityRecordWizardRecordRow>
  );
};

export default CompanyGroupCard;
