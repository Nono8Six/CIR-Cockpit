import StatusSection from './StatusSection';
import type { SettingsSectionsProps } from './SettingsSections.types';

type SettingsStatusColumnProps = Pick<
  SettingsSectionsProps,
  | 'statuses'
  | 'newStatus'
  | 'newStatusCategory'
  | 'setNewStatus'
  | 'setNewStatusCategory'
  | 'addStatus'
  | 'removeStatus'
  | 'updateStatusLabel'
  | 'updateStatusCategory'
  | 'readOnly'
>;

const SettingsStatusColumn = ({
  statuses,
  newStatus,
  newStatusCategory,
  setNewStatus,
  setNewStatusCategory,
  addStatus,
  removeStatus,
  updateStatusLabel,
  updateStatusCategory,
  readOnly
}: SettingsStatusColumnProps) => (
  <StatusSection
    statuses={statuses}
    newStatus={newStatus}
    newStatusCategory={newStatusCategory}
    setNewStatus={setNewStatus}
    setNewStatusCategory={setNewStatusCategory}
    onAdd={addStatus}
    onRemove={removeStatus}
    onLabelUpdate={updateStatusLabel}
    onCategoryUpdate={updateStatusCategory}
    readOnly={readOnly}
  />
);

export default SettingsStatusColumn;
