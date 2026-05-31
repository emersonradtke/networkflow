import { useState } from 'react';
import { Crown, Users } from 'lucide-react';

const NODE_WIDTH = 80;
const NODE_GAP = 12;

function OrgNode({ member, isSelf, children = [], level = 0, getDirects, maxLevel }) {
  const [collapsed, setCollapsed] = useState(level >= 2);

  const directs = getDirects(member.id);
  const hasChildren = directs.length > 0 && level < maxLevel;
  const showChildren = hasChildren && !collapsed;

  const initials = member.full_name
    ? member.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div className="flex flex-col items-center select-none">
      {/* Node */}
      <div className="flex flex-col items-center" style={{ width: NODE_WIDTH }}>
        <button
          onClick={() => hasChildren && setCollapsed(c => !c)}
          className={`relative flex flex-col items-center group focus:outline-none`}
          title={member.full_name}
        >
          {/* Avatar circle */}
          <div className={`
            w-14 h-14 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all
            ${isSelf
              ? 'border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-200'
              : member.status === 'active'
                ? 'border-slate-300 bg-white text-slate-700 shadow group-hover:border-blue-300 group-hover:shadow-blue-100'
                : 'border-slate-200 bg-slate-100 text-slate-400 opacity-70'}
          `}>
            {isSelf ? <Crown size={20} className="text-white" /> : initials}
          </div>

          {/* Count badge */}
          {hasChildren && (
            <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center border border-white
              ${collapsed ? 'bg-blue-500 text-white' : 'bg-slate-500 text-white'}`}>
              {directs.length}
            </span>
          )}

          {/* Name label */}
          <span className="mt-2 text-[11px] font-semibold text-slate-700 text-center leading-tight max-w-[76px] truncate">
            {member.full_name?.split(' ')[0]}
          </span>
          {member.status !== 'active' && !isSelf && (
            <span className="text-[9px] text-slate-400">Pendente</span>
          )}
        </button>
      </div>

      {/* Children */}
      {showChildren && (
        <>
          {/* Vertical line down from parent */}
          <div className="w-px bg-slate-300 mt-1" style={{ height: 20 }} />

          {/* Horizontal bar + children */}
          <div className="relative flex items-start">
            {/* Horizontal connector line */}
            {directs.length > 1 && (
              <div
                className="absolute top-0 bg-slate-300"
                style={{
                  left: NODE_WIDTH / 2 + NODE_GAP / 2,
                  right: NODE_WIDTH / 2 + NODE_GAP / 2,
                  height: 2,
                  transform: 'translateX(-50%)',
                  width: `calc(100% - ${NODE_WIDTH + NODE_GAP}px)`,
                  marginLeft: (NODE_WIDTH + NODE_GAP) / 2,
                }}
              />
            )}

            <div className="flex gap-3 pt-0">
              {directs.map((child, idx) => (
                <div key={child.id} className="flex flex-col items-center">
                  {/* Vertical line up to horizontal bar */}
                  <div className="w-px bg-slate-300" style={{ height: 20 }} />
                  <OrgNode
                    member={child}
                    isSelf={false}
                    level={level + 1}
                    getDirects={getDirects}
                    maxLevel={maxLevel}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Collapsed indicator */}
      {hasChildren && collapsed && (
        <div className="mt-1 flex flex-col items-center">
          <div className="w-px bg-slate-200" style={{ height: 10 }} />
          <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200">
            +{directs.length}
          </span>
        </div>
      )}
    </div>
  );
}

export default function NetworkOrgChart({ associate, network, maxLevel = 5 }) {
  const getDirects = (sponsorId) =>
    network.filter(a => a.sponsor_id === sponsorId && a.status === 'active');

  if (!associate) return null;

  const directCount = getDirects(associate.id).length;

  return (
    <div className="dark-card rounded-2xl p-4">
      <h3 className="font-bold text-foreground mb-1 flex items-center gap-2">
        <Users size={16} className="text-primary" /> Organograma da Rede
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Clique em um nó para expandir/recolher · {directCount} direto(s) · até {maxLevel} níveis
      </p>

      {directCount === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Users size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Você ainda não tem ninguém na rede.</p>
          <p className="text-xs mt-1">Compartilhe seu código de convite para começar.</p>
        </div>
      ) : (
        <div className="overflow-auto pb-4">
          <div className="inline-flex flex-col items-center min-w-full pt-2">
            <OrgNode
              member={associate}
              isSelf={true}
              level={0}
              getDirects={getDirects}
              maxLevel={maxLevel}
            />
          </div>
        </div>
      )}

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