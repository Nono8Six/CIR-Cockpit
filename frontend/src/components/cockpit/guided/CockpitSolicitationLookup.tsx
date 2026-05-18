import { useEffect, useMemo, useState, type ChangeEvent, type RefObject } from 'react';
import type { FieldErrors, UseFormRegisterReturn, UseFormSetValue } from 'react-hook-form';
import { History, Megaphone, Phone, PhoneCall, Search, X } from 'lucide-react';

import { useCockpitPhoneLookup } from '@/hooks/useCockpitPhoneLookup';
import { formatDate } from '@/utils/date/formatDate';
import { formatFrenchPhone } from '@/utils/formatFrenchPhone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isSolicitationRelationValue } from '@/constants/relations';
import type { Interaction } from '@/types';
import type { InteractionFormValues } from 'shared/schemas/interaction.schema';
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

  return (
    <GuidedTierSearchShell
      archiveSupport="hidden"
      contentClassName="min-h-[170px] p-2"
    >
      <div className="space-y-2" data-testid="cockpit-solicitation-lookup">
        <div className="relative">
          <Search
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            {...contactPhoneField}
            ref={contactPhoneField.ref}
            value={contactPhone}
            onChange={onContactPhoneChange}
            inputMode="tel"
            autoComplete="tel"
            placeholder="Rechercher par numéro de téléphone…"
            aria-invalid={Boolean(errors.contact_phone?.message)}
            className="h-10 pl-9 text-[13px]"
          />
          {errors.contact_phone?.message ? (
            <p className="mt-1 text-xs text-destructive">{errors.contact_phone.message}</p>
          ) : null}
        </div>
        <section className="rounded-lg border border-primary/15 bg-primary/5 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
          {!showCreate ? (
            <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-md border border-primary/10 bg-card/85 px-2.5 py-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Megaphone size={15} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">Ajouter une sollicitation</p>
                  <p className="truncate text-[11px] text-muted-foreground">Nom et numéro, sans créer de tiers.</p>
                </div>
              </div>
              <Button
                type="button"
                variant="default"
                size="dense"
                onClick={openCreate}
                className="bg-primary px-3 shadow-sm transition-[background-color,box-shadow,transform] hover:bg-primary/90 active:scale-[0.98]"
              >
                <PhoneCall size={13} aria-hidden="true" />
                Ajouter
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5 rounded-md border border-primary/15 bg-card px-2.5 py-2.5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Megaphone size={15} aria-hidden="true" />
                  </span>
                  <p className="truncate text-xs font-semibold text-foreground">Sollicitation rapide</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="dense"
                  onClick={() => setShowCreate(false)}
                  aria-label="Refermer la création de sollicitation"
                  className="bg-primary/5 text-primary hover:bg-primary/10"
                >
                  <X size={13} aria-hidden="true" />
                  Refermer
                </Button>
              </div>
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_240px_190px]">
                <Input
                  aria-label="Nom de la sollicitation"
                  name="solicitation-contact-name"
                  value={contactName}
                  onChange={(event) => setContactName(compactWhitespace(event.target.value))}
                  placeholder="Nom…"
                  className="h-9"
                  autoComplete="off"
                />
                <div className="relative">
                  <Phone size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    aria-label="Téléphone de la sollicitation"
                    name="solicitation-contact-phone"
                    value={quickPhone}
                    onChange={(event) => setQuickPhone(formatFrenchPhone(event.target.value))}
                    placeholder="05 58 36 96 19"
                    className="h-9 pl-9"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                  />
                </div>
                <Button type="button" size="sm" onClick={handleCreate} disabled={!canCreate} className="h-9 w-full">
                  Utiliser cette sollicitation
                </Button>
              </div>
            </div>
          )}
        </section>
        {lookup.isFetching ? (
          <div className="space-y-2" role="status" aria-live="polite" aria-label="Recherche des appels">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-12 animate-pulse rounded-md border border-border bg-muted/35" />
            ))}
          </div>
        ) : null}
        {!lookup.isFetching && hasMatches ? (
          <div className="rounded-md border border-border/80 bg-card shadow-[0_1px_0_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 border-b border-border/70 bg-surface-1 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <History size={13} aria-hidden="true" />
              Historique du numéro
            </div>
            <div className="max-h-48 space-y-1.5 overflow-y-auto p-2">
              {lookup.data?.matches.map((match) => (
                <button
                  key={match.id}
                  type="button"
                  onClick={() => {
                    applySolicitation(match.contact_phone ?? contactPhone, match.contact_name);
                    onComplete();
                  }}
                  className="grid min-h-11 w-full gap-1 rounded-md border border-border/80 bg-card px-3 py-2 text-left transition-[background-color,border-color,box-shadow] hover:border-primary/25 hover:bg-primary/5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-foreground">
                      {match.contact_name || match.contact_phone || contactPhone}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[match.contact_phone ?? contactPhone, match.subject].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">{formatDate(match.last_action_at)}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {!showCreate && !lookup.isFetching && !hasMatches && recentSolicitations.length > 0 ? (
          <div className="rounded-md border border-border/80 bg-card shadow-[0_1px_0_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 border-b border-border/70 bg-surface-1 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <History size={13} aria-hidden="true" />
              Dernières sollicitations
            </div>
            <div className="max-h-48 space-y-1.5 overflow-y-auto p-2">
              {recentSolicitations.map((interaction) => (
                <button
                  key={interaction.id}
                  type="button"
                  onClick={() => {
                    applySolicitation(interaction.contact_phone ?? '', interaction.contact_name);
                    onComplete();
                  }}
                  className="grid min-h-11 w-full gap-1 rounded-md border border-border/80 bg-card px-3 py-2 text-left transition-[background-color,border-color,box-shadow] hover:border-primary/25 hover:bg-primary/5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-foreground">
                      {interaction.contact_name || interaction.contact_phone}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[interaction.contact_phone, interaction.subject].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">{formatDate(interaction.last_action_at ?? interaction.created_at)}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {!showCreate && !lookup.isFetching && !hasMatches && canContinue ? (
          <div className="rounded-md border border-dashed border-border bg-surface-1/60 px-3 py-2.5" role="status" aria-live="polite">
            <p className="text-xs font-medium text-foreground">Aucun historique pour ce numéro</p>
            <p className="text-[11px] text-muted-foreground">Ajoutez une sollicitation rapide si besoin.</p>
          </div>
        ) : null}
        {!showCreate && !lookup.isFetching && !hasMatches && !canContinue ? (
          <p className="px-1 text-xs text-muted-foreground" role="status" aria-live="polite">
            Saisis un numéro pour retrouver l’historique.
          </p>
        ) : null}
      </div>
    </GuidedTierSearchShell>
  );
};

export default CockpitSolicitationLookup;
