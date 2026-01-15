import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Save, RotateCcw, Pencil } from 'lucide-react';
import { 
  getStoredFamilies, saveStoredFamilies, 
  getStoredServices, saveStoredServices,
  getStoredEntities, saveStoredEntities,
  getStoredStatuses, saveStoredStatuses
} from '../services/configService';
import { 
  DEFAULT_MEGA_FAMILIES, DEFAULT_SERVICES, 
  DEFAULT_ENTITY_TYPES, DEFAULT_STATUSES 
} from '../types';

interface SettingsProps {
  onConfigChange: () => void;
}

// Helper Component defined outside to prevent re-creation on render
const ConfigSection = ({ 
  title, count, list, newItem, setNewItem, onAdd, onRemove, onUpdate, placeholder, uppercase = false 
}: any) => (
  <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col h-full">
    <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
      {title}
      <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">({count})</span>
    </h3>
    
    <div className="flex gap-2 mb-4">
      <input 
        type="text" 
        value={newItem}
        onChange={(e) => setNewItem(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onAdd()}
        className={`flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-slate-300 focus:outline-none ${uppercase ? 'uppercase' : ''}`}
        placeholder={placeholder}
      />
      <button onClick={onAdd} className="bg-slate-900 text-white p-2 rounded-md hover:bg-slate-800 transition-colors">
        <Plus size={18} />
      </button>
    </div>

    <div className="flex-1 overflow-auto space-y-2 max-h-[300px] pr-2">
      {list.map((item: string, index: number) => (
        <div key={index} className="flex justify-between items-center group bg-white border border-transparent hover:border-slate-100 rounded-md px-1 py-1 transition-all">
          <input 
            type="text"
            value={item}
            onChange={(e) => onUpdate(index, e.target.value)}
            className={`flex-1 bg-transparent border-b border-transparent focus:border-slate-300 focus:outline-none text-sm text-slate-700 px-2 py-1 ${uppercase ? 'uppercase font-bold text-xs' : ''}`}
          />
          <button onClick={() => onRemove(index)} className="text-slate-200 hover:text-red-500 transition-colors p-2 opacity-0 group-hover:opacity-100">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  </div>
);

const Settings: React.FC<SettingsProps> = ({ onConfigChange }) => {
  const [families, setFamilies] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [entities, setEntities] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);

  const [newFamily, setNewFamily] = useState('');
  const [newService, setNewService] = useState('');
  const [newEntity, setNewEntity] = useState('');
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    setFamilies(getStoredFamilies());
    setServices(getStoredServices());
    setEntities(getStoredEntities());
    setStatuses(getStoredStatuses());
  }, []);

  const handleSave = () => {
    saveStoredFamilies(families);
    saveStoredServices(services);
    saveStoredEntities(entities);
    saveStoredStatuses(statuses);
    onConfigChange();
  };

  const handleReset = () => {
    if (confirm("Réinitialiser toutes les configurations par défaut ?")) {
      setFamilies(DEFAULT_MEGA_FAMILIES);
      setServices(DEFAULT_SERVICES);
      setEntities(DEFAULT_ENTITY_TYPES);
      setStatuses(DEFAULT_STATUSES);
    }
  };

  // Generic Helpers
  const addItem = (item: string, list: string[], setList: (l: string[]) => void, clearInput: () => void, uppercase = false) => {
    const val = uppercase ? item.toUpperCase() : item;
    if (val && !list.includes(val)) {
      setList([...list, val]);
      clearInput();
    }
  };

  const removeItem = (index: number, list: string[], setList: (l: string[]) => void) => {
    const newList = [...list];
    newList.splice(index, 1);
    setList(newList);
  };

  const updateItem = (index: number, newValue: string, list: string[], setList: (l: string[]) => void, uppercase = false) => {
    const val = uppercase ? newValue.toUpperCase() : newValue;
    const newList = [...list];
    newList[index] = val;
    setList(newList);
  };

  return (
    <div className="h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
        <h2 className="font-semibold text-slate-800 text-lg">Paramétrage Agence</h2>
        <div className="flex gap-2">
           <button onClick={handleReset} className="flex items-center gap-2 text-xs bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-2 rounded-md transition font-medium">
             <RotateCcw size={14} /> Défaut
           </button>
           <button onClick={handleSave} className="flex items-center gap-2 text-sm bg-cir-red hover:bg-red-700 text-white px-4 py-2 rounded-md font-semibold transition shadow-sm">
             <Save size={16} /> Enregistrer
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full min-h-[500px]">
          
          <ConfigSection 
            title="📦 Familles Produits"
            count={families.length}
            list={families}
            newItem={newFamily}
            setNewItem={setNewFamily}
            onAdd={() => addItem(newFamily, families, setFamilies, () => setNewFamily(''), true)}
            onRemove={(i: number) => removeItem(i, families, setFamilies)}
            onUpdate={(i: number, val: string) => updateItem(i, val, families, setFamilies, true)}
            placeholder="NOUVELLE FAMILLE..."
            uppercase
          />

          <ConfigSection 
            title="👥 Services"
            count={services.length}
            list={services}
            newItem={newService}
            setNewItem={setNewService}
            onAdd={() => addItem(newService, services, setServices, () => setNewService(''))}
            onRemove={(i: number) => removeItem(i, services, setServices)}
            onUpdate={(i: number, val: string) => updateItem(i, val, services, setServices)}
            placeholder="Nouveau service..."
          />

          <ConfigSection 
            title="🏷️ Types de Tiers"
            count={entities.length}
            list={entities}
            newItem={newEntity}
            setNewItem={setNewEntity}
            onAdd={() => addItem(newEntity, entities, setEntities, () => setNewEntity(''))}
            onRemove={(i: number) => removeItem(i, entities, setEntities)}
            onUpdate={(i: number, val: string) => updateItem(i, val, entities, setEntities)}
            placeholder="Ex: Client Export..."
          />

          <ConfigSection 
            title="🚩 Statuts Dossier"
            count={statuses.length}
            list={statuses}
            newItem={newStatus}
            setNewItem={setNewStatus}
            onAdd={() => addItem(newStatus, statuses, setStatuses, () => setNewStatus(''))}
            onRemove={(i: number) => removeItem(i, statuses, setStatuses)}
            onUpdate={(i: number, val: string) => updateItem(i, val, statuses, setStatuses)}
            placeholder="Ex: En attente SAV..."
          />

        </div>
      </div>
    </div>
  );
};

export default Settings;