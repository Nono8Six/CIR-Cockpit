import { Command } from './ui/command';
import { useInteractionSearch } from '@/hooks/useInteractionSearch';
import type { InteractionSearchBarProps } from './interaction-search/InteractionSearchBar.types';
import InteractionSearchContainer from './interaction-search/InteractionSearchContainer';
import InteractionSearchFooter from './interaction-search/InteractionSearchFooter';
import InteractionSearchHeader from './interaction-search/InteractionSearchHeader';
import InteractionSearchInput from './interaction-search/InteractionSearchInput';
import InteractionSearchListArea from './interaction-search/InteractionSearchListArea';

const InteractionSearchBar = ({
  agencyId,
  entityType = '',
  entities,
  contacts,
  isLoading = false,
  onSelectEntity,
  onSelectContact,
  onCreateEntity,
  onOpenGlobalSearch,
  recentEntities,
  inputRef
}: InteractionSearchBarProps) => {
  const {
    query,
    setQuery,
    setIsOpen,
    includeArchived,
    setIncludeArchived,
    filteredRecents,
    panelState,
    limitedEntities,
    limitedContacts,
    entityHeading,
    handleSelectEntity,
    handleSelectContact,
    handleOpenGlobalSearch
  } = useInteractionSearch({
    agencyId,
    entityType,
    entities,
    contacts,
    isLoading,
    recentEntities,
    onSelectEntity,
    onSelectContact,
    onOpenGlobalSearch
  });

  const canOpenGlobalSearch = Boolean(onOpenGlobalSearch);

  return (
    <InteractionSearchContainer
      onOpen={() => setIsOpen(true)}
      onClose={() => setIsOpen(false)}
    >
      <InteractionSearchHeader
        includeArchived={includeArchived}
        onIncludeArchivedChange={setIncludeArchived}
      />
      <Command className="rounded-none overflow-visible h-auto bg-transparent" shouldFilter={false}>
        <InteractionSearchInput query={query} onQueryChange={setQuery} inputRef={inputRef} />
        <InteractionSearchListArea
          panelState={panelState}
          filteredRecents={filteredRecents}
          limitedEntities={limitedEntities}
          limitedContacts={limitedContacts}
          query={query}
          includeArchived={includeArchived}
          entityHeading={entityHeading}
          onSelectEntity={handleSelectEntity}
          onSelectContact={handleSelectContact}
        />
      </Command>
      <InteractionSearchFooter
        entityHeading={entityHeading}
        onCreateEntity={onCreateEntity}
        onOpenGlobalSearch={canOpenGlobalSearch ? handleOpenGlobalSearch : undefined}
      />
    </InteractionSearchContainer>
  );
};

export default InteractionSearchBar;
