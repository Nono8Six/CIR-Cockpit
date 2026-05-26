import type { AgencyStatus, StatusCategory } from '@/types';
import type {
  ConfigUsageSnapshot,
  EditableConfigReferenceDimension
} from '../../../../shared/schemas/system/config.schema';

export type SettingsSectionsProps = {
  readOnly: boolean;
  activeSection: string;
  canEditAgencySettings: boolean;
  canEditProductSettings: boolean;
  usage: ConfigUsageSnapshot | null;
  usageLoading: boolean;
  allowManualEntryOverride: 'inherit' | 'enabled' | 'disabled';
  defaultCompanyAccountTypeOverride: 'inherit' | 'term' | 'cash';
  productAllowManualEntry: boolean;
  productDefaultCompanyAccountType: 'term' | 'cash';
  productUiShellV2: boolean;
  families: string[];
  services: string[];
  entities: string[];
  interactionTypes: string[];
  statuses: AgencyStatus[];
  newFamily: string;
  newService: string;
  newEntity: string;
  newInteractionType: string;
  newStatus: string;
  newStatusCategory: StatusCategory;
  setAllowManualEntryOverride: (value: 'inherit' | 'enabled' | 'disabled') => void;
  setDefaultCompanyAccountTypeOverride: (value: 'inherit' | 'term' | 'cash') => void;
  setProductAllowManualEntry: (value: boolean) => void;
  setProductDefaultCompanyAccountType: (value: 'term' | 'cash') => void;
  setProductUiShellV2: (value: boolean) => void;
  setNewFamily: (value: string) => void;
  setNewService: (value: string) => void;
  setNewEntity: (value: string) => void;
  setNewInteractionType: (value: string) => void;
  setNewStatus: (value: string) => void;
  setNewStatusCategory: (value: StatusCategory) => void;
  addItem: (
    dimension: EditableConfigReferenceDimension,
    item: string,
    list: string[],
    setList: (next: string[]) => void,
    clearInput: () => void,
    uppercase?: boolean
  ) => void;
  removeItem: (
    dimension: EditableConfigReferenceDimension,
    index: number,
    list: string[],
    setList: (next: string[]) => void
  ) => void;
  updateItem: (
    index: number,
    newValue: string,
    list: string[],
    setList: (next: string[]) => void,
    uppercase?: boolean
  ) => void;
  renameItem: (
    dimension: EditableConfigReferenceDimension,
    index: number,
    nextLabel: string,
    list: string[],
    setList: (next: string[]) => void,
    uppercase?: boolean
  ) => void;
  setFamilies: (next: string[]) => void;
  setServices: (next: string[]) => void;
  setEntities: (next: string[]) => void;
  setInteractionTypes: (next: string[]) => void;
  setStatuses: (next: AgencyStatus[]) => void;
  addStatus: () => void;
  removeStatus: (index: number) => void;
  updateStatusLabel: (index: number, value: string) => void;
  updateStatusCategory: (index: number, value: StatusCategory) => void;
  renameStatus: (index: number, nextLabel: string) => void;
};
