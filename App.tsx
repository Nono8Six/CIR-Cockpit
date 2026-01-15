import React, { useState, useEffect } from 'react';
import CockpitForm from './components/CockpitForm';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import { Interaction } from './types';
import { getInteractions, saveInteraction } from './services/interactionService';
import { Search, User, LayoutDashboard, PenTool, Settings as SettingsIcon, Command, CheckCircle2 } from 'lucide-react';
import { getStoredStatuses } from './services/configService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'cockpit' | 'dashboard' | 'settings'>('cockpit');
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [configVersion, setConfigVersion] = useState(0);
  const [firstStatus, setFirstStatus] = useState('À traiter');
  
  // Toast State
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

  // Load initial data
  useEffect(() => {
    setInteractions(getInteractions());
    const statuses = getStoredStatuses();
    if (statuses.length > 0) setFirstStatus(statuses[0]);
  }, [configVersion]);

  // Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') setIsSearchOpen(false);
      if (e.key === 'F1') { e.preventDefault(); setActiveTab('cockpit'); }
      if (e.key === 'F2') { e.preventDefault(); setActiveTab('dashboard'); }
      if (e.key === 'F3') { e.preventDefault(); setActiveTab('settings'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const showNotification = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  const handleSaveInteraction = (newInteraction: Interaction) => {
    const updated = saveInteraction(newInteraction);
    setInteractions(updated);
    showNotification("Interaction enregistrée avec succès");
  };

  const handleDataChange = (message?: string) => {
    setInteractions(getInteractions());
    if (message) showNotification(message);
  };

  const handleConfigChange = () => {
    setConfigVersion(prev => prev + 1);
    showNotification("Paramètres mis à jour");
  };

  const filteredInteractions = searchQuery 
    ? interactions.filter(i => 
        i.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (i.order_ref && i.order_ref.includes(searchQuery)) ||
        i.contact_phone.includes(searchQuery)
      )
    : [];

  const pendingCount = interactions.filter(i => i.status === firstStatus).length;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50/50 overflow-hidden text-slate-900 font-sans">
      
      {/* Top Header & Navigation */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-20 shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cir-red rounded flex items-center justify-center text-white font-black tracking-tighter shadow-sm transform -skew-x-6">
              CIR
            </div>
            <div className="flex flex-col">
              <h1 className="font-bold text-slate-900 text-sm leading-none tracking-tight">COCKPIT</h1>
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">TCS</span>
            </div>
          </div>

          {/* TABS - Segmented Control Style */}
          <div className="flex bg-slate-100 rounded-md p-1 gap-1">
             <button 
               onClick={() => setActiveTab('cockpit')}
               className={`flex items-center gap-2 px-3 py-1 rounded-[4px] text-xs font-medium transition-all ${activeTab === 'cockpit' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
             >
               <PenTool size={14} /> <span className="hidden sm:inline">Saisie (F1)</span>
             </button>
             <button 
               onClick={() => setActiveTab('dashboard')}
               className={`flex items-center gap-2 px-3 py-1 rounded-[4px] text-xs font-medium transition-all ${activeTab === 'dashboard' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
             >
               <LayoutDashboard size={14} /> <span className="hidden sm:inline">Pilotage (F2)</span>
               {pendingCount > 0 && (
                 <span className="bg-cir-red text-white text-[10px] px-1.5 rounded-full font-bold ml-1">
                   {pendingCount}
                 </span>
               )}
             </button>
             <button 
               onClick={() => setActiveTab('settings')}
               className={`flex items-center gap-2 px-3 py-1 rounded-[4px] text-xs font-medium transition-all ${activeTab === 'settings' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
             >
               <SettingsIcon size={14} /> <span className="hidden sm:inline">Paramètres (F3)</span>
             </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div 
            className="flex items-center bg-white border border-slate-200 rounded-md px-3 py-1.5 cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all gap-3 text-slate-500 w-64 shadow-sm group"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search size={14} className="group-hover:text-slate-700" />
            <span className="text-xs text-slate-400 font-medium hidden md:inline group-hover:text-slate-600">Recherche rapide...</span>
            <div className="ml-auto flex items-center gap-1">
              <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono text-slate-500">⌘K</span>
            </div>
          </div>

          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 border border-slate-200 hover:bg-slate-200 cursor-pointer transition-colors">
            <User size={16} />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 overflow-hidden relative">
        <div className="h-full w-full max-w-[1600px] mx-auto transition-opacity duration-200">
           {activeTab === 'cockpit' && <CockpitForm onSave={handleSaveInteraction} configVersion={configVersion} />}
           {activeTab === 'dashboard' && <Dashboard interactions={interactions} onDataChange={handleDataChange} />}
           {activeTab === 'settings' && <Settings onConfigChange={handleConfigChange} />}
        </div>
      </main>

      {/* SEARCH MODAL OVERLAY (Command Palette Style) */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-50 flex items-start justify-center pt-[15vh] animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh] border border-slate-200 ring-1 ring-slate-900/5 animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3">
              <Command className="text-slate-400" size={18} />
              <input 
                autoFocus
                type="text" 
                placeholder="Rechercher un client, une commande, un téléphone..." 
                className="flex-1 text-base outline-none text-slate-800 placeholder:text-slate-400 font-medium bg-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button onClick={() => setIsSearchOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 rounded-sm p-1">
                <span className="text-xs font-mono">ESC</span>
              </button>
            </div>
            
            <div className="overflow-y-auto p-2 bg-white min-h-[100px]">
              {filteredInteractions.length === 0 ? (
                 <div className="text-center py-12 text-slate-400 text-sm">
                   {searchQuery ? "Aucun résultat trouvé." : "Commencez à taper pour rechercher..."}
                 </div>
              ) : (
                <div className="space-y-1">
                  <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Résultats récents</div>
                  {filteredInteractions.map(interaction => (
                    <div key={interaction.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer group transition-colors">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-slate-900 text-sm group-hover:text-cir-red transition-colors">{interaction.company_name}</span>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                           <span className="truncate max-w-[200px]">{interaction.subject}</span>
                           <span>•</span>
                           <span>{interaction.contact_name}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                         <span className="text-[10px] text-slate-400">{new Date(interaction.created_at).toLocaleDateString()}</span>
                         {interaction.order_ref && <span className="text-[10px] bg-slate-100 px-1.5 rounded text-slate-600 font-mono">#{interaction.order_ref}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between">
              <span><strong>↑↓</strong> pour naviguer</span>
              <span><strong>↵</strong> pour sélectionner</span>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast.visible && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 border border-slate-700">
            <CheckCircle2 size={20} className="text-emerald-400" />
            <span className="font-medium text-sm">{toast.message}</span>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;