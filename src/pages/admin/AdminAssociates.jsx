import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, UserCheck, UserX, User, CheckCircle, XCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export default function AdminAssociates() {
  const [associates, setAssociates] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAssociates(); }, []);

  const loadAssociates = async () => {
    const data = await base44.entities.Associate.list('-created_date');
    setAssociates(data);
    setLoading(false);
  };

  const activate = async (id) => {
    await base44.entities.Associate.update(id, { status: 'active', adhesion_paid: true });
    await base44.entities.Notification.create({
      associate_id: id,
      title: 'Conta Ativada! 🎉',
      message: 'Seu pagamento foi confirmado. Bem-vindo à Bold Life! Acesse a loja e comece a ganhar.',
      type: 'activation',
      is_read: false,
    });
    loadAssociates();
  };

  const block = async (id) => {
    await base44.entities.Associate.update(id, { status: 'blocked' });
    loadAssociates();
  };

  const unblock = async (id) => {
    await base44.entities.Associate.update(id, { status: 'active' });
    loadAssociates();
  };

  const statusBadge = (status) => {
    const map = {
      pending: { label: 'Pendente', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      active: { label: 'Ativo', cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
      blocked: { label: 'Bloqueado', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
      inactive: { label: 'Inativo', cls: 'bg-secondary text-muted-foreground' },
    };
    const s = map[status] || map.inactive;
    return <Badge className={s.cls}>{s.label}</Badge>;
  };

  const filtered = associates
    .filter(a => filter === 'all' || a.status === filter)
    .filter(a =>
      a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.email?.toLowerCase().includes(search.toLowerCase()) ||
      a.cpf?.includes(search)
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Associados</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie todos os membros da rede</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 bg-secondary border-border text-foreground"
            placeholder="Buscar por nome, email ou CPF..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'active', 'blocked'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === f ? 'gold-gradient text-background' : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendentes' : f === 'active' ? 'Ativos' : 'Bloqueados'}
            </button>
          ))}
        </div>
      </div>

      <div className="dark-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-secondary rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Nenhum associado encontrado.</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors">
                <div className="w-10 h-10 gold-gradient rounded-full flex items-center justify-center font-bold text-background shrink-0">
                  {a.full_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{a.full_name}</p>
                  <p className="text-xs text-muted-foreground">{a.email}</p>
                  {a.sponsor_name && (
                    <p className="text-xs text-muted-foreground">Patrocinador: <span className="text-primary">{a.sponsor_name}</span></p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {statusBadge(a.status)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronDown size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-surface border-border">
                      {a.status === 'pending' && (
                        <DropdownMenuItem onClick={() => activate(a.id)} className="text-green-400 gap-2">
                          <CheckCircle size={14} /> Ativar
                        </DropdownMenuItem>
                      )}
                      {a.status === 'active' && (
                        <DropdownMenuItem onClick={() => block(a.id)} className="text-red-400 gap-2">
                          <XCircle size={14} /> Bloquear
                        </DropdownMenuItem>
                      )}
                      {a.status === 'blocked' && (
                        <DropdownMenuItem onClick={() => unblock(a.id)} className="text-green-400 gap-2">
                          <CheckCircle size={14} /> Desbloquear
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}