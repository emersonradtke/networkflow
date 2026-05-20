import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Users, ChevronDown, ChevronRight, Crown, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Network() {
  const { associate } = useOutletContext();
  const [network, setNetwork] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (associate?.id) loadNetwork();
  }, [associate]);

  const loadNetwork = async () => {
    const configs = await base44.entities.NetworkConfig.list();
    if (configs.length > 0) setConfig(configs[0]);

    const allAssociates = await base44.entities.Associate.list();
    setNetwork(allAssociates);
    setLoading(false);
  };

  const getDirects = (sponsorId) => network.filter(a => a.sponsor_id === sponsorId && a.status === 'active');

  const NetworkNode = ({ member, level = 1, maxLevel }) => {
    const [expanded, setExpanded] = useState(level <= 2);
    const directs = getDirects(member.id);
    const hasChildren = directs.length > 0;

    if (level > maxLevel) return null;

    return (
      <div className="animate-fade-up">
        <div
          className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
            member.id === associate?.id
              ? 'border-blue-300 bg-blue-50'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
          onClick={() => hasChildren && setExpanded(!expanded)}
        >
          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
            member.id === associate?.id ? 'gold-gradient text-background' : 'bg-secondary text-foreground'
          }`}>
            {member.id === associate?.id ? <Crown size={16} /> : member.full_name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{member.full_name}</p>
            <p className="text-xs text-slate-500">Nível {level} · {directs.length} diretos</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={member.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-secondary text-muted-foreground'}>
              {member.status === 'active' ? 'Ativo' : 'Pendente'}
            </Badge>
            {hasChildren && level < maxLevel && (
              expanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />
            )}
          </div>
        </div>

        {expanded && hasChildren && level < maxLevel && (
          <div className="ml-6 mt-1 pl-3 border-l border-border/50 space-y-1">
            {directs.map(d => (
              <NetworkNode key={d.id} member={d} level={level + 1} maxLevel={maxLevel} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const countInNetwork = () => {
    const traverse = (id, depth, max) => {
      if (depth > max) return 0;
      const directs = network.filter(a => a.sponsor_id === id && a.status === 'active');
      return directs.length + directs.reduce((sum, d) => sum + traverse(d.id, depth + 1, max), 0);
    };
    return traverse(associate?.id, 1, config?.max_levels || 5);
  };

  if (!associate || associate.status !== 'active') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Users size={40} className="text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Ative sua conta para ver sua rede.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Minha Rede</h1>
        <p className="text-muted-foreground text-sm mt-1">Estrutura da sua rede de associados</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="dark-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total na Rede</p>
          <p className="text-2xl font-black text-foreground mt-1">{loading ? '...' : countInNetwork()}</p>
        </div>
        <div className="dark-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Níveis Ativos</p>
          <p className="text-2xl font-black text-primary mt-1">{config?.max_levels || 5}</p>
        </div>
      </div>

      <div className="dark-card rounded-2xl p-4">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <Users size={16} className="text-primary" /> Árvore da Rede
        </h3>
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-14 bg-secondary rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-1">
            <NetworkNode member={associate} level={0} maxLevel={config?.max_levels || 5} />
          </div>
        )}
      </div>
    </div>
  );
}