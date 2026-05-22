import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function PlacementModal({ associate, onClose, onPlaced }) {
  const [activeAssociates, setActiveAssociates] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null);
  const [done, setDone] = useState(null);

  useEffect(() => {
    loadActive();
  }, []);

  const loadActive = async () => {
    const data = await base44.entities.Associate.filter({ status: 'active' }, 'full_name');
    // Excluir o próprio associado
    setActiveAssociates(data.filter(a => a.id !== associate.id));
    setLoading(false);
  };

  const sendRequest = async (targetSponsor) => {
    setSending(targetSponsor.id);
    // Criar solicitação de alocação
    await base44.entities.PlacementRequest.create({
      associate_id: associate.id,
      associate_name: associate.full_name,
      target_sponsor_id: targetSponsor.id,
      target_sponsor_name: targetSponsor.full_name,
      original_sponsor_id: associate.sponsor_id || '',
      original_sponsor_name: associate.sponsor_name || '',
      status: 'pending',
    });
    // Notificar o patrocinador alvo
    await base44.entities.Notification.create({
      associate_id: targetSponsor.id,
      title: 'Solicitação de Colocação 🤝',
      message: `O associado ${associate.full_name} está aguardando colocação na sua rede. Acesse o painel para aceitar ou recusar.`,
      type: 'system',
      is_read: false,
    });
    setDone(targetSponsor.id);
    setSending(null);
    if (onPlaced) onPlaced();
  };

  const filtered = activeAssociates.filter(a =>
    a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle className="font-black">Alocar Associado na Rede</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500 -mt-2">
          Escolha um associado ativo para receber <span className="font-semibold text-[#1B2A5E]">{associate.full_name}</span> em sua rede.
          O patrocinador escolhido receberá uma notificação para aceitar ou recusar.
        </p>

        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Buscar associado ativo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="max-h-72 overflow-y-auto space-y-2">
          {loading ? (
            <div className="p-4 text-center text-slate-400 text-sm">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-sm">Nenhum associado encontrado.</div>
          ) : filtered.map(a => (
            <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50">
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0"
                style={{ background: 'linear-gradient(135deg,#1B2A5E,#3B9EE2)' }}>
                {a.full_name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{a.full_name}</p>
                <p className="text-xs text-slate-400">{a.email}</p>
              </div>
              {done === a.id ? (
                <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                  <CheckCircle size={11} /> Enviado
                </Badge>
              ) : (
                <Button
                  size="sm"
                  disabled={!!sending || done === a.id}
                  onClick={() => sendRequest(a)}
                  className="text-white text-xs gap-1 shrink-0"
                  style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }}
                >
                  {sending === a.id ? '...' : <><UserPlus size={12} /> Alocar</>}
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button variant="outline" onClick={onClose} className="w-full">Fechar</Button>
      </DialogContent>
    </Dialog>
  );
}