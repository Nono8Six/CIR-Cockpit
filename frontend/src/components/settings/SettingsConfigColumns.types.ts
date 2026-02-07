import type { SettingsSectionsProps } from './SettingsSections.types';

export type SettingsConfigColumnsProps = Pick<
  SettingsSectionsProps,
  | 'readOnly'
  | 'families'
  | 'services'
  | 'entities'
  | 'interactionTypes'
  | 'newFamily'
  | 'newService'
  | 'newEntity'
  | 'newInteractionType'
  | 'setNewFamily'
  | 'setNewService'
  | 'setNewEntity'
  | 'setNewInteractionType'
  | 'addItem'
  | 'removeItem'
  | 'updateItem'
  | 'setFamilies'
  | 'setServices'
  | 'setEntities'
  | 'setInteractionTypes'
>;
