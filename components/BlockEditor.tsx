
import React, { useState } from 'react';
import { WorkspaceItem, ContentBlock, PageVersion } from '../types';
import { CheckSquare, Square, Type, Hash, Trash2, History, RotateCcw, X } from 'lucide-react';

interface BlockEditorProps {
  item: WorkspaceItem;
  onChange: (updates: Partial<WorkspaceItem>) => void;
  onRestore: (version: PageVersion) => void;
}

export const BlockEditor: React.FC<BlockEditorProps> = ({ item, onChange, onRestore }) => {
  const [showHistory, setShowHistory] = useState(false);
  const blocks = item.content || [];

  const updateBlock = (blockId: string, updates: Partial<ContentBlock>) => {
    const newBlocks = blocks.map(b => b.id === blockId ? { ...b, ...updates } : b);
    onChange({ content: newBlocks });
  };

  const addBlock = (type: ContentBlock['type']) => {
    const newBlock: ContentBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content: '',
      checked: false
    };
    onChange({ content: [...blocks, newBlock] });
  };

  const removeBlock = (blockId: string) => {
    onChange({ content: blocks.filter(b => b.id !== blockId) });
  };

  const saveVersion = () => {
    const newVersion: PageVersion = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      content: JSON.parse(JSON.stringify(blocks)),
      name: item.name
    };
    const history = [newVersion, ...(item.history || [])].slice(0, 10);
    onChange({ history });
    alert("Version saved!");
  };

  return (
    <div className="relative h-full flex flex-col">
      <div className="max-w-4xl mx-auto w-full p-4 md:p-12 animate-in fade-in slide-in-from-bottom-4 duration-700 flex-grow">
        <div className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex-grow">
            <input 
              value={item.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="bg-transparent text-3xl md:text-4xl font-bold w-full outline-none text-slate-100 focus:text-white transition-colors"
              placeholder="Untitled Page"
            />
            <div className="h-1 w-20 bg-violet-500 rounded-full mt-4 blur-[1px]"></div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={saveVersion}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-card hover:bg-white/10 text-xs text-slate-300 transition-all border border-white/5"
            >
              Save Version
            </button>
            <button 
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-card hover:bg-white/10 text-xs text-slate-300 transition-all border border-white/5"
            >
              <History size={14} /> History
            </button>
          </div>
        </div>

        <div className="space-y-4 md:space-y-6">
          {blocks.map((block) => (
            <div key={block.id} className="group flex items-start gap-2 md:gap-3 w-full">
              <div className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button 
                  onClick={() => removeBlock(block.id)}
                  className="p-1 hover:bg-white/10 rounded text-slate-500 hover:text-red-400"
                 >
                   <Trash2 size={14} />
                 </button>
              </div>

              <div className="flex-grow">
                {block.type === 'heading' && (
                  <input 
                    value={block.content}
                    onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                    className="bg-transparent text-xl md:text-2xl font-semibold w-full outline-none text-slate-200"
                    placeholder="Heading..."
                  />
                )}
                {block.type === 'text' && (
                  <textarea 
                    value={block.content}
                    onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                    className="bg-transparent text-base md:text-lg text-slate-300 w-full outline-none resize-none min-h-[1.5rem]"
                    placeholder="Start typing..."
                    rows={Math.max(1, block.content.split('\n').length)}
                  />
                )}
                {block.type === 'checklist' && (
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => updateBlock(block.id, { checked: !block.checked })}
                      className={`p-0.5 rounded transition-colors ${block.checked ? 'text-violet-400' : 'text-slate-500'}`}
                    >
                      {block.checked ? <CheckSquare size={20} /> : <Square size={20} />}
                    </button>
                    <input 
                      value={block.content}
                      onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                      className={`bg-transparent text-base md:text-lg w-full outline-none transition-all ${block.checked ? 'text-slate-500 line-through' : 'text-slate-300'}`}
                      placeholder="Checklist item..."
                    />
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Action Bar */}
          <div className="mt-12 pt-6 border-t border-white/10 flex flex-wrap items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
            <button onClick={() => addBlock('text')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white text-xs md:text-sm transition-all">
              <Type size={16} /> Text
            </button>
            <button onClick={() => addBlock('heading')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white text-xs md:text-sm transition-all">
              <Hash size={16} /> Heading
            </button>
            <button onClick={() => addBlock('checklist')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white text-xs md:text-sm transition-all">
              <CheckSquare size={16} /> Checklist
            </button>
          </div>
        </div>
      </div>

      {/* History Side Panel */}
      {showHistory && (
        <div className="absolute inset-y-0 right-0 w-full md:w-80 glass z-50 animate-in slide-in-from-right duration-300 border-l border-white/10 shadow-2xl flex flex-col">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-bold text-slate-200 flex items-center gap-2"><History size={18} /> History</h3>
            <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-white/10 rounded"><X size={20} /></button>
          </div>
          <div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {(!item.history || item.history.length === 0) ? (
              <div className="text-center text-slate-500 py-10 text-sm">No versions saved yet.</div>
            ) : (
              item.history.map((version) => (
                <div key={version.id} className="p-3 glass-card rounded-xl border border-white/5 space-y-2 group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{new Date(version.timestamp).toLocaleString()}</span>
                    <button 
                      onClick={() => onRestore(version)}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 transition-all"
                    >
                      <RotateCcw size={10} /> Restore
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{version.content.length} blocks • {version.name}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
