import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Target, TrendingUp, CheckCircle2, Clock } from 'lucide-react';

export default function MonthlyActivationCard({ associate, networkConfig }) {
  const [monthlySpent, setMonthlySpent] = useState(0);
  const [loading, setLoading] = useState(true);

  const target = networkConfig?.monthly_activation_amount || 0;

  useEffect(() => {
    if (!associate?.id || !target) { setLoading(false); return; }
    loadMonthlySpending();
  }, [associate?.id, target]);

  const loadMonthlySpending = async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
      // Pedidos pagos no mês corrente
      const orders = await base44.entities.Order.filter({ associate_id: associate.id, status: 'paid' });
      const thisMonthOrders = orders.filter(o => o.created_date >= startOfMonth);
      const ordersTotal = thisMonthOrders.reduce((s, o) => s + (o.amount || 0), 0);

      // Comprovantes de cartão aprovados no mês
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const proofs = await base44.entities.CardSpendingProof.filter({ associate_id: associate.id, month: currentMonth, status: 'approved' });
      const proofsTotal = proofs.reduce((s, p) => s + (p.spending_amount || 0), 0);

      setMonthlySpent(ordersTotal + proofsTotal);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // Não exibir se não há meta configurada
  if (!target || target <= 0) return null;

  const percent = Math.min(100, (monthlySpent / target) * 100);
  const remaining = Math.max(0, target - monthlySpent);
  const completed = monthlySpent >= target;

  const now = new Date();
  const monthName = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className={`dark-card rounded-2xl p-5 border-l-4 ${completed ? 'border-green-500' : 'border-[#3B9EE2]'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${completed ? 'bg-green-100' : 'bg-blue-100'}`}>
            {completed ? <CheckCircle2 size={16} className="text-green-600" /> : <Target size={16} className="text-[#3B9EE2]" />}
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Ativação Mensal</p>
            <p className="text-xs text-muted-foreground capitalize">{monthName}</p>
          </div>
        </div>
        {completed && (
          <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">✓ Concluído!</span>
        )}
      </div>

      {loading ? (
        <div className="h-10 bg-secondary rounded-lg animate-pulse" />
      ) : (
        <>
          {/* Barra de progresso */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>R$ {monthlySpent.toFixed(2)} gastos</span>
              <span>Meta: R$ {target.toFixed(2)}</span>
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${completed ? 'bg-green-500' : 'bg-gradient-to-r from-[#1B2A5E] to-[#3B9EE2]'}`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-1.5">
              <span className="text-xs font-bold text-foreground">{percent.toFixed(0)}% concluído</span>
              {!completed && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock size={11} />
                  Faltam R$ {remaining.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {completed ? (
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 font-medium">
              🎉 Parabéns! Você atingiu a meta de ativação deste mês!
            </p>
          ) : (
            <p className="text-xs text-muted-foreground bg-secondary rounded-lg px-3 py-2">
              💡 Faça compras na loja ou comprove gastos no cartão BoldLife para completar sua meta.
            </p>
          )}
        </>
      )}
    </div>
  );
}