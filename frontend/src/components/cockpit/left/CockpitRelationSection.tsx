import type { RefObject } from 'react';
import { Building2, Circle, Factory, Megaphone, UserRound } from 'lucide-react';
import type { FieldErrors, UseFormSetValue } from 'react-hook-form';

import type { InteractionFormValues } from '@/schemas/interactionSchema';
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
  setValue: UseFormSetValue<InteractionFormValues>;
  relationOptions: string[];
  entityType: string;
  relationButtonRef: RefObject<HTMLButtonElement | null>;
};

const RELATION_ICONS = {
  'Client': Building2,
  'Prospect / Particulier': UserRound,
  'Fournisseur': Factory,
  'Sollicitation': Megaphone,
  'Interne (CIR)': Building2
} as const;

const CockpitRelationSection = ({
  labelStyle,
  errors,
  setValue,
  relationOptions,
  entityType,
  relationButtonRef
}: CockpitRelationSectionProps) => {
  const relationLabelId = 'cockpit-relation-label';

  return (
    <div className="space-y-2">
      <label id={relationLabelId} className={labelStyle}>Relation</label>
      <div className="min-[769px]:hidden">
      <Combobox
        items={relationOptions}
        value={entityType}
        onValueChange={(value) => {
          if (!value) return;
          setValue('entity_type', value, { shouldValidate: true, shouldDirty: true });
        }}
      >
        <ComboboxInput
          id="cockpit-relation-picker-input"
          aria-labelledby={relationLabelId}
          data-testid="cockpit-relation-picker-trigger"
          placeholder="Selectionner une relation"
          searchPlaceholder="Rechercher une relation..."
        />
        <ComboboxContent>
          <ComboboxEmpty>Aucune relation trouvee.</ComboboxEmpty>
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
      value={entityType}
      aria-labelledby={relationLabelId}
      data-testid="cockpit-relation-group"
      size="sm"
      variant="outline"
      spacing={2}
      onValueChange={(value) => {
        if (!value) return;
        setValue('entity_type', value, { shouldValidate: true, shouldDirty: true });
      }}
      className="hidden flex-wrap items-center justify-start gap-2 min-[769px]:flex"
    >
      {relationOptions.map((option, index) => {
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
    {errors.entity_type ? (
      <p className="text-xs text-destructive" role="status" aria-live="polite">
        {errors.entity_type.message}
      </p>
    ) : null}
    </div>
  );
};

export default CockpitRelationSection;
