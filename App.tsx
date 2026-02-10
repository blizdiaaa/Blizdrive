
import React, { useState, useEffect, useRef } from 'react';
import { Search, Settings, PlusCircle, Database, LayoutDashboard, Command, HelpCircle, FilePlus, Menu, X, FileText, ChevronRight, Upload, Plus, Trash2, Edit3, Image, User, Check, LogOut, Download, Globe, Cloud, RefreshCw, Move } from 'lucide-react';
import { WorkspaceState, WorkspaceItem, PageVersion, Annotation, Tab, UserSettings } from './types';
import { storageService } from './services/storageService';
import { TreeItem } from './components/TreeItem';
import { BlockEditor } from './components/BlockEditor';
import { PDFViewer } from './components/PDFViewer';
import { INITIAL_DATA, THEME_OPTIONS } from './constants';

const App: React.FC = () => {
  const [state, setState] = useState<WorkspaceState>(INITIAL_DATA);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [tabRenameValue, setTabRenameValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Mobile Move Support
  const [itemToMoveId, setItemToMoveId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const syncTimeoutRef = useRef<number | null>(null);

  // Deriving active tab and active item from state
  const activeTab = state.tabs.find(t => t.id === state.activeTabId);
  const activeItem = state.activeItemId ? state.items[state.activeItemId] : null;

  // Initialization: Load from Firebase
  useEffect(() => {
    const init = async () => {
      try {
        const savedState = await storageService.load();
        if (savedState) {
          setState(savedState);
        }
      } catch (e) {
        console.error("Critical Initialization Failure:", e);
      } finally {
        setIsInitialized(true);
      }
    };
    init();
  }, []);

  // Auto-save to Firebase with Debounce
  useEffect(() => {
    if (!isInitialized) return;
    storageService.saveLocal(state);
    if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
    setIsSyncing(true);
    syncTimeoutRef.current = window.setTimeout(async () => {
      const success = await storageService.saveRemote(state);
      setIsSyncing(false);
    }, 2000);
    return () => {
      if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
    };
  }, [state, isInitialized]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchVisible(true);
      }
      if (e.key === 'Escape') {
        setIsSearchVisible(false);
        setIsSettingsOpen(false);
        setEditingTabId(null);
        setDeleteConfirmId(null);
        setItemToMoveId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelect = (id: string) => {
    setState(prev => ({ ...prev, activeItemId: id }));
    if (window.innerWidth <= 768) setIsSidebarOpen(false);
  };

  const handleUpdateItem = (itemId: string, updates: Partial<WorkspaceItem>) => {
    setState(prev => ({
      ...prev,
      items: {
        ...prev.items,
        [itemId]: {
          ...prev.items[itemId],
          ...updates,
          updatedAt: Date.now()
        }
      }
    }));
  };

  const handleMoveItem = (itemId: string, newParentId: string | null) => {
    setState(prev => {
      const nextItems = { ...prev.items };
      const item = nextItems[itemId];
      if (!item || itemId === newParentId) return prev;

      let pId = newParentId;
      while (pId) {
        if (pId === itemId) return prev;
        pId = nextItems[pId]?.parentId || null;
      }

      Object.keys(nextItems).forEach(id => {
        if (nextItems[id].children?.includes(itemId)) {
          nextItems[id] = {
            ...nextItems[id],
            children: nextItems[id].children!.filter(cId => cId !== itemId)
          };
        }
      });

      const nextTabs = prev.tabs.map(tab => ({
        ...tab,
        rootItems: tab.rootItems.filter(id => id !== itemId)
      }));

      if (newParentId && nextItems[newParentId]) {
        const newParent = nextItems[newParentId];
        nextItems[newParentId] = {
          ...newParent,
          children: [...(newParent.children || []), itemId]
        };
        nextItems[itemId] = { ...item, parentId: newParentId };
        return { ...prev, items: nextItems, tabs: nextTabs };
      } else {
        const updatedTabs = nextTabs.map(tab => {
          if (tab.id === prev.activeTabId) {
            return { ...tab, rootItems: [...tab.rootItems, itemId] };
          }
          return tab;
        });
        nextItems[itemId] = { ...item, parentId: null };
        return { ...prev, items: nextItems, tabs: updatedTabs };
      }
    });
    setItemToMoveId(null);
  };

  const handleDeleteItem = (itemId: string) => {
    setDeleteConfirmId(itemId);
  };

  const confirmDelete = () => {
    if (!deleteConfirmId) return;
    const itemIdToRemove = deleteConfirmId;
    setState(prev => {
      const nextItems = { ...prev.items };
      if (!nextItems[itemIdToRemove]) return prev;
      const idsToDelete = new Set<string>();
      const gather = (id: string) => {
        idsToDelete.add(id);
        const item = nextItems[id];
        if (item && item.children) {
          item.children.forEach(childId => gather(childId));
        }
      };
      gather(itemIdToRemove);
      const updatedItems: Record<string, WorkspaceItem> = {};
      Object.keys(nextItems).forEach(id => {
        if (!idsToDelete.has(id)) {
          const item = { ...nextItems[id] };
          if (item.children) {
            item.children = item.children.filter(cId => !idsToDelete.has(cId));
          }
          updatedItems[id] = item;
        }
      });
      const updatedTabs = prev.tabs.map(tab => ({
        ...tab,
        rootItems: tab.rootItems.filter(id => !idsToDelete.has(id))
      }));
      let newActiveItemId = prev.activeItemId;
      if (prev.activeItemId && idsToDelete.has(prev.activeItemId)) {
        newActiveItemId = null;
      }
      return { ...prev, items: updatedItems, tabs: updatedTabs, activeItemId: newActiveItemId };
    });
    setDeleteConfirmId(null);
  };

  const handleAddTab = () => {
    const id = `tab-${Math.random().toString(36).substr(2, 9)}`;
    const newTab: Tab = { id, name: 'NEW CLUSTER', rootItems: [] };
    setState(prev => ({ ...prev, tabs: [...prev.tabs, newTab], activeTabId: id }));
    setEditingTabId(id);
    setTabRenameValue('NEW CLUSTER');
  };

  const saveTabRename = () => {
    if (!editingTabId) return;
    const finalValue = tabRenameValue.trim().toUpperCase() || 'UNTITLED';
    setState(prev => ({ ...prev, tabs: prev.tabs.map(t => t.id === editingTabId ? { ...t, name: finalValue } : t) }));
    setEditingTabId(null);
  };

  const handleDeleteTab = (tabId: string) => {
    if (state.tabs.length <= 1) return;
    setState(prev => {
      const tabIndex = prev.tabs.findIndex(t => t.id === tabId);
      const nextTabs = prev.tabs.filter(t => t.id !== tabId);
      let newActiveTabId = prev.activeTabId;
      if (prev.activeTabId === tabId) {
          const newIndex = tabIndex > 0 ? tabIndex - 1 : 0;
          newActiveTabId = nextTabs[newIndex].id;
      }
      return { ...prev, tabs: nextTabs, activeTabId: newActiveTabId };
    });
  };

  const handleAddItem = (parentId: string | null, type: WorkspaceItem['type'], additionalProps: Partial<WorkspaceItem> = {}) => {
    const id = `${type}-${Math.random().toString(36).substr(2, 9)}`;
    const newItem: WorkspaceItem = {
      id, parentId, name: additionalProps.name || `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type, createdAt: Date.now(), updatedAt: Date.now(),
      children: type === 'folder' ? [] : undefined,
      content: type === 'page' ? [{ id: '1', type: 'text', content: '' }] : undefined,
      pdfUrl: additionalProps.pdfUrl, annotations: [], ...additionalProps
    };
    setState(prev => {
      const nextItems = { ...prev.items, [id]: newItem };
      const nextTabs = [...prev.tabs];
      if (parentId && nextItems[parentId]) {
        nextItems[parentId] = { ...nextItems[parentId], children: [...(nextItems[parentId].children || []), id] };
      } else {
        const tabIdx = nextTabs.findIndex(t => t.id === prev.activeTabId);
        if (tabIdx !== -1) {
          nextTabs[tabIdx] = { ...nextTabs[tabIdx], rootItems: [...nextTabs[tabIdx].rootItems, id] };
        }
      }
      return { ...prev, items: nextItems, tabs: nextTabs, activeItemId: id };
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        handleAddItem(null, 'pdf', { name: file.name, pdfUrl: url });
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const updateSettings = (updates: Partial<UserSettings>) => {
    setState(prev => ({ ...prev, settings: { ...prev.settings, ...updates } }));
  };

  const handleRestoreVersion = (version: PageVersion) => {
    if (!state.activeItemId) return;
    handleUpdateItem(state.activeItemId, { content: version.content, name: version.name });
  };

  const handleUpdateAnnotations = (annotations: Annotation[]) => {
    if (!state.activeItemId) return;
    handleUpdateItem(state.activeItemId, { annotations });
  };

  // Fix: Added explicit cast to WorkspaceItem[] to resolve unknown property access errors
  const getSearchResults = () => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const items = Object.values(state.items) as WorkspaceItem[];
    return items.filter(item => item.name.toLowerCase().includes(query));
  };

  // Move Modal Logic - Fix: Added explicit cast for workspace items
  const allFolders = (Object.values(state.items) as WorkspaceItem[]).filter(item => item.type === 'folder' && item.id !== itemToMoveId);

  if (!isInitialized) {
    return (
      <div className="h-screen w-screen bg-[#020617] flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-1000">
        <div className="relative">
          <div className="w-20 h-20 border-b-4 border-violet-500 rounded-full animate-spin" />
        </div>
        <div className="text-center">
          <h2 className="text-violet-400 font-['Orbitron'] tracking-[0.5em] uppercase text-xs font-bold mb-3">System Uplink</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative flex overflow-hidden bg-cover bg-center transition-all duration-1000" style={{ backgroundImage: `url(${state.settings.background})` }}>
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" />

      <div className="md:hidden absolute top-0 left-0 right-0 z-20 h-14 glass flex items-center justify-between px-4 border-b border-white/5">
        <div className="flex items-center">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-300"><Menu size={24} /></button>
          <span className="ml-3 font-['Orbitron'] text-xs font-bold tracking-widest text-violet-400 uppercase">{state.settings.workspaceName}</span>
        </div>
      </div>

      {isSidebarOpen && window.innerWidth <= 768 && <div className="fixed inset-0 bg-black/70 z-30 backdrop-blur-md" onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`fixed md:relative z-40 h-[calc(100vh-24px)] md:h-[calc(100vh-24px)] w-80 glass border-r border-white/10 flex flex-col m-3 rounded-2xl transition-all duration-300 shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-[calc(100%+24px)] md:translate-x-0'}`}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/30 flex items-center justify-center border border-violet-400/50 glow-purple"><LayoutDashboard className="text-violet-400" size={20} /></div>
          <div className="flex-grow overflow-hidden">
            <h1 className="font-['Orbitron'] text-sm font-bold tracking-wider text-slate-100 uppercase truncate">{state.settings.workspaceName}</h1>
            <p className="text-[10px] text-slate-400 tracking-widest font-medium uppercase truncate">Terminal: {state.settings.userName}</p>
          </div>
        </div>

        <div className="px-4 mb-4">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Semesters</span>
            <button onClick={handleAddTab} className="p-1.5 hover:bg-white/10 rounded-full text-slate-400 hover:text-violet-400 transition-all active:scale-90"><Plus size={16} /></button>
          </div>
          <div className="flex flex-wrap gap-2 pb-2">
            {state.tabs.map(tab => (
              <div key={tab.id} onClick={() => setState(prev => ({ ...prev, activeTabId: tab.id }))} className={`relative group px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider cursor-pointer border transition-all ${state.activeTabId === tab.id ? 'bg-violet-600/30 text-violet-200 border-violet-500/40 shadow-lg' : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/10'}`}>
                {editingTabId === tab.id ? <input autoFocus className="bg-transparent border-none outline-none text-[9px] font-bold uppercase tracking-wider text-white w-16 text-center" value={tabRenameValue} onChange={e => setTabRenameValue(e.target.value)} onBlur={saveTabRename} onKeyDown={e => e.key === 'Enter' && saveTabRename()} /> : tab.name}
                {!editingTabId && <div className="absolute -top-1 -right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/95 backdrop-blur-sm rounded p-0.5 border border-white/10 shadow-xl z-10"><button onClick={(e) => { e.stopPropagation(); setEditingTabId(tab.id); setTabRenameValue(tab.name); }} className="p-1 hover:text-violet-400"><Edit3 size={10}/></button><button onClick={(e) => { e.stopPropagation(); handleDeleteTab(tab.id); }} className="p-1 hover:text-red-400"><Trash2 size={10}/></button></div>}
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 mb-6">
          <div className="relative group cursor-pointer" onClick={() => setIsSearchVisible(true)}><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-slate-300" size={14} /><div className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs text-slate-400 select-none">Locate Node... (⌘K)</div></div>
        </div>

        <div className="flex-grow overflow-y-auto px-4 custom-scrollbar">
          <div className="flex items-center justify-between mb-4 px-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Knowledge Base</span>
            <div className="flex gap-1">
              <button onClick={() => fileInputRef.current?.click()} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors" title="Import PDF"><FilePlus size={14} /></button>
              <button onClick={() => handleAddItem(null, 'folder')} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors" title="Create Folder"><PlusCircle size={14} /></button>
            </div>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="application/pdf" />
          <div className="space-y-1 min-h-[100px] rounded-xl transition-colors pb-10">
            {activeTab && activeTab.rootItems.length === 0 && <div className="text-[10px] text-slate-600 text-center py-16 px-4 border border-dashed border-white/5 rounded-2xl">Cluster Node Empty.</div>}
            {activeTab && activeTab.rootItems.map(itemId => (
              <TreeItem key={itemId} itemId={itemId} state={state} onSelect={handleSelect} onAdd={handleAddItem} onMove={handleMoveItem} onUpdate={handleUpdateItem} onDelete={handleDeleteItem} onSetMoveTarget={setItemToMoveId} depth={0} />
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-white/5 glass">
          <div className="flex items-center justify-between">
            <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-2 p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-slate-200"><Settings size={16} /><span className="text-xs font-medium">Preferences</span></button>
          </div>
        </div>
      </aside>

      {/* Move Modal (Mobile Friendly) */}
      {itemToMoveId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setItemToMoveId(null)} />
          <div className="w-full max-w-md glass-card rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-['Orbitron'] font-bold text-white uppercase tracking-wider flex items-center gap-3"><Move className="text-violet-400" size={20}/> Relocate Node</h2>
              <button onClick={() => setItemToMoveId(null)} className="text-slate-500 hover:text-white"><X size={20}/></button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-2">
              <button onClick={() => handleMoveItem(itemToMoveId, null)} className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-white/10 border border-white/5 group text-left transition-all">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400"><Globe size={18}/></div>
                <div><div className="text-sm font-bold text-slate-100 uppercase tracking-widest">Root Directory</div><div className="text-[9px] text-slate-500 uppercase">Move to top level</div></div>
              </button>
              {allFolders.map(folder => (
                <button key={folder.id} onClick={() => handleMoveItem(itemToMoveId, folder.id)} className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-white/10 border border-white/5 group text-left transition-all">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400"><Database size={18}/></div>
                  <div><div className="text-sm font-bold text-slate-100 uppercase tracking-widest">{folder.name}</div><div className="text-[9px] text-slate-500 uppercase">Internal Storage</div></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ... Other modals like DeleteConfirm, Search, Settings remain largely similar ... */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setDeleteConfirmId(null)} />
          <div className="w-full max-w-md glass-card rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="p-10 text-center space-y-6">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]"><Trash2 className="text-red-500" size={36} /></div>
              <div><h2 className="text-2xl font-['Orbitron'] font-bold text-white mb-3 uppercase tracking-wider">Purge Archive</h2><p className="text-slate-400 text-sm leading-relaxed">Permanently erase <span className="text-slate-100 font-bold">"{state.items[deleteConfirmId]?.name}"</span> and all nested sub-systems?</p></div>
              <div className="flex gap-4 pt-4"><button onClick={() => setDeleteConfirmId(null)} className="flex-1 px-4 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-300 text-xs font-bold uppercase tracking-widest transition-all">Cancel</button><button onClick={confirmDelete} className="flex-1 px-4 py-4 bg-red-600 hover:bg-red-500 rounded-2xl text-white font-bold text-xs uppercase tracking-widest transition-all shadow-[0_0_30px_rgba(220,38,38,0.4)]">Confirm Purge</button></div>
            </div>
          </div>
        </div>
      )}

      {isSearchVisible && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setIsSearchVisible(false)} />
          <div className="w-full max-w-2xl glass-card rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative flex flex-col max-h-[70vh]">
            <div className="p-4 border-b border-white/10 flex items-center gap-4"><Search className="text-violet-400" size={20} /><input autoFocus placeholder="Locate knowledge node..." className="w-full bg-transparent border-none text-slate-100 text-lg outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /><button onClick={() => setIsSearchVisible(false)} className="text-[10px] text-slate-500 bg-white/5 px-2 py-1 rounded border border-white/10">Esc</button></div>
            <div className="flex-grow overflow-y-auto custom-scrollbar p-2">
              {getSearchResults().map(item => (
                <button key={item.id} onClick={() => { handleSelect(item.id); setIsSearchVisible(false); }} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/10 group text-left">
                  <div className="flex items-center gap-3"><div className="p-2 bg-white/5 rounded-lg text-slate-400 group-hover:text-violet-400 transition-colors">{item.type === 'pdf' ? <FileText size={18}/> : item.type === 'folder' ? <Database size={18}/> : <FileText size={18}/>}</div><div><div className="text-sm font-medium text-slate-200">{item.name}</div><div className="text-[10px] text-slate-500 uppercase tracking-tighter">{item.type}</div></div></div><ChevronRight size={14} className="text-slate-600 opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => setIsSettingsOpen(false)} />
          <div className="w-full max-w-xl glass-card rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/10 flex items-center justify-between"><h2 className="font-['Orbitron'] font-bold text-slate-100 flex items-center gap-3 uppercase tracking-widest"><Settings className="text-violet-400"/> System Preferences</h2><button onClick={() => setIsSettingsOpen(false)} className="text-slate-500 hover:text-white"><X size={20}/></button></div>
            <div className="p-8 space-y-10 custom-scrollbar max-h-[70vh] overflow-y-auto">
              <section className="space-y-6"><h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2"><User size={12}/> Profile Identity</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-6"><div className="space-y-2"><label className="text-[9px] font-bold text-slate-500 ml-1 uppercase tracking-widest">User Name</label><input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 text-slate-200" value={state.settings.userName} onChange={e => updateSettings({ userName: e.target.value })} /></div><div className="space-y-2"><label className="text-[9px] font-bold text-slate-500 ml-1 uppercase tracking-widest">Workspace Name</label><input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 text-slate-200" value={state.settings.workspaceName} onChange={e => updateSettings({ workspaceName: e.target.value })} /></div></div></section>
              <section className="space-y-6"><h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2"><Image size={12}/> Environment Calibration</h3><div className="grid grid-cols-2 gap-4">{THEME_OPTIONS.map(opt => (<button key={opt.url} onClick={() => updateSettings({ background: opt.url })} className={`group relative aspect-video rounded-2xl overflow-hidden border-2 transition-all ${state.settings.background === opt.url ? 'border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.3)] scale-[1.02]' : 'border-transparent opacity-60 hover:opacity-100'}`}><img src={opt.url} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3"><span className="text-[10px] font-bold text-white uppercase tracking-wider">{opt.name}</span></div>{state.settings.background === opt.url && (<div className="absolute top-2 right-2 bg-violet-600 rounded-full p-1"><Check size={12} className="text-white"/></div>)}</button>))}</div></section>
              <section className="space-y-6 pt-6 border-t border-white/10"><h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Matrix Data Management</h3><div className="flex flex-wrap gap-4"><button onClick={() => { const dataStr = JSON.stringify(state, null, 2); const blob = new Blob([dataStr], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${state.settings.workspaceName.toLowerCase()}-archive.json`; link.click(); }} className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all"><Download size={14}/> Backup Workspace</button><button onClick={() => { if (confirm("Initiate Factory Reset? All global archive data will be purged.")) { localStorage.clear(); window.location.reload(); } }} className="flex items-center gap-2 px-5 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all"><LogOut size={14}/> Factory Reset</button></div></section>
            </div>
          </div>
        </div>
      )}

      <main className={`relative z-10 flex-grow flex flex-col m-2 md:m-3 mt-16 md:mt-3 ml-0 md:ml-0 rounded-2xl glass-card overflow-hidden shadow-2xl border border-white/10 transition-all ${isSidebarOpen && window.innerWidth <= 768 ? 'opacity-20 blur-sm' : ''}`}>
        {activeItem ? (
          <div className="flex-grow overflow-hidden h-full">
            {activeItem.type === 'page' && <BlockEditor item={activeItem} onChange={updates => handleUpdateItem(activeItem.id, updates)} onRestore={v => handleRestoreVersion(v)}/>}
            {activeItem.type === 'pdf' && <PDFViewer item={activeItem} onUpdateAnnotations={ann => handleUpdateAnnotations(ann)}/>}
            {activeItem.type === 'folder' && (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-8 animate-float p-10 overflow-y-auto">
                <div className="p-10 bg-white/5 rounded-full border border-white/10 relative group"><Database size={80} className="text-violet-400/20 transition-transform group-hover:scale-110 duration-700" /><div className="absolute -bottom-2 -right-2 p-3 bg-violet-600 rounded-2xl animate-pulse"><LayoutDashboard size={20} className="text-white" /></div></div>
                <div className="text-center max-w-md"><h3 className="text-3xl font-['Orbitron'] font-bold text-slate-100 uppercase tracking-widest mb-2">{activeItem.name}</h3>
                  <div className="mt-10 grid grid-cols-2 gap-4">
                    <button onClick={() => handleAddItem(activeItem.id, 'page')} className="flex flex-col items-center gap-3 p-6 glass-card rounded-3xl border border-white/10 hover:border-violet-500/50 hover:bg-violet-500/5 group transition-all"><PlusCircle className="text-violet-400 group-hover:scale-110" /><span className="text-[10px] uppercase font-bold tracking-widest">New Page</span></button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-3 p-6 glass-card rounded-3xl border border-white/10 hover:border-violet-500/50 hover:bg-violet-500/5 group transition-all"><Upload className="text-violet-400 group-hover:scale-110" /><span className="text-[10px] uppercase font-bold tracking-widest">Import PDF</span></button>
                    <button onClick={() => handleAddItem(activeItem.id, 'folder')} className="flex flex-col items-center gap-3 p-6 glass-card rounded-3xl border border-white/10 hover:border-violet-500/50 hover:bg-violet-500/5 group transition-all"><Database className="text-violet-400 group-hover:scale-110" /><span className="text-[10px] uppercase font-bold tracking-widest">Subfolder</span></button>
                    <button onClick={() => handleDeleteItem(activeItem.id)} className="flex flex-col items-center gap-3 p-6 glass-card rounded-3xl border border-white/10 hover:border-red-500/50 hover:bg-red-500/5 group transition-all"><Trash2 className="text-red-500 group-hover:scale-110" /><span className="text-[10px] uppercase font-bold tracking-widest text-red-500">Purge Node</span></button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-grow items-center justify-center text-slate-500 p-6"><div className="text-center animate-pulse"><Command size={100} className="mx-auto opacity-5 mb-6" /><h2 className="text-2xl font-['Orbitron'] text-slate-500 mb-2 tracking-[0.4em] uppercase font-bold">Terminal Idle</h2></div></div>
        )}
        <div className="h-12 px-6 glass border-t border-white/5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-6"><div className="flex items-center gap-2 text-[9px] text-slate-500 whitespace-nowrap uppercase font-bold tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]" /> Server: ONLINE</div>{isSyncing && (<div className="flex items-center gap-2 text-[9px] text-violet-400 animate-pulse uppercase font-bold tracking-widest"><RefreshCw size={10} className="animate-spin" /> Persisting global state...</div>)}</div>
          <div className="text-[9px] text-slate-600 font-bold tracking-[0.2em] uppercase">BlizDrive v1.4.8 • Firebase Global Cloud</div>
        </div>
      </main>
    </div>
  );
};

export default App;
