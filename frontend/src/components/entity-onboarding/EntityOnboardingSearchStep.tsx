import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import {
  ArrowUpRight,
  Check,
  ChevronsRight,
  LoaderCircle,
  MapPin,
  Search,
  ShieldCheck,
  UserRound
} from 'lucide-react';

import type {
  DirectoryCompanySearchMatchQuality,
  DirectoryCompanySearchResult,
  DirectoryListRow
} from 'shared/schemas/directory.schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Command, CommandEmpty, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import DirectoryFilterCombobox from '@/components/client-directory/directory-filters/DirectoryFilterCombobox';
import type { OnboardingFormInput, OnboardingValues } from './entityOnboarding.schema';
import type { CompanySearchGroup, DuplicateMatch } from './entityOnboarding.types';
import { getDepartmentFromPostalCode } from './entityOnboarding.utils';

interface OfficialCityAutocompleteProps {
  value: string;
  suggestions: string[];
  onValueChange: (value: string) => void;
}

const OfficialCityAutocomplete = ({
  value,
  suggestions,
  onValueChange
}: OfficialCityAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const isSelectingSuggestionRef = useRef(false);
  const normalizedValue = value.trim().toLowerCase();
  const filteredSuggestions = useMemo(
    () => suggestions.filter((suggestion) => suggestion.toLowerCase().includes(normalizedValue)),
    [normalizedValue, suggestions]
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' || event.key === 'Enter') {
      setOpen(false);
    }
  };

  const shouldShowSuggestions = open && filteredSuggestions.length > 0 && value.trim().length >= 1;

  return (
    <Popover open={shouldShowSuggestions} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Input
          name="official-search-city"
          value={value}
          autoComplete="off"
          onChange={(event) => {
            const nextValue = event.target.value;
            onValueChange(nextValue);
            setOpen(nextValue.trim().length >= 1);
          }}
          onFocus={() => {
            if (value.trim().length >= 1) {
              setOpen(true);
            }
          }}
          onBlur={() => {
            window.setTimeout(() => {
              if (isSelectingSuggestionRef.current) {
                isSelectingSuggestionRef.current = false;
                return;
              }

              setOpen(false);
            }, 0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ville…"
          aria-label="Filtre ville recherche officielle"
          density="dense"
          className="rounded-md border-border-subtle bg-background"
        />
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList>
            {filteredSuggestions.length === 0 ? <CommandEmpty>Aucune ville trouvee.</CommandEmpty> : null}
            {filteredSuggestions.map((suggestion) => (
              <CommandItem
                key={suggestion}
                value={suggestion}
                onMouseDown={() => {
                  isSelectingSuggestionRef.current = true;
                }}
                onSelect={() => {
                  onValueChange(suggestion);
                  setOpen(false);
                }}
              >
                <span className="flex-1">{suggestion}</span>
                <Check className={cn('size-4 text-primary', suggestion === value ? 'opacity-100' : 'opacity-0')} />
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const getMatchBadgeLabel = (quality: DirectoryCompanySearchMatchQuality): string | null => {
  if (quality === 'close') {
    return 'Approchant';
  }

  if (quality === 'expanded') {
    return 'Elargi';
  }

  return null;
};

interface DuplicatePanelProps {
  duplicateMatches: DuplicateMatch[];
  duplicatesLoading: boolean;
  onOpenDuplicate?: (record: DirectoryListRow) => void;
  emptyTitle: string;
  emptyBody: string;
  successBody: string;
  hasSelection: boolean;
}

const DuplicatePanel = ({
  duplicateMatches,
  duplicatesLoading,
  onOpenDuplicate,
  emptyTitle,
  emptyBody,
  successBody,
  hasSelection
}: DuplicatePanelProps) => {
  if (!hasSelection) {
    return (
      <div className="flex flex-1 items-center justify-center p-5">
        <div className="max-w-sm text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-md border border-primary/15 bg-primary/6 text-primary">
            <ShieldCheck className="size-4" />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">{emptyTitle}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{emptyBody}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div aria-live="polite" className="border-b border-border-subtle px-4 py-3.5">
        {duplicatesLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Verification des doublons
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" />
            Controle CIR
          </div>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2.5 px-4 py-4">
          {duplicateMatches.length > 0 ? duplicateMatches.map(({ record, reason }) => (
            <div key={record.id} className="rounded-lg border border-warning/35 bg-warning/8 p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{record.name}</p>
                    {record.client_kind === 'individual' ? <Badge variant="outline">Particulier</Badge> : null}
                    {record.client_number ? <Badge variant="outline">Client {record.client_number}</Badge> : null}
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{reason}</p>
                </div>
                {onOpenDuplicate ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => onOpenDuplicate(record)}
                  >
                    Ouvrir
                    <ArrowUpRight className="size-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          )) : (
            <div className="rounded-lg border border-success/25 bg-success/8 p-3.5 text-sm leading-6 text-muted-foreground">
              {successBody}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

interface EntityOnboardingSearchStepProps {
  form: UseFormReturn<OnboardingFormInput, unknown, OnboardingValues>;
  values: OnboardingValues;
  isIndividualClient: boolean;
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  department: string;
  onDepartmentChange: (value: string) => void;
  city: string;
  onCityChange: (value: string) => void;
  departmentOptions: Array<{ value: string; label: string }>;
  citySuggestions: string[];
  manualEntry: boolean;
  onToggleManualEntry: () => void;
  isFetching: boolean;
  isStale: boolean;
  groups: CompanySearchGroup[];
  selectedGroup: CompanySearchGroup | null;
  onGroupSelect: (groupId: string) => void;
  selectedCompany: DirectoryCompanySearchResult | undefined;
  onEstablishmentSelect: (company: DirectoryCompanySearchResult) => void;
  duplicateMatches: DuplicateMatch[];
  duplicatesLoading: boolean;
  onOpenDuplicate?: (record: DirectoryListRow) => void;
}

const EntityOnboardingSearchStep = ({
  form,
  values,
  isIndividualClient,
  searchDraft,
  onSearchDraftChange,
  department,
  onDepartmentChange,
  city,
  onCityChange,
  departmentOptions,
  citySuggestions,
  manualEntry,
  onToggleManualEntry,
  isFetching,
  isStale,
  groups,
  selectedGroup,
  onGroupSelect,
  selectedCompany,
  onEstablishmentSelect,
  duplicateMatches,
  duplicatesLoading,
  onOpenDuplicate
}: EntityOnboardingSearchStepProps) => {
  const { errors } = form.formState;

  if (isIndividualClient) {
    return (
      <div className="grid h-full min-h-0 gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <Card variant="section" className="flex min-h-0 flex-col overflow-hidden rounded-lg border-border-subtle bg-background shadow-none">
          <div className="border-b border-border-subtle px-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UserRound className="size-4" />
                Client particulier
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">Identite et doublons</h2>
                <Badge variant="outline">Sans societe</Badge>
                <Badge variant="outline">Compte comptant</Badge>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Ce parcours cree un client particulier sans appel a la recherche officielle entreprise. L objectif ici est de qualifier l identite, les coordonnees utiles et verifier les doublons CIR.
              </p>
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="grid gap-3 px-4 py-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="individual-last-name" className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Nom</label>
                <Input id="individual-last-name" aria-label="Nom" density="dense" {...form.register('last_name')} className="rounded-md border-border-subtle bg-background" />
                {errors.last_name?.message ? <p className="text-xs text-destructive">{errors.last_name.message}</p> : null}
              </div>

              <div className="space-y-2">
                <label htmlFor="individual-first-name" className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Prenom</label>
                <Input id="individual-first-name" aria-label="Prenom" density="dense" {...form.register('first_name')} className="rounded-md border-border-subtle bg-background" />
                {errors.first_name?.message ? <p className="text-xs text-destructive">{errors.first_name.message}</p> : null}
              </div>

              <div className="space-y-2">
                <label htmlFor="individual-phone" className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Telephone</label>
                <Input id="individual-phone" type="tel" autoComplete="tel" aria-label="Telephone" density="dense" {...form.register('phone')} className="rounded-md border-border-subtle bg-background" />
                {errors.phone?.message ? <p className="text-xs text-destructive">{errors.phone.message}</p> : <p className="text-xs text-muted-foreground">Telephone ou email obligatoire.</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="individual-email" className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Email</label>
                <Input id="individual-email" type="email" autoComplete="email" spellCheck={false} aria-label="Email" density="dense" {...form.register('email')} className="rounded-md border-border-subtle bg-background" />
                {errors.email?.message ? <p className="text-xs text-destructive">{errors.email.message}</p> : <p className="text-xs text-muted-foreground">Utilise l email exact pour renforcer la detection.</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="individual-postal-code" className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Code postal</label>
                <Input
                  id="individual-postal-code"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  spellCheck={false}
                  aria-label="Code postal"
                  density="dense"
                  value={values.postal_code}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, '').slice(0, 5);
                    form.setValue('postal_code', digits, { shouldDirty: true, shouldValidate: true });
                    form.setValue(
                      'department',
                      digits.length >= 2 ? getDepartmentFromPostalCode(digits) : '',
                      { shouldDirty: true }
                    );
                  }}
                  className="rounded-md border-border-subtle bg-background font-mono tabular-nums"
                />
                {errors.postal_code?.message ? <p className="text-xs text-destructive">{errors.postal_code.message}</p> : null}
              </div>

              <div className="space-y-2">
                <label htmlFor="individual-city" className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Ville</label>
                <Input id="individual-city" autoComplete="address-level2" aria-label="Ville" density="dense" {...form.register('city')} className="rounded-md border-border-subtle bg-background" />
                {errors.city?.message ? <p className="text-xs text-destructive">{errors.city.message}</p> : null}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label htmlFor="individual-address" className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Adresse</label>
                <Input id="individual-address" autoComplete="street-address" aria-label="Adresse" density="dense" {...form.register('address')} className="rounded-md border-border-subtle bg-background" />
                <p className="text-xs text-muted-foreground">Optionnelle. Tu pourras encore la completer a l etape suivante.</p>
              </div>

              <div className="rounded-lg border border-border-subtle bg-surface-1/70 p-4 md:col-span-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-border-subtle bg-background">Nom complet derive automatiquement</Badge>
                  <Badge variant="outline" className="border-border-subtle bg-background">Aucun commercial CIR</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Le nom annuaire sera construit a partir de <span className="font-medium text-foreground">Nom + Prenom</span> au moment de la creation, tout en conservant le contact principal structure.
                </p>
              </div>
            </div>
          </ScrollArea>
        </Card>

        <Card variant="section" className="flex min-h-0 flex-col overflow-hidden rounded-lg border-border-subtle bg-background shadow-none">
          <div className="border-b border-border-subtle px-4 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 text-primary" />
              Verification doublons
            </div>
          </div>
          <DuplicatePanel
            duplicateMatches={duplicateMatches}
            duplicatesLoading={duplicatesLoading}
            onOpenDuplicate={onOpenDuplicate}
            emptyTitle="Renseigne au moins le nom"
            emptyBody="Le controle commence des que le nom est saisi, puis il se renforce avec le telephone, l email, la ville et le code postal."
            successBody="Aucun doublon evident detecte pour ce particulier."
            hasSelection={Boolean(values.last_name.trim())}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-0 gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
      <Card variant="section" className="flex min-h-0 flex-col overflow-hidden rounded-lg border-border-subtle bg-background shadow-none">
        <div className="border-b border-border-subtle px-4 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Search className="size-4" />
                  Recherche officielle
                </div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">Entreprise et etablissement</h2>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  Recherche libre, filtres compacts, selection de l etablissement et verification des doublons dans le meme workspace.
                </p>
              </div>

              <Button type="button" variant="outline" size="dense" onClick={onToggleManualEntry}>
                {manualEntry ? 'Retour recherche' : 'Saisie manuelle'}
              </Button>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_180px_minmax(0,0.8fr)]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  name="company-search"
                  autoComplete="off"
                  spellCheck={false}
                  value={searchDraft}
                  onChange={(event) => onSearchDraftChange(event.target.value)}
                  placeholder="Nom de societe, SIREN ou SIRET…"
                  density="dense"
                  className="rounded-md border-border-subtle bg-background pl-9"
                />
              </div>
              <DirectoryFilterCombobox
                items={departmentOptions}
                values={department ? [department] : []}
                onValuesChange={(nextValues) => onDepartmentChange(nextValues[0] ?? '')}
                placeholder="Departement"
                allLabel="Tous les departements"
                searchPlaceholder="Code departement..."
                emptyLabel="Aucun departement."
                searchInputName="official-search-department"
              />
              <OfficialCityAutocomplete value={city} suggestions={citySuggestions} onValueChange={onCityChange} />
            </div>
          </div>
        </div>

        {manualEntry ? (
          <div className="flex flex-1 items-center justify-center p-5">
            <div className="max-w-lg rounded-lg border border-dashed border-border-subtle bg-surface-1/70 p-6">
              <p className="text-sm font-medium text-foreground">Saisie manuelle active</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Le flux continue sans donnees officielles. Les champs identite, adresse et rattachement agence restent disponibles a l etape suivante.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3 text-sm text-muted-foreground">
              <span>
                {groups.length > 0
                  ? `${groups.length} entreprise${groups.length > 1 ? 's' : ''} trouvee${groups.length > 1 ? 's' : ''}`
                  : 'Aucun resultat officiel pour cette recherche.'}
              </span>
              {isFetching ? (
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle className="size-4 animate-spin" />
                  Actualisation
                </span>
              ) : null}
            </div>

            <ScrollArea className={cn('min-h-0 flex-1', isStale && 'opacity-70 transition-opacity')}>
              <div className="divide-y divide-border-subtle">
                {groups.length > 0 ? groups.map((group) => {
                  const isActive = selectedGroup?.id === group.id;
                  const cities = Array.from(
                    new Set(group.establishments.map((company) => company.city).filter(Boolean))
                  ).slice(0, 3);

                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => onGroupSelect(group.id)}
                      className={cn(
                        'flex w-full items-start justify-between gap-4 border-l-2 border-transparent px-4 py-3.5 text-left transition-[background-color,border-color]',
                        isActive ? 'border-primary bg-primary/5' : 'hover:bg-surface-1'
                      )}
                    >
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{group.label}</span>
                          {group.siren ? <Badge variant="outline" className="border-border-subtle bg-background font-mono tabular-nums">SIREN {group.siren}</Badge> : null}
                          {getMatchBadgeLabel(group.match_quality) ? (
                            <Badge variant="outline" className="border-border-subtle bg-surface-1">
                              {getMatchBadgeLabel(group.match_quality)}
                            </Badge>
                          ) : null}
                          <Badge variant={isActive ? 'secondary' : 'outline'} className={cn(!isActive && 'border-border-subtle bg-background')}>
                            {group.establishments.length} site{group.establishments.length > 1 ? 's' : ''}
                          </Badge>
                        </div>
                        {group.subtitle ? <p className="text-sm text-muted-foreground">{group.subtitle}</p> : null}
                        {group.match_quality !== 'exact' && group.match_explanation ? (
                          <p className="text-xs text-muted-foreground">{group.match_explanation}</p>
                        ) : null}
                        {cities.length > 0 ? (
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {cities.map((entry) => (
                              <span key={entry} className="inline-flex items-center gap-1">
                                <MapPin className="size-3.5" />
                                {entry}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        Ouvrir
                        <ChevronsRight className="size-4" />
                      </span>
                    </button>
                  );
                }) : (
                  <div className="px-4 py-8 text-sm leading-6 text-muted-foreground">
                    Aucun resultat officiel. Essaie un nom plus court, un departement, une ville, ou passe en saisie manuelle.
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </Card>

      <Card variant="section" className="flex min-h-0 flex-col overflow-hidden rounded-lg border-border-subtle bg-background shadow-none">
        <div className="border-b border-border-subtle px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" />
            Verification et selection
          </div>
        </div>

        {selectedGroup ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="space-y-2 border-b border-border-subtle px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold text-foreground">{selectedGroup.label}</p>
                {getMatchBadgeLabel(selectedGroup.match_quality) ? (
                  <Badge variant="outline" className="border-border-subtle bg-surface-1">
                    {getMatchBadgeLabel(selectedGroup.match_quality)}
                  </Badge>
                ) : null}
                <Badge variant="secondary">{selectedGroup.establishments.length} site{selectedGroup.establishments.length > 1 ? 's' : ''}</Badge>
              </div>
              {selectedGroup.subtitle ? <p className="text-sm text-muted-foreground">{selectedGroup.subtitle}</p> : null}
              {selectedGroup.match_quality !== 'exact' && selectedGroup.match_explanation ? (
                <p className="text-xs text-muted-foreground">{selectedGroup.match_explanation}</p>
              ) : null}
              <p className="text-sm leading-6 text-muted-foreground">
                Choisis l etablissement a importer. La detection des doublons s appuie ensuite sur cette selection.
              </p>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-2 px-4 py-4">
                {selectedGroup.establishments.map((establishment) => {
                  const isSelected = selectedCompany?.siret === establishment.siret;
                  return (
                    <button
                      key={establishment.siret ?? `${establishment.city}-${establishment.address}`}
                      type="button"
                      onClick={() => onEstablishmentSelect(establishment)}
                      className={cn(
                        'w-full rounded-lg border px-4 py-3.5 text-left transition-[background-color,border-color,box-shadow]',
                        isSelected
                          ? 'border-primary/35 bg-primary/5 shadow-[0_0_0_1px_rgba(220,38,38,0.04)]'
                          : 'border-border-subtle bg-background hover:bg-surface-1'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {[establishment.postal_code, establishment.city].filter(Boolean).join(' ') || 'Etablissement'}
                            </span>
                            <Badge variant={establishment.is_head_office ? 'secondary' : 'outline'}>
                              {establishment.is_head_office ? 'Siege' : 'Etablissement'}
                            </Badge>
                          </div>
                          <p className="text-sm leading-6 text-muted-foreground">
                            {establishment.address ?? 'Adresse non diffusee'}
                          </p>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            {establishment.siret ? <span className="font-mono tabular-nums">SIRET {establishment.siret}</span> : null}
                            {establishment.naf_code ? <span className="font-mono tabular-nums">NAF {establishment.naf_code}</span> : null}
                          </div>
                        </div>
                        {isSelected ? <Check className="size-4 shrink-0 text-primary" /> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>

            <DuplicatePanel
              duplicateMatches={duplicateMatches}
              duplicatesLoading={duplicatesLoading}
              onOpenDuplicate={onOpenDuplicate}
              emptyTitle="Selectionne une entreprise"
              emptyBody="Le panneau de droite affiche ici les etablissements disponibles puis les doublons CIR lies a la selection retenue."
              successBody="Aucun doublon evident detecte pour cet etablissement."
              hasSelection={Boolean(selectedCompany)}
            />
          </div>
        ) : (
          <DuplicatePanel
            duplicateMatches={duplicateMatches}
            duplicatesLoading={duplicatesLoading}
            onOpenDuplicate={onOpenDuplicate}
            emptyTitle="Selectionne une entreprise"
            emptyBody="Le panneau de droite affiche ici les etablissements disponibles puis les doublons CIR lies a la selection retenue."
            successBody="Aucun doublon evident detecte pour cet etablissement."
            hasSelection={false}
          />
        )}
      </Card>
    </div>
  );
};

export default EntityOnboardingSearchStep;
