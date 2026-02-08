import React, { useState } from 'react';
// Added Edit3 to the imports from lucide-react
import { Folder, FileText, ChevronRight, ChevronDown, File as FileIcon, Plus, Palette, Check, Trash2, Edit3 } from 'lucide-react';
import { WorkspaceItem, WorkspaceState } from '../types';

interface TreeItemProps {
  itemId: string;
  state: WorkspaceState;
  onSelect: (id: string) => void;
  onAdd: (parentId: string, type: 'folder' | 'page' | 'pdf') => void;
  onMove: (itemId: string, newParentId: string | null) => void;
  onUpdate: (itemId: string, updates: Partial<WorkspaceItem>) => void;
  onDelete: (itemId: string) => void;
  depth: number;
}

const COLOR_OPTIONS = [
  { name: 'Default', value: 'transparent' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Emerald', value: '#10b981' },
];

export const TreeItem: React.FC<TreeItemProps> = ({ itemId, state, onSelect, onAdd, onMove, onUpdate, onDelete, depth }) => {
  const item = state.items[itemId];
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [editName, setEditName] = useState(item?.name || '');
  const [isOver, setIsOver] = useState(false);

  if (!item) return null;

  const isActive = state.activeItemId === itemId;
  const isFolder = item.type === 'folder';

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (editName.trim()) {
      onUpdate(itemId, { name: editName });
    }
    setIsEditing(false);
  };

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('itemId', itemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent) => {
    if (isFolder) {
      e.preventDefault();
      setIsOver(true);
    }
  };

  const onDragLeave = () => {
    setIsOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    if (isFolder) {
      e.preventDefault();
      e.stopPropagation();
      setIsOver(false);
      const draggedId = e.dataTransfer.getData('itemId');
      if (draggedId && draggedId !== itemId) {
        onMove(draggedId, itemId);
      }
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Delete button clicked for item:', itemId, item.name);
    // Call onDelete which will show confirmation in App.tsx
    onDelete(itemId);
  };

  const Icon = isFolder ? Folder : (item.type === 'pdf' ? FileIcon : FileText);
  const accentColor = item.icon || 'transparent'; 

  return (
    <div className="select-none">
      <div 
        draggable={!isEditing && !isCustomizing}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => onSelect(itemId)}
        className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 border-l-2 ${
          isActive 
            ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(139,92,246,0.15)]' 
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
        } ${isOver ? 'border-violet-500 bg-violet-500/20 scale-[1.02]' : 'border-transparent'}`}
        style={{ marginLeft: `${depth * 14}px`, borderLeftColor: accentColor !== 'transparent' ? accentColor : 'transparent' }}
      >
        <div className="flex items-center gap-1 w-full overflow-hidden">
          {isFolder && (
            <button onClick={toggleOpen} className="p-0.5 hover:bg-white/10 rounded transition-colors">
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
          {!isFolder && <div className="w-4" />}
          
          <Icon size={16} className={isActive ? 'text-violet-400' : 'text-slate-500'} />
          
          {isEditing ? (
            <form onSubmit={handleRename} className="flex-grow flex items-center gap-1 min-w-0" onClick={e => e.stopPropagation()}>
              <input 
                autoFocus
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={handleRename}
                className="bg-white/10 border-none text-xs text-white w-full outline-none px-1 rounded font-medium"
              />
              <Check size={12} className="text-violet-400" />
            </form>
          ) : (
            <span className="truncate text-sm font-medium flex-grow">{item.name}</span>
          )}
        </div>
        
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => { e.stopPropagation(); setIsCustomizing(!isCustomizing); }}
            className={`p-1 hover:bg-white/20 rounded transition-colors ${isCustomizing ? 'text-violet-400' : ''}`}
            title="Color Tag"
          >
            <Palette size={12} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); setEditName(item.name); }}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Rename"
          >
            <Edit3 size={12} />
          </button>
          <button 
            onClick={handleDelete}
            className="p-1 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded transition-colors"
            title="Delete Archive"
          >
            <Trash2 size={12} />
          </button>
          {isFolder && (
            <button 
              onClick={(e) => { e.stopPropagation(); onAdd(itemId, 'page'); }}
              className="p-1 hover:bg-white/20 rounded text-violet-400 transition-transform active:scale-90"
              title="Add Page"
            >
              <Plus size={14} />
            </button>
          )}
        </div>
      </div>

      {isCustomizing && (
        <div 
          className="flex gap-2 p-2 mx-4 mb-2 glass-card rounded-xl animate-in slide-in-from-top-2 duration-200"
          style={{ marginLeft: `${depth * 14 + 20}px` }}
          onClick={e => e.stopPropagation()}
        >
          {COLOR_OPTIONS.map(opt => (
            <button 
              key={opt.value}
              onClick={() => { onUpdate(itemId, { icon: opt.value }); setIsCustomizing(false); }}
              className={`w-4 h-4 rounded-full border border-white/20 hover:scale-110 transition-transform ${opt.value === 'transparent' ? 'bg-slate-800' : ''}`}
              style={{ backgroundColor: opt.value }}
              title={opt.name}
            />
          ))}
          <button onClick={() => setIsCustomizing(false)} className="ml-auto text-[10px] text-slate-500 hover:text-white px-2">Close</button>
        </div>
      )}

      {isFolder && isOpen && item.children && (
        <div className="mt-1">
          {item.children.map(childId => (
            <TreeItem 
              key={childId} 
              itemId={childId} 
              state={state} 
              onSelect={onSelect} 
              onAdd={onAdd}
              onMove={onMove}
              onUpdate={onUpdate}
              onDelete={onDelete}
              depth={depth + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
};