import type { AgencyStatus, StatusCategory } from '@/types';
import type {
  ConfigUsageSnapshot,
  EditableConfigReferenceDimension
} from '../../../../shared/schemas/system/config.schema';

export type SettingsSectionsProps = {
  readOnly: boolean;
  activeSection: string;
  canEditAgencySettings: boolean;
  usage: ConfigUsageSnapshot | null;
  usageLoading: boolean;
  families: string[];
  services: string[];
  interactionTypes: string[];
  statuses: AgencyStatus[];
  newFamily: string;
  newService: string;
  newInteractionType: string;
  newStatus: string;
  newStatusCategory: StatusCategory;
  setNewFamily: (value: string) => void;
  setNewService: (value: string) => void;
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
  setInteractionTypes: (next: string[]) => void;
  setStatuses: (next: AgencyStatus[]) => void;
  addStatus: () => void;
  removeStatus: (index: number) => void;
  updateStatusLabel: (index: number, value: string) => void;
  updateStatusCategory: (index: number, value: StatusCategory) => void;
  renameStatus: (index: number, nextLabel: string) => void;
};
