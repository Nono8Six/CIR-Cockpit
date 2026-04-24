import type { RefObject } from 'react';
import { Building2, Circle, Factory, Globe, Megaphone, UserRound, Users } from 'lucide-react';
import type { FieldErrors } from 'react-hook-form';

import type { InteractionFormValues } from 'shared/schemas/interaction.schema';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList
} from '@/components/ui/combobox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type CockpitRelationSectionProps = {
  labelStyle: string;
  errors: FieldErrors<InteractionFormValues>;
  relationOptions: string[];
  entityType: string;
  onRelationChange: (entityType: string) => void;
  relationButtonRef: RefObject<HTMLButtonElement | null>;
};

const ALL_OPTION_VALUE = 'Tout';

const RELATION_ICONS = {
  [ALL_OPTION_VALUE]: Globe,
  'Client': Building2,
  'Prospect / Particulier': UserRound,
  'Fournisseur': Factory,
  'Sollicitation': Megaphone,
  'Interne (CIR)': Users
} as const;

const CockpitRelationSection = ({
  labelStyle,
  errors,
  relationOptions,
  entityType,
  onRelationChange,
  relationButtonRef
}: CockpitRelationSectionProps) => {
  const relationLabelId = 'cockpit-relation-label';
  const displayOptions = [ALL_OPTION_VALUE, ...relationOptions];
  const toggleValue = entityType.trim() === '' ? ALL_OPTION_VALUE : entityType;

  const handleValueChange = (value: string) => {
    if (!value) return;
    const normalized = value === ALL_OPTION_VALUE ? '' : value;
    onRelationChange(normalized);
  };

    return (
    <div className="space-y-2">
      <p id={relationLabelId} className={labelStyle}>Type de tiers</p>
      <div className="min-[769px]:hidden">
      <Combobox
        items={displayOptions}
        value={toggleValue}
        onValueChange={handleValueChange}
      >
        <ComboboxInput
          id="cockpit-relation-picker-input"
          aria-labelledby={relationLabelId}
          data-testid="cockpit-relation-picker-trigger"
          placeholder="Selectionner un type de tiers"
          searchPlaceholder="Rechercher un type de tiers..."
        />
        <ComboboxContent>
          <ComboboxEmpty>Aucun type de tiers trouve.</ComboboxEmpty>
          <ComboboxList>
            {(item) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
    <ToggleGroup
      type="single"
      value={toggleValue}
      aria-labelledby={relationLabelId}
      data-testid="cockpit-relation-group"
      size="sm"
      variant="outline"
      spacing={2}
      onValueChange={handleValueChange}
      className="hidden flex-wrap items-center justify-start gap-2 min-[769px]:flex"
    >
      {displayOptions.map((option, index) => {
        const RelationIcon = RELATION_ICONS[option as keyof typeof RELATION_ICONS] ?? Circle;

        return (
          <ToggleGroupItem
            key={option}
            ref={index === 0 ? relationButtonRef : undefined}
            value={option}
            className="h-7 max-w-full gap-1.5 whitespace-nowrap rounded-md border px-2 text-xs font-normal data-[state=on]:border-ring data-[state=on]:bg-primary data-[state=on]:text-white"
          >
            <RelationIcon size={12} className="shrink-0" aria-hidden="true" />
            {option}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
    {toggleValue === ALL_OPTION_VALUE ? (
      <p className="text-[11px] text-muted-foreground">
        Tous les types sont visibles dans la recherche. Choisissez un tiers pour préciser.
      </p>
    ) : null}
    {errors.entity_type ? (
      <p className="text-xs text-destructive" role="status" aria-live="polite">
        {errors.entity_type.message}
      </p>
    ) : null}
    </div>
  );
};

export default CockpitRelationSection;
