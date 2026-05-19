import { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Phone, Search, UserRound } from 'lucide-react';

import type { TierV1DirectoryRow } from '../../../../../shared/schemas/interaction/tier-v1.schema';
import { isApplePlatform } from '@/app/appConstants';
import type { CockpitFormLeftPaneProps } from '../CockpitPaneTypes';
import { Button } from '../../ui/inputs/basic/Button';
import { Input } from '../../ui/inputs/basic/Input';
import { Kbd } from '../../ui/data-display/Kbd';
import { useUnifiedEntitySearch } from '../../../hooks/directory/core/useUnifiedEntitySearch';
import GuidedTierSearchShell from './GuidedTierSearchShell';

type CockpitSupplierLookupProps = Pick<
  CockpitFormLeftPaneProps,
  | 'activeAgencyId'
  | 'selectedEntity'
  | 'companyName'
  | 'onSelectUnifiedSearchResult'
  | 'onClearSelectedEntity'
  | 'setValue'
> & {
  onComplete: () => void;
};

const getMatchLabel = (result: TierV1DirectoryRow): string => {
  if (result.match_kind === 'phone') return `Téléphone contact · ${result.match_label ?? result.phone ?? ''}`;
  if (result.match_kind === 'email') return `Email contact · ${result.match_label ?? result.email ?? ''}`;
  if (result.match_kind === 'contact') return `Contact · ${result.match_label ?? ''}`;
  return [result.city, result.phone ?? result.email].filter(Boolean).join(' · ') || 'Fournisseur';
};

const CockpitSupplierLookup = ({
  activeAgencyId,
  selectedEntity,
  companyName,
  onSelectUnifiedSearchResult,
  onClearSelectedEntity,
  setValue,
  onComplete
}: CockpitSupplierLookupProps) => {
  const [query, setQuery] = useState('');
  const [temporaryName, setTemporaryName] = useState(companyName);
  const searchQuery = useUnifiedEntitySearch({
    query,
    agency_id: activeAgencyId,
    family: 'suppliers',
    client_filter: 'all',
    prospect_filter: 'all',
    include_archived: false,
    limit: 8
  }, Boolean(activeAgencyId) && query.trim().length >= 2);
  const canContinue = Boolean(selectedEntity);
  const continueShortcutLabel = `${isApplePlatform() ? '⌘' : 'Ctrl'} Entrée`;
  const canUseTemporary = temporaryName.trim().length > 0;

  useEffect(() => {
    if (!canContinue) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.key !== 'Enter') return;
      event.preventDefault();
      onComplete();
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [canContinue, onComplete]);

  const useTemporarySupplier = () => {
    const normalizedName = temporaryName.trim();
    if (!normalizedName) return;
    onClearSelectedEntity();
    setValue('entity_id', '', { shouldDirty: true, shouldValidate: true });
    setValue('contact_id', '', { shouldDirty: true, shouldValidate: true });
    setValue('company_name', normalizedName, { shouldDirty: true, shouldValidate: true });
    onComplete();
  };

  return (
    <GuidedTierSearchShell archiveSupport="hidden" contentClassName="min-h-[280px] p-3">
      <div className="space-y-3" data-testid="cockpit-supplier-lookup">
        <div className="grid items-stretch gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative">
            <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nom fournisseur, contact, téléphone…"
              aria-label="Rechercher un fournisseur enregistré"
              name="supplier-search"
              className="h-10 pl-9 text-[13px]"
              autoComplete="off"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="comfortable"
            className="h-10"
            onClick={useTemporarySupplier}
            disabled={!canUseTemporary}
          >
            Fournisseur ponctuel
          </Button>
        </div>

        {selectedEntity ? (
          <section className="rounded-md border border-success/25 bg-success/5 p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-success/10 text-success">
                  <CheckCircle2 size={15} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{selectedEntity.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[selectedEntity.primary_phone, selectedEntity.primary_email, selectedEntity.city].filter(Boolean).join(' · ') || 'Fournisseur sélectionné'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="dense" onClick={onClearSelectedEntity}>Changer</Button>
                <Button type="button" size="dense" onClick={onComplete}>
                  Continuer
                  <Kbd className="ml-1 border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground">
                    {continueShortcutLabel}
                  </Kbd>
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        {!selectedEntity && query.trim().length >= 2 ? (
          <div className="rounded-md border border-border bg-card">
            <div className="max-h-60 space-y-1.5 overflow-y-auto p-2">
              {searchQuery.isFetching ? (
                <div className="p-2 text-xs text-muted-foreground">Recherche…</div>
              ) : searchQuery.data?.results.length ? searchQuery.data.results.map((result) => (
                <button
                  key={`${result.source}-${result.id}`}
                  type="button"
                  onClick={() => {
                    onSelectUnifiedSearchResult(result);
                    setTemporaryName('');
                    setValue('contact_phone', result.phone ?? '', { shouldDirty: true, shouldValidate: true });
                    setValue('contact_email', result.email ?? '', { shouldDirty: true, shouldValidate: true });
                  }}
                  className="grid min-h-12 w-full grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                    {result.match_kind === 'contact' ? <UserRound size={15} aria-hidden="true" /> : result.match_kind === 'phone' ? <Phone size={15} aria-hidden="true" /> : <Building2 size={15} aria-hidden="true" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-foreground">{result.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{getMatchLabel(result)}</span>
                  </span>
                  <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Fournisseur
                  </span>
                </button>
              )) : (
                <div className="rounded-lg border border-dashed border-border bg-surface-1/40 p-4 text-center text-xs text-muted-foreground">
                  Aucun fournisseur enregistré. Utilise un fournisseur ponctuel pour cette saisie.
                </div>
              )}
            </div>
          </div>
        ) : null}

        {!selectedEntity ? (
          <section className="rounded-md border border-dashed border-border bg-card p-2.5">
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                value={temporaryName}
                onChange={(event) => setTemporaryName(event.target.value)}
                placeholder="Nom du fournisseur ponctuel…"
                aria-label="Nom du fournisseur ponctuel"
                name="temporary-supplier-name"
                className="h-9"
                autoComplete="organization"
              />
              <Button type="button" size="sm" onClick={useTemporarySupplier} disabled={!canUseTemporary}>
                Utiliser pour cette saisie
              </Button>
            </div>
          </section>
        ) : null}
      </div>
    </GuidedTierSearchShell>
  );
};

export default CockpitSupplierLookup;
