import { useState } from 'react';
import type { ReactNode } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEntityContacts } from '@/hooks/useEntityContacts';
import { useEntityInteractions } from '@/hooks/useEntityInteractions';
import type { Client } from '@/types';

type UiPocClientDetailsProps = {
  selectedClient: Client | null;
  overviewContent: ReactNode;
};

const UiPocClientDetails = ({ selectedClient, overviewContent }: UiPocClientDetailsProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'contacts' | 'interactions' | 'conditions'>('overview');
  const clientId = selectedClient?.id ?? null;
  const contactsQuery = useEntityContacts(clientId, false, Boolean(clientId) && activeTab === 'contacts');
  const interactionsQuery = useEntityInteractions(clientId, 1, 10, Boolean(clientId) && activeTab === 'interactions');

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        if (value === 'overview' || value === 'contacts' || value === 'interactions' || value === 'conditions') {
          setActiveTab(value);
        }
      }}
      className="flex min-h-0 flex-1 flex-col gap-3"
    >
      <TabsList className="h-9 w-full justify-start gap-1 rounded-md border border-border bg-surface-1 p-1">
        <TabsTrigger value="overview" className="h-7 px-3 text-xs sm:text-sm">Aperçu</TabsTrigger>
        <TabsTrigger value="contacts" className="h-7 px-3 text-xs sm:text-sm">Contacts</TabsTrigger>
        <TabsTrigger value="interactions" className="h-7 px-3 text-xs sm:text-sm">Interactions</TabsTrigger>
        <TabsTrigger value="conditions" className="h-7 px-3 text-xs sm:text-sm">Conditions</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-0 min-h-0 flex-1">{overviewContent}</TabsContent>

      <TabsContent value="contacts" className="mt-0 min-h-0 flex-1">
        {!selectedClient ? (
          <p className="rounded-lg border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
            Sélectionne un client dans le tableau.
          </p>
        ) : contactsQuery.isLoading ? (
          <p className="rounded-lg border border-border/70 bg-card p-4 text-sm text-muted-foreground">
            Chargement des contacts...
          </p>
        ) : (
          <div className="space-y-2">
            {(contactsQuery.data ?? []).map((contact) => (
              <article key={contact.id} className="rounded-lg border border-border/70 bg-card p-3">
                <p className="text-sm font-semibold text-foreground">
                  {(contact.first_name ?? '').trim()} {contact.last_name}
                </p>
                <p className="text-xs text-muted-foreground">{contact.position ?? 'Poste non renseigné'}</p>
                <p className="text-xs text-muted-foreground">{contact.email ?? '—'} · {contact.phone ?? '—'}</p>
              </article>
            ))}
            {(contactsQuery.data ?? []).length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
                Aucun contact pour ce client.
              </p>
            ) : null}
          </div>
        )}
      </TabsContent>

      <TabsContent value="interactions" className="mt-0 min-h-0 flex-1">
        {!selectedClient ? (
          <p className="rounded-lg border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
            Sélectionne un client dans le tableau.
          </p>
        ) : interactionsQuery.isLoading ? (
          <p className="rounded-lg border border-border/70 bg-card p-4 text-sm text-muted-foreground">
            Chargement des interactions...
          </p>
        ) : (
          <div className="space-y-2">
            {(interactionsQuery.data?.interactions ?? []).map((interaction) => (
              <article key={interaction.id} className="rounded-lg border border-border/70 bg-card p-3">
                <p className="text-sm font-semibold text-foreground">{interaction.subject}</p>
                <p className="text-xs text-muted-foreground">{interaction.status} · {interaction.last_action_at}</p>
              </article>
            ))}
            {(interactionsQuery.data?.interactions ?? []).length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
                Aucune interaction pour ce client.
              </p>
            ) : null}
          </div>
        )}
      </TabsContent>

      <TabsContent value="conditions" className="mt-0 min-h-0 flex-1">
        {!selectedClient ? (
          <p className="rounded-lg border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
            Sélectionne un client dans le tableau.
          </p>
        ) : (
          <article className="rounded-lg border border-border/70 bg-card p-4 text-sm">
            <p><span className="font-semibold">Compte:</span> {selectedClient.account_type === 'cash' ? 'Comptant' : 'Compte à terme'}</p>
            <p className="mt-1"><span className="font-semibold">Adresse:</span> {selectedClient.address ?? '—'}</p>
            <p className="mt-1"><span className="font-semibold">Ville:</span> {selectedClient.city ?? '—'}</p>
            <p className="mt-1"><span className="font-semibold">Département:</span> {selectedClient.department ?? '—'}</p>
            <p className="mt-1"><span className="font-semibold">Notes:</span> {selectedClient.notes ?? '—'}</p>
          </article>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default UiPocClientDetails;
