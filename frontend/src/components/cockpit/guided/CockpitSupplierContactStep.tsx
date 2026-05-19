import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, Plus, Search, UserRound } from 'lucide-react';

import type { CockpitFormLeftPaneProps } from '../CockpitPaneTypes';
import { Button } from '../../ui/inputs/basic/Button';
import { Input } from '../../ui/inputs/basic/Input';
import { Kbd } from '../../ui/data-display/Kbd';
import { saveEntityContact } from '@/services/entities/saveEntityContact';
import { handleUiError } from '@/services/errors/handleUiError';
import { invalidateClientContactsQuery } from '@/services/query/queryInvalidation';
import { formatFrenchPhone } from '@/utils/formatFrenchPhone';

type CockpitSupplierContactStepProps = Pick<
  CockpitFormLeftPaneProps,
  | 'selectedEntity'
  | 'selectedContact'
  | 'selectedContactMeta'
  | 'contacts'
  | 'contactsLoading'
  | 'onSelectContactFromSearch'
  | 'onClearSelectedContact'
  | 'contactFirstNameField'
  | 'contactLastNameField'
  | 'contactPositionField'
  | 'contactPhoneField'
  | 'contactEmailField'
  | 'contactFirstName'
  | 'contactLastName'
  | 'contactPosition'
  | 'contactPhone'
  | 'contactEmail'
  | 'onContactPhoneChange'
> & {
  onComplete: () => void;
  continueShortcutLabel: string;
};

const emptyQuickContact = () => ({
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  position: ''
});

const getContactName = (contact: NonNullable<CockpitFormLeftPaneProps['selectedContact']>): string =>
  [contact.first_name ?? '', contact.last_name].filter(Boolean).join(' ');

const CockpitSupplierContactStep = ({
  selectedEntity,
  selectedContact,
  selectedContactMeta,
  contacts,
  contactsLoading,
  onSelectContactFromSearch,
  onClearSelectedContact,
  contactFirstNameField,
  contactLastNameField,
  contactPositionField,
  contactPhoneField,
  contactEmailField,
  contactFirstName,
  contactLastName,
  contactPosition,
  contactPhone,
  contactEmail,
  onContactPhoneChange,
  onComplete,
  continueShortcutLabel
}: CockpitSupplierContactStepProps) => {
  const queryClient = useQueryClient();
  const [contactQuery, setContactQuery] = useState('');
  const [quickContact, setQuickContact] = useState(emptyQuickContact);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const filteredContacts = useMemo(() => {
    const normalized = contactQuery.trim().toLowerCase();
    if (!normalized) return contacts;
    return contacts.filter((contact) => [
      contact.first_name ?? '',
      contact.last_name,
      contact.position ?? '',
      contact.phone ?? '',
      contact.email ?? ''
    ].join(' ').toLowerCase().includes(normalized));
  }, [contactQuery, contacts]);
  const canSaveContact = Boolean(
    selectedEntity?.id
    && quickContact.firstName.trim()
    && quickContact.lastName.trim()
    && (quickContact.phone.trim() || quickContact.email.trim())
  );

  const saveContact = async () => {
    if (!selectedEntity?.id || !canSaveContact || isSavingContact) return;
    setIsSavingContact(true);
    const contact = await saveEntityContact({
      entity_id: selectedEntity.id,
      first_name: quickContact.firstName,
      last_name: quickContact.lastName,
      phone: quickContact.phone || null,
      email: quickContact.email || null,
      position: quickContact.position || null
    }).match(
      (createdContact) => createdContact,
      (error) => {
        handleUiError(error, "Impossible d'enregistrer le contact.", {
          source: 'CockpitSupplierContactStep.saveContact'
        });
        return null;
      }
    );
    setIsSavingContact(false);

    if (!contact || !selectedEntity) return;
    onSelectContactFromSearch(contact, selectedEntity);
    setQuickContact(emptyQuickContact());
    void invalidateClientContactsQuery(queryClient, selectedEntity.id, false);
  };

  if (!selectedEntity) {
    return (
      <div className="space-y-2" data-testid="cockpit-supplier-temporary-contact-step">
        <section className="space-y-2 rounded-md border border-dashed border-border bg-card p-2.5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Contact ponctuel
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            <Input
              {...contactFirstNameField}
              value={contactFirstName}
              placeholder="Prénom…"
              aria-label="Prénom du contact fournisseur ponctuel"
              className="h-9"
              autoComplete="given-name"
            />
            <Input
              {...contactLastNameField}
              value={contactLastName}
              placeholder="Nom…"
              aria-label="Nom du contact fournisseur ponctuel"
              className="h-9"
              autoComplete="family-name"
            />
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <Input
              {...contactPositionField}
              value={contactPosition}
              placeholder="Fonction…"
              aria-label="Fonction du contact fournisseur ponctuel"
              className="h-9"
              autoComplete="organization-title"
            />
            <Input
              {...contactPhoneField}
              value={contactPhone}
              onChange={onContactPhoneChange}
              placeholder="Téléphone…"
              aria-label="Téléphone du contact fournisseur ponctuel"
              className="h-9"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
            />
            <Input
              {...contactEmailField}
              value={contactEmail}
              placeholder="Email…"
              aria-label="Email du contact fournisseur ponctuel"
              className="h-9"
              type="email"
              autoComplete="email"
              spellCheck={false}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Aucun contact ne sera ajouté à l’annuaire fournisseur.
          </p>
        </section>
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={onComplete} className="gap-1.5 shadow-sm">
            Continuer
            <Kbd className="ml-1 border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground">
              {continueShortcutLabel}
            </Kbd>
            <ArrowRight size={14} aria-hidden="true" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="cockpit-supplier-contact-step">
      {selectedContact ? (
        <section className="rounded-md border border-success/25 bg-success/5 p-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-success/10 text-success">
                <CheckCircle2 size={15} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{getContactName(selectedContact)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {selectedContactMeta || [selectedContact.position, selectedContact.phone ?? selectedContact.email].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
            <Button type="button" variant="ghost" size="dense" onClick={onClearSelectedContact}>Changer</Button>
          </div>
        </section>
      ) : null}

      <section className="space-y-2 rounded-md border border-border bg-card p-2.5">
        <div className="relative">
          <Search size={14} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={contactQuery}
            onChange={(event) => setContactQuery(event.target.value)}
            placeholder="Chercher un contact fournisseur…"
            aria-label="Chercher un contact fournisseur"
            name="supplier-contact-search"
            className="h-9 pl-9"
            autoComplete="off"
          />
        </div>
        {contactsLoading ? (
          <p className="px-1 text-xs text-muted-foreground">Chargement des contacts…</p>
        ) : filteredContacts.length > 0 ? (
          <div className="grid gap-1 sm:grid-cols-2">
            {filteredContacts.slice(0, 6).map((contact) => (
              <button
                key={contact.id}
                type="button"
                onClick={() => onSelectContactFromSearch(contact, selectedEntity)}
                className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-surface-1/40 px-2 py-1.5 text-left hover:border-primary/25 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <UserRound size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold">{getContactName(contact)}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{[contact.position, contact.phone ?? contact.email].filter(Boolean).join(' · ')}</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="px-1 text-xs text-muted-foreground">Contact optionnel.</p>
        )}
      </section>

      <section className="space-y-2 rounded-md border border-primary/15 bg-primary/5 p-2.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <Plus size={12} aria-hidden="true" />
          Ajouter un contact
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <Input
            value={quickContact.firstName}
            onChange={(event) => setQuickContact((current) => ({ ...current, firstName: event.target.value }))}
            placeholder="Prénom…"
            aria-label="Prénom du contact fournisseur"
            name="supplier-contact-first-name"
            className="h-9"
            autoComplete="given-name"
          />
          <Input
            value={quickContact.lastName}
            onChange={(event) => setQuickContact((current) => ({ ...current, lastName: event.target.value }))}
            placeholder="Nom…"
            aria-label="Nom du contact fournisseur"
            name="supplier-contact-last-name"
            className="h-9"
            autoComplete="family-name"
          />
        </div>
        <div className="grid gap-2 md:grid-cols-[160px_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Input
            value={quickContact.position}
            onChange={(event) => setQuickContact((current) => ({ ...current, position: event.target.value }))}
            placeholder="Fonction…"
            aria-label="Fonction du contact fournisseur"
            name="supplier-contact-position"
            className="h-9"
            autoComplete="organization-title"
          />
          <Input
            value={quickContact.phone}
            onChange={(event) => setQuickContact((current) => ({ ...current, phone: formatFrenchPhone(event.target.value) }))}
            placeholder="Téléphone…"
            aria-label="Téléphone du contact fournisseur"
            name="supplier-contact-phone"
            className="h-9"
            inputMode="tel"
            type="tel"
            autoComplete="tel"
          />
          <Input
            value={quickContact.email}
            onChange={(event) => setQuickContact((current) => ({ ...current, email: event.target.value }))}
            placeholder="Email…"
            aria-label="Email du contact fournisseur"
            name="supplier-contact-email"
            className="h-9"
            type="email"
            autoComplete="email"
            spellCheck={false}
          />
          <Button type="button" size="sm" onClick={saveContact} disabled={!canSaveContact || isSavingContact} className="h-9">
            {isSavingContact ? 'Ajout…' : 'Ajouter'}
          </Button>
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onComplete}>
          Continuer sans contact
        </Button>
        <Button type="button" size="sm" onClick={onComplete} className="gap-1.5 shadow-sm">
          Continuer
          <Kbd className="ml-1 border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground">
            {continueShortcutLabel}
          </Kbd>
          <ArrowRight size={14} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};

export default CockpitSupplierContactStep;
