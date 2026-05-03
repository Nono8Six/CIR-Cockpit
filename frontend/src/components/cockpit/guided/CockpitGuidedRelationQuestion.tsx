import type { RefObject } from 'react';
import type { FieldErrors } from 'react-hook-form';
import { Building2, Factory, Megaphone, Sprout, Store, UserRound, Users, type LucideIcon } from 'lucide-react';

import {
  CASH_CLIENT_RELATION_LABEL,
  INDIVIDUAL_RELATION_LABEL,
  INTERNAL_RELATION_LABEL,
  PROSPECT_RELATION_LABEL,
  SUPPLIER_RELATION_LABEL,
  TERM_CLIENT_RELATION_LABEL
} from '@/constants/relations';
import { cn } from '@/lib/utils';
import type { InteractionFormValues } from 'shared/schemas/interaction.schema';

type CockpitGuidedRelationQuestionProps = {
  entityType: string;
  errors: FieldErrors<InteractionFormValues>;
  onRelationChange: (entityType: string) => void;
  relationButtonRef: RefObject<HTMLButtonElement | null>;
  onComplete: () => void;
};

type RelationOption = {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

const RELATION_OPTIONS: RelationOption[] = [
  { value: TERM_CLIENT_RELATION_LABEL, label: TERM_CLIENT_RELATION_LABEL, description: 'Société avec compte à terme', icon: Building2 },
  { value: CASH_CLIENT_RELATION_LABEL, label: CASH_CLIENT_RELATION_LABEL, description: 'Société paiement comptant', icon: Store },
  { value: INDIVIDUAL_RELATION_LABEL, label: INDIVIDUAL_RELATION_LABEL, description: 'Client personne physique', icon: UserRound },
  { value: PROSPECT_RELATION_LABEL, label: PROSPECT_RELATION_LABEL, description: 'Pas encore client', icon: Sprout },
  { value: SUPPLIER_RELATION_LABEL, label: SUPPLIER_RELATION_LABEL, description: 'Partenaire fournisseur', icon: Factory },
  { value: 'Sollicitation', label: 'Sollicitation', description: 'Démarchage entrant', icon: Megaphone },
  { value: INTERNAL_RELATION_LABEL, label: INTERNAL_RELATION_LABEL, description: 'Collègue ou autre agence', icon: Users }
];

const CockpitGuidedRelationQuestion = ({
  entityType,
  errors,
  onRelationChange,
  relationButtonRef,
  onComplete
}: CockpitGuidedRelationQuestionProps) => (
  <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="cockpit-guided-relation">
    {RELATION_OPTIONS.map((option, index) => {
      const Icon = option.icon;
      const isSelected = entityType === option.value;
      return (
        <button
          key={option.value}
          ref={index === 0 ? relationButtonRef : undefined}
          type="button"
          onClick={() => {
            onRelationChange(option.value);
            onComplete();
          }}
          className={cn(
            'group grid h-full min-h-[88px] grid-cols-[36px_minmax(0,1fr)] items-start gap-3 rounded-md border bg-card px-3.5 py-3 text-left transition-[border-color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.99]',
            isSelected
              ? 'border-primary/55 shadow-[inset_3px_0_0_0_hsl(var(--primary))]'
              : 'border-border hover:border-foreground/20 hover:shadow-soft'
          )}
          aria-pressed={isSelected}
        >
          <span
            className={cn(
              'mt-0.5 grid size-9 place-items-center rounded-md border border-border bg-surface-2 transition-colors',
              isSelected ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
            )}
          >
            <Icon size={16} aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold leading-tight text-foreground">
              {option.label}
            </span>
            <span className="mt-1 block text-[12px] leading-[1.45] text-muted-foreground">
              {option.description}
            </span>
          </span>
        </button>
      );
    })}
    {errors.entity_type ? (
      <p className="text-xs text-destructive sm:col-span-2 xl:col-span-3" role="status" aria-live="polite">
        {errors.entity_type.message}
      </p>
    ) : null}
  </div>
);

export default CockpitGuidedRelationQuestion;
