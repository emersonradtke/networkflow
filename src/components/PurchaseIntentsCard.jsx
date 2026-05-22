import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ExternalLink, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PurchaseProofModal from './PurchaseProofModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function PurchaseIntentsCard({ associateId }) {
  const [intents, setIntents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIntent, setSelectedIntent] = useState(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [detailsModal, setDetailsModal] = useState(null);

  useEffect(() => {
    loadIntents();
  }, [associateId]);

  const loadIntents = async () => {
    try {
      const data = await base44.entities.ExternalLinkClick.filter(
        { associate_id: associateId, status: 'intent' },
        '-created_date'
      );
      setIntents(data);
    } catch (error) {
      console.error('Erro ao carregar intenções:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = (intent) => {
    setSelectedIntent(intent);
    setShowProofModal(true);
  };

  const handleProofSubmitted = () => {
    setShowProofModal(false);
    setSelectedIntent(null);
    loadIntents();
  };

  if (loading) {
    return (
      <div className="dark-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={20} className="text-primary" />
          <h3 className="font-bold text-foreground">Minhas Intenções de Compra</h3>
        </div>
        <p className="text-muted-foreground text-sm">Carregando...</p>
      </div>
    );
  }

  if (intents.length === 0) {
    return (
      <div className="dark-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={20} className="text-primary" />
          <h3 className="font-bold text-foreground">Minhas Intenções de Compra</h3>
        </div>
        <p className="text-muted-foreground text-sm text-center py-4">Nenhuma intenção de compra registrada</p>
      </div>
    );
  }

  return (
    <>
      <div className="dark-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={20} className="text-primary" />
          <h3 className="font-bold text-foreground">Minhas Intenções de Compra</h3>
        </div>

        <div className="space-y-3">
          {intents.map(intent => (
            <div key={intent.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {intent.product_name || intent.banner_name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(intent.created_date).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => setDetailsModal(intent)}
                >
                  Ver
                </Button>
                <Button
                  size="sm"
                  className="text-xs h-7 gold-gradient text-background font-bold"
                  onClick={() => handleConfirm(intent)}
                >
                  Confirmar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Details Modal */}
      <Dialog open={!!detailsModal} onOpenChange={(open) => !open && setDetailsModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes da Intenção</DialogTitle>
          </DialogHeader>
          {detailsModal && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Produto/Banner</p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {detailsModal.product_name || detailsModal.banner_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Tipo</p>
                <Badge className="mt-1" variant="outline">
                  {detailsModal.link_type === 'product' ? 'Produto' : 'Banner'}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Data e Hora</p>
                <p className="text-sm text-foreground mt-1">
                  {new Date(detailsModal.created_date).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </p>
              </div>
              <Button
                className="w-full gold-gradient text-background font-bold"
                onClick={() => {
                  setDetailsModal(null);
                  handleConfirm(detailsModal);
                }}
              >
                Confirmar Compra
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedIntent && (
        <PurchaseProofModal
          open={showProofModal}
          onClose={() => {
            setShowProofModal(false);
            setSelectedIntent(null);
          }}
          intent={selectedIntent}
          onSubmitted={handleProofSubmitted}
        />
      )}
    </>
  );
}