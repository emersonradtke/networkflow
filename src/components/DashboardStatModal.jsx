import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/date-utils';
import { Wallet, TrendingUp, Users, Gift, ArrowUpCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

const statusConfig = {
  pending:  { label: 'Pendente',  cls: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Aprovado',  cls: 'bg-blue-100 text-blue-700' },
  paid:     { label: 'Pago',      cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejeitado', cls: 'bg-red-100 text-red-700' },
  active:   { label: 'Ativo',     cls: 'bg-green-100 text-green-700' },
  inactive: { label: 'Inativo',   cls: 'bg-slate-100 text-slate-600' },
  blocked:  { label: 'Bloqueado', cls: 'bg-red-100 text-red-700' },
  credited: { label: 'Creditado', cls: 'bg-green-100 text-green-700' },
  cancelled:{ label: 'Cancelado', cls: 'bg-red-100 text-red-700' },
};

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{title}</p>
      {children}
    </div>
  );
}

function EmptyState({ text }) {
  return <p className="text-sm text-muted-foreground text-center py-4">{text}</p>;
}

// ── Saldo ──────────────────────────────────────────────────────────────────────
function SaldoDetail({ associate }) {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.WithdrawalRequest.filter({ associate_id: associate.id }, '-created_date', 10)
      .then(r => { setWithdrawals(r); setLoading(false); });
  }, [associate.id]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Saldo Disponível', value: `R$ ${(associate.wallet_balance || 0).toFixed(2)}`, color: 'text-primary' },
          { label: 'Total Ganho',      value: `R$ ${(associate.total_earned || 0).toFixed(2)}`,   color: 'text-green-600' },
          { label: 'Total Sacado',     value: `R$ ${(associate.total_withdrawn || 0).toFixed(2)}`, color: 'text-slate-700' },
        ].map(i => (
          <div key={i.label} className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">{i.label}</p>
            <p className={`text-base font-black ${i.color}`}>{i.value}</p>
          </div>
        ))}
      </div>

      <Section title="Últimos Saques">
        {loading ? <div className="h-10 bg-slate-100 rounded animate-pulse" /> :
         withdrawals.length === 0 ? <EmptyState text="Nenhum saque solicitado ainda." /> : (
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {withdrawals.map(w => {
              const s = statusConfig[w.status] || statusConfig.pending;
              return (
                <div key={w.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                  <div>
                    <p className="text-sm font-bold text-foreground">R$ {w.amount?.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(w.created_date)}</p>
                  </div>
                  <Badge className={s.cls}>{s.label}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Total Ganho ────────────────────────────────────────────────────────────────
function TotalGanhoDetail({ associate }) {
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Commission.filter({ beneficiary_id: associate.id }, '-created_date', 30)
      .then(r => { setCommissions(r); setLoading(false); });
  }, [associate.id]);

  const totalCredited = commissions.filter(c => c.status === 'credited').reduce((s, c) => s + (c.commission_amount || 0), 0);
  const totalPending  = commissions.filter(c => c.status === 'pending').reduce((s, c) => s + (c.commission_amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Creditado</p>
          <p className="text-base font-black text-green-600">R$ {totalCredited.toFixed(2)}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Pendente</p>
          <p className="text-base font-black text-yellow-600">R$ {totalPending.toFixed(2)}</p>
        </div>
      </div>

      <Section title="Histórico de Comissões (últimas 30)">
        {loading ? <div className="h-10 bg-slate-100 rounded animate-pulse" /> :
         commissions.length === 0 ? <EmptyState text="Nenhuma comissão registrada." /> : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {commissions.map(c => {
              const s = statusConfig[c.status] || statusConfig.pending;
              return (
                <div key={c.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{c.product_name}</p>
                    <p className="text-xs text-muted-foreground">Nível {c.network_level} · {c.originator_name} · {formatDate(c.created_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">+R$ {c.commission_amount?.toFixed(2)}</p>
                    <Badge className={`${s.cls} text-xs mt-0.5`}>{s.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Diretos ────────────────────────────────────────────────────────────────────
function DiretosDetail({ associate }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Associate.filter({ sponsor_id: associate.id }, '-created_date')
      .then(r => { setMembers(r); setLoading(false); });
  }, [associate.id]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total',    value: members.length,                                        color: 'text-primary' },
          { label: 'Ativos',   value: members.filter(m => m.status === 'active').length,     color: 'text-green-600' },
          { label: 'Pendentes',value: members.filter(m => m.status === 'pending').length,    color: 'text-yellow-600' },
        ].map(i => (
          <div key={i.label} className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">{i.label}</p>
            <p className={`text-xl font-black ${i.color}`}>{loading ? '...' : i.value}</p>
          </div>
        ))}
      </div>

      <Section title="Membros Diretos">
        {loading ? <div className="h-10 bg-slate-100 rounded animate-pulse" /> :
         members.length === 0 ? <EmptyState text="Nenhum membro direto ainda. Compartilhe seu link!" /> : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {members.map(m => {
              const s = statusConfig[m.status] || { label: m.status, cls: 'bg-slate-100 text-slate-600' };
              return (
                <div key={m.id} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0"
                    style={{ background: 'linear-gradient(135deg,#1B2A5E,#3B9EE2)' }}>
                    {m.full_name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{m.full_name}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(m.created_date)}</p>
                  </div>
                  <Badge className={s.cls}>{s.label}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Pontos ─────────────────────────────────────────────────────────────────────
function PontosDetail({ associate }) {
  return (
    <div className="space-y-4">
      <div className="bg-purple-50 rounded-2xl p-5 text-center">
        <Gift size={32} className="text-purple-500 mx-auto mb-2" />
        <p className="text-3xl font-black text-purple-700">{(associate.total_pontos || 0).toLocaleString('pt-BR')}</p>
        <p className="text-sm text-muted-foreground mt-1">Pontos acumulados</p>
      </div>
      <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm text-slate-600">
        <p>• Pontos são ganhos a cada compra realizada na loja.</p>
        <p>• Quanto mais pontos, maiores os benefícios na rede.</p>
        {associate.has_boldlife_card && (
          <p className="text-purple-700 font-semibold">• Você possui o Cartão BoldLife ativo! 🎉</p>
        )}
      </div>
    </div>
  );
}

// ── Modal principal ────────────────────────────────────────────────────────────
const modalConfig = {
  saldo:       { title: 'Detalhes do Saldo',        icon: Wallet,     component: SaldoDetail },
  totalGanho:  { title: 'Detalhes dos Ganhos',       icon: TrendingUp, component: TotalGanhoDetail },
  diretos:     { title: 'Membros Diretos',           icon: Users,      component: DiretosDetail },
  pontos:      { title: 'Detalhes dos Pontos',       icon: Gift,       component: PontosDetail },
};

export default function DashboardStatModal({ type, associate, onClose }) {
  if (!type || !associate) return null;
  const cfg = modalConfig[type];
  if (!cfg) return null;
  const Icon = cfg.icon;
  const Detail = cfg.component;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-black">
            <Icon size={18} className="text-primary" /> {cfg.title}
          </DialogTitle>
        </DialogHeader>
        <Detail associate={associate} />
      </DialogContent>
    </Dialog>
  );
}