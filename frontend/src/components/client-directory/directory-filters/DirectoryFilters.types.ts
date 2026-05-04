import type {
  DirectoryDensity,
  DirectoryCommercialOption,
  DirectorySearchState
} from 'shared/schemas/directory.schema';

export interface DirectoryFilterOption {
  value: string;
  label: string;
}

export type DirectoryOptionRequest = 'agencies' | 'commercials' | 'departments';

export interface ClientDirectoryFiltersProps {
  search: DirectorySearchState;
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
  onSearchPatch: (patch: Partial<DirectorySearchState>) => void;
  onRequestOptions: (options: DirectoryOptionRequest[]) => void;
  onReset: () => void;
}
