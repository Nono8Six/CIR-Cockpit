import { CheckSquare, Layers, Monitor, ShieldAlert } from 'lucide-react';

import { Badge } from '../../ui/data-display/Badge';

type ProductSettingsCardProps = {
  productAllowManualEntry: boolean;
  productDefaultCompanyAccountType: 'term' | 'cash';
  productUiShellV2: boolean;
  readOnly: boolean;
  setProductAllowManualEntry: (value: boolean) => void;
  setProductDefaultCompanyAccountType: (value: 'term' | 'cash') => void;
  setProductUiShellV2: (value: boolean) => void;
};

const ProductSettingsCard = ({
  productAllowManualEntry,
  productDefaultCompanyAccountType,
  productUiShellV2,
  readOnly,
  setProductAllowManualEntry,
  setProductDefaultCompanyAccountType,
  setProductUiShellV2,
}: ProductSettingsCardProps) => {
  return (
    <section
      id="settings-section-product"
      className="scroll-mt-6 rounded-xl border border-border/80 bg-card p-6 shadow-sm transition-all hover:shadow-md"
    >
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldAlert className="size-4" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Paramètres globaux produit
            </h3>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Ces configurations définissent les comportements par défaut de toutes les agences n&apos;ayant pas appliqué de surcharge.
          </p>
        </div>
        <Badge
          variant="outline"
          className="w-fit border-primary/20 bg-primary/5 text-[10px] font-bold uppercase tracking-wider text-primary"
        >
          Super-admin
        </Badge>
      </div>

      <div className="space-y-5">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-1/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Monitor className="size-3.5 text-muted-foreground" aria-hidden="true" />
              Interface utilisateur Shell V2
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Active la nouvelle barre de navigation latérale et le shell de l&apos;application.
            </p>
          </div>
          <button
            type="button"
            disabled={readOnly}
            onClick={() => setProductUiShellV2(!productUiShellV2)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-primary focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
              productUiShellV2 ? 'bg-primary' : 'bg-clay-300'
            }`}
            aria-pressed={productUiShellV2}
          >
            <span
              className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                productUiShellV2 ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-1/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <CheckSquare className="size-3.5 text-muted-foreground" aria-hidden="true" />
              Saisie manuelle autorisée par défaut
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Permet aux agences de créer manuellement des fiches clients sans passer par l&apos;onboarding automatisé.
            </p>
          </div>
          <button
            type="button"
            disabled={readOnly}
            onClick={() => setProductAllowManualEntry(!productAllowManualEntry)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-primary focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
              productAllowManualEntry ? 'bg-primary' : 'bg-clay-300'
            }`}
            aria-pressed={productAllowManualEntry}
          >
            <span
              className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                productAllowManualEntry ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-1/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-[70%] space-y-0.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Layers className="size-3.5 text-muted-foreground" aria-hidden="true" />
              Compte entreprise par défaut
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Définit le type de compte par défaut des sociétés si aucune agence ne le surcharge.
            </p>
          </div>
          <select
            value={productDefaultCompanyAccountType}
            disabled={readOnly}
            onChange={(event) => setProductDefaultCompanyAccountType(event.target.value as 'term' | 'cash')}
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <option value="term">À terme</option>
            <option value="cash">Comptant</option>
          </select>
        </div>
      </div>
    </section>
  );
};

export default ProductSettingsCard;
