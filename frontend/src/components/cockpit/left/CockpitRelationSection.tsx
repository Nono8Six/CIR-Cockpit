import type { RefObject } from 'react';
import { Building2, Factory, Megaphone, Sprout, Store, UserRound, Users } from 'lucide-react';
import type { FieldErrors } from 'react-hook-form';

import type { InteractionFormValues } from 'shared/schemas/interaction.schema';
import {
  CASH_CLIENT_RELATION_LABEL,
  INDIVIDUAL_RELATION_LABEL,
  INTERNAL_RELATION_LABEL,
  PRODUCT_RELATION_OPTIONS,
  PROSPECT_RELATION_LABEL,
  SOLICITATION_RELATION_LABEL,
  SUPPLIER_RELATION_LABEL,
  TERM_CLIENT_RELATION_LABEL
} from '@/constants/relations';
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

const RELATION_ICONS = {
  [TERM_CLIENT_RELATION_LABEL]: Building2,
  [CASH_CLIENT_RELATION_LABEL]: Store,
  [INDIVIDUAL_RELATION_LABEL]: UserRound,
  [PROSPECT_RELATION_LABEL]: Sprout,
  [SUPPLIER_RELATION_LABEL]: Factory,
  [SOLICITATION_RELATION_LABEL]: Megaphone,
  [INTERNAL_RELATION_LABEL]: Users
} as const;

const CockpitRelationSection = ({
  labelStyle,
  errors,
  entityType,
  onRelationChange,
  relationButtonRef
}: CockpitRelationSectionProps) => {
  const relationLabelId = 'cockpit-relation-label';
  const displayOptions = [...PRODUCT_RELATION_OPTIONS];
  const toggleValue = entityType.trim();

  const handleValueChange = (value: string) => {
    if (!value) return;
    onRelationChange(value);
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
          placeholder="Sélectionner un type de tiers"
          searchPlaceholder="Rechercher un type de tiers…"
        />
        <ComboboxContent>
          <ComboboxEmpty>Aucun type de tiers trouvé.</ComboboxEmpty>
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
        const RelationIcon = RELATION_ICONS[option];

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
