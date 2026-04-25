import type { UseFormReturn } from "react-hook-form";
import {
  Building2,
  Check,
  ChevronsRight,
  LoaderCircle,
  MapPin,
  Search,
  AlertTriangle,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type {
  DirectoryCompanySearchEstablishmentStatus,
  DirectoryCompanySearchMatchQuality,
  DirectoryCompanySearchResult,
  DirectoryListRow,
} from "shared/schemas/directory.schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import DirectoryFilterCombobox from "@/components/client-directory/directory-filters/DirectoryFilterCombobox";
import type {
  OnboardingFormInput,
  OnboardingValues,
} from "./entityOnboarding.schema";
import type {
  CompanySearchGroup,
  DuplicateMatch,
  CompanySearchStatusFilter,
} from "./entityOnboarding.types";
import { formatOfficialDate } from "./entityOnboarding.utils";
import EntityOnboardingIndividualSearchStep from "./EntityOnboardingIndividualSearchStep";

const getMatchBadgeLabel = (
  quality: DirectoryCompanySearchMatchQuality,
): string | null => {
  if (quality === "close") {
    return "Approchant";
  }

  if (quality === "expanded") {
    return "Elargi";
  }

  return null;
};

interface EntityOnboardingSearchStepProps {
  form: UseFormReturn<OnboardingFormInput, unknown, OnboardingValues>;
  values: OnboardingValues;
  isIndividualClient: boolean;
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  department: string;
  onDepartmentChange: (value: string) => void;
  statusFilter: CompanySearchStatusFilter;
  onStatusFilterChange: (filter: CompanySearchStatusFilter) => void;
  departmentOptions: Array<{ value: string; label: string }>;
  allowManualEntry: boolean;
  manualEntry: boolean;
  onToggleManualEntry: () => void;
  isFetching: boolean;
  isStale: boolean;
  groups: CompanySearchGroup[];
  hasStatusFilteredOutResults: boolean;
  selectedGroup: CompanySearchGroup | null;
  onGroupSelect: (groupId: string) => void;
  selectedCompany: DirectoryCompanySearchResult | undefined;
  onEstablishmentSelect: (company: DirectoryCompanySearchResult) => void;
  duplicateMatches: DuplicateMatch[];
  duplicatesLoading: boolean;
  onOpenDuplicate?: (record: DirectoryListRow) => void;
}

const labelClasses =
  "text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground";

const STATUS_FILTER_OPTIONS: Array<{
  value: CompanySearchStatusFilter;
  label: string;
  compactLabel: string;
}> = [
  { value: "all", label: "Tous les statuts", compactLabel: "Tous" },
  {
    value: "open",
    label: "Etablissements actifs",
    compactLabel: "Actifs",
  },
  {
    value: "closed",
    label: "Etablissements fermes",
    compactLabel: "Fermés",
  },
  {
    value: "unknown",
    label: "Statuts officiels inconnus",
    compactLabel: "Inconnus",
  },
];

const getStatusBadgeCopy = (
  status: DirectoryCompanySearchEstablishmentStatus,
): string => {
  if (status === "open") {
    return "Actif";
  }

  if (status === "closed") {
    return "Fermé";
  }

  return "Inconnu";
};

const getVisibleEstablishmentsSummary = (
  visibleCount: number,
  statusFilter: CompanySearchStatusFilter,
  department: string,
  totalCount: number,
): string => {
  const scope =
    statusFilter === "all"
      ? `${visibleCount} établissement${visibleCount > 1 ? "s" : ""} affiché${visibleCount > 1 ? "s" : ""}`
      : statusFilter === "open"
        ? `${visibleCount} établissement${visibleCount > 1 ? "s" : ""} actif${visibleCount > 1 ? "s" : ""} affiché${visibleCount > 1 ? "s" : ""}`
        : statusFilter === "closed"
          ? `${visibleCount} établissement${visibleCount > 1 ? "s" : ""} fermé${visibleCount > 1 ? "s" : ""} affiché${visibleCount > 1 ? "s" : ""}`
          : `${visibleCount} établissement${visibleCount > 1 ? "s" : ""} au statut inconnu affiché${visibleCount > 1 ? "s" : ""}`;

  const departmentScope = department
    ? ` pour le département ${department}`
    : "";

  return `${scope}${departmentScope} sur ${totalCount} site${totalCount > 1 ? "s" : ""} officiels`;
};

const getStatusAccentClasses = (
  status: DirectoryCompanySearchEstablishmentStatus,
  isSelected: boolean,
): string => {
  if (status === "closed") {
    return cn(
      "border-destructive/35 bg-destructive/[0.03] hover:border-destructive/55 hover:bg-destructive/[0.05]",
      isSelected && "border-destructive/60 ring-2 ring-destructive/15",
    );
  }

  if (status === "unknown") {
    return cn(
      "border-border-strong/60 bg-surface-1/40 hover:border-border-strong hover:bg-surface-1/60",
      isSelected && "border-border-strong ring-2 ring-primary/15",
    );
  }

  return cn(
    "border-border bg-background hover:border-border-strong hover:bg-surface-1/30",
    isSelected && "border-primary/40 bg-primary/[0.03] ring-2 ring-primary/15",
  );
};

const getStatusRailClasses = (
  status: DirectoryCompanySearchEstablishmentStatus,
): string => {
  if (status === "closed") {
    return "bg-destructive";
  }

  if (status === "unknown") {
    return "bg-muted-foreground/40";
  }

  return "bg-success";
};

const EntityOnboardingSearchStep = ({
  form,
  values,
  isIndividualClient,
  searchDraft,
  onSearchDraftChange,
  department,
  onDepartmentChange,
  statusFilter,
  onStatusFilterChange,
  departmentOptions,
  allowManualEntry,
  manualEntry,
  onToggleManualEntry,
  isFetching,
  isStale,
  groups,
  hasStatusFilteredOutResults,
  selectedGroup,
  onGroupSelect,
  selectedCompany,
  onEstablishmentSelect,
}: EntityOnboardingSearchStepProps) => {
  const reducedMotion = useReducedMotion();

  if (isIndividualClient) {
    return <EntityOnboardingIndividualSearchStep form={form} values={values} />;
  }

  return (
    <div className="flex h-full flex-col space-y-8">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="size-4" />
            <span>Entreprise</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Recherche officielle
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Trouve l&apos;etablissement via la base officielle pour importer les
            donnees.
          </p>
        </div>
        {allowManualEntry ? (
          <Button
            type="button"
            variant="outline"
            size="dense"
            onClick={onToggleManualEntry}
            className="bg-surface-1/50 text-muted-foreground hover:text-foreground border-border"
          >
            {manualEntry ? "Retour recherche" : "Saisie manuelle"}
          </Button>
        ) : null}
      </div>

      {manualEntry ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="max-w-md rounded-lg border border-dashed border-border-subtle bg-surface-1/30 p-8 text-center">
            <p className="text-sm font-medium text-foreground">
              Saisie manuelle active
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Le flux continue sans donnees officielles. Les champs identite,
              adresse et rattachement agence pourront etre saisis a l&apos;etape
              suivante.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0 space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground/60" />
            <input
              id="company-search"
              name="company-search"
              aria-label="Recherche entreprise"
              autoComplete="off"
              spellCheck={false}
              value={searchDraft}
              onChange={(event) => onSearchDraftChange(event.target.value)}
              placeholder="Nom de societe, SIREN ou SIRET…"
              className="h-12 w-full rounded-lg border border-border bg-surface-1/30 pl-12 pr-4 text-lg font-medium tracking-tight text-foreground shadow-sm transition-[border-color,background-color,box-shadow] placeholder:text-muted-foreground/40 focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex flex-wrap items-end gap-4 border-b border-border-subtle pb-4">
            <div className="flex flex-col gap-1.5">
              <p className={labelClasses}>Département</p>
              <div className="w-48">
                <DirectoryFilterCombobox
                  items={departmentOptions}
                  values={department ? [department] : []}
                  onValuesChange={(nextValues) =>
                    onDepartmentChange(nextValues[0] ?? "")
                  }
                  placeholder="Tous"
                  allLabel="Tous les departements"
                  searchPlaceholder="Code…"
                  emptyLabel="Aucun."
                  searchInputName="official-search-department"
                  triggerAriaLabel="Département"
                  className="h-9 rounded-md border-border bg-surface-1/30 shadow-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <p className={labelClasses}>Statut établissement</p>
              <ToggleGroup
                type="single"
                value={statusFilter}
                variant="outline"
                size="sm"
                aria-label="Filtre statut etablissement"
                onValueChange={(nextValue) => {
                  if (nextValue) {
                    onStatusFilterChange(
                      nextValue as CompanySearchStatusFilter,
                    );
                  }
                }}
                className="justify-start gap-1"
              >
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <ToggleGroupItem
                    key={option.value}
                    value={option.value}
                    aria-label={option.label}
                    className="h-9 min-w-[84px] rounded-md border-border bg-surface-1/30 px-3 text-[11px] font-bold shadow-sm transition-[border-color,background-color,color,box-shadow] data-[state=on]:border-primary/40 data-[state=on]:bg-primary/5 data-[state=on]:text-primary"
                  >
                    {option.compactLabel}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            {isFetching && (
              <div className="ml-auto flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <LoaderCircle className="size-3.5 animate-spin text-primary" />
                Recherche
              </div>
            )}
          </div>

          <div
            className={cn(
              "flex-1 min-h-0",
              isStale && "opacity-60 transition-opacity duration-300",
            )}
          >
            {groups.length > 0 ? (
              <ScrollArea className="h-full -mx-4 px-4">
                <div className="space-y-5 pb-10">
                  <p
                    aria-live="polite"
                    className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60"
                  >
                    {groups.length} entreprise{groups.length > 1 ? "s" : ""}{" "}
                    trouvee{groups.length > 1 ? "s" : ""}
                  </p>
                  {groups.map((group) => {
                    const isActive = selectedGroup?.id === group.id;
                    const visibleEstablishmentCount = group.establishments.length;
                    const hiddenOfficialCount = Math.max(
                      group.totalEstablishmentCount - visibleEstablishmentCount,
                      0,
                    );
                    const cities = Array.from(
                      new Set(
                        group.establishments
                          .map((company) => company.city)
                          .filter(Boolean),
                      ),
                    ).slice(0, 3);

                    return (
                      <div key={group.id} className="relative space-y-3">
                        <button
                          type="button"
                          onClick={() => onGroupSelect(group.id)}
                          className={cn(
                            "relative z-10 flex w-full flex-col items-start gap-3 rounded-xl border p-5 text-left transition-[border-color,background-color,box-shadow,transform]",
                            isActive
                              ? "border-primary/30 bg-surface-1 shadow-sm ring-1 ring-primary/10"
                              : "border-border bg-background hover:border-border-strong hover:shadow-md",
                          )}
                        >
                          <div className="flex w-full items-start justify-between gap-4">
                            <div className="space-y-2 min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={cn(
                                    "text-base font-bold text-foreground truncate",
                                    isActive && "text-primary",
                                  )}
                                >
                                  {group.label}
                                </span>
                                {group.siren && (
                                  <Badge
                                    variant="outline"
                                    className="border-border bg-surface-1 font-mono tabular-nums text-[10px] font-bold"
                                  >
                                    {group.siren}
                                  </Badge>
                                )}
                                {getMatchBadgeLabel(group.match_quality) && (
                                  <Badge
                                    variant="outline"
                                    className="border-border bg-surface-1 text-[10px] font-bold uppercase tracking-tight"
                                  >
                                    {getMatchBadgeLabel(group.match_quality)}
                                  </Badge>
                                )}
                              </div>
                              {group.subtitle && (
                                <p className="text-[13px] text-muted-foreground leading-relaxed">
                                  {group.subtitle}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Badge
                                  variant="outline"
                                  className="h-5 border-border bg-background px-2 text-[10px] font-bold tabular-nums"
                                >
                                  {group.totalEstablishmentCount} site
                                  {group.totalEstablishmentCount > 1 ? "s" : ""}
                                </Badge>
                                {group.openEstablishmentCount > 0 ? (
                                  <Badge
                                    variant="outline"
                                    className="h-5 border-success/30 bg-success/5 px-2 text-[10px] font-bold text-success tabular-nums"
                                  >
                                    {group.openEstablishmentCount} actif
                                    {group.openEstablishmentCount > 1 ? "s" : ""}
                                  </Badge>
                                ) : null}
                                {group.closedEstablishmentCount > 0 ? (
                                  <Badge
                                    variant="outline"
                                    className="h-5 border-destructive/30 bg-destructive/5 px-2 text-[10px] font-bold text-destructive tabular-nums"
                                  >
                                    {group.closedEstablishmentCount} ferme
                                    {group.closedEstablishmentCount > 1 ? "s" : ""}
                                  </Badge>
                                ) : null}
                                {group.unknownEstablishmentCount > 0 ? (
                                  <Badge
                                    variant="outline"
                                    className="h-5 border-border-strong/60 bg-surface-1 px-2 text-[10px] font-bold text-muted-foreground tabular-nums"
                                  >
                                    {group.unknownEstablishmentCount} inconnu
                                    {group.unknownEstablishmentCount > 1 ? "s" : ""}
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                            <div className="mt-1 flex items-center h-5">
                              <ChevronsRight
                                className={cn(
                                  "size-4 transition-transform",
                                  isActive
                                    ? "rotate-90 text-primary"
                                    : "text-muted-foreground/40",
                                )}
                              />
                            </div>
                          </div>

                          {cities.length > 0 && !isActive && (
                            <div className="flex flex-wrap gap-3 text-[11px] font-medium text-muted-foreground/70">
                              {cities.map((entry) => (
                                <span
                                  key={entry}
                                  className="inline-flex items-center gap-1.5"
                                >
                                  <MapPin className="size-3" />
                                  {entry}
                                </span>
                              ))}
                            </div>
                          )}

                          {(group.closedEstablishmentCount > 0 ||
                            hiddenOfficialCount > 0) && (
                            <div className="flex flex-wrap items-center gap-4 text-[12px] leading-relaxed">
                              {group.closedEstablishmentCount > 0 ? (
                                <span className="font-medium text-destructive">
                                  {group.closedEstablishmentCount} site
                                  {group.closedEstablishmentCount > 1 ? "s" : ""}{" "}
                                  fermé
                                  {group.closedEstablishmentCount > 1 ? "s" : ""}{" "}
                                  à vérifier avant import
                                </span>
                              ) : null}
                              {hiddenOfficialCount > 0 ? (
                                <span className="text-muted-foreground">
                                  {hiddenOfficialCount} autre
                                  {hiddenOfficialCount > 1 ? "s" : ""} site
                                  {hiddenOfficialCount > 1 ? "s" : ""} officiel
                                  {hiddenOfficialCount > 1 ? "s" : ""} hors de
                                  la liste actuelle
                                </span>
                              ) : null}
                            </div>
                          )}
                        </button>

                        <AnimatePresence>
                          {isActive && (
                            <motion.div
                              initial={
                                reducedMotion
                                  ? { opacity: 0 }
                                  : { opacity: 0, y: -8 }
                              }
                              animate={
                                reducedMotion
                                  ? { opacity: 1 }
                                  : { opacity: 1, y: 0 }
                              }
                              exit={
                                reducedMotion
                                  ? { opacity: 0 }
                                  : { opacity: 0, y: -6 }
                              }
                              transition={{ duration: reducedMotion ? 0.15 : 0.2 }}
                              className="relative z-10 ml-4 rounded-xl border border-border-subtle bg-surface-1/30 p-4 shadow-sm"
                            >
                              <div className="flex flex-col gap-3">
                                <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80">
                                  <div className="h-px w-4 bg-border" />
                                  <span>Choisissez l&apos;établissement précis</span>
                                  <span>
                                    {getVisibleEstablishmentsSummary(
                                      visibleEstablishmentCount,
                                      statusFilter,
                                      department,
                                      group.totalEstablishmentCount,
                                    )}
                                  </span>
                                  {group.closedEstablishmentCount > 0 ? (
                                    <span className="text-destructive">
                                      Les sites fermés sont marqués en rouge.
                                    </span>
                                  ) : null}
                                </div>
                                {group.establishments.map((establishment) => {
                                  const isSelected =
                                    selectedCompany?.siret ===
                                    establishment.siret;
                                  const establishmentLabel =
                                    [
                                      establishment.postal_code,
                                      establishment.city,
                                    ]
                                      .filter(Boolean)
                                      .join(" ") || "Etablissement";
                                  const isClosed =
                                    establishment.establishment_status ===
                                    "closed";
                                  const isUnknown =
                                    establishment.establishment_status ===
                                    "unknown";
                                  const formattedClosedAt =
                                    formatOfficialDate(
                                      establishment.establishment_closed_at,
                                    );

                                  return (
                                    <button
                                      key={
                                        establishment.siret ??
                                        `${establishment.city}-${establishment.address}`
                                      }
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onEstablishmentSelect(establishment);
                                      }}
                                      className={cn(
                                        "flex w-full items-start gap-4 rounded-xl border p-4 text-left text-sm transition-[border-color,background-color,box-shadow,transform]",
                                        getStatusAccentClasses(
                                          establishment.establishment_status,
                                          isSelected,
                                        ),
                                      )}
                                    >
                                      <div
                                        className={cn(
                                          "mt-0.5 h-auto min-h-16 w-1.5 shrink-0 rounded-full",
                                          getStatusRailClasses(
                                            establishment.establishment_status,
                                          ),
                                        )}
                                      />
                                      <div className="min-w-0 flex-1 space-y-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span
                                            className={cn(
                                              "text-[14px] font-bold truncate",
                                              isSelected
                                                ? "text-primary"
                                                : "text-foreground",
                                            )}
                                          >
                                            {establishmentLabel}
                                          </span>
                                          <Badge
                                            variant={
                                              isClosed ? "destructive" : "outline"
                                            }
                                            className={cn(
                                              "h-5 px-2 text-[10px] font-bold",
                                              !isClosed &&
                                                !isUnknown &&
                                                "border-success/30 bg-success/5 text-success",
                                              isUnknown &&
                                                "border-border-strong/60 bg-surface-1 text-muted-foreground",
                                            )}
                                          >
                                            {getStatusBadgeCopy(
                                              establishment.establishment_status,
                                            )}
                                          </Badge>
                                          {establishment.is_head_office ? (
                                            <Badge
                                              variant="outline"
                                              className="h-5 px-2 text-[10px] font-bold"
                                            >
                                              Siège
                                            </Badge>
                                          ) : null}
                                          {establishment.is_former_head_office ? (
                                            <Badge
                                              variant="outline"
                                              className="h-5 px-2 text-[10px] font-bold"
                                            >
                                              Ancien siège
                                            </Badge>
                                          ) : null}
                                        </div>
                                        {establishment.commercial_name ? (
                                          <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                            {establishment.commercial_name}
                                          </p>
                                        ) : null}
                                        <div className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">
                                          <div className="flex items-center gap-1.5">
                                            <MapPin className="size-3 opacity-60" />
                                            <span className="truncate">
                                              {establishment.address ??
                                                "Adresse non diffusee"}
                                            </span>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-3">
                                            <span className="rounded border border-border-subtle bg-surface-1 px-1.5 font-mono font-medium tabular-nums">
                                              {establishment.siret}
                                            </span>
                                            {establishment.naf_code ? (
                                              <span className="font-mono tabular-nums">
                                                NAF {establishment.naf_code}
                                              </span>
                                            ) : null}
                                          </div>
                                        </div>
                                        {isClosed ? (
                                          <div className="rounded-lg border border-destructive/30 bg-destructive/[0.05] px-3 py-2 text-destructive">
                                            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em]">
                                              <AlertTriangle
                                                aria-hidden="true"
                                                className="size-3.5"
                                              />
                                              Site ferme
                                            </div>
                                            <p className="mt-1 text-xs leading-relaxed">
                                              {formattedClosedAt
                                                ? `Ferme officiellement le ${formattedClosedAt}.`
                                                : "Fermeture officielle signalée par la base SIRENE."}
                                            </p>
                                          </div>
                                        ) : null}
                                        {isUnknown ? (
                                          <div className="rounded-lg border border-border-subtle bg-background/80 px-3 py-2 text-muted-foreground">
                                            <p className="text-xs leading-relaxed">
                                              Le statut officiel de cet
                                              établissement n&apos;est pas
                                              disponible dans la réponse
                                              actuelle.
                                            </p>
                                          </div>
                                        ) : null}
                                      </div>
                                      <div
                                        className={cn(
                                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-[border-color,background-color,color,transform]",
                                          isSelected
                                            ? "border-primary bg-primary text-primary-foreground scale-110"
                                            : "border-border bg-surface-1",
                                        )}
                                      >
                                        {isSelected && (
                                          <Check
                                            className="size-3"
                                            strokeWidth={4}
                                          />
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : hasStatusFilteredOutResults ? (
              <div className="mx-auto max-w-sm rounded-xl border border-dashed border-border bg-surface-1/10 py-12 text-center">
                <AlertTriangle className="mx-auto mb-3 size-8 text-muted-foreground/40" />
                <p className="text-sm font-bold text-foreground">
                  Aucun établissement ne correspond au filtre actuel
                </p>
                <p className="mt-1 px-6 text-xs leading-relaxed text-muted-foreground">
                  Reviens sur <strong>Tous</strong> pour revoir l&apos;ensemble
                  des sites officiels remontés par la recherche.
                </p>
              </div>
            ) : searchDraft.length > 2 ? (
              <div className="py-12 text-center border rounded-xl border-dashed border-border bg-surface-1/10 mx-auto max-w-sm">
                <AlertTriangle className="size-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-bold text-foreground">
                  Aucun résultat officiel trouvé
                </p>
                <p className="mt-1 text-xs text-muted-foreground px-6 leading-relaxed">
                  Vérifiez l&apos;orthographe, essayez un département précis ou
                  {allowManualEntry
                    ? <> utilisez la <strong>saisie manuelle</strong>.</>
                    : ' ajustez le périmètre de recherche.'}
                </p>
              </div>
            ) : (
              <div className="py-12 text-center">
                <Search className="size-10 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-sm font-medium text-muted-foreground/60 px-12 leading-relaxed">
                  Entrez le nom d&apos;une entreprise ou son numéro SIREN pour
                  lancer l&apos;intelligence commerciale.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EntityOnboardingSearchStep;
