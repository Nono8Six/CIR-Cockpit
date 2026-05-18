import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Building2, CheckCircle2, Filter, Globe2, Hash, Loader2, Search } from 'lucide-react';

import type { DirectoryCompanySearchInput, DirectoryCompanySearchResult } from 'shared/schemas/directory.schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAppSessionStateContext } from '@/hooks/useAppSession';
import { useDirectoryCompanySearch } from '@/hooks/useDirectoryCompanySearch';
import { useSaveSupplier } from '@/hooks/useSaveSupplier';
import { notifySuccess } from '@/services/errors/notify';
import { cn } from '@/lib/utils';
import { DEFAULT_SUPPLIER_SEARCH } from './supplierDirectorySearch';

type Step = 'search' | 'details' | 'review';
type StatusFilter = 'all' | 'open' | 'closed';
type HeadOfficeFilter = 'all' | 'head_office' | 'secondary';

type SupplierDraft = {
  name: string;
  supplier_code: string;
  supplier_number: string;
  primary_phone: string;
  primary_email: string;
  address: string;
  postal_code: string;
  department: string;
  city: string;
  siren: string;
  siret: string;
  naf_code: string;
  official_name: string;
  official_data_source: 'api-recherche-entreprises' | null;
  official_data_synced_at: string | null;
  notes: string;
};

const emptyDraft = (): SupplierDraft => ({
  name: '',
  supplier_code: '',
  supplier_number: '',
  primary_phone: '',
  primary_email: '',
  address: '',
  postal_code: '',
  department: '',
  city: '',
  siren: '',
  siret: '',
  naf_code: '',
  official_name: '',
  official_data_source: null,
  official_data_synced_at: null,
  notes: ''
});

const activitySections = [
  ['A', 'A - Agriculture'],
  ['B', 'B - Industries extractives'],
  ['C', 'C - Industrie manufacturière'],
  ['D', 'D - Énergie'],
  ['E', 'E - Eau et déchets'],
  ['F', 'F - Construction'],
  ['G', 'G - Commerce'],
  ['H', 'H - Transports'],
  ['I', 'I - Hébergement'],
  ['J', 'J - Information'],
  ['K', 'K - Finance'],
  ['L', 'L - Immobilier'],
  ['M', 'M - Activités spécialisées'],
  ['N', 'N - Services administratifs'],
  ['O', 'O - Administration'],
  ['P', 'P - Enseignement'],
  ['Q', 'Q - Santé'],
  ['R', 'R - Arts'],
  ['S', 'S - Autres services']
] as const;

const normalizeNafCode = (value: string): string =>
  value.trim().replace(/\s+/g, '').toUpperCase().replace(/^(\d{2})\.?(\d{2})([A-Z])$/, '$1.$2$3');

const buildDraftFromOfficial = (company: DirectoryCompanySearchResult): SupplierDraft => ({
  ...emptyDraft(),
  name: company.name,
  address: company.address ?? '',
  postal_code: company.postal_code ?? '',
  department: company.department ?? '',
  city: company.city ?? '',
  siren: company.siren ?? '',
  siret: company.siret ?? '',
  naf_code: company.naf_code ?? '',
  official_name: company.official_name ?? company.name,
  official_data_source: 'api-recherche-entreprises',
  official_data_synced_at: company.official_data_synced_at ?? new Date().toISOString()
});

const stepLabels: Record<Step, string> = {
  search: 'Recherche',
  details: 'Informations',
  review: 'Validation'
};

const AdminSupplierCreatePage = () => {
  const navigate = useNavigate({ from: '/admin/suppliers/new' });
  const sessionState = useAppSessionStateContext();
  const userRole = sessionState.profile?.role ?? 'tcs';
  const [step, setStep] = useState<Step>('search');
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [nafCode, setNafCode] = useState('');
  const [activitySection, setActivitySection] = useState('');
  const [headOffice, setHeadOffice] = useState<HeadOfficeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [submittedSearch, setSubmittedSearch] = useState<DirectoryCompanySearchInput | null>(null);
  const [draft, setDraft] = useState<SupplierDraft>(() => emptyDraft());
  const saveSupplier = useSaveSupplier(false);
  const search = useDirectoryCompanySearch(
    submittedSearch ?? { query: '', page: 1, per_page: 10 },
    Boolean(submittedSearch),
    { debounceMs: 0, keepPreviousData: true, notifyOnError: false, retry: false }
  );
  const visibleCompanies = (search.data?.companies ?? []).filter((company) =>
    statusFilter === 'all' || company.establishment_status === statusFilter
  );
  const canContinueDetails = Boolean(
    draft.name.trim() && (draft.primary_phone.trim() || draft.primary_email.trim())
  );
  const activeStepIndex = ['search', 'details', 'review'].indexOf(step);

  const submitSearch = () => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 3) return;
    setSubmittedSearch({
      query: normalizedQuery,
      department: department.trim() || undefined,
      postal_code: postalCode.trim() || undefined,
      city: city.trim() || undefined,
      naf_code: normalizeNafCode(nafCode) || undefined,
      activity_section: activitySection || undefined,
      head_office: headOffice,
      page: 1,
      per_page: 10
    });
  };

  const updateDraft = (key: keyof SupplierDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const updateSupplierCode = (value: string) => {
    updateDraft('supplier_code', value.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4));
  };

  const updateSupplierNumber = (value: string) => {
    updateDraft('supplier_number', value.replace(/\D/g, '').slice(0, 15));
  };

  const save = async () => {
    if (!canContinueDetails || saveSupplier.isPending) return;
    const entity = await saveSupplier.mutateAsync({
      entity_type: 'Fournisseur',
      name: draft.name,
      supplier_code: draft.supplier_code,
      supplier_number: draft.supplier_number,
      primary_phone: draft.primary_phone,
      primary_email: draft.primary_email,
      address: draft.address,
      postal_code: draft.postal_code,
      department: draft.department,
      city: draft.city,
      siren: draft.siren,
      siret: draft.siret,
      naf_code: draft.naf_code,
      official_name: draft.official_name,
      official_data_source: draft.official_data_source,
      official_data_synced_at: draft.official_data_synced_at,
      notes: draft.notes
    });
    notifySuccess('Fournisseur créé.');
    void navigate({ to: '/admin/suppliers', search: () => DEFAULT_SUPPLIER_SEARCH });
    return entity;
  };

  const summaryRows = [
    ['Code interne', draft.supplier_code],
    ['N° fournisseur', draft.supplier_number],
    ['Téléphone', draft.primary_phone],
    ['Email', draft.primary_email],
    ['Ville', [draft.postal_code, draft.city].filter(Boolean).join(' ')],
    ['SIRET', draft.siret],
    ['NAF', draft.naf_code]
  ].filter(([, value]) => Boolean(value));

  if (userRole === 'tcs') {
    return (
      <section className="flex h-full items-center justify-center rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Création fournisseur réservée aux administrateurs.
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border-subtle bg-background">
      <header className="flex min-h-14 items-center justify-between gap-3 border-b border-border-subtle px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button type="button" variant="ghost" size="dense" onClick={() => void navigate({ to: '/admin/suppliers', search: () => DEFAULT_SUPPLIER_SEARCH })}>
            <ArrowLeft data-icon="inline-start" aria-hidden="true" />
            Retour fournisseurs
          </Button>
          <nav aria-label="Progression création fournisseur" className="hidden md:block">
            <ol className="flex items-center gap-2 text-sm font-medium">
              {(['search', 'details', 'review'] as Step[]).map((item, index) => (
                <li key={item} className={cn(index === activeStepIndex ? 'text-foreground' : 'text-muted-foreground')}>
                  {stepLabels[item]}{index < 2 ? <span className="ml-2 text-muted-foreground/40">›</span> : null}
                </li>
              ))}
            </ol>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="dense" onClick={() => void navigate({ to: '/admin/suppliers', search: () => DEFAULT_SUPPLIER_SEARCH })}>
            Annuler
          </Button>
          {step === 'search' ? <Button type="button" size="dense" onClick={() => setStep('details')}>Saisie manuelle</Button> : null}
          {step === 'details' ? <Button type="button" size="dense" disabled={!canContinueDetails} onClick={() => setStep('review')}>Continuer</Button> : null}
          {step === 'review' ? <Button type="button" size="dense" disabled={!canContinueDetails || saveSupplier.isPending} onClick={() => void save()}>{saveSupplier.isPending ? 'Création…' : 'Créer'}</Button> : null}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_360px]">
        <main className="min-h-0 overflow-y-auto p-6 lg:p-10">
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            {step === 'search' ? (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fournisseur</p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight">Recherche officielle</h1>
                </div>
                <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); submitSearch(); }}>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input name="admin-supplier-official-search" value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 pl-9" placeholder="Nom, SIREN, SIRET…" aria-label="Recherche officielle fournisseur admin" />
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <Input name="admin-supplier-filter-department" value={department} onChange={(event) => setDepartment(event.target.value.toUpperCase())} placeholder="Département" aria-label="Département fournisseur" />
                    <Input name="admin-supplier-filter-postal-code" value={postalCode} onChange={(event) => setPostalCode(event.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="Code postal" aria-label="Code postal fournisseur" inputMode="numeric" />
                    <Input name="admin-supplier-filter-city" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Ville" aria-label="Ville fournisseur" />
                    <Input name="admin-supplier-filter-naf" value={nafCode} onChange={(event) => setNafCode(normalizeNafCode(event.target.value))} placeholder="Code NAF" aria-label="Code NAF fournisseur" className="font-mono uppercase" />
                    <Select name="admin-supplier-activity-section" value={activitySection || 'all'} onValueChange={(value) => setActivitySection(value === 'all' ? '' : value)}>
                      <SelectTrigger aria-label="Section activité fournisseur"><SelectValue placeholder="Section activité" /></SelectTrigger>
                      <SelectContent><SelectGroup><SelectItem value="all">Toutes les sections</SelectItem>{activitySections.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectGroup></SelectContent>
                    </Select>
                    <Button type="submit" disabled={query.trim().length < 3 || search.isFetching}>
                      {search.isFetching ? <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : <Filter data-icon="inline-start" aria-hidden="true" />}
                      Rechercher
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <ToggleGroup type="single" value={headOffice} onValueChange={(value) => value && setHeadOffice(value as HeadOfficeFilter)} variant="outline" className="grid grid-cols-3">
                      <ToggleGroupItem value="all">Tous</ToggleGroupItem>
                      <ToggleGroupItem value="head_office">Siège</ToggleGroupItem>
                      <ToggleGroupItem value="secondary">Secondaires</ToggleGroupItem>
                    </ToggleGroup>
                    <ToggleGroup type="single" value={statusFilter} onValueChange={(value) => value && setStatusFilter(value as StatusFilter)} variant="outline" className="grid grid-cols-3">
                      <ToggleGroupItem value="all">Tous</ToggleGroupItem>
                      <ToggleGroupItem value="open">Actifs</ToggleGroupItem>
                      <ToggleGroupItem value="closed">Fermés</ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                </form>
                <div className="flex flex-col gap-2">
                  {visibleCompanies.map((company) => (
                    <button key={`${company.siren}-${company.siret}`} type="button" className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-left hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background" onClick={() => { setDraft(buildDraftFromOfficial(company)); setStep('details'); }}>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{company.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{[company.siret, company.city, company.naf_code, company.is_head_office ? 'Siège' : null].filter(Boolean).join(' · ')}</span>
                      </span>
                      <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
                    </button>
                  ))}
                  {submittedSearch && !search.isFetching && visibleCompanies.length === 0 ? <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Aucun établissement trouvé.</p> : null}
                </div>
              </>
            ) : null}

            {step === 'details' ? (
              <>
                <div><h1 className="text-2xl font-semibold tracking-tight">Informations fournisseur</h1><p className="mt-1 text-sm text-muted-foreground">Complète les champs permanents de la fiche fournisseur.</p></div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input name="admin-supplier-name" value={draft.name} onChange={(event) => updateDraft('name', event.target.value)} placeholder="Nom fournisseur" aria-label="Nom fournisseur admin" />
                  <Input name="admin-supplier-code" value={draft.supplier_code} onChange={(event) => updateSupplierCode(event.target.value)} placeholder="Code interne (ex. EDF)" aria-label="Code interne fournisseur" className="font-mono uppercase" maxLength={4} />
                  <Input name="admin-supplier-number" value={draft.supplier_number} onChange={(event) => updateSupplierNumber(event.target.value)} placeholder="N° fournisseur" aria-label="Numéro fournisseur" inputMode="numeric" maxLength={15} />
                  <Input name="admin-supplier-phone" value={draft.primary_phone} onChange={(event) => updateDraft('primary_phone', event.target.value)} placeholder="Téléphone principal" aria-label="Téléphone fournisseur admin" />
                  <Input name="admin-supplier-email" value={draft.primary_email} onChange={(event) => updateDraft('primary_email', event.target.value)} placeholder="Email principal" aria-label="Email fournisseur admin" type="email" />
                  <Input name="admin-supplier-address" value={draft.address} onChange={(event) => updateDraft('address', event.target.value)} placeholder="Adresse" aria-label="Adresse fournisseur admin" className="md:col-span-2" />
                  <Input name="admin-supplier-postal-code" value={draft.postal_code} onChange={(event) => updateDraft('postal_code', event.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="Code postal" aria-label="Code postal fiche fournisseur" />
                  <Input name="admin-supplier-city" value={draft.city} onChange={(event) => updateDraft('city', event.target.value)} placeholder="Ville" aria-label="Ville fiche fournisseur" />
                  <Input name="admin-supplier-department" value={draft.department} onChange={(event) => updateDraft('department', event.target.value.toUpperCase())} placeholder="Département" aria-label="Département fiche fournisseur" />
                  <Input name="admin-supplier-naf" value={draft.naf_code} onChange={(event) => updateDraft('naf_code', normalizeNafCode(event.target.value))} placeholder="NAF" aria-label="NAF fiche fournisseur" className="font-mono uppercase" />
                  <Input name="admin-supplier-siren" value={draft.siren} onChange={(event) => updateDraft('siren', event.target.value)} placeholder="SIREN" aria-label="SIREN fournisseur" />
                  <Input name="admin-supplier-siret" value={draft.siret} onChange={(event) => updateDraft('siret', event.target.value)} placeholder="SIRET" aria-label="SIRET fournisseur" />
                  <Textarea name="admin-supplier-notes" value={draft.notes} onChange={(event) => updateDraft('notes', event.target.value)} placeholder="Notes…" aria-label="Notes fournisseur admin" className="md:col-span-2" />
                </div>
                {!canContinueDetails ? <p className="text-sm text-destructive">Nom et téléphone ou email sont requis.</p> : null}
              </>
            ) : null}

            {step === 'review' ? (
              <>
                <div><h1 className="text-2xl font-semibold tracking-tight">Validation</h1><p className="mt-1 text-sm text-muted-foreground">Vérifie la fiche avant création.</p></div>
                <div className="rounded-lg border border-border bg-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div><h2 className="text-lg font-semibold">{draft.name}</h2><p className="text-sm text-muted-foreground">Référentiel global CIR</p></div>
                    {draft.official_data_source ? <Badge variant="success"><CheckCircle2 data-icon="inline-start" aria-hidden="true" />Officiel</Badge> : <Badge variant="secondary">Manuel</Badge>}
                  </div>
                  <dl className="mt-5 grid gap-3 md:grid-cols-2">{summaryRows.map(([label, value]) => <div key={label}><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 text-sm font-medium">{value}</dd></div>)}</dl>
                </div>
              </>
            ) : null}
          </div>
        </main>
        <aside className="hidden min-h-0 border-l border-border-subtle bg-surface-1/30 p-5 lg:block">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Globe2 className="size-4" aria-hidden="true" />
            Intelligence fournisseur
          </div>
          <div className="mt-5 rounded-lg border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
            {draft.official_data_source ? 'Données officielles importées depuis la recherche SIRENE. La fiche reste globale CIR.' : 'Sélectionne un établissement officiel pour préremplir la fiche globale CIR.'}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {draft.siret ? <Badge variant="outline">SIRET {draft.siret}</Badge> : null}
            {draft.naf_code ? <Badge variant="outline"><Hash data-icon="inline-start" aria-hidden="true" />{draft.naf_code}</Badge> : null}
            {draft.city ? <Badge variant="outline">{draft.city}</Badge> : null}
          </div>
        </aside>
      </div>
    </section>
  );
};

export default AdminSupplierCreatePage;
