import ConfigSectionAddRow from './ConfigSectionAddRow';
import ConfigSectionItemsList from './ConfigSectionItemsList';
import type { LucideIcon } from 'lucide-react';

type ConfigSectionProps = {
  title: string;
  icon: LucideIcon;
  namePrefix: string;
  count: number;
  list: string[];
  newItem: string;
  setNewItem: (value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, value: string) => void;
  placeholder: string;
  uppercase?: boolean;
  readOnly?: boolean;
};

const ConfigSection = ({
  title,
  icon: Icon,
  namePrefix,
  count,
  list,
  newItem,
  setNewItem,
  onAdd,
  onRemove,
  onUpdate,
  placeholder,
  uppercase = false,
  readOnly = false
}: ConfigSectionProps) => (
  <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col h-full">
    <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
      <Icon size={15} className="text-slate-500" aria-hidden="true" />
      {title}
      <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">({count})</span>
    </h3>

    <ConfigSectionAddRow
      newItem={newItem}
      setNewItem={setNewItem}
      onAdd={onAdd}
      placeholder={placeholder}
      namePrefix={namePrefix}
      uppercase={uppercase}
      readOnly={readOnly}
    />

    <ConfigSectionItemsList
      list={list}
      onUpdate={onUpdate}
      onRemove={onRemove}
      title={title}
      namePrefix={namePrefix}
      uppercase={uppercase}
      readOnly={readOnly}
    />
  </div>
);

export default ConfigSection;
