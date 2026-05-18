import { useMemo, useState } from 'react';
import { Mail, Plus, UserPlus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

type QuickContactState = {
  firstName: string;
  lastName: string;
  phone: string;
  agencyId: string;
};

type AgencyOption = {
  id: string;
  name: string;
};

type CockpitInternalQuickCreateProps = {
  agencies: AgencyOption[];
  defaultAgencyId: string;
  onUseContact: (contact: QuickContactState & { email: string; agencyName: string }) => void;
};

const EMPTY_QUICK_CONTACT: QuickContactState = {
  firstName: '',
  lastName: '',
  phone: '',
  agencyId: ''
};

const normalizeEmailPart = (value: string): string =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const buildCirEmail = (firstName: string, lastName: string): string => {
  const normalizedFirstName = normalizeEmailPart(firstName);
  const normalizedLastName = normalizeEmailPart(lastName);
  if (!normalizedFirstName || !normalizedLastName) return '';
  return `${normalizedFirstName.slice(0, 1)}.${normalizedLastName}@cir.fr`;
};

const compactWhitespace = (value: string): string => value.replace(/\s+/g, ' ');

const formatFirstName = (value: string): string =>
  compactWhitespace(value)
    .toLocaleLowerCase('fr-FR')
    .replace(/(^|[\s'-])(\p{L})/gu, (_, separator: string, letter: string) =>
      `${separator}${letter.toLocaleUpperCase('fr-FR')}`
    );

const formatLastName = (value: string): string =>
  compactWhitespace(value).toLocaleUpperCase('fr-FR');

const formatPhoneNumber = (value: string): string =>
  value
    .replace(/\D/g, '')
    .slice(0, 10)
    .replace(/(\d{2})(?=\d)/g, '$1 ')
    .trim();

const CockpitInternalQuickCreate = ({
  agencies,
  defaultAgencyId,
  onUseContact
}: CockpitInternalQuickCreateProps) => {
  const [showCreate, setShowCreate] = useState(false);
  const [quickContact, setQuickContact] = useState<QuickContactState>({
    ...EMPTY_QUICK_CONTACT,
    agencyId: defaultAgencyId
  });
  const email = useMemo(
    () => buildCirEmail(quickContact.firstName, quickContact.lastName),
    [quickContact.firstName, quickContact.lastName]
  );
  const selectedAgencyName = agencies.find((agency) => agency.id === quickContact.agencyId)?.name ?? '';
  const canUseQuickContact = Boolean(
    quickContact.firstName.trim() && quickContact.lastName.trim() && quickContact.agencyId && email
  );

  const openCreate = () => {
    setQuickContact((current) => ({
      ...current,
      agencyId: current.agencyId || defaultAgencyId
    }));
    setShowCreate(true);
  };

  const closeCreate = () => setShowCreate(false);

  const updateQuickContact = (values: Partial<QuickContactState>) => {
    setQuickContact((current) => ({ ...current, ...values }));
  };

  const submitContact = () => {
    if (!canUseQuickContact) return;
    onUseContact({
      ...quickContact,
      firstName: quickContact.firstName.trim(),
      lastName: quickContact.lastName.trim(),
      phone: quickContact.phone.trim(),
      email,
      agencyName: selectedAgencyName
    });
  };

  return (
    <section className="rounded-lg border border-primary/15 bg-primary/5 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
      {!showCreate ? (
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-md border border-primary/10 bg-card/85 px-2.5 py-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <UserPlus size={15} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground">Ajouter un contact ponctuel</p>
              <p className="truncate text-[11px] text-muted-foreground">Pour cette interaction uniquement.</p>
            </div>
          </div>
          <Button
            type="button"
            variant="default"
            size="dense"
            onClick={openCreate}
            className="bg-primary px-3 shadow-sm transition-[background-color,box-shadow,transform] hover:bg-primary/90 active:scale-[0.98]"
          >
            <Plus size={13} aria-hidden="true" />
            Ajouter
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5 rounded-md border border-primary/15 bg-card px-2.5 py-2.5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <UserPlus size={15} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground">Contact ponctuel</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="dense"
              onClick={closeCreate}
              aria-label="Refermer la création de contact interne"
            >
              <X size={13} aria-hidden="true" />
              Refermer
            </Button>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
          <Input
            aria-label="Prénom"
            name="internal-contact-first-name"
            value={quickContact.firstName}
            onChange={(event) => updateQuickContact({ firstName: formatFirstName(event.target.value) })}
            placeholder="Prénom…"
              className="h-9"
              autoComplete="off"
            />
          <Input
            aria-label="Nom"
            name="internal-contact-last-name"
            value={quickContact.lastName}
            onChange={(event) => updateQuickContact({ lastName: formatLastName(event.target.value) })}
            placeholder="Nom…"
            className="h-9"
            autoComplete="off"
          />
          <Select
            value={quickContact.agencyId}
            onValueChange={(agencyId) => updateQuickContact({ agencyId })}
          >
            <SelectTrigger density="comfortable" aria-label="Agence du contact" className="h-9">
              <SelectValue placeholder="Agence du contact…" />
            </SelectTrigger>
            <SelectContent>
              {agencies.map((agency) => (
                <SelectItem key={agency.id} value={agency.id}>
                  {agency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            aria-label="Téléphone"
            name="internal-contact-phone"
            value={quickContact.phone}
            onChange={(event) => updateQuickContact({ phone: formatPhoneNumber(event.target.value) })}
            placeholder="05 58 36 96 19"
            className="h-9"
            type="tel"
            inputMode="numeric"
            autoComplete="off"
          />
          <div className="relative">
            <Mail size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              aria-label="Email CIR généré"
              name="internal-contact-email"
              value={email}
              readOnly
              placeholder="initiale.nom@cir.fr"
              className="h-9 bg-surface-1 pl-9 text-muted-foreground"
              type="email"
              spellCheck={false}
            />
          </div>
          <div className="flex items-center">
            <Button type="button" size="sm" onClick={submitContact} disabled={!canUseQuickContact} className="h-9 w-full">
              Utiliser ce contact
            </Button>
          </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default CockpitInternalQuickCreate;
