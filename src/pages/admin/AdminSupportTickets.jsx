import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, MessageSquare, CheckCircle, Clock, AlertTriangle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const statusConfig = {
  open:        { label: 'Aberto',       cls: 'bg-red-500/20 text-red-600 border-red-500/30' },
  in_progress: { label: 'Em Andamento', cls: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' },
  resolved:    { label: 'Resolvido',    cls: 'bg-green-500/20 text-green-600 border-green-500/30' },
  closed:      { label: 'Fechado',      cls: 'bg-slate-500/20 text-slate-500 border-slate-500/30' },
};

const typeLabel = {
  not_delivered:       'Não Entregue',
  delivery_confirmed:  'Entrega Confirmada',
  damaged:             'Produto Danificado',
  wrong_item:          'Item Errado',
  other:               'Outro',
};

export default function AdminSupportTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editTicket, setEditTicket] = useState(null);
  const [editForm, setEditForm] = useState({ status: '', admin_notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const data = await base44.entities.SupportTicket.list('-created_date');
    setTickets(data);
    setLoading(false);
  };

  const openEdit = (t) => {
    setEditForm({ status: t.status, admin_notes: t.admin_notes || '' });
    setEditTicket(t);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const update = { status: editForm.status, admin_notes: editForm.admin_notes };
    if (editForm.status === 'resolved' && !editTicket.resolved_at) {
      update.resolved_at = new Date().toISOString();
    }
    await base44.entities.SupportTicket.update(editTicket.id, update);
    // Notificar o associado
    await base44.entities.Notification.create({
      associate_id: editTicket.associate_id,
      title: `Chamado #${editTicket.order_number} Atualizado`,
      message: editForm.status === 'resolved'
        ? `Seu chamado foi resolvido. ${editForm.admin_notes || ''}`
        : `Seu chamado está agora: ${statusConfig[editForm.status]?.label}. ${editForm.admin_notes || ''}`,
      type: 'system',
      is_read: false,
    });
    setEditTicket(null);
    load();
    setSaving(false);
  };

  const filtered = tickets.filter(t => {
    const matchFilter = filter === 'all' || t.status === filter;
    const matchSearch = !search ||
      t.associate_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      String(t.order_number).includes(search);
    return matchFilter && matchSearch;
  });

  const counts = { all: tickets.length, open: 0, in_progress: 0, resolved: 0, closed: 0 };
  tickets.forEach(t => { if (counts[t.status] !== undefined) counts[t.status]++; });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Chamados de Entrega</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie problemas de entrega reportados pelos associados</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { key: 'open', label: 'Abertos', color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
          { key: 'in_progress', label: 'Em Andamento', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
          { key: 'resolved', label: 'Resolvidos', color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
          { key: 'closed', label: 'Fechados', color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' },
        ].map(s => (
          <div key={s.key} className={`rounded-xl p-4 border ${s.bg}`}>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
            <p className={`text-2xl font-black mt-1 ${s.color}`}>{counts[s.key]}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por associado, produto ou nº pedido..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'open', 'in_progress', 'resolved', 'closed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === f ? 'text-white' : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
              style={filter === f ? { background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' } : {}}
            >
              {{ all: 'Todos', open: 'Abertos', in_progress: 'Em Andamento', resolved: 'Resolvidos', closed: 'Fechados' }[f]}
              {f !== 'all' && <span className="ml-1 opacity-70">({counts[f]})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="dark-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-secondary rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <MessageSquare size={32} className="text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground">Nenhum chamado encontrado.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(t => (
              <div key={t.id} className="flex items-start gap-3 p-4 hover:bg-secondary/30 transition-colors">
                <div className={`mt-1 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  t.status === 'open' ? 'bg-red-100' : t.status === 'in_progress' ? 'bg-yellow-100' : 'bg-green-100'
                }`}>
                  {t.status === 'open' ? <AlertTriangle size={14} className="text-red-500" /> :
                   t.status === 'in_progress' ? <Clock size={14} className="text-yellow-600" /> :
                   <CheckCircle size={14} className="text-green-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{t.associate_name}</p>
                    <Badge className={`text-xs ${statusConfig[t.status]?.cls}`}>{statusConfig[t.status]?.label}</Badge>
                    <Badge variant="outline" className="text-xs">{typeLabel[t.type] || t.type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pedido #{t.order_number} · {t.product_name}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(t.created_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  {t.description && (
                    <p className="text-xs text-foreground/70 mt-1 line-clamp-2 italic">"{t.description}"</p>
                  )}
                  {t.admin_notes && (
                    <p className="text-xs text-primary mt-1">📝 {t.admin_notes}</p>
                  )}
                </div>
                <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={() => openEdit(t)}>
                  Tratar
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Tratativa */}
      <Dialog open={!!editTicket} onOpenChange={() => setEditTicket(null)}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-black">Tratar Chamado #{editTicket?.order_number}</DialogTitle>
          </DialogHeader>
          {editTicket && (
            <form onSubmit={save} className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border text-sm space-y-1">
                <p><span className="text-muted-foreground">Associado:</span> <strong>{editTicket.associate_name}</strong></p>
                <p><span className="text-muted-foreground">Produto:</span> {editTicket.product_name}</p>
                <p><span className="text-muted-foreground">Tipo:</span> {typeLabel[editTicket.type]}</p>
                {editTicket.description && <p className="italic text-muted-foreground">"{editTicket.description}"</p>}
              </div>
              <div>
                <Label>Status do Chamado</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Aberto</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="resolved">Resolvido</SelectItem>
                    <SelectItem value="closed">Fechado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observações / Tratativa</Label>
                <Textarea
                  className="mt-1.5"
                  placeholder="Descreva a tratativa realizada, prazo de reenvio, etc."
                  value={editForm.admin_notes}
                  onChange={e => setEditForm(f => ({ ...f, admin_notes: e.target.value }))}
                  rows={3}
                />
              </div>
              <Button type="submit" disabled={saving} className="w-full font-bold text-white" style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }}>
                {saving ? 'Salvando...' : 'Salvar Tratativa'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}