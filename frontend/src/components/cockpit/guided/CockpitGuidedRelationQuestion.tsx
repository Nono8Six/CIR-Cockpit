import type { RefObject } from 'react';
import type { FieldErrors } from 'react-hook-form';
import { Building2, Factory, Globe, Megaphone, UserRound, Users, type LucideIcon } from 'lucide-react';

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
  icon: LucideIcon;
};

const RELATION_OPTIONS: RelationOption[] = [
  { value: '', label: 'Tout', icon: Globe },
  { value: 'Client', label: 'Client', icon: Building2 },
  { value: 'Prospect / Particulier', label: 'Prospect / Particulier', icon: UserRound },
  { value: 'Fournisseur', label: 'Fournisseur', icon: Factory },
  { value: 'Sollicitation', label: 'Sollicitation', icon: Megaphone },
  { value: 'Interne (CIR)', label: 'Interne (CIR)', icon: Users }
];

const CockpitGuidedRelationQuestion = ({
  entityType,
  errors,
  onRelationChange,
  relationButtonRef,
  onComplete
}: CockpitGuidedRelationQuestionProps) => (
  <div className="grid gap-2 sm:grid-cols-2" data-testid="cockpit-guided-relation">
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
            'flex min-h-[64px] items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
            isSelected
              ? 'border-ring/50 bg-primary text-primary-foreground shadow-sm'
              : 'border-border bg-card hover:border-ring/35 hover:bg-surface-1'
          )}
          aria-pressed={isSelected}
        >
          <Icon size={17} className="shrink-0" aria-hidden="true" />
          <span className="truncate text-sm font-semibold">{option.label}</span>
        </button>
      );
    })}
    {errors.entity_type ? (
      <p className="sm:col-span-2 text-xs text-destructive" role="status" aria-live="polite">
        {errors.entity_type.message}
      </p>
    ) : null}
  </div>
);

export default CockpitGuidedRelationQuestion;
