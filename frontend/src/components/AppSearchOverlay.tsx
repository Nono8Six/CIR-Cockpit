import type { ReactNode } from 'react';

import type { Entity, EntityContact, Interaction } from '@/types';
import type { ConvertClientEntity } from './ConvertClientDialog';
import AppSearchHeader from './app-search/AppSearchHeader';
import AppSearchEmptyState from './app-search/AppSearchEmptyState';
import AppSearchResults from './app-search/AppSearchResults';
import AppSearchFooter from './app-search/AppSearchFooter';

type AppSearchOverlayProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onClose: () => void;
  filteredInteractions: Interaction[];
  filteredClients: Entity[];
  filteredProspects: Entity[];
  filteredContacts: EntityContact[];
  hasSearchResults: boolean;
  entityNameById: Map<string, string>;
  onFocusClient: (clientId: string, contactId?: string | null) => void;
  onRequestConvert: (entity: ConvertClientEntity) => void;
  footerLeft?: ReactNode;
  footerRight?: ReactNode;
};

const AppSearchOverlay = ({
  searchQuery,
  onSearchQueryChange,
  onClose,
  filteredInteractions,
  filteredClients,
  filteredProspects,
  filteredContacts,
  hasSearchResults,
  entityNameById,
  onFocusClient,
  onRequestConvert,
  footerLeft,
  footerRight
}: AppSearchOverlayProps) => {
  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-50 flex items-start justify-center pt-[15vh] animate-in fade-in duration-200 motion-reduce:animate-none">
      <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh] border border-slate-200 ring-1 ring-slate-900/5 animate-in zoom-in-95 duration-200 motion-reduce:animate-none">
        <AppSearchHeader
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          onClose={onClose}
        />

        <div className="overflow-y-auto p-2 bg-white min-h-[100px]">
          <AppSearchEmptyState searchQuery={searchQuery} hasSearchResults={hasSearchResults} />
          <AppSearchResults
            searchQuery={searchQuery}
            hasSearchResults={hasSearchResults}
            filteredInteractions={filteredInteractions}
            filteredClients={filteredClients}
            filteredProspects={filteredProspects}
            filteredContacts={filteredContacts}
            entityNameById={entityNameById}
            onFocusClient={onFocusClient}
            onRequestConvert={onRequestConvert}
          />
        </div>
        <AppSearchFooter footerLeft={footerLeft} footerRight={footerRight} />
      </div>
    </div>
  );
};

export default AppSearchOverlay;
