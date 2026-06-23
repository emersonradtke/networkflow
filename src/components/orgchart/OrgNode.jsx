import { useState } from 'react';
import { Crown, Loader2 } from 'lucide-react';
import { STATUS_CONFIG, NODE_DIMS } from './orgchart-config';

function NodeTooltip({ member, directs }) {
  const sc = STATUS_CONFIG[member.status] || STATUS_CONFIG.inactive;
  return (
    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-xs pointer-events-none whitespace-normal">
      <p className="font-bold text-slate-800 truncate">{member.full_name}</p>
      {member.email && <p className="text-slate-500 truncate mt-0.5">{member.email}</p>}
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className={`w-2 h-2 rounded-full shrink-0 ${sc.color}`} />
        <span className={`font-medium ${sc.text}`}>{sc.label}</span>
      </div>
      <div className="mt-1.5 text-slate-600 space-y-0.5">
        <div>Diretos: <strong>{directs}</strong></div>
        {member.invite_code && <div className="font-mono text-[10px]">#{member.invite_code}</div>}
        {member.city && <div className="truncate">{member.city}{member.state ? `, ${member.state}` : ''}</div>}
        {member.level_in_network != null && <div>Nível na rede: <strong>{member.level_in_network}</strong></div>}
      </div>
    </div>
  );
}

export default function OrgNode({ nodeId, isSelf, level, mode, member, directCount, isExpanded, isLoading, onToggle }) {
  const [hovered, setHovered] = useState(false);
  if (!member) return null;

  const sc = STATUS_CONFIG[member.status] || STATUS_CONFIG.inactive;
  const initials = member.full_name
    ? member.full_name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  const { w: NW, h: NH } = NODE_DIMS[mode];
  const hasChildren = directCount > 0;

  return (
    <div
      className="absolute select-none"
      style={{ width: NW, height: NH }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={() => hasChildren && onToggle(nodeId)}
        className={`relative flex flex-col items-center w-full h-full focus:outline-none group transition-transform duration-150
          ${hasChildren ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'}`}
      >
        {/* ── NORMAL mode ── */}
        {mode === 'normal' && (
          <>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all
              ${isSelf
                ? 'border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-100'
                : `${sc.border} bg-white text-slate-700 shadow-sm group-hover:border-blue-300`}`}>
              {isSelf ? <Crown size={18} className="text-white" /> : initials}
            </div>
            <span className="mt-1.5 text-[10px] font-semibold text-slate-700 text-center leading-tight w-full truncate px-1">
              {member.full_name?.split(' ')[0]}
            </span>
            <span className={`text-[9px] font-medium ${sc.text}`}>{sc.label}</span>
            {hasChildren && (
              <span className="text-[9px] text-slate-400 mt-0.5">
                {directCount} {directCount === 1 ? 'direto' : 'diretos'}
              </span>
            )}
          </>
        )}

        {/* ── COMPACT mode ── */}
        {mode === 'compact' && (
          <>
            <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all
              ${isSelf ? 'border-blue-500 bg-blue-600 text-white' : `${sc.border} bg-white text-slate-700`}`}>
              {isSelf ? <Crown size={13} /> : initials}
            </div>
            <span className="mt-1 text-[9px] font-semibold text-slate-700 w-full truncate text-center px-0.5 leading-tight">
              {member.full_name?.split(' ')[0]}
            </span>
            <span className={`w-2 h-2 rounded-full mt-0.5 ${sc.color}`} title={sc.label} />
          </>
        )}

        {/* ── MINI mode ── */}
        {mode === 'mini' && (
          <>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-[11px] border transition-all
              ${isSelf ? 'border-blue-500 bg-blue-600 text-white' : `${sc.border} bg-white text-slate-700`}`}>
              {isSelf ? <Crown size={11} /> : initials}
            </div>
            <span className={`w-1.5 h-1.5 rounded-full mt-1 ${sc.color}`} />
          </>
        )}

        {/* ── MICRO mode ── */}
        {mode === 'micro' && (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] border transition-all
            ${isSelf ? 'border-blue-500 bg-blue-600 text-white' : `${sc.border} bg-white text-slate-600`}`}>
            {isSelf ? <Crown size={10} /> : initials}
          </div>
        )}

        {/* Expand/collapse badge */}
        {hasChildren && (
          <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center border border-white z-10
            ${isExpanded ? 'bg-slate-400 text-white' : 'bg-blue-500 text-white'}`}>
            {isExpanded ? '−' : '+'}
          </span>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-full">
            <Loader2 size={14} className="animate-spin text-blue-500" />
          </span>
        )}
      </button>

      {/* Tooltip on hover */}
      {hovered && <NodeTooltip member={member} directs={directCount} />}
    </div>
  );
}