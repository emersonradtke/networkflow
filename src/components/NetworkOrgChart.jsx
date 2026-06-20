import { useState, useRef, useLayoutEffect } from 'react';
import { Crown, Users } from 'lucide-react';

const NODE_W = 80;
const NODE_H = 90; // avatar + name height estimate
const H_GAP = 16;  // horizontal gap between siblings
const V_GAP = 48;  // vertical gap between levels (space for lines)

// ─── Node component (pure layout, no lines) ───────────────────────────────────
function OrgNode({ member, isSelf, level, getDirects, maxLevel, onToggle, collapsed }) {
  const directs = getDirects(member.id);
  const hasChildren = directs.length > 0 && level < maxLevel;

  const initials = member.full_name
    ? member.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div
      className="flex flex-col items-center select-none"
      style={{ width: NODE_W }}
    >
      <button
        onClick={() => hasChildren && onToggle(member.id)}
        className="flex flex-col items-center focus:outline-none group relative"
        title={member.full_name}
        style={{ width: NODE_W }}
      >
        {/* Avatar */}
        <div className={`
          w-14 h-14 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all
          ${isSelf
            ? 'border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-200'
            : member.status === 'active'
              ? 'border-slate-300 bg-white text-slate-700 shadow group-hover:border-blue-300'
              : 'border-slate-200 bg-slate-100 text-slate-400 opacity-60'}
        `}>
          {isSelf ? <Crown size={20} className="text-white" /> : initials}
        </div>

        {/* Child count badge */}
        {hasChildren && (
          <span className={`absolute top-9 right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-white
            ${collapsed ? 'bg-blue-500 text-white' : 'bg-slate-400 text-white'}`}>
            {directs.length}
          </span>
        )}

        {/* Name */}
        <span className="mt-2 text-[11px] font-semibold text-slate-700 text-center leading-tight w-full truncate px-1">
          {member.full_name?.split(' ')[0]}
        </span>
        {member.status !== 'active' && !isSelf && (
          <span className="text-[9px] text-slate-400">Pendente</span>
        )}
      </button>
    </div>
  );
}

// ─── Recursive tree layout ─────────────────────────────────────────────────────
// Returns a tree of positioned nodes + connector lines, all absolutely positioned.
// Returns { width, nodes: [{member,x,y,isSelf}], lines: [{x1,y1,x2,y2}] }
function layoutTree(member, isSelf, level, getDirects, maxLevel, collapsedSet) {
  const directs = getDirects(member.id);
  const hasChildren = directs.length > 0 && level < maxLevel;
  const isCollapsed = collapsedSet.has(member.id);
  const showChildren = hasChildren && !isCollapsed;

  if (!showChildren) {
    return {
      width: NODE_W,
      nodes: [{ member, x: 0, y: 0, isSelf, level }],
      lines: []
    };
  }

  // Layout children
  const childLayouts = directs.map(child =>
    layoutTree(child, false, level + 1, getDirects, maxLevel, collapsedSet)
  );

  // Total children width
  const childrenTotalWidth = childLayouts.reduce((sum, cl) => sum + cl.width, 0)
    + H_GAP * (childLayouts.length - 1);

  const totalWidth = Math.max(NODE_W, childrenTotalWidth);

  // Center the parent over children
  const parentX = (totalWidth - NODE_W) / 2;
  const parentCenterX = parentX + NODE_W / 2;
  const parentBottomY = NODE_H; // bottom of avatar+name area

  // Position children
  let childOffsetX = (totalWidth - childrenTotalWidth) / 2;
  const nodes = [{ member, x: parentX, y: 0, isSelf, level }];
  const lines = [];

  const childY = parentBottomY + V_GAP;

  childLayouts.forEach((cl, idx) => {
    const childCenterX = childOffsetX + cl.width / 2;

    // Vertical from parent center down to horizontal bar
    const barY = parentBottomY + V_GAP / 2;

    // Vertical from horizontal bar down to child top
    lines.push({ x1: childCenterX, y1: barY, x2: childCenterX, y2: childY });

    // Offset all child nodes/lines
    cl.nodes.forEach(n => nodes.push({ ...n, x: n.x + childOffsetX, y: n.y + childY }));
    cl.lines.forEach(l => lines.push({ x1: l.x1 + childOffsetX, y1: l.y1 + childY, x2: l.x2 + childOffsetX, y2: l.y2 + childY }));

    childOffsetX += cl.width + H_GAP;
  });

  // Horizontal bar connecting all children
  if (childLayouts.length > 1) {
    const firstChildCenterX = (totalWidth - childrenTotalWidth) / 2 + childLayouts[0].width / 2;
    const lastChildCenterX = childOffsetX - H_GAP - childLayouts[childLayouts.length - 1].width / 2;
    const barY = parentBottomY + V_GAP / 2;
    lines.push({ x1: firstChildCenterX, y1: barY, x2: lastChildCenterX, y2: barY });
  }

  // Vertical from parent center down to bar
  const barY = parentBottomY + V_GAP / 2;
  lines.push({ x1: parentCenterX, y1: parentBottomY, x2: parentCenterX, y2: barY });

  // Compute total height
  const childMaxHeight = childLayouts.reduce((max, cl) => Math.max(max, cl.nodes.reduce((m, n) => Math.max(m, n.y), 0)), 0);

  return { width: totalWidth, nodes, lines, height: childY + childMaxHeight + NODE_H };
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function NetworkOrgChart({ associate, network, maxLevel = 5 }) {
  const getDirects = (sponsorId) =>
    network.filter(a => a.sponsor_id === sponsorId && a.status === 'active');

  // Colapsar por padrão todos os nós EXCETO o próprio usuário
  // Assim o organograma mostra só os diretos inicialmente
  const [collapsedSet, setCollapsedSet] = useState(() => {
    const set = new Set();
    // Colapsar todos os filhos diretos (nível 1) — clique para expandir
    const directs = network.filter(a => a.sponsor_id === associate?.id && a.status === 'active');
    directs.forEach(d => set.add(d.id));
    return set;
  });

  const toggleCollapse = (id) => {
    setCollapsedSet(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!associate) return null;

  const directCount = getDirects(associate.id).length;

  if (directCount === 0) {
    return (
      <div className="dark-card rounded-2xl p-4">
        <h3 className="font-bold text-foreground mb-1 flex items-center gap-2">
          <Users size={16} className="text-primary" /> Organograma da Rede
        </h3>
        <div className="text-center py-10 text-muted-foreground">
          <Users size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Você ainda não tem ninguém na rede.</p>
          <p className="text-xs mt-1">Compartilhe seu código de convite para começar.</p>
        </div>
      </div>
    );
  }

  const { width, nodes, lines, height } = layoutTree(
    associate, true, 0, getDirects, maxLevel, collapsedSet
  );

  const canvasW = Math.max(width, NODE_W) + 32;
  const canvasH = (height || NODE_H) + 32;

  return (
    <div className="dark-card rounded-2xl p-4">
      <h3 className="font-bold text-foreground mb-1 flex items-center gap-2">
        <Users size={16} className="text-primary" /> Organograma da Rede
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Clique em um nó para expandir/recolher · {directCount} direto(s) · até {maxLevel} níveis
      </p>

      <div className="overflow-auto pb-2">
        <div className="relative inline-block" style={{ width: canvasW, height: canvasH }}>
          {/* SVG connector lines */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={canvasW}
            height={canvasH}
            style={{ overflow: 'visible' }}
          >
            {lines.map((l, i) => (
              <line
                key={i}
                x1={l.x1 + 16}
                y1={l.y1 + 16}
                x2={l.x2 + 16}
                y2={l.y2 + 16}
                stroke="#CBD5E1"
                strokeWidth={1.5}
              />
            ))}
          </svg>

          {/* Nodes */}
          {nodes.map((n, i) => (
            <div
              key={n.member.id + '-' + i}
              className="absolute"
              style={{ left: n.x + 16, top: n.y + 16 }}
            >
              <OrgNode
                member={n.member}
                isSelf={n.isSelf}
                level={n.level}
                getDirects={getDirects}
                maxLevel={maxLevel}
                onToggle={toggleCollapse}
                collapsed={collapsedSet.has(n.member.id)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/50 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-blue-600 border-2 border-blue-500" />
          <span className="text-xs text-muted-foreground">Você</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-white border-2 border-slate-300" />
          <span className="text-xs text-muted-foreground">Ativo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-slate-100 border-2 border-slate-200 opacity-70" />
          <span className="text-xs text-muted-foreground">Pendente</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[9px] flex items-center justify-center font-bold border border-white">3</span>
          <span className="text-xs text-muted-foreground">= recolhido (clique para expandir)</span>
        </div>
      </div>
    </div>
  );
}