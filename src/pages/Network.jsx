import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Users, ChevronDown, ChevronRight, Crown, TrendingUp, ShoppingBag, CheckCircle, XCircle, Clock, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export default function Network() {
  const { associate } = useOutletContext();
  const [network, setNetwork] = useState([]);
  const [orders, setOrders] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('tree'); // 'tree' | 'list'

  useEffect(() => {
    if (associate?.id) loadData();
  }, [associate]);

  const loadData = async () => {
    const [allAssocs, allOrders, allComms, configs] = await Promise.all([
      base44.entities.Associate.list(),
      base44.entities.Order.filter({ status: 'paid' }),
      base44.entities.Commission.filter({ beneficiary_id: associate.id }),
      base44.entities.NetworkConfig.list(),
    ]);
    setNetwork(allAssocs);
    setOrders(allOrders);
    setCommissions(allComms);
    if (configs.length > 0) setConfig(configs[0]);
    setLoading(false);
  };

  const getDirects = (sponsorId) => network.filter(a => a.sponsor_id === sponsorId && a.status === 'active');

  // Calcular consumo mensal de um associado
  const getMonthlyConsumption = (assocId) => {
    const now = new Date();
    return orders
      .filter(o => o.associate_id === assocId &&
        new Date(o.created_date).getMonth() === now.getMonth() &&
        new Date(o.created_date).getFullYear() === now.getFullYear())
      .reduce((s, o) => s + (o.amount || 0), 0);
  };

  // Comissão gerada por um associado para mim
  const getCommissionFromMember = (assocId) => {
    return commissions
      .filter(c => c.originator_id === assocId)
      .reduce((s, c) => s + (c.commission_amount || 0), 0);
  };

  const countInNetwork = () => {
    const traverse = (id, depth, max) => {
      if (depth > max) return 0;
      const directs = network.filter(a => a.sponsor_id === id && a.status === 'active');
      return directs.length + directs.reduce((sum, d) => sum + traverse(d.id, depth + 1, max), 0);
    };
    return traverse(associate?.id, 1, config?.max_levels || 5);
  };

  // Todos os membros da rede (flat list)
  const getAllNetworkMembers = () => {
    const result = [];
    const traverse = (id, level, max) => {
      if (level > max) return;
      const directs = network.filter(a => a.sponsor_id === id && a.status === 'active');
      directs.forEach(d => {
        result.push({ ...d, networkLevel: level });
        traverse(d.id, level + 1, max);
      });
    };
    traverse(associate?.id, 1, config?.max_levels || 5);
    return result;
  };

  const NetworkNode = ({ member, level = 1, maxLevel }) => {
    const [expanded, setExpanded] = useState(level <= 2);
    const directs = getDirects(member.id);
    const hasChildren = directs.length > 0;
    const monthlyConsumption = getMonthlyConsumption(member.id);
    const commissionFromMember = getCommissionFromMember(member.id);
    const isSelf = member.id === associate?.id;

    if (level > maxLevel) return null;

    return (
      <div>
        <div
          className={`border rounded-xl transition-all ${isSelf ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'} ${hasChildren && level < maxLevel ? 'cursor-pointer' : ''}`}
          onClick={() => hasChildren && level < maxLevel && setExpanded(!expanded)}
        >
          <div className="flex items-start gap-3 p-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${isSelf ? 'gold-gradient text-background' : 'bg-secondary text-foreground'}`}>
              {isSelf ? <Crown size={15} /> : member.full_name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-slate-800">{member.full_name}</p>
                {member.invite_code && (
                  <span className="text-xs font-mono bg-secondary text-primary px-1.5 py-0.5 rounded shrink-0">#{member.invite_code}</span>
                )}
                <Badge className={member.status === 'active' ? 'bg-green-500/20 text-green-600 border-green-500/30' : 'bg-secondary text-muted-foreground'}>
                  {member.status === 'active' ? 'Ativo' : 'Pendente'}
                </Badge>
              </div>
              <div className="flex gap-3 mt-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground">Nível {level} · {directs.length} diretos</span>
                {monthlyConsumption > 0 && (
                  <span className="text-xs flex items-center gap-1 text-blue-600">
                    <ShoppingBag size={10} /> R$ {monthlyConsumption.toFixed(2)}/mês
                  </span>
                )}
                {commissionFromMember > 0 && (
                  <span className="text-xs flex items-center gap-1 text-green-600">
                    <TrendingUp size={10} /> +R$ {commissionFromMember.toFixed(2)} comissão
                  </span>
                )}
              </div>
              {member.email && <p className="text-xs text-muted-foreground mt-0.5">{member.email}</p>}
            </div>
            {hasChildren && level < maxLevel && (
              <div className="shrink-0 mt-2">
                {expanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
              </div>
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

  if (!associate || associate.status !== 'active') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Users size={40} className="text-muted-foreground mb-4 opacity-40" />
        <h2 className="text-lg font-bold text-foreground mb-2">Rede Bloqueada</h2>
        <p className="text-muted-foreground">Ative sua conta para ver sua rede.</p>
      </div>
    );
  }

  const allMembers = getAllNetworkMembers();
  const activeMembers = allMembers.filter(m => m.status === 'active');

  const filteredMembers = allMembers.filter(m =>
    !search || m.full_name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalMonthlyConsumption = activeMembers.reduce((s, m) => s + getMonthlyConsumption(m.id), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Minha Rede</h1>
        <p className="text-muted-foreground text-sm mt-1">Estrutura e performance da sua rede de associados</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="dark-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total na Rede</p>
          <p className="text-2xl font-black text-foreground mt-1">{loading ? '...' : countInNetwork()}</p>
        </div>
        <div className="dark-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Ativos</p>
          <p className="text-2xl font-black text-green-600 mt-1">{loading ? '...' : activeMembers.length}</p>
        </div>
        <div className="dark-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Consumo / Mês</p>
          <p className="text-2xl font-black text-primary mt-1">R$ {totalMonthlyConsumption.toFixed(0)}</p>
        </div>
        <div className="dark-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Níveis Configurados</p>
          <p className="text-2xl font-black text-foreground mt-1">{config?.max_levels || 5}</p>
        </div>
      </div>

      {/* Toggle view */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('tree')}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${view === 'tree' ? 'gold-gradient text-background' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
        >
          Árvore
        </button>
        <button
          onClick={() => setView('list')}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${view === 'list' ? 'gold-gradient text-background' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
        >
          Lista Detalhada
        </button>
      </div>

      {/* Árvore */}
      {view === 'tree' && (
        <div className="dark-card rounded-2xl p-4">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Users size={16} className="text-primary" /> Árvore da Rede
          </h3>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-secondary rounded-xl animate-pulse" />)}</div>
          ) : (
            <div className="space-y-1">
              <NetworkNode member={associate} level={0} maxLevel={config?.max_levels || 5} />
            </div>
          )}
        </div>
      )}

      {/* Lista detalhada */}
      {view === 'list' && (
        <div className="dark-card rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Users size={16} className="text-primary" /> Todos os Associados
            </h3>
            <span className="text-xs text-muted-foreground">{filteredMembers.length} encontrado(s)</span>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nome ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {loading ? (
            <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-secondary rounded-xl animate-pulse" />)}</div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users size={32} className="text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">Nenhum associado encontrado.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMembers.map(member => {
                const monthly = getMonthlyConsumption(member.id);
                const commissionFromMember = getCommissionFromMember(member.id);
                return (
                  <div key={member.id} className="border border-slate-200 rounded-xl p-4 bg-white">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-secondary text-foreground shrink-0">
                        {member.full_name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-800 text-sm">{member.full_name}</p>
                          <Badge className={member.status === 'active' ? 'bg-green-500/20 text-green-600 border-green-500/30 text-xs' : 'bg-red-500/20 text-red-600 border-red-500/30 text-xs'}>
                            {member.status === 'active' ? 'Ativo' : 'Inativo'}
                          </Badge>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">Nível {member.networkLevel}</span>
                        </div>
                        {member.email && <p className="text-xs text-muted-foreground mt-0.5">{member.email}</p>}
                        {member.phone && <p className="text-xs text-muted-foreground">{member.phone}</p>}
                        <div className="flex gap-4 mt-2 flex-wrap">
                          <div className="text-xs">
                            <span className="text-muted-foreground">Consumo mensal: </span>
                            <span className={`font-semibold ${monthly > 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>
                              R$ {monthly.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-xs">
                            <span className="text-muted-foreground">Comissão para mim: </span>
                            <span className={`font-semibold ${commissionFromMember > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                              R$ {commissionFromMember.toFixed(2)}
                            </span>
                          </div>
                          {member.city && (
                            <div className="text-xs text-muted-foreground">{member.city}{member.state ? ` / ${member.state}` : ''}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}