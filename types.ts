
export type ItemType = 'folder' | 'page' | 'pdf';

export interface ContentBlock {
  id: string;
  type: 'text' | 'heading' | 'checklist' | 'link';
  content: string;
  checked?: boolean;
}

export interface Annotation {
  id: string;
  page: number;
  type: 'highlight' | 'draw' | 'note';
  color: string;
  points?: { x: number, y: number }[]; // For freehand drawing
  rect?: { x: number, y: number, w: number, h: number }; // For highlight/note
  text?: string;
}

export interface PageVersion {
  id: string;
  timestamp: number;
  content: ContentBlock[];
  name: string;
}

export interface WorkspaceItem {
  id: string;
  parentId: string | null;
  name: string;
  type: ItemType;
  icon?: string;
  content?: ContentBlock[];
  pdfUrl?: string;
  annotations?: Annotation[];
  children?: string[]; // IDs of children
  history?: PageVersion[];
  createdAt: number;
  updatedAt: number;
}

export interface Tab {
  id: string;
  name: string;
  rootItems: string[];
}

export interface UserSettings {
  background: string;
  accentColor: string;
  userName: string;
  workspaceName: string;
}

export interface WorkspaceState {
  items: Record<string, WorkspaceItem>;
  tabs: Tab[];
  activeTabId: string | null;
  activeItemId: string | null;
  settings: UserSettings;
}
