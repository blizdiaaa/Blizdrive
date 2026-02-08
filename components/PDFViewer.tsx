
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Maximize2, Minimize2, ZoomIn, ZoomOut, Download, FileText, 
  AlertCircle, Layers, MousePointer2, Highlighter, 
  StickyNote, Layout, Trash2, Search, X, PenTool, ChevronDown, ChevronUp
} from 'lucide-react';
import { WorkspaceItem, Annotation } from '../types';

interface PDFViewerProps {
  item: WorkspaceItem;
  onUpdateAnnotations: (annotations: Annotation[]) => void;
}

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ item, onUpdateAnnotations }) => {
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<'pages' | 'annotations' | 'search'>('pages');
  const [tool, setTool] = useState<'select' | 'highlight' | 'draw' | 'note'>('select');
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 1024);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{page: number, text: string}[]>([]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    const initPdf = async () => {
      if (!item.pdfUrl) return;
      setLoading(true);
      setError(false);
      try {
        let pdfData: any = item.pdfUrl;
        if (pdfData.startsWith('data:')) {
          const base64 = pdfData.split(',')[1];
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
          pdfData = bytes;
        }
        
        const loadingTask = window.pdfjsLib.getDocument({ 
          data: pdfData,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
        });
        
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setLoading(false);
      } catch (err) {
        console.error('PDF Load Error:', err);
        setError(true);
        setLoading(false);
      }
    };

    if (!window.pdfjsLib) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        initPdf();
      };
      document.body.appendChild(script);
    } else {
      initPdf();
    }
  }, [item.pdfUrl]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !pdfDoc) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.getAttribute('data-page') || '1');
            setCurrentPage(pageNum);
          }
        });
      },
      { root: container, threshold: 0.1 }
    );

    Object.values(pageRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [pdfDoc, loading]);

  const scrollToPage = (num: number) => {
    pageRefs.current[num]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSearch = async () => {
    if (!pdfDoc || !searchQuery) return;
    const results = [];
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map((it: any) => it.str).join(' ');
      if (text.toLowerCase().includes(searchQuery.toLowerCase())) {
        results.push({ page: i, text: text.substring(0, 100) + '...' });
      }
    }
    setSearchResults(results);
  };

  const addAnnotation = (newAnn: Annotation) => {
    onUpdateAnnotations([...(item.annotations || []), newAnn]);
  };

  const removeAnnotation = (id: string) => {
    onUpdateAnnotations((item.annotations || []).filter(a => a.id !== id));
  };

  return (
    <div className={`flex flex-col h-full bg-slate-950/90 ${isFullscreen ? 'fixed inset-0 z-[100]' : 'relative'}`}>
      <header className="glass h-16 flex items-center justify-between px-4 md:px-6 border-b border-white/10 z-30 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => setShowSidebar(!showSidebar)} className={`p-2 rounded-lg transition-all ${showSidebar ? 'bg-violet-500/20 text-violet-400' : 'text-slate-400'}`}>
            <Layout size={18} />
          </button>
          <span className="text-sm font-medium text-slate-200 truncate max-w-[200px]">{item.name}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center bg-white/5 rounded-xl p-1 border border-white/10 gap-1">
            <button onClick={() => setTool('select')} className={`p-1.5 rounded-lg ${tool === 'select' ? 'bg-violet-500 text-white' : 'text-slate-400'}`} title="Selection Tool"><MousePointer2 size={16}/></button>
            <button onClick={() => setTool('highlight')} className={`p-1.5 rounded-lg ${tool === 'highlight' ? 'bg-violet-500 text-white' : 'text-slate-400'}`} title="Highlighter"><Highlighter size={16}/></button>
            <button onClick={() => setTool('draw')} className={`p-1.5 rounded-lg ${tool === 'draw' ? 'bg-violet-500 text-white' : 'text-slate-400'}`} title="Pen Tool"><PenTool size={16}/></button>
            <button onClick={() => setTool('note')} className={`p-1.5 rounded-lg ${tool === 'note' ? 'bg-violet-500 text-white' : 'text-slate-400'}`} title="Sticky Note"><StickyNote size={16}/></button>
          </div>
          <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10 ml-2">
            <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="p-1.5 text-slate-400"><ZoomOut size={16}/></button>
            <span className="text-[10px] text-slate-200 font-mono w-10 text-center">{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(300, z + 10))} className="p-1.5 text-slate-400"><ZoomIn size={16}/></button>
          </div>
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 text-slate-400"><Maximize2 size={18}/></button>
        </div>
      </header>

      <div className="flex flex-grow overflow-hidden relative">
        {showSidebar && (
          <aside className="w-64 glass border-r border-white/10 flex flex-col flex-shrink-0 z-20">
            <div className="flex border-b border-white/5 p-2 gap-1">
              <button onClick={() => setActiveTab('pages')} className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest ${activeTab === 'pages' ? 'bg-white/10 text-violet-400' : 'text-slate-500'}`}>Pages</button>
              <button onClick={() => setActiveTab('search')} className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest ${activeTab === 'search' ? 'bg-white/10 text-violet-400' : 'text-slate-500'}`}>Search</button>
              <button onClick={() => setActiveTab('annotations')} className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest ${activeTab === 'annotations' ? 'bg-white/10 text-violet-400' : 'text-slate-500'}`}>Notes</button>
            </div>
            <div className="flex-grow overflow-y-auto custom-scrollbar p-3">
              {activeTab === 'pages' && pdfDoc && (
                <div className="space-y-3">
                  {Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1).map(num => (
                    <div key={num} onClick={() => scrollToPage(num)} className={`cursor-pointer group rounded-lg overflow-hidden border ${currentPage === num ? 'border-violet-500' : 'border-white/5'} bg-black/40 p-1`}>
                      <Thumbnail pageNumber={num} pdfDoc={pdfDoc} />
                      <div className="text-[8px] text-center text-slate-500 mt-1 uppercase font-bold">Page {num}</div>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'search' && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input 
                      value={searchQuery} 
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                      placeholder="Search PDF..." 
                      className="flex-grow bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-violet-500"
                    />
                    <button onClick={handleSearch} className="p-2 bg-violet-600 rounded-lg"><Search size={14}/></button>
                  </div>
                  <div className="space-y-2">
                    {searchResults.map((res, i) => (
                      <div key={i} onClick={() => scrollToPage(res.page)} className="p-2 bg-white/5 rounded-lg border border-white/5 cursor-pointer hover:bg-white/10">
                        <div className="text-[9px] text-violet-400 font-bold mb-1">PAGE {res.page}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-2">{res.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'annotations' && (
                <div className="space-y-3">
                  {(item.annotations || []).length === 0 && <div className="text-center py-10 text-[10px] text-slate-500 uppercase font-bold tracking-widest opacity-50">Zero Records Found</div>}
                  {(item.annotations || []).map(ann => (
                    <div key={ann.id} className="p-2 bg-white/5 rounded-lg border border-white/5 group relative">
                      <div className="flex justify-between items-start">
                        <span className="text-[8px] font-bold text-violet-400 uppercase">Page {ann.page} • {ann.type}</span>
                        <button onClick={() => removeAnnotation(ann.id)} className="text-slate-600 hover:text-red-400"><Trash2 size={12}/></button>
                      </div>
                      <p className="text-[10px] text-slate-300 mt-1">{ann.text || 'Manual Notation'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}

        <div ref={scrollContainerRef} className="flex-grow overflow-y-auto bg-slate-900/40 flex flex-col items-center py-10 gap-10 custom-scrollbar scroll-smooth">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
              <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Initializing Stream...</p>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <AlertCircle size={40} className="text-red-500/30 mb-2" />
              <p className="text-slate-500 text-sm font-['Orbitron'] tracking-widest">Archive Link Broken</p>
            </div>
          ) : pdfDoc && (
            Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1).map(num => (
              <div 
                key={num} 
                data-page={num}
                ref={el => { pageRefs.current[num] = el; }}
                className="relative bg-white shadow-2xl transition-all"
                style={{ width: `${zoom}%`, maxWidth: '900px' }}
              >
                <PDFPage 
                  pageNumber={num} 
                  pdfDoc={pdfDoc} 
                  zoom={zoom} 
                  tool={tool}
                  annotations={(item.annotations || []).filter(a => a.page === num)}
                  onAddAnnotation={(data) => addAnnotation({
                    id: Math.random().toString(36).substr(2, 9),
                    page: num,
                    type: tool as any,
                    color: tool === 'highlight' ? 'rgba(139, 92, 246, 0.4)' : '#8b5cf6',
                    ...data
                  })}
                />
              </div>
            ))
          )}
          <div className="h-40 flex-shrink-0" />
        </div>
      </div>
    </div>
  );
};

const PDFPage: React.FC<{ 
  pageNumber: number, 
  pdfDoc: any, 
  zoom: number, 
  tool: string, 
  annotations: Annotation[],
  onAddAnnotation: (data: any) => void 
}> = ({ pageNumber, pdfDoc, zoom, tool, annotations, onAddAnnotation }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    let isCancelled = false;
    const render = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        const canvas = canvasRef.current;
        if (!canvas || isCancelled) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        // Increased quality factor (2.0) for crisp text on high-res displays
        const scale = (zoom / 100) * dpr * 2.0; 
        const viewport = page.getViewport({ scale });
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.style.width = '100%';
        canvas.style.height = 'auto';

        if (renderTaskRef.current) renderTaskRef.current.cancel();

        renderTaskRef.current = page.render({ canvasContext: ctx, viewport: viewport });
        await renderTaskRef.current.promise;
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') console.error(err);
      }
    };
    render();
    return () => { isCancelled = true; };
  }, [pdfDoc, pageNumber, zoom]);

  const handleInteraction = (e: React.MouseEvent) => {
    if (tool === 'select') return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Strict boundary check to prevent accidental triggers on margins
    if (x < 0.01 || x > 0.99 || y < 0.01 || y > 0.99) return;

    if (tool === 'note') {
      const text = prompt("Enter Holographic Signature:");
      if (text && text.trim()) onAddAnnotation({ rect: { x, y, w: 0.1, h: 0.05 }, text });
    } else if (tool === 'highlight') {
      // Small logic to ensure we aren't just clicking background
      onAddAnnotation({ rect: { x: x - 0.05, y: y - 0.01, w: 0.1, h: 0.02 } });
    }
  };

  return (
    <div ref={containerRef} onClick={handleInteraction} className={`relative group ${tool !== 'select' ? 'cursor-crosshair' : 'cursor-text'}`}>
      <canvas ref={canvasRef} className="block w-full" />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {annotations.map(ann => (
          ann.rect && (
            <div 
              key={ann.id} 
              className={`absolute transition-all ${ann.type === 'highlight' ? 'bg-violet-400/30 border border-violet-500/20 blur-[1px]' : 'bg-white/95 shadow-[0_10px_30px_rgba(0,0,0,0.3)] rounded-lg p-2 text-[10px] text-slate-900 border-2 border-violet-500 backdrop-blur-md'}`}
              style={{
                left: `${ann.rect.x * 100}%`,
                top: `${ann.rect.y * 100}%`,
                width: ann.type === 'highlight' ? `${ann.rect.w * 100}%` : 'auto',
                height: ann.type === 'highlight' ? `${ann.rect.h * 100}%` : 'auto',
                minWidth: ann.type === 'note' ? '140px' : 'none',
                zIndex: ann.type === 'note' ? 50 : 10
              }}
            >
              {ann.text}
            </div>
          )
        ))}
      </div>
    </div>
  );
};

const Thumbnail: React.FC<{ pageNumber: number, pdfDoc: any }> = ({ pageNumber, pdfDoc }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const render = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const viewport = page.getViewport({ scale: 0.4 }); // High-fidelity thumbnails
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
      } catch (e) {}
    };
    render();
  }, [pdfDoc, pageNumber]);
  return <canvas ref={canvasRef} className="w-full grayscale opacity-40 group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-500" />;
};
