import type { AgencyStatus, StatusCategory } from '@/types';

export type SettingsSectionsProps = {
  readOnly: boolean;
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
  setNewFamily: (value: string) => void;
  setNewService: (value: string) => void;
  setNewEntity: (value: string) => void;
  setNewInteractionType: (value: string) => void;
  setNewStatus: (value: string) => void;
  setNewStatusCategory: (value: StatusCategory) => void;
  addItem: (
    item: string,
    list: string[],
    setList: (next: string[]) => void,
    clearInput: () => void,
    uppercase?: boolean
  ) => void;
  removeItem: (index: number, list: string[], setList: (next: string[]) => void) => void;
  updateItem: (
    index: number,
    newValue: string,
    list: string[],
    setList: (next: string[]) => void,
    uppercase?: boolean
  ) => void;
  setFamilies: (next: string[]) => void;
  setServices: (next: string[]) => void;
  setEntities: (next: string[]) => void;
  setInteractionTypes: (next: string[]) => void;
  addStatus: () => void;
  removeStatus: (index: number) => void;
  updateStatusLabel: (index: number, value: string) => void;
  updateStatusCategory: (index: number, value: StatusCategory) => void;
};
