import { Command } from './ui/command';
import { useInteractionSearch } from '@/hooks/useInteractionSearch';
import {
  getRelationLabelForTierType,
  getTierTypeDisplayLabel
} from '@/constants/relations';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
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
  onSelectSearchResult,
  onCreateEntity,
  onOpenGlobalSearch,
  recentEntities,
  inputRef,
  showTypeBadge = false
}: InteractionSearchBarProps) => {
  const {
    query,
    setQuery,
    setIsOpen,
    includeArchived,
    setIncludeArchived,
    filteredRecents,
    panelState,
    limitedResults,
    entityHeading,
    pendingResult,
    handleSelectEntity,
    handleSelectSearchResult,
    handleConfirmPendingResult,
    handleCancelPendingResult,
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
    onSelectSearchResult,
    onOpenGlobalSearch
  });

  const canOpenGlobalSearch = Boolean(onOpenGlobalSearch);
  const pendingResultType = pendingResult ? getTierTypeDisplayLabel(pendingResult.type) : '';
  const pendingRelation = pendingResult ? getRelationLabelForTierType(pendingResult.type) : '';

  return (
    <>
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
            limitedResults={limitedResults}
            query={query}
            includeArchived={includeArchived}
            entityHeading={entityHeading}
            onSelectEntity={handleSelectEntity}
            onSelectSearchResult={handleSelectSearchResult}
            showTypeBadge={showTypeBadge}
          />
        </Command>
        <InteractionSearchFooter
          entityHeading={entityHeading}
          onCreateEntity={onCreateEntity}
          onOpenGlobalSearch={canOpenGlobalSearch ? handleOpenGlobalSearch : undefined}
        />
      </InteractionSearchContainer>
      <AlertDialog open={Boolean(pendingResult)} onOpenChange={(open) => {
        if (!open) handleCancelPendingResult();
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Basculer vers le type réel ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le tiers sélectionné est classé {pendingResultType}. La Saisie va passer sur {pendingRelation} pour éviter une interaction incohérente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPendingResult}>
              Basculer vers ce type
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default InteractionSearchBar;
