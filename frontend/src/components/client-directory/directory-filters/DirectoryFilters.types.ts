import type {
  DirectoryDensity,
  DirectoryCommercialOption,
  DirectoryListInput
} from 'shared/schemas/directory.schema';

export interface DirectoryFilterOption {
  value: string;
  label: string;
}

export interface ClientDirectoryFiltersProps {
  search: DirectoryListInput;
  cityDraftSeed?: string;
  searchDraft: string;
  agencies: Array<{ id: string; name: string }>;
  commercials: DirectoryCommercialOption[];
  departments: string[];
  canFilterAgency: boolean;
  isFetching: boolean;
  density: DirectoryDensity;
  viewOptionColumns: Array<{
    id: string;
    label: string;
    canHide: boolean;
    isVisible: boolean;
  }>;
  renderSavedViews?: () => React.ReactNode;
  onToggleColumn: (columnId: string) => void;
  onDensityChange: (density: DirectoryDensity) => void;
  onSearchDraftChange: (value: string) => void;
  onSearchPatch: (patch: Partial<DirectoryListInput>) => void;
  onRequestOptions: () => void;
  onReset: () => void;
}
