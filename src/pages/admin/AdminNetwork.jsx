import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, TrendingUp, Crown, ChevronRight, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AdminNetwork() {
  const [associates, setAssociates] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoot, setSelectedRoot] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [assocs, configs] = await Promise.all([
      base44.entities.Associate.filter({ status: 'active' }),
      base44.entities.NetworkConfig.list(),
    ]);
    setAssociates(assocs);
    if (configs.length > 0) setConfig(configs[0]);
    setLoading(false);
  };

  const roots = associates.filter(a => !a.sponsor_id);
  const getChildren = (id) => associates.filter(a => a.sponsor_id === id);

  const NetworkNode = ({ member, level = 1, maxLevel }) => {
    const [expanded, setExpanded] = useState(level <= 2);
    const children = getChildren(member.id);
    const hasChildren = children.length > 0;

    if (level > maxLevel) return null;

    return (
      <div>
        <div
          className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all cursor-pointer mb-1"
          onClick={() => hasChildren && setExpanded(!expanded)}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
            level === 1 ? 'gold-gradient text-background' : 'bg-secondary text-foreground'
          }`}>
            {level === 1 ? <Crown size={14} /> : member.full_name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{member.full_name}</p>
            <p className="text-xs text-slate-500">{children.length} diretos · Nível {level}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Ativo</Badge>
            {hasChildren && level < maxLevel && (
              expanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />
            )}
          </div>
        </div>

        {expanded && hasChildren && level < maxLevel && (
          <div className="ml-6 pl-3 border-l border-border/50 space-y-1">
            {children.map(c => (
              <NetworkNode key={c.id} member={c} level={level + 1} maxLevel={maxLevel} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const totalActive = associates.length;
  const totalCommissions = associates.reduce((s, a) => s + (a.total_earned || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Rede Completa</h1>
        <p className="text-muted-foreground text-sm mt-1">Visualize toda a estrutura de associados</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="dark-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Ativos</p>
          <p className="text-2xl font-black text-foreground mt-1">{totalActive}</p>
        </div>
        <div className="dark-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Níveis Configurados</p>
          <p className="text-2xl font-black text-primary mt-1">{config?.max_levels || 5}</p>
        </div>
        <div className="dark-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Comissões Distribuídas</p>
          <p className="text-2xl font-black text-green-400 mt-1">R$ {totalCommissions.toFixed(2)}</p>
        </div>
      </div>

      <div className="dark-card rounded-2xl p-5">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <Users size={16} className="text-primary" /> Árvore da Rede
        </h3>
        {loading ? (
          <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-secondary rounded-xl animate-pulse" />)}</div>
        ) : roots.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">Nenhum associado ativo ainda.</p>
        ) : (
          <div className="space-y-1">
            {roots.map(r => (
              <NetworkNode key={r.id} member={r} level={1} maxLevel={config?.max_levels || 5} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}