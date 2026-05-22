import { Gift } from 'lucide-react';

export default function AssociatePointsCard({ pontos }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
      <Gift size={14} className="text-amber-600 shrink-0" />
      <span className="text-xs font-semibold text-amber-900">
        {(pontos || 0).toLocaleString('pt-BR')} pts
      </span>
    </div>
  );
}