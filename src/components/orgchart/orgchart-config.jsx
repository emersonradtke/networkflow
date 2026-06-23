// ─── Status config ────────────────────────────────────────────────────────────
export const STATUS_CONFIG = {
  active:            { label: 'Ativo',      color: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-300' },
  pending:           { label: 'Pendente',   color: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50',  border: 'border-yellow-300' },
  inactive:          { label: 'Inativo',    color: 'bg-slate-400',  text: 'text-slate-500',  bg: 'bg-slate-50',   border: 'border-slate-200' },
  blocked:           { label: 'Bloqueado',  color: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-300' },
  awaiting_placement:{ label: 'Aguardando', color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-300' },
};

// ─── Display modes ─────────────────────────────────────────────────────────────
export const PAGE_SIZE = 20;

export function getDisplayMode(visibleCount) {
  if (visibleCount <= 5)  return 'normal';
  if (visibleCount <= 15) return 'compact';
  if (visibleCount <= 30) return 'mini';
  return 'micro';
}

export const NODE_DIMS = {
  normal:  { w: 120, h: 108 },
  compact: { w: 88,  h: 84  },
  mini:    { w: 64,  h: 64  },
  micro:   { w: 44,  h: 48  },
};

export const GAPS = {
  normal:  { h: 28, v: 64 },
  compact: { h: 16, v: 50 },
  mini:    { h: 8,  v: 38 },
  micro:   { h: 4,  v: 28 },
};