import { useState } from 'react';

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
import InteractionSearchInput from './interaction-search/InteractionSearchInput';
import InteractionSearchListArea from './interaction-search/InteractionSearchListArea';
import GuidedTierSearchShell from './cockpit/guided/GuidedTierSearchShell';

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
  createLabel,
  createMode = 'dialog',
  createDisabled = false,
  inlineCreateSlot,
  onOpenGlobalSearch,
  recentEntities,
  inputRef,
  showTypeBadge = false
}: InteractionSearchBarProps) => {
  const [showInlineCreate, setShowInlineCreate] = useState(false);
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
  const resolvedCreateMode = createLabel ? createMode : 'none';
  const handleCreate = resolvedCreateMode === 'inline'
    ? () => {
        setShowInlineCreate((current) => !current);
        setIsOpen(true);
      }
    : onCreateEntity;
  const footer = createLabel || canOpenGlobalSearch
    ? (
      <InteractionSearchFooter
        createLabel={createLabel}
        createDisabled={createDisabled || resolvedCreateMode === 'none'}
        onCreateEntity={handleCreate}
        onOpenGlobalSearch={canOpenGlobalSearch ? handleOpenGlobalSearch : undefined}
      />
    )
    : undefined;

  return (
    <>
      <InteractionSearchContainer
        onOpen={() => setIsOpen(true)}
        onClose={() => setIsOpen(false)}
      >
        <GuidedTierSearchShell
          includeArchived={includeArchived}
          onIncludeArchivedChange={setIncludeArchived}
          footer={footer}
        >
          <Command className="h-auto overflow-visible rounded-none bg-transparent" shouldFilter={false}>
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
          {showInlineCreate && inlineCreateSlot ? (
            <div className="border-t border-border bg-surface-1/70 px-3 py-3">
              {typeof inlineCreateSlot === 'function'
                ? inlineCreateSlot({ onCancel: () => setShowInlineCreate(false) })
                : inlineCreateSlot}
            </div>
          ) : null}
        </GuidedTierSearchShell>
      </InteractionSearchContainer>
      <AlertDialog open={Boolean(pendingResult)} onOpenChange={(open) => {
        if (!open) handleCancelPendingResult();
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {`Ce tiers existe déjà comme ${pendingResultType}. Basculer vers ce type ?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              La Saisie guidée va passer sur {pendingRelation} avant de sélectionner ce résultat pour éviter une interaction incohérente.
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
