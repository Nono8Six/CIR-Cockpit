import type { ReactNode } from 'react';
import { useState } from 'react';
import type { DirectoryRecord } from '../../../../shared/schemas/system/directory.schema';
import { formatDate } from '@/utils/date/formatDate';
import { formatRelativeTime } from '@/utils/date/formatRelativeTime';
import { formatClientNumber } from '@/utils/clients/formatClientNumber';
import { getDirectoryTypeLabel } from './clientDirectorySearch';
import StatusDot from '../ui/data-display/StatusDot';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/navigation/Tabs';

export interface ClientDirectoryRecordInfoGridProps {
  record: DirectoryRecord;
  contactsSection: ReactNode;
  interactionsSection: ReactNode;
  historySection: ReactNode;
}

/**
 * Renders the main content grid for a client/prospect detail view.
 * Utilizes a split layout:
 * - Left/Main side (wider) for Notes and Contacts, followed by the Interactions feed.
 * - Right side (narrower sidebar) for structured metadata/properties.
 *
 * @param props - The component properties.
 * @param props.record - The client or prospect directory record.
 * @param props.contactsSection - The contacts section component.
 * @param props.interactionsSection - The interactions panel component.
 * @returns The rendered JSX element.
 */
const ClientDirectoryRecordInfoGrid = ({
  record,
  contactsSection,
  interactionsSection,
  historySection,
}: ClientDirectoryRecordInfoGridProps) => {
  const [activeTab, setActiveTab] = useState('summary');
  const isSupplier = record.entity_type === 'Fournisseur';
  const isProspect = !isSupplier && record.entity_type !== 'Client';
  const statusEntityType = isSupplier
    ? 'Fournisseur'
    : record.entity_type === 'Client' ? 'Client' : 'Prospect';

  const propertiesPanel = (
    <div className="xl:border-l xl:border-neutral-200/80 xl:pl-8 space-y-6 self-start">
      <div className="space-y-4">
        <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
          Propriétés de la fiche
        </h3>

        <div className="divide-y divide-neutral-100/60 text-xs">
          <div className="flex justify-between items-center py-2 px-2 -mx-2 rounded hover:bg-neutral-50/80 transition-all cursor-pointer group">
            <span className="text-neutral-500 font-semibold group-hover:text-neutral-700">Statut</span>
            <span className="font-bold inline-flex items-center gap-1.5 text-neutral-900 group-hover:text-neutral-950">
              <StatusDot
                entityType={statusEntityType}
                archivedAt={record.archived_at ?? null}
              />
              {record.archived_at ? 'Archivé' : 'Actif'}
            </span>
          </div>

          <div className="flex justify-between items-center py-2 px-2 -mx-2 rounded hover:bg-neutral-50/80 transition-all cursor-pointer group">
            <span className="text-neutral-500 font-semibold group-hover:text-neutral-700">Type de fiche</span>
            <span className="font-bold text-neutral-900 group-hover:text-neutral-950">
              {getDirectoryTypeLabel(record.entity_type)}
            </span>
          </div>

          {!isProspect && !isSupplier && record.client_number && (
            <div className="flex justify-between items-center py-2 px-2 -mx-2 rounded hover:bg-neutral-50/80 transition-all cursor-pointer group">
              <span className="text-neutral-500 font-semibold group-hover:text-neutral-700">N° Client</span>
              <span className="font-mono text-[11px] font-bold tracking-tight text-neutral-900 group-hover:text-neutral-950">
                {formatClientNumber(record.client_number)}
              </span>
            </div>
          )}

          {isSupplier && record.supplier_code ? (
            <div className="flex justify-between items-center py-2 px-2 -mx-2 rounded hover:bg-neutral-50/80 transition-all cursor-pointer group">
              <span className="text-neutral-500 font-semibold group-hover:text-neutral-700">Code fournisseur</span>
              <span className="font-mono text-[11px] font-bold tracking-tight text-neutral-900 group-hover:text-neutral-950">
                {record.supplier_code}
              </span>
            </div>
          ) : null}

          {isSupplier && record.supplier_number ? (
            <div className="flex justify-between items-center py-2 px-2 -mx-2 rounded hover:bg-neutral-50/80 transition-all cursor-pointer group">
              <span className="text-neutral-500 font-semibold group-hover:text-neutral-700">N° fournisseur</span>
              <span className="font-mono text-[11px] font-bold tracking-tight text-neutral-900 group-hover:text-neutral-950">
                {record.supplier_number}
              </span>
            </div>
          ) : null}

          {record.siret && (
            <div className="flex justify-between items-center py-2 px-2 -mx-2 rounded hover:bg-neutral-50/80 transition-all cursor-pointer group">
              <span className="text-neutral-500 font-semibold group-hover:text-neutral-700">SIRET</span>
              <span className="font-mono text-[11px] font-bold tracking-tight text-neutral-900 group-hover:text-neutral-950">
                {record.siret}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center py-2 px-2 -mx-2 rounded hover:bg-neutral-50/80 transition-all cursor-pointer group">
            <span className="text-neutral-500 font-semibold group-hover:text-neutral-700">
              {isSupplier ? 'Portée' : 'Agence'}
            </span>
            <span className="font-bold text-neutral-900 group-hover:text-neutral-950">
              {isSupplier ? 'Référentiel global CIR' : record.agency_name ?? 'Non rattaché'}
            </span>
          </div>

          {!isSupplier ? (
            <div className="flex justify-between items-center py-2 px-2 -mx-2 rounded hover:bg-neutral-50/80 transition-all cursor-pointer group">
              <span className="text-neutral-500 font-semibold group-hover:text-neutral-700">Commercial</span>
              <span className="font-bold text-neutral-900 group-hover:text-neutral-950">
                {record.cir_commercial_name ?? 'Non affecté'}
              </span>
            </div>
          ) : null}

          {record.department && (
            <div className="flex justify-between items-center py-2 px-2 -mx-2 rounded hover:bg-neutral-50/80 transition-all cursor-pointer group">
              <span className="text-neutral-500 font-semibold group-hover:text-neutral-700">Département</span>
              <span className="font-mono text-[11px] font-bold text-neutral-900 group-hover:text-neutral-950">
                {record.department}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center py-2 px-2 -mx-2 rounded hover:bg-neutral-50/80 transition-all cursor-pointer group">
            <span className="text-neutral-500 font-semibold group-hover:text-neutral-700">Pays</span>
            <span className="font-bold text-neutral-900 group-hover:text-neutral-950">{record.country}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-200/80 pt-4 space-y-1.5 text-[11px] text-neutral-500 font-semibold">
        <div className="flex justify-between py-1 px-2 -mx-2 rounded hover:bg-neutral-50/80 transition-all cursor-pointer group">
          <span className="group-hover:text-neutral-700">Créé le</span>
          <span className="font-mono text-neutral-700 font-bold group-hover:text-neutral-900">{formatDate(record.created_at)}</span>
        </div>
        <div className="flex justify-between py-1 px-2 -mx-2 rounded hover:bg-neutral-50/80 transition-all cursor-pointer group">
          <span className="group-hover:text-neutral-700">Mis à jour</span>
          <span className="font-mono text-neutral-700 font-bold group-hover:text-neutral-900">{formatRelativeTime(record.updated_at)}</span>
        </div>
      </div>
    </div>
  );

  const notesSection = (
    <section className="space-y-3">
      <h3 className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
        Notes & Description
      </h3>
      {record.notes ? (
        <p className="text-sm text-neutral-900 font-medium leading-relaxed whitespace-pre-wrap border-l-2 border-neutral-200 pl-4 py-0.5">
          {record.notes}
        </p>
      ) : (
        <p className="text-sm text-neutral-500 italic font-medium pl-4">
          Aucune note ou description enregistrée pour cette fiche.
        </p>
      )}
    </section>
  );

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="mt-6 min-h-0"
    >
      <div className="flex min-w-0 overflow-x-auto border-b border-neutral-200 pb-2">
        <TabsList className="h-9 rounded border border-neutral-200 bg-neutral-50/80 p-0.5">
          <TabsTrigger
            value="summary"
            className="rounded-sm px-3 py-1.5 text-xs font-bold text-neutral-500 data-[state=active]:bg-white data-[state=active]:text-neutral-950 data-[state=active]:shadow-sm"
          >
            Synthèse
          </TabsTrigger>
          <TabsTrigger
            value="contacts"
            className="rounded-sm px-3 py-1.5 text-xs font-bold text-neutral-500 data-[state=active]:bg-white data-[state=active]:text-neutral-950 data-[state=active]:shadow-sm"
          >
            Contacts
          </TabsTrigger>
          <TabsTrigger
            value="interactions"
            className="rounded-sm px-3 py-1.5 text-xs font-bold text-neutral-500 data-[state=active]:bg-white data-[state=active]:text-neutral-950 data-[state=active]:shadow-sm"
          >
            Interactions
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="rounded-sm px-3 py-1.5 text-xs font-bold text-neutral-500 data-[state=active]:bg-white data-[state=active]:text-neutral-950 data-[state=active]:shadow-sm"
          >
            Historique
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="summary" className="mt-6">
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-6">
            {notesSection}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3">
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
                  Contact principal
                </p>
                <p className="mt-1 text-sm font-semibold text-neutral-900">
                  {record.primary_email ?? record.primary_phone ?? 'Non renseigné'}
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3">
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
                  Dernière activité
                </p>
                <p className="mt-1 text-sm font-semibold text-neutral-900">
                  {formatRelativeTime(record.updated_at)}
                </p>
              </div>
            </div>
          </div>

          {propertiesPanel}
        </div>
      </TabsContent>

      <TabsContent value="contacts" className="mt-6">
        <div className="max-w-4xl">
          {contactsSection}
        </div>
      </TabsContent>

      <TabsContent value="interactions" className="mt-6">
        <div className="max-w-5xl">
          {interactionsSection}
        </div>
      </TabsContent>

      <TabsContent value="history" className="mt-6">
        <div className="max-w-4xl">
          {historySection}
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default ClientDirectoryRecordInfoGrid;
