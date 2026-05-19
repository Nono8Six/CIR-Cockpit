import { Layers3 } from 'lucide-react';
import SettingsSelectField from './SettingsSelectField';
import { Badge } from '../../ui/data-display/Badge';

type GeneralSettingsCardProps = {
  allowManualEntryOverride: 'inherit' | 'enabled' | 'disabled';
  defaultCompanyAccountTypeOverride: 'inherit' | 'term' | 'cash';
  productAllowManualEntry: boolean;
  productDefaultCompanyAccountType: 'term' | 'cash';
  readOnly: boolean;
  setAllowManualEntryOverride: (value: 'inherit' | 'enabled' | 'disabled') => void;
  setDefaultCompanyAccountTypeOverride: (value: 'inherit' | 'term' | 'cash') => void;
};

/**
 * Bento card representing Agency-level onboarding parameters.
 * Visualizes visual inheritance clearly using select overlays.
 */
const GeneralSettingsCard = ({
  allowManualEntryOverride,
  defaultCompanyAccountTypeOverride,
  productAllowManualEntry,
  productDefaultCompanyAccountType,
  readOnly,
  setAllowManualEntryOverride,
  setDefaultCompanyAccountTypeOverride,
}: GeneralSettingsCardProps) => {
  const parentManualEntryLabel = productAllowManualEntry ? 'Autorisé' : 'Bloqué';
  const parentAccountTypeLabel =
    productDefaultCompanyAccountType === 'term' ? 'À terme' : 'Comptant';

  return (
    <section
      id="settings-section-general"
      className="scroll-mt-6 rounded-xl border border-border/80 bg-card p-6 shadow-sm transition-all hover:shadow-md"
    >
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers3 className="size-4" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Paramètres onboarding agence
            </h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Ces surcharges s&apos;appliquent seulement à l&apos;agence active et complètent les valeurs par défaut du produit.
          </p>
        </div>
        <Badge
          variant="outline"
          className="w-fit border-border bg-surface-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
        >
          {readOnly ? 'Agence • Lecture Seule' : 'Agence'}
        </Badge>
      </div>

      <div className="space-y-4">
        <SettingsSelectField
          label="Saisie manuelle"
          description="Choisit si l'agence hérite du comportement global ou force l'activation/désactivation de la saisie manuelle."
          value={allowManualEntryOverride}
          onValueChange={(val) =>
            setAllowManualEntryOverride(val as 'inherit' | 'enabled' | 'disabled')
          }
          disabled={readOnly}
          parentValueLabel={parentManualEntryLabel}
          items={[
            { value: 'inherit', label: 'Hériter du produit' },
            { value: 'enabled', label: 'Toujours autoriser' },
            { value: 'disabled', label: 'Toujours bloquer' },
          ]}
        />

        <SettingsSelectField
          label="Compte entreprise par défaut"
          description="Fixe le type de compte appliqué par défaut lors de la création d'un client société."
          value={defaultCompanyAccountTypeOverride}
          onValueChange={(val) =>
            setDefaultCompanyAccountTypeOverride(val as 'inherit' | 'term' | 'cash')
          }
          disabled={readOnly}
          parentValueLabel={parentAccountTypeLabel}
          items={[
            { value: 'inherit', label: 'Hériter du produit' },
            { value: 'term', label: 'À terme' },
            { value: 'cash', label: 'Comptant' },
          ]}
        />

        <div className="rounded-lg border border-border bg-surface-1/40 px-3 py-2.5 text-xs text-muted-foreground">
          Les particuliers restent forcés en <strong>comptant</strong>. Ce point est volontairement hors paramétrage.
        </div>
      </div>
    </section>
  );
};

export default GeneralSettingsCard;
