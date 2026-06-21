import { ClipboardCheck } from 'lucide-react';

import type { AgencyInteractionTypeConfig } from '../../../../../shared/schemas/system/config.schema';
import SettingsSectionShell from '../ui/SettingsSectionShell';
import { Switch } from '@/components/ui/inputs/basic/Switch';
import { normalizeInteractionTypeConfig, type AgencyInteractionTypeLike } from '@/services/config';

type InputRulesSectionProps = {
  readOnly: boolean;
  interactionTypes: AgencyInteractionTypeLike[];
  setInteractionTypes: (next: AgencyInteractionTypeConfig[]) => void;
};

const InputRulesSection = ({
  readOnly,
  interactionTypes,
  setInteractionTypes,
}: InputRulesSectionProps) => {
  const normalizedInteractionTypes = normalizeInteractionTypeConfig(interactionTypes);
  const enabledCount = normalizedInteractionTypes.filter((item) => item.requires_product_families).length;
  const toggleProductFamiliesRequirement = (index: number, checked: boolean) => {
    setInteractionTypes(normalizedInteractionTypes.map((item, itemIndex) => (
      itemIndex === index ? { ...item, requires_product_families: checked } : item
    )));
  };

  return (
    <SettingsSectionShell
      id="settings-section-input-rules"
      title="Règles de saisie"
      description="Définissez les champs visibles et obligatoires selon le type d'interaction sélectionné."
      icon={ClipboardCheck}
      badge={readOnly ? 'Lecture seule' : `${enabledCount} active(s)`}
      badgeTone={readOnly ? 'warning' : 'default'}
    >
      <div className="max-w-4xl border border-border/70 bg-background">
        <div className="border-b border-border/70 px-3 py-2.5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Familles produits
          </h4>
          <p className="mt-1 max-w-[68ch] text-xs leading-relaxed text-muted-foreground">
            Quand la règle est active, le choix des familles produits apparaît dans le cockpit et devient obligatoire.
          </p>
        </div>

        <div className="divide-y divide-border/60">
          {normalizedInteractionTypes.map((item, index) => (
            <div
              key={item.id ?? item.label}
              className="grid min-h-12 gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">
                  Afficher et rendre obligatoire le champ familles produits.
                </p>
              </div>
              <Switch
                checked={item.requires_product_families}
                disabled={readOnly}
                onCheckedChange={(checked) => toggleProductFamiliesRequirement(index, checked)}
                aria-label={`Familles produits obligatoires pour ${item.label}`}
              />
            </div>
          ))}
        </div>
      </div>
    </SettingsSectionShell>
  );
};

export default InputRulesSection;
