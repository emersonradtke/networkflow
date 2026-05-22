import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, User } from 'lucide-react';

export default function CommissionsModal({ commissions, open, onClose }) {
  const byAssociate = {};
  commissions.forEach(c => {
    const key = c.beneficiary_id;
    if (!byAssociate[key]) {
      byAssociate[key] = {
        id: c.beneficiary_id,
        name: c.beneficiary_name,
        total: 0,
        count: 0,
        commissions: []
      };
    }
    byAssociate[key].total += c.commission_amount || 0;
    byAssociate[key].count += 1;
    byAssociate[key].commissions.push(c);
  });

  const associates = Object.values(byAssociate).sort((a, b) => b.total - a.total);
  const totalCommissions = associates.reduce((sum, a) => sum + a.total, 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp size={20} className="text-primary" />
            Comissões por Associado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3 p-3 bg-secondary rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Total de Associados</p>
              <p className="text-xl font-bold text-foreground">{associates.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total em Comissões</p>
              <p className="text-xl font-bold text-primary">R$ {totalCommissions.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Comissões Totais</p>
              <p className="text-xl font-bold text-foreground">{commissions.length}</p>
            </div>
          </div>

          <div className="space-y-2">
            {associates.map(associate => (
              <div key={associate.id} className="border border-border rounded-lg p-3 space-y-2 hover:bg-secondary/50 transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground flex items-center gap-2">
                      <User size={16} className="text-primary shrink-0" />
                      <span className="truncate">{associate.name}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-primary text-lg">R$ {associate.total.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{associate.count} comissão(ões)</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-secondary/40 rounded p-2">
                  {associate.commissions.slice(0, 2).map((c, idx) => (
                    <div key={idx} className="truncate">
                      <span className="text-muted-foreground">Pedido #{c.order_id?.slice(0, 8)}...</span>
                      <p className="font-medium text-foreground">
                        {c.commission_percent}% = R$ {c.commission_amount?.toFixed(2)}
                      </p>
                    </div>
                  ))}
                  {associate.count > 2 && (
                    <p className="text-muted-foreground col-span-2">+{associate.count - 2} comissão(ões)</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}