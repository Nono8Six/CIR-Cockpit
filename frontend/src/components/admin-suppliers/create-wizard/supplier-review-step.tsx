import { CheckCircle2 } from 'lucide-react';

import { Badge } from '../../ui/data-display/Badge';
import type { SupplierDraft } from './use-supplier-onboarding';

interface SupplierReviewStepProps {
  draft: SupplierDraft;
}

/**
 * Step 3 component of the supplier creation wizard. Renders a summary of
 * the entered supplier details for final confirmation before submitting.
 * @param {SupplierReviewStepProps} props - The component props.
 * @returns {JSX.Element} The rendered review step.
 */
const SupplierReviewStep = ({ draft }: SupplierReviewStepProps) => {
  const summaryRows = [
    ['Code interne', draft.supplier_code],
    ['N° fournisseur', draft.supplier_number],
    ['Téléphone', draft.primary_phone],
    ['Email', draft.primary_email],
    ['Ville', [draft.postal_code, draft.city].filter(Boolean).join(' ')],
    ['SIRET', draft.siret],
    ['NAF', draft.naf_code]
  ].filter(([, value]) => Boolean(value));

  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Étape 3</p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Validation finale</h1>
        <p className="mt-1 text-sm text-muted-foreground">Vérifie l&apos;exactitude des informations avant la création définitive du fournisseur.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-start justify-between gap-4 border-b border-border-subtle pb-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground">{draft.name}</h2>
            <p className="text-xs font-medium text-muted-foreground">Référentiel fournisseurs global CIR</p>
          </div>
          {draft.official_data_source ? (
            <Badge variant="success" className="gap-1 text-xs px-2.5 py-0.5">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              Source officielle
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs px-2.5 py-0.5">
              Saisie manuelle
            </Badge>
          )}
        </div>
        <dl className="grid gap-x-6 gap-y-4 md:grid-cols-2">
          {summaryRows.map(([label, value]) => (
            <div key={label} className="border-b border-border-subtle/50 pb-2.5">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">{value}</dd>
            </div>
          ))}
          {draft.address ? (
            <div className="col-span-2 border-b border-border-subtle/50 pb-2.5">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Adresse complète</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {draft.address}
                {draft.postal_code || draft.city ? `, ${[draft.postal_code, draft.city].filter(Boolean).join(' ')}` : ''}
              </dd>
            </div>
          ) : null}
          {draft.notes ? (
            <div className="col-span-2">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notes</dt>
              <dd className="mt-1 text-xs font-medium text-muted-foreground whitespace-pre-line bg-surface-2 p-3 rounded-lg border border-border-subtle">{draft.notes}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </>
  );
};

export default SupplierReviewStep;
