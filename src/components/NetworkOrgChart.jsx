import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Users, ZoomIn, ZoomOut, Crosshair, Search, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import OrgNode from './orgchart/OrgNode';
import { layoutTree } from './orgchart/orgchart-layout';
import { STATUS_CONFIG, NODE_DIMS, GAPS, PAGE_SIZE, getDisplayMode } from './orgchart/orgchart-config';

const CANVAS_PAD = 48;

export default function NetworkOrgChart({ associate, network, maxLevel = 5 }) {
  const containerRef = useRef(null);

  // ── State ──────────────────────────────────────────────────────────────────
  const [expandedSet, setExpandedSet] = useState(() => new Set());
  const [pageMap, setPageMap] = useState({});
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [highlightId, setHighlightId] = useState(null);
  const [levelFilter, setLevelFilter] = useState(maxLevel);
  const touchRef = useRef({ lastDist: null, lastPan: null });

  // ── Derived maps ───────────────────────────────────────────────────────────
  const memberMap = useMemo(() => {
    const m = {};
    network.forEach(a => { m[a.id] = a; });
    if (associate) m[associate.id] = associate;
    return m;
  }, [network, associate]);

  const childrenMap = useMemo(() => {
    const m = {};
    network.forEach(a => {
      if (!a.sponsor_id) return;
      if (!m[a.sponsor_id]) m[a.sponsor_id] = [];
      m[a.sponsor_id].push(a);
    });
    return m;
  }, [network]);

  const getChildren = useCallback((id) =>
    (childrenMap[id] || []).filter(a => a.status === 'active'),
  [childrenMap]);

  // ── Visible node count (for display mode) ─────────────────────────────────
  const countVisible = useCallback((id, depth) => {
    if (depth > levelFilter) return 0;
    if (!expandedSet.has(id)) return 1;
    const ch = getChildren(id);
    const page = pageMap[id] || 1;
    return 1 + ch.slice(0, page * PAGE_SIZE).reduce((s, c) => s + countVisible(c.id, depth + 1), 0);
  }, [expandedSet, pageMap, getChildren, levelFilter]);

  const visibleCount = useMemo(() =>
    associate ? countVisible(associate.id, 0) : 0,
  [associate, countVisible]);

  const mode = getDisplayMode(visibleCount);
  const { w: NW, h: NH } = NODE_DIMS[mode];

  // ── Layout ─────────────────────────────────────────────────────────────────
  const layout = useMemo(() => {
    if (!associate) return null;
    return layoutTree(associate.id, true, 0, levelFilter, getChildren, expandedSet, pageMap, mode);
  }, [associate, getChildren, expandedSet, pageMap, mode, levelFilter]);

  const canvasW = (layout?.width  || NW) + CANVAS_PAD * 2;
  const canvasH = (layout?.height || NH) + CANVAS_PAD * 2;

  // ── Fit-to-view helper ─────────────────────────────────────────────────────
  const fitView = useCallback(() => {
    if (!containerRef.current) return;
    const { offsetWidth: cw, offsetHeight: ch } = containerRef.current;
    const fitZoom = Math.max(0.15, Math.min(1, Math.min(cw / canvasW, ch / canvasH) * 0.88));
    setZoom(fitZoom);
    setPan({ x: (cw - canvasW * fitZoom) / 2, y: Math.max(8, (ch - canvasH * fitZoom) / 2) });
  }, [canvasW, canvasH]);

  // Center on mount
  useEffect(() => { fitView(); }, [associate?.id]);

  // Auto-fit after expand/collapse
  useEffect(() => { fitView(); }, [expandedSet, pageMap, levelFilter]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleToggle = useCallback((id) => {
    setExpandedSet(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleShowMore = useCallback((nodeId) => {
    setPageMap(prev => ({ ...prev, [nodeId]: (prev[nodeId] || 1) + 1 }));
  }, []);

  const adjustZoom = (delta) => setZoom(z => Math.min(2.5, Math.max(0.1, z + delta)));

  // Pan
  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  const onMouseMove = (e) => { if (isPanning) setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y }); };
  const onMouseUp = () => setIsPanning(false);

  // Wheel zoom
  const onWheel = (e) => { e.preventDefault(); adjustZoom(e.deltaY < 0 ? 0.1 : -0.1); };

  // Touch
  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchRef.current.lastDist = Math.sqrt(dx * dx + dy * dy);
    } else {
      touchRef.current.lastPan = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y };
    }
  };
  const onTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 2 && touchRef.current.lastDist != null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      adjustZoom((dist - touchRef.current.lastDist) * 0.005);
      touchRef.current.lastDist = dist;
    } else if (e.touches.length === 1 && touchRef.current.lastPan) {
      setPan({ x: e.touches[0].clientX - touchRef.current.lastPan.x, y: e.touches[0].clientY - touchRef.current.lastPan.y });
    }
  };
  const onTouchEnd = () => { touchRef.current = { lastDist: null, lastPan: null }; };

  // Search
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const q = search.toLowerCase();
    setSearchResults(network.filter(a =>
      a.full_name?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.invite_code?.toLowerCase().includes(q)
    ).slice(0, 8));
  }, [search, network]);

  const focusNode = (member) => {
    setHighlightId(member.id);
    setSearch('');
    setSearchResults([]);
    // Expand path to found node
    const path = [];
    let cur = memberMap[member.sponsor_id];
    while (cur && cur.id !== associate?.id) {
      path.push(cur.id);
      cur = memberMap[cur.sponsor_id];
    }
    if (associate) path.push(associate.id);
    setExpandedSet(prev => {
      const next = new Set(prev);
      path.forEach(id => next.add(id));
      return next;
    });
    setTimeout(() => setHighlightId(null), 3000);
  };

  // ── Early returns ──────────────────────────────────────────────────────────
  if (!associate || associate.status !== 'active') return null;

  const directCount = getChildren(associate.id).length;
  if (directCount === 0) {
    return (
      <div className="dark-card rounded-2xl p-6 text-center">
        <Users size={36} className="mx-auto mb-3 opacity-30 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Você ainda não tem ninguém na rede.</p>
        <p className="text-xs text-muted-foreground mt-1">Compartilhe seu código de convite para começar.</p>
      </div>
    );
  }

  const levelOptions = [...new Set([1, 2, 3, 5, maxLevel])].filter(l => l <= maxLevel);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="dark-card rounded-2xl overflow-hidden flex flex-col">

      {/* ── Top controls ─────────────────────────────────────────────────── */}
      <div className="p-2.5 border-b border-border/50 flex flex-wrap items-center gap-2">
        {/* Title */}
        <div className="flex items-center gap-1.5">
          <Users size={14} className="text-primary" />
          <span className="font-bold text-sm text-foreground">Organograma</span>
          <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
            {visibleCount} nós · {mode}
          </span>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[150px] max-w-xs">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-7 h-7 text-xs"
            placeholder="Buscar nome, e-mail, código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => { setSearch(''); setSearchResults([]); }} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X size={11} className="text-muted-foreground" />
            </button>
          )}
          {/* Search dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
              {searchResults.map(r => {
                const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.inactive;
                return (
                  <button key={r.id} onClick={() => focusNode(r)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 border-b border-slate-100 last:border-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${sc.color}`} />
                    <span className="text-xs font-medium text-slate-700 truncate">{r.full_name}</span>
                    {r.invite_code && <span className="text-[10px] text-slate-400 font-mono ml-auto shrink-0">#{r.invite_code}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Level filter */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Nível:</span>
          {levelOptions.map(l => (
            <button key={l} onClick={() => setLevelFilter(l)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${levelFilter === l ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => adjustZoom(0.15)} className="w-7 h-7 flex items-center justify-center rounded bg-secondary hover:bg-secondary/70 transition" title="Zoom +">
            <ZoomIn size={13} />
          </button>
          <span className="text-[10px] text-muted-foreground w-9 text-center font-mono">{Math.round(zoom * 100)}%</span>
          <button onClick={() => adjustZoom(-0.15)} className="w-7 h-7 flex items-center justify-center rounded bg-secondary hover:bg-secondary/70 transition" title="Zoom −">
            <ZoomOut size={13} />
          </button>
          <button onClick={fitView} className="w-7 h-7 flex items-center justify-center rounded bg-secondary hover:bg-secondary/70 transition ml-0.5" title="Centralizar">
            <Crosshair size={13} />
          </button>
        </div>
      </div>

      {/* ── Legend ───────────────────────────────────────────────────────── */}
      <div className="px-3 py-1 border-b border-border/30 flex gap-3 flex-wrap items-center">
        {Object.entries(STATUS_CONFIG).slice(0, 4).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${v.color}`} />
            <span className="text-[10px] text-muted-foreground">{v.label}</span>
          </div>
        ))}
        <span className="text-[10px] text-muted-foreground ml-auto hidden sm:block">
          Clique para expandir · Arraste · Scroll para zoom
        </span>
      </div>

      {/* ── Canvas ───────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="relative overflow-hidden bg-slate-50/60"
        style={{ height: 520, cursor: isPanning ? 'grabbing' : 'grab', touchAction: 'none' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: canvasW,
            height: canvasH,
            position: 'relative',
          }}
        >
          {/* SVG connector lines */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={canvasW} height={canvasH}
            style={{ overflow: 'visible' }}
          >
            {layout?.lines.map((l, i) => (
              <line key={i}
                x1={l.x1 + CANVAS_PAD} y1={l.y1 + CANVAS_PAD}
                x2={l.x2 + CANVAS_PAD} y2={l.y2 + CANVAS_PAD}
                stroke="#CBD5E1" strokeWidth={1.2} strokeDasharray="4 3"
              />
            ))}
          </svg>

          {/* Nodes */}
          {layout?.nodes.map((n, i) => {
            const member = memberMap[n.id];
            const children = getChildren(n.id);
            const isHighlighted = highlightId === n.id;
            return (
              <div
                key={n.id + '-' + i}
                className={`absolute ${isHighlighted ? 'ring-2 ring-blue-500 ring-offset-2 rounded-full animate-pulse' : ''}`}
                style={{ left: n.x + CANVAS_PAD, top: n.y + CANVAS_PAD, width: NW }}
              >
                <OrgNode
                  nodeId={n.id}
                  isSelf={n.isSelf}
                  level={n.level}
                  mode={mode}
                  member={member}
                  directCount={children.length}
                  isExpanded={expandedSet.has(n.id)}
                  isLoading={false}
                  onToggle={handleToggle}
                />
              </div>
            );
          })}

          {/* "Show more" pagination buttons */}
          {layout?.extraButtons.map((btn, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); handleShowMore(btn.nodeId); }}
              className="absolute flex items-center gap-1 px-2.5 py-1 bg-white border border-primary/30 text-primary text-[10px] font-bold rounded-full shadow hover:bg-primary/5 transition"
              style={{ left: btn.x + CANVAS_PAD, top: btn.y + CANVAS_PAD }}
            >
              <Plus size={9} />
              Mostrar mais ({btn.shown} de {btn.total})
            </button>
          ))}
        </div>

        {/* ── Minimap ───────────────────────────────────────────────────── */}
        <Minimap canvasW={canvasW} canvasH={canvasH} pan={pan} zoom={zoom} containerRef={containerRef} />
      </div>
    </div>
  );
}

function Minimap({ canvasW, canvasH, pan, zoom, containerRef }) {
  const MM_W = 110, MM_H = 76;
  const scaleX = MM_W / canvasW;
  const scaleY = MM_H / canvasH;

  const vpW  = Math.min(MM_W, ((containerRef.current?.offsetWidth  || 600) / (canvasW * zoom)) * MM_W);
  const vpH  = Math.min(MM_H, ((containerRef.current?.offsetHeight || 520) / (canvasH * zoom)) * MM_H);
  const vpX  = Math.max(0, Math.min(MM_W - vpW, (-pan.x / (canvasW * zoom)) * MM_W));
  const vpY  = Math.max(0, Math.min(MM_H - vpH, (-pan.y / (canvasH * zoom)) * MM_H));

  return (
    <div className="absolute bottom-3 right-3 rounded-lg shadow border border-slate-200 bg-white/80 overflow-hidden" style={{ width: MM_W, height: MM_H }}>
      <div className="w-full h-full bg-slate-100 relative">
        <div className="absolute bg-blue-400/30 border border-blue-400 rounded" style={{ left: vpX, top: vpY, width: Math.max(4, vpW), height: Math.max(4, vpH) }} />
      </div>
      <p className="absolute bottom-0.5 left-0 right-0 text-center text-[8px] text-slate-400">minimap</p>
    </div>
  );
}