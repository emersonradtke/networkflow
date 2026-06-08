import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Target, CheckCircle2, Clock, X, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export default function AdminMonthlyActivationWidget({ networkConfig }) {
  const [data, setData] = useState({ completed: [], pending: [] });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'completed' | 'pending'

  const target = networkConfig?.monthly_activation_amount || 0;

  useEffect(() => {
    if (target > 0) loadData();
    else setLoading(false);
  }, [target]);

  const loadData = async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const [associates, allOrders, allProofs] = await Promise.all([
        base44.entities.Associate.filter({ status: 'active' }),
        base44.entities.Order.filter({ status: 'paid' }),
        base44.entities.CardSpendingProof.filter({ month: currentMonth, status: 'approved' }),
      ]);

      const thisMonthOrders = allOrders.filter(o => o.created_date >= startOfMonth);

      const spentByAssociate = {};
      thisMonthOrders.forEach(o => {
        spentByAssociate[o.associate_id] = (spentByAssociate[o.associate_id] || 0) + (o.amount || 0);
      });
      allProofs.forEach(p => {
        spentByAssociate[p.associate_id] = (spentByAssociate[p.associate_id] || 0) + (p.spending_amount || 0);
      });

      const completed = [];
      const pending = [];

      associates.forEach(a => {
        const spent = spentByAssociate[a.id] || 0;
        const percent = Math.min(100, (spent / target) * 100);
        const item = { ...a, monthly_spent: spent, percent };
        if (spent >= target) completed.push(item);
        else pending.push(item);
      });

      // Ordena pendentes por % decrescente (mais próximos primeiro)
      pending.sort((a, b) => b.percent - a.percent);

      setData({ completed, pending });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  if (!target || target <= 0) return null;

  const now = new Date();
  const monthName = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const total = data.completed.length + data.pending.length;
  const completedPercent = total > 0 ? Math.round((data.completed.length / total) * 100) : 0;

  return (
    <>
      <div className="dark-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <Target size={18} className="text-[#1B2A5E]" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm">Ativação Mensal</h3>
              <p className="text-xs text-muted-foreground capitalize">Meta: R$ {target.toFixed(2)} · {monthName}</p>
            </div>
          </div>
          {!loading && (
            <span className="text-2xl font-black text-foreground">{completedPercent}%</span>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            <div className="h-8 bg-secondary rounded-lg animate-pulse" />
            <div className="h-8 bg-secondary rounded-lg animate-pulse" />
          </div>
        ) : (
          <>
            {/* Barra geral */}
            <div>
              <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#1B2A5E] to-[#3B9EE2] transition-all"
                  style={{ width: `${completedPercent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{data.completed.length} de {total} associados ativos completaram a meta</p>
            </div>

            {/* Cards clicáveis */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setModal('completed')}
                className="flex items-center justify-between p-3 rounded-xl bg-green-50 border border-green-200 hover:border-green-400 transition text-left"
              >
                <div>
                  <p className="text-xs font-semibold text-green-800">Completaram</p>
                  <p className="text-2xl font-black text-green-600">{data.completed.length}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <CheckCircle2 size={20} className="text-green-500" />
                  <ChevronRight size={14} className="text-green-400" />
                </div>
              </button>

              <button
                onClick={() => setModal('pending')}
                className="flex items-center justify-between p-3 rounded-xl bg-yellow-50 border border-yellow-200 hover:border-yellow-400 transition text-left"
              >
                <div>
                  <p className="text-xs font-semibold text-yellow-800">Faltam</p>
                  <p className="text-2xl font-black text-yellow-600">{data.pending.length}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Clock size={20} className="text-yellow-500" />
                  <ChevronRight size={14} className="text-yellow-400" />
                </div>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modal de detalhes */}
      <Dialog open={modal !== null} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {modal === 'completed' ? (
                <><CheckCircle2 size={18} className="text-green-500" /> Completaram a Meta — {monthName}</>
              ) : (
                <><Clock size={18} className="text-yellow-500" /> Ainda não completaram — {monthName}</>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 mt-2">
            {(modal === 'completed' ? data.completed : data.pending).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum associado nesta categoria.</p>
            ) : (
              (modal === 'completed' ? data.completed : data.pending).map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary border border-border">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">{a.full_name?.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{a.full_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="h-1.5 flex-1 bg-border rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${a.percent >= 100 ? 'bg-green-500' : 'bg-gradient-to-r from-[#1B2A5E] to-[#3B9EE2]'}`}
                          style={{ width: `${a.percent}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{a.percent.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-foreground">R$ {a.monthly_spent.toFixed(2)}</p>
                    {a.percent < 100 && (
                      <p className="text-xs text-muted-foreground">faltam R$ {(target - a.monthly_spent).toFixed(2)}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}