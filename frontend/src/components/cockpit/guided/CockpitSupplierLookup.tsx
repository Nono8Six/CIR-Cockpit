import { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Phone, Search, UserRound } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

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
  const shouldReduceMotion = useReducedMotion();
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
    <GuidedTierSearchShell archiveSupport="hidden" contentClassName="min-h-[280px] bg-card">
      <div className="space-y-0" data-testid="cockpit-supplier-lookup">
        {/* Cellule de recherche fournisseur style compartiment details */}
        <div className="relative border-b border-border/60 bg-card px-5 py-3.5 focus-within:bg-surface-1/30 transition-all duration-150">
          <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground select-none block mb-1.5" htmlFor="supplier-search">
            Recherche Fournisseur
          </label>
          <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative flex items-center gap-2">
              <Search size={14} aria-hidden="true" className="pointer-events-none text-muted-foreground/60 transition-colors duration-150" />
              <Input
                id="supplier-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nom fournisseur, contact, téléphone…"
                aria-label="Rechercher un fournisseur enregistré"
                name="supplier-search"
                className="h-9 w-full min-w-0 text-[13px] font-semibold border-none bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-none placeholder:text-muted-foreground/75 text-foreground"
                autoComplete="off"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="comfortable"
              className="h-9 text-xs font-bold shrink-0 shadow-sm cursor-pointer"
              onClick={useTemporarySupplier}
              disabled={!canUseTemporary}
            >
              Fournisseur ponctuel
            </Button>
          </div>
        </div>

        {/* Fournisseur sélectionné avec liseré vert success style rattaché */}
        {selectedEntity ? (
          <div className="px-4 py-3 bg-surface-1/40 border-b border-border/60">
            <motion.div
              whileHover={shouldReduceMotion ? {} : { y: -0.5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="flex items-center justify-between gap-4 rounded-xl border border-success/25 border-l-4 border-l-success bg-success/5 px-5 py-4 shadow-sm transition-all duration-200"
            >
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success shadow-sm ring-1 ring-success/20">
                  <CheckCircle2 size={16} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-foreground">{selectedEntity.name}</p>
                  <p className="truncate text-[11px] font-medium text-muted-foreground/80 mt-0.5">
                    {[selectedEntity.primary_phone, selectedEntity.primary_email, selectedEntity.city].filter(Boolean).join(' · ') || 'Fournisseur sélectionné'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="dense"
                  onClick={onClearSelectedEntity}
                  className="rounded-md bg-card border border-border px-2.5 py-1 text-xs font-bold text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors shadow-sm cursor-pointer"
                >
                  Changer
                </Button>
                <Button
                  type="button"
                  size="dense"
                  onClick={onComplete}
                  className="bg-primary hover:bg-primary/95 text-xs font-bold px-3 shadow-sm active:scale-[0.98] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  Continuer
                  <Kbd className="border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground shadow-sm">
                    {continueShortcutLabel}
                  </Kbd>
                </Button>
              </div>
            </motion.div>
          </div>
        ) : null}

        {/* Liste de résultats sous forme de boutons rounded-xl interactifs */}
        {!selectedEntity && query.trim().length >= 2 ? (
          <div className="p-3 bg-surface-1/30 border-b border-border/60">
            <div className="max-h-60 space-y-1.5 overflow-y-auto pr-1">
              {searchQuery.isFetching ? (
                <div className="p-4 text-xs font-medium text-muted-foreground/80 italic text-center">Recherche en cours…</div>
              ) : searchQuery.data?.results.length ? searchQuery.data.results.map((result) => (
                <motion.button
                  key={`${result.source}-${result.id}`}
                  type="button"
                  onClick={() => {
                    onSelectUnifiedSearchResult(result);
                    setTemporaryName('');
                    setValue('contact_phone', result.phone ?? '', { shouldDirty: true, shouldValidate: true });
                    setValue('contact_email', result.email ?? '', { shouldDirty: true, shouldValidate: true });
                  }}
                  whileHover={shouldReduceMotion ? {} : { y: -0.5 }}
                  className="grid min-h-12 w-full grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5 text-left transition-all duration-200 hover:border-primary/30 hover:bg-surface-1/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer"
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-sm ring-1 ring-primary/5">
                    {result.match_kind === 'contact' ? <UserRound size={15} aria-hidden="true" /> : result.match_kind === 'phone' ? <Phone size={15} aria-hidden="true" /> : <Building2 size={15} aria-hidden="true" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-bold text-foreground">{result.label}</span>
                    <span className="block truncate text-[11px] text-muted-foreground mt-0.5">{getMatchLabel(result)}</span>
                  </span>
                  <span className="rounded-full border border-border/80 bg-muted/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                    Fournisseur
                  </span>
                </motion.button>
              )) : (
                <div className="rounded-xl border border-dashed border-border bg-card p-5 text-center text-xs font-medium text-muted-foreground">
                  Aucun fournisseur enregistré. Utilise un fournisseur ponctuel pour cette saisie.
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Module de fournisseur ponctuel sous forme de sous-carte fine */}
        {!selectedEntity ? (
          <div className="p-4 bg-surface-1/40">
            <div className="rounded-xl border border-dashed border-border bg-card p-4">
              <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground select-none block mb-2.5" htmlFor="temporary-supplier-name">
                Saisie ponctuelle
              </label>
              <div className="grid gap-2.5 md:grid-cols-[minmax(0,1fr)_auto]">
                <Input
                  id="temporary-supplier-name"
                  value={temporaryName}
                  onChange={(event) => setTemporaryName(event.target.value)}
                  placeholder="Nom du fournisseur ponctuel…"
                  aria-label="Nom du fournisseur ponctuel"
                  name="temporary-supplier-name"
                  className="h-9 text-[13px] font-semibold"
                  autoComplete="organization"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={useTemporarySupplier}
                  disabled={!canUseTemporary}
                  className="h-9 px-4 font-bold shrink-0 cursor-pointer"
                >
                  Utiliser pour cette saisie
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </GuidedTierSearchShell>
  );
};

export default CockpitSupplierLookup;
