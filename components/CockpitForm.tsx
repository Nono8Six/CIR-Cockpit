
import React, { useState, useEffect } from 'react';
import { 
  Phone, Mail, Store, Car, 
  ArrowUpRight, Save, RotateCcw, Clock, Zap, Check, ChevronDown
} from 'lucide-react';
import { 
  Channel, LeadSource, Interaction, TimelineEvent
} from '../types';
import { generateId, getKnownCompanies } from '../services/interactionService';
import { 
  getStoredFamilies, getStoredServices, 
  getStoredEntities, getStoredStatuses 
} from '../services/configService';

interface CockpitFormProps {
  onSave: (interaction: Interaction) => void;
  configVersion: number; 
}

const formatPhoneNumber = (value: string) => {
  if (!value) return value;
  const phoneNumber = value.replace(/[^\d]/g, '');
  const phoneNumberLength = phoneNumber.length;
  if (phoneNumberLength < 4) return phoneNumber;
  if (phoneNumberLength < 6) return `${phoneNumber.slice(0, 2)} ${phoneNumber.slice(2)}`;
  if (phoneNumberLength < 8) return `${phoneNumber.slice(0, 2)} ${phoneNumber.slice(2, 4)} ${phoneNumber.slice(4)}`;
  if (phoneNumberLength < 10) return `${phoneNumber.slice(0, 2)} ${phoneNumber.slice(2, 4)} ${phoneNumber.slice(4, 6)} ${phoneNumber.slice(6)}`;
  return `${phoneNumber.slice(0, 2)} ${phoneNumber.slice(2, 4)} ${phoneNumber.slice(4, 6)} ${phoneNumber.slice(6, 8)} ${phoneNumber.slice(8, 10)}`;
};

const CockpitForm: React.FC<CockpitFormProps> = ({ onSave, configVersion }) => {
  // --- STATE ---
  const [availableFamilies, setAvailableFamilies] = useState<string[]>([]);
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [availableEntities, setAvailableEntities] = useState<string[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [knownCompanies, setKnownCompanies] = useState<string[]>([]);

  useEffect(() => {
    setAvailableFamilies(getStoredFamilies());
    setAvailableServices(getStoredServices());
    setAvailableEntities(getStoredEntities());
    setAvailableStatuses(getStoredStatuses());
    setKnownCompanies(getKnownCompanies());
  }, [configVersion]);

  // Default selections
  useEffect(() => {
    if (availableEntities.length > 0 && !entityType) setEntityType(availableEntities[0]);
    if (availableStatuses.length > 0 && !status) setStatus(availableStatuses[0]);
    if (availableServices.length > 0 && !contactService) setContactService(availableServices[0]);
  }, [availableEntities, availableStatuses, availableServices]);

  const [channel, setChannel] = useState<Channel>(Channel.PHONE);
  const [leadSource, setLeadSource] = useState<LeadSource>(LeadSource.DIRECT);
  const [supplierRef, setSupplierRef] = useState('');
  
  const [entityType, setEntityType] = useState<string>('');
  const [contactService, setContactService] = useState<string>('');
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  
  const [subject, setSubject] = useState('');
  const [megaFamilies, setMegaFamilies] = useState<string[]>([]);
  
  const [status, setStatus] = useState<string>('');
  const [orderRef, setOrderRef] = useState('');
  const [reminderAt, setReminderAt] = useState<string>('');
  const [notes, setNotes] = useState('');

  const [showSuggestions, setShowSuggestions] = useState(false);

  // --- HANDLERS ---
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setContactPhone(formatted);
  };

  const toggleFamily = (family: string) => {
    setMegaFamilies(prev => 
      prev.includes(family) 
        ? prev.filter(f => f !== family) 
        : [...prev, family]
    );
  };

  const setReminder = (type: '1h' | 'tomorrow' | '3days' | 'nextWeek') => {
    const now = new Date();
    let date = new Date();
    switch (type) {
      case '1h': date.setHours(now.getHours() + 1); break;
      case 'tomorrow': date.setDate(now.getDate() + 1); date.setHours(9, 0, 0, 0); break;
      case '3days': date.setDate(now.getDate() + 3); date.setHours(9, 0, 0, 0); break;
      case 'nextWeek': date.setDate(now.getDate() + 7); date.setHours(9, 0, 0, 0); break;
    }
    const formatted = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    setReminderAt(formatted);
  };

  const handleSubmit = () => {
    if (!companyName) {
      document.getElementById('company-input')?.focus();
      return;
    }
    if (!subject) {
      document.getElementById('subject-input')?.focus();
      return;
    }

    // Heuristic: if status contains "Devis" or "Envoyé"
    const isQuote = status.toLowerCase().includes('devis');
    if (isQuote && !reminderAt) {
      if (window.confirm("Devis envoyé sans relance. Ajouter J+3 ?")) {
        const date = new Date();
        date.setDate(date.getDate() + 3);
        date.setHours(9, 0, 0, 0);
        const autoReminder = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        saveAndReset(autoReminder);
        return;
      }
    }
    saveAndReset(reminderAt);
  };

  const saveAndReset = (finalReminder: string) => {
    const creationDate = new Date().toISOString();
    
    // Initial Note as timeline event if exists
    const timeline: TimelineEvent[] = [{
      id: generateId(),
      date: creationDate,
      type: 'creation',
      content: 'Dossier créé',
      author: 'Moi'
    }];

    if (notes.trim()) {
      timeline.push({
        id: generateId(),
        date: creationDate,
        type: 'note',
        content: notes,
        author: 'Moi'
      });
    }

    const newInteraction: Interaction = {
      id: generateId(),
      created_at: creationDate,
      channel, lead_source: leadSource, supplier_ref: supplierRef,
      entity_type: entityType, contact_service: contactService,
      company_name: companyName, contact_name: contactName, contact_phone: contactPhone,
      mega_families: megaFamilies, subject,
      order_ref: orderRef, status, reminder_at: finalReminder || undefined, 
      notes: notes, // Keep legacy field for now
      timeline: timeline
    };
    onSave(newInteraction);
    if (companyName && !knownCompanies.includes(companyName)) {
      setKnownCompanies(prev => [...prev, companyName].sort());
    }
    handleReset();
  };

  const handleReset = () => {
    setLeadSource(LeadSource.DIRECT);
    setSupplierRef('');
    if (availableEntities.length > 0) setEntityType(availableEntities[0]);
    if (availableStatuses.length > 0) setStatus(availableStatuses[0]);
    setCompanyName('');
    setContactName('');
    setContactPhone('');
    setSubject('');
    setMegaFamilies([]);
    setOrderRef('');
    setReminderAt('');
    setNotes('');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') handleSubmit();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [channel, leadSource, supplierRef, entityType, contactService, companyName, contactName, contactPhone, megaFamilies, subject, orderRef, status, reminderAt, notes]);

  const labelStyle = "text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 block";
  // Display only top 3 entities to save space, others in a dropdown if needed, or just list all if few
  const visibleEntities = availableEntities.slice(0, 4); 

  return (
    <div className="h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      <div className="bg-white border-b border-slate-200 px-6 py-3 shrink-0 flex justify-between items-center">
        <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
          <ArrowUpRight className="text-cir-red" size={16} />
          Nouvelle Interaction
        </h2>
        <div className="flex items-center gap-3">
           <span className="text-[10px] text-slate-400 font-medium">Formulaire intelligent</span>
           <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">Ctrl + Enter</span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-0 min-h-0 bg-slate-50/30">
        
        {/* LEFT COLUMN: CONTEXT (40%) */}
        <div className="col-span-12 md:col-span-5 bg-white border-r border-slate-200 p-6 flex flex-col gap-6 overflow-y-auto">
          
          {/* CHANNEL */}
          <div>
             <label className={labelStyle}>Canal</label>
             <div className="grid grid-cols-4 gap-2">
              {[
                { val: Channel.PHONE, icon: Phone },
                { val: Channel.EMAIL, icon: Mail },
                { val: Channel.COUNTER, icon: Store },
                { val: Channel.VISIT, icon: Car },
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => setChannel(opt.val)}
                  className={`flex flex-col items-center justify-center py-2.5 rounded-md transition-all text-xs font-medium border ${
                    channel === opt.val 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <opt.icon size={16} className="mb-1" />
                  {opt.val}
                </button>
              ))}
            </div>
          </div>

          {/* IDENTITY */}
          <div className="space-y-4 flex-1">
            <div className="flex items-center justify-between">
               <label className={labelStyle}>Identité</label>
               <div className="flex flex-wrap bg-slate-100 p-0.5 rounded-md gap-0.5">
                  {availableEntities.map((et) => (
                    <button
                      key={et}
                      onClick={() => setEntityType(et)}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-sm transition-all whitespace-nowrap ${entityType === et ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {et}
                    </button>
                  ))}
               </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <input 
                  id="company-input"
                  type="text"
                  value={companyName}
                  onChange={(e) => { setCompanyName(e.target.value); setShowSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Nom de la société / client..."
                  className="input-shadcn font-semibold"
                  autoFocus
                />
                {showSuggestions && companyName.length > 1 && (
                  <div className="absolute z-50 w-full bg-white border border-slate-200 shadow-lg rounded-md mt-1 max-h-40 overflow-auto py-1">
                    {knownCompanies.filter(c => c.toLowerCase().includes(companyName.toLowerCase())).length === 0 ? (
                        <div className="px-3 py-2 text-xs text-slate-400 italic">Nouvelle entrée</div>
                    ) : (
                      knownCompanies.filter(c => c.toLowerCase().includes(companyName.toLowerCase())).map((c, i) => (
                        <div 
                          key={i} 
                          className="px-3 py-1.5 text-sm hover:bg-slate-50 cursor-pointer text-slate-700"
                          onClick={() => setCompanyName(c)}
                        >
                          {c}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <input 
                   type="text" 
                   value={contactName}
                   onChange={(e) => setContactName(e.target.value)}
                   className="input-shadcn"
                   placeholder="Interlocuteur"
                 />
                 <input 
                   type="tel" 
                   value={contactPhone}
                   onChange={handlePhoneChange}
                   className="input-shadcn font-mono text-slate-600"
                   placeholder="06..."
                 />
              </div>

              <div>
                 <label className={labelStyle}>Service</label>
                 <div className="flex flex-wrap gap-1.5">
                    {availableServices.map(svc => (
                      <button
                        key={svc}
                        onClick={() => setContactService(svc)}
                        className={`px-2.5 py-1 rounded-full text-[10px] border transition-all font-medium ${contactService === svc ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                      >
                        {svc}
                      </button>
                    ))}
                 </div>
              </div>
            </div>
            
            <div className="mt-auto pt-4 border-t border-dashed border-slate-200">
              <div className="flex items-center gap-3">
                 <span className="text-[10px] font-bold text-slate-400">SOURCE</span>
                 <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer hover:text-slate-900">
                      <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${leadSource === LeadSource.DIRECT ? 'border-cir-red' : 'border-slate-300'}`}>
                        {leadSource === LeadSource.DIRECT && <div className="w-1.5 h-1.5 bg-cir-red rounded-full" />}
                      </div>
                      <input type="radio" className="hidden" checked={leadSource === LeadSource.DIRECT} onChange={() => setLeadSource(LeadSource.DIRECT)} />
                      Direct
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer hover:text-slate-900">
                      <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${leadSource === LeadSource.RETROCESSION ? 'border-cir-red' : 'border-slate-300'}`}>
                        {leadSource === LeadSource.RETROCESSION && <div className="w-1.5 h-1.5 bg-cir-red rounded-full" />}
                      </div>
                      <input type="radio" className="hidden" checked={leadSource === LeadSource.RETROCESSION} onChange={() => setLeadSource(LeadSource.RETROCESSION)} />
                      Rétrocession
                    </label>
                 </div>
              </div>
              {leadSource === LeadSource.RETROCESSION && (
                <input 
                  type="text" 
                  placeholder="Nom du fournisseur..." 
                  className="input-shadcn mt-2 text-xs bg-yellow-50/50 border-yellow-200"
                  value={supplierRef}
                  onChange={(e) => setSupplierRef(e.target.value)}
                />
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ACTION (60%) */}
        <div className="col-span-12 md:col-span-7 p-6 flex flex-col gap-6 overflow-y-auto">
          
          {/* SUBJECT */}
          <div className="space-y-3">
             <label className={labelStyle}>Sujet & Technique</label>
             <input 
                id="subject-input"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-transparent border-0 border-b border-slate-200 px-0 py-2 text-xl font-semibold text-slate-900 focus:ring-0 focus:border-cir-red focus:outline-none placeholder:text-slate-300 transition-colors"
                placeholder="Ex: Vérin ISO 15552 diam 80 course 200..."
              />
              <div className="flex flex-wrap gap-1.5">
                {availableFamilies.map(fam => (
                  <button
                    key={fam}
                    onClick={() => toggleFamily(fam)}
                    className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-md border transition-all ${
                      megaFamilies.includes(fam)
                        ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                    }`}
                  >
                    {fam}
                  </button>
                ))}
              </div>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-slate-300 focus:border-slate-300 focus:outline-none resize-none placeholder:text-slate-400"
                placeholder="Ajouter des détails techniques, références constructeur, contexte..."
              ></textarea>
          </div>

          <div className="flex-1" />

          {/* ACTION BAR */}
          <div className="bg-slate-50 rounded-lg p-5 border border-slate-200 space-y-5 shadow-sm">
             <div className="grid grid-cols-2 gap-5">
                <div>
                   <label className={labelStyle}>Statut</label>
                   <div className="relative">
                      <select 
                        value={status} 
                        onChange={(e) => setStatus(e.target.value)}
                        className={`w-full appearance-none pl-3 pr-8 py-2 rounded-md text-xs font-bold border focus:outline-none cursor-pointer transition-shadow shadow-sm h-9 bg-white border-slate-200 text-slate-700`}
                      >
                        {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" />
                   </div>
                </div>
                <div>
                   <label className={labelStyle}>Ref. Dossier</label>
                   <input 
                    type="text" 
                    value={orderRef}
                    onChange={(e) => setOrderRef(e.target.value)}
                    maxLength={6}
                    placeholder="N° Devis"
                    className="input-shadcn font-mono text-slate-700"
                  />
                </div>
             </div>

             <div>
                <label className={labelStyle}>
                  <span className="flex items-center gap-1.5"><Clock size={12} /> Rappel (Optionnel)</span>
                </label>
                <div className="flex gap-2">
                   <input 
                      type="datetime-local" 
                      value={reminderAt}
                      onChange={(e) => setReminderAt(e.target.value)}
                      className="flex-1 input-shadcn text-xs text-slate-600"
                    />
                    <button onClick={() => setReminder('1h')} className="px-3 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-medium hover:bg-slate-50 text-slate-600 shadow-sm">+1h</button>
                    <button onClick={() => setReminder('3days')} className="px-3 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-medium hover:bg-slate-50 text-slate-600 shadow-sm">J+3</button>
                </div>
             </div>

             <div className="flex gap-3 pt-2">
               <button 
                  onClick={handleReset}
                  className="px-4 py-2 rounded-md border border-slate-200 text-slate-500 hover:bg-white hover:text-slate-800 transition shadow-sm bg-white"
                  title="Effacer"
               >
                 <RotateCcw size={16} />
               </button>
               <button 
                  onClick={handleSubmit}
                  className="flex-1 bg-cir-red hover:bg-red-700 text-white font-semibold rounded-md shadow-sm transition-all flex items-center justify-center gap-2 text-sm h-10 ring-offset-2 focus:ring-2 focus:ring-red-600"
               >
                 <Save size={16} />
                 ENREGISTRER L'INTERACTION
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CockpitForm;
