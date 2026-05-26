import { useEffect, useMemo, useState, type ChangeEvent, type RefObject } from 'react';
import type { FieldErrors, UseFormRegisterReturn, UseFormSetValue } from 'react-hook-form';
import { History, Megaphone, Phone, PhoneCall, Search, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

import { useCockpitPhoneLookup } from '../../../hooks/cockpit-utils/useCockpitPhoneLookup';
import { formatDate } from '@/utils/date/formatDate';
import { formatFrenchPhone } from '@/utils/formatFrenchPhone';
import { Button } from '../../ui/inputs/basic/Button';
import { Input } from '../../ui/inputs/basic/Input';
import { isSolicitationRelationValue } from '@/constants/relations';
import type { Interaction } from '@/types';
import type { InteractionFormValues } from '../../../../../shared/schemas/interaction/interaction.schema';
import GuidedTierSearchShell from './GuidedTierSearchShell';

type CockpitSolicitationLookupProps = {
  activeAgencyId: string | null;
  errors: FieldErrors<InteractionFormValues>;
  companyField: UseFormRegisterReturn;
  companyName: string;
  showSuggestions: boolean;
  onShowSuggestionsChange: (show: boolean) => void;
  companySuggestions: string[];
  companyInputRef: RefObject<HTMLInputElement | null>;
  contactPhoneField: UseFormRegisterReturn;
  contactPhone: string;
  onContactPhoneChange: (event: ChangeEvent<HTMLInputElement>) => void;
  setValue: UseFormSetValue<InteractionFormValues>;
  interactions: Interaction[];
  onComplete: () => void;
};

const SOLICITATION_COMPANY_LABEL = 'Sollicitation';
const RECENT_SOLICITATIONS_LIMIT = 5;

const compactWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trimStart();
const getInteractionDateTime = (interaction: Interaction): number =>
  new Date(interaction.last_action_at ?? interaction.created_at).getTime();

const CockpitSolicitationLookup = ({
  activeAgencyId,
  errors,
  contactPhoneField,
  contactPhone,
  onContactPhoneChange,
  setValue,
  interactions,
  onComplete
}: CockpitSolicitationLookupProps) => {
  const shouldReduceMotion = useReducedMotion();
  const [showCreate, setShowCreate] = useState(false);
  const [contactName, setContactName] = useState('');
  const [quickPhone, setQuickPhone] = useState(contactPhone);
  const lookup = useCockpitPhoneLookup(activeAgencyId, contactPhone, true);
  const canContinue = lookup.normalizedPhone.length >= 10;
  const hasMatches = Boolean(lookup.data?.matches.length);
  const canCreate = Boolean(contactName.trim() && quickPhone.replace(/\D/g, '').length >= 10);
  const recentSolicitations = useMemo(() => interactions
    .filter((interaction) => isSolicitationRelationValue(interaction.entity_type))
    .filter((interaction) => Boolean(interaction.contact_phone))
    .sort((first, second) => getInteractionDateTime(second) - getInteractionDateTime(first))
    .slice(0, RECENT_SOLICITATIONS_LIMIT), [interactions]);

  useEffect(() => {
    if (!showCreate) setQuickPhone(contactPhone);
  }, [contactPhone, showCreate]);

  const applySolicitation = (phone: string, name: string) => {
    const normalizedName = compactWhitespace(name).trim();
    setValue('entity_id', '', { shouldDirty: true, shouldValidate: true });
    setValue('contact_id', '', { shouldDirty: true, shouldValidate: true });
    setValue('company_name', SOLICITATION_COMPANY_LABEL, { shouldDirty: true, shouldValidate: true });
    setValue('contact_name', normalizedName, { shouldDirty: true, shouldValidate: true });
    setValue('contact_first_name', '', { shouldDirty: true, shouldValidate: true });
    setValue('contact_last_name', '', { shouldDirty: true, shouldValidate: true });
    setValue('contact_position', '', { shouldDirty: true, shouldValidate: true });
    setValue('contact_email', '', { shouldDirty: true, shouldValidate: true });
    setValue('contact_phone', phone, { shouldDirty: true, shouldValidate: true });
  };

  const openCreate = () => {
    setQuickPhone(contactPhone);
    setShowCreate(true);
  };

  const handleCreate = () => {
    if (!canCreate) return;
    applySolicitation(quickPhone, contactName);
    onComplete();
  };

  const refinedHeaderStyle = 'flex items-center gap-2 border-b border-border/70 bg-surface-1 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground select-none';

  return (
    <GuidedTierSearchShell
      archiveSupport="hidden"
      contentClassName="min-h-[170px] bg-card"
    >
      <div className="space-y-0" data-testid="cockpit-solicitation-lookup">
        {/* Cellule de recherche téléphone style compartiment details */}
        <div className="relative border-b border-border/60 bg-card px-5 py-3.5 focus-within:bg-surface-1/30 transition-all duration-150">
          <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground select-none block mb-1.5" htmlFor="solicitation-search-phone">
            Téléphone
          </label>
          <div className="relative flex items-center gap-2">
            <Search
              size={14}
              aria-hidden="true"
              className="pointer-events-none text-muted-foreground/60 transition-colors duration-150"
            />
            <Input
              id="solicitation-search-phone"
              {...contactPhoneField}
              ref={contactPhoneField.ref}
              value={contactPhone}
              onChange={onContactPhoneChange}
              inputMode="tel"
              autoComplete="tel"
              placeholder="Rechercher par numéro de téléphone…"
              aria-invalid={Boolean(errors.contact_phone?.message)}
              className="h-9 w-full min-w-0 text-[13px] font-semibold border-none bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-none placeholder:text-muted-foreground/75 text-foreground"
            />
          </div>
          {errors.contact_phone?.message ? (
            <p className="mt-1 text-xs text-destructive font-medium">{errors.contact_phone.message}</p>
          ) : null}
        </div>

        {/* Section d'ajout rapide sous forme de carte moderne dans une sous-zone grise */}
        <div className="p-4 bg-surface-1/40 border-b border-border/60">
          {!showCreate ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/15 bg-card px-4 py-3 shadow-sm transition-all duration-200 hover:border-primary/30">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-sm ring-1 ring-primary/5">
                  <Megaphone size={15} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-foreground">Ajouter une sollicitation</p>
                  <p className="truncate text-[10px] font-medium text-muted-foreground mt-0.5">Nom et numéro, sans créer de tiers.</p>
                </div>
              </div>
              <Button
                type="button"
                variant="default"
                size="dense"
                onClick={openCreate}
                className="bg-primary hover:bg-primary/95 text-xs font-bold px-3 shadow-sm transition-transform active:scale-[0.98] cursor-pointer"
              >
                <PhoneCall size={13} aria-hidden="true" className="mr-1.5 inline" />
                Ajouter
              </Button>
            </div>
          ) : (
            <div className="space-y-3.5 rounded-xl border border-primary/15 bg-card px-4 py-3.5 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Megaphone size={14} aria-hidden="true" />
                  </span>
                  <p className="truncate text-xs font-bold text-foreground">Sollicitation rapide</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="dense"
                  onClick={() => setShowCreate(false)}
                  aria-label="Refermer la création de sollicitation"
                  className="bg-muted hover:bg-muted/80 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer rounded-md px-2.5 py-1"
                >
                  <X size={13} aria-hidden="true" className="mr-1.5 inline" />
                  Refermer
                </Button>
              </div>
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_200px_auto]">
                <Input
                  aria-label="Nom de la sollicitation"
                  name="solicitation-contact-name"
                  value={contactName}
                  onChange={(event) => setContactName(compactWhitespace(event.target.value))}
                  placeholder="Nom…"
                  className="h-9 text-[13px] font-semibold"
                  autoComplete="off"
                />
                <div className="relative">
                  <Phone size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    aria-label="Téléphone de la sollicitation"
                    name="solicitation-contact-phone"
                    value={quickPhone}
                    onChange={(event) => setQuickPhone(formatFrenchPhone(event.target.value))}
                    placeholder="05 58 36 96 19"
                    className="h-9 pl-8 text-[13px] font-semibold"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreate}
                  disabled={!canCreate}
                  className="h-9 px-4 font-bold cursor-pointer"
                >
                  Utiliser cette sollicitation
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Listes d'historiques stylisées comme de belles cartes interactives */}
        {lookup.isFetching ? (
          <div className="space-y-2 p-3 bg-surface-1/30" role="status" aria-live="polite" aria-label="Recherche des appels">
            {[0, 1].map((item) => (
              <div key={item} className="h-12 animate-pulse rounded-xl border border-border bg-card shadow-sm" />
            ))}
          </div>
        ) : null}

        {!lookup.isFetching && hasMatches ? (
          <div className="border-b border-border/60">
            <div className={refinedHeaderStyle}>
              <History size={13} aria-hidden="true" className="text-muted-foreground/80" />
              Historique du numéro
            </div>
            <div className="max-h-48 space-y-1.5 overflow-y-auto p-3 bg-surface-1/30">
              {lookup.data?.matches.map((match) => (
                <motion.button
                  key={match.id}
                  type="button"
                  onClick={() => {
                    applySolicitation(match.contact_phone ?? contactPhone, match.contact_name);
                    onComplete();
                  }}
                  whileHover={shouldReduceMotion ? {} : { y: -0.5 }}
                  className="grid min-h-12 w-full gap-1.5 rounded-xl border border-border/60 bg-card px-4 py-2.5 text-left transition-all duration-200 hover:border-primary/30 hover:bg-surface-1/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 sm:grid-cols-[minmax(0,1fr)_auto] cursor-pointer"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-bold text-foreground">
                      {match.contact_name || match.contact_phone || contactPhone}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground mt-0.5">
                      {[match.contact_phone ?? contactPhone, match.subject].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="text-[11px] font-bold text-muted-foreground/80 sm:text-right mt-0.5 sm:mt-0">{formatDate(match.last_action_at)}</span>
                </motion.button>
              ))}
            </div>
          </div>
        ) : null}

        {!showCreate && !lookup.isFetching && !hasMatches && recentSolicitations.length > 0 ? (
          <div className="border-b border-border/60">
            <div className={refinedHeaderStyle}>
              <History size={13} aria-hidden="true" className="text-muted-foreground/80" />
              Dernières sollicitations
            </div>
            <div className="max-h-48 space-y-1.5 overflow-y-auto p-3 bg-surface-1/30">
              {recentSolicitations.map((interaction) => (
                <motion.button
                  key={interaction.id}
                  type="button"
                  onClick={() => {
                    applySolicitation(interaction.contact_phone ?? '', interaction.contact_name);
                    onComplete();
                  }}
                  whileHover={shouldReduceMotion ? {} : { y: -0.5 }}
                  className="grid min-h-12 w-full gap-1.5 rounded-xl border border-border/60 bg-card px-4 py-2.5 text-left transition-all duration-200 hover:border-primary/30 hover:bg-surface-1/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 sm:grid-cols-[minmax(0,1fr)_auto] cursor-pointer"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-bold text-foreground">
                      {interaction.contact_name || interaction.contact_phone}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground mt-0.5">
                      {[interaction.contact_phone, interaction.subject].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="text-[11px] font-bold text-muted-foreground/80 sm:text-right mt-0.5 sm:mt-0">{formatDate(interaction.last_action_at ?? interaction.created_at)}</span>
                </motion.button>
              ))}
            </div>
          </div>
        ) : null}

        {!showCreate && !lookup.isFetching && !hasMatches && canContinue ? (
          <div className="rounded-xl border border-dashed border-border bg-surface-1/60 p-4 m-3" role="status" aria-live="polite">
            <p className="text-xs font-semibold text-foreground">Aucun historique pour ce numéro</p>
            <p className="text-[10px] font-medium text-muted-foreground mt-0.5">Ajoutez une sollicitation rapide si besoin.</p>
          </div>
        ) : null}

        {!showCreate && !lookup.isFetching && !hasMatches && !canContinue ? (
          <p className="px-5 py-3 text-xs font-medium text-muted-foreground" role="status" aria-live="polite">
            Saisis un numéro pour retrouver l’historique.
          </p>
        ) : null}
      </div>
    </GuidedTierSearchShell>
  );
};

export default CockpitSolicitationLookup;
