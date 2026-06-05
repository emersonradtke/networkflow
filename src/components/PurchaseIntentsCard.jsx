import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ExternalLink, Zap, Trash2 } from 'lucide-react';
import { formatDateTime } from '@/lib/date-utils';
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

  useEffect(() => {
    // Subscribe to new external link clicks
    const unsubscribe = base44.entities.ExternalLinkClick.subscribe((event) => {
      if (event.type === 'create' && event.data?.associate_id === associateId) {
        loadIntents();
      }
    });
    return unsubscribe;
  }, [associateId]);

  const loadIntents = async () => {
    try {
      const data = await base44.entities.ExternalLinkClick.filter(
        { associate_id: associateId, status: 'intent' },
        '-created_date'
      );
      
      // Enriquecer dados com preço e comissão do produto/banner
      const enrichedData = await Promise.all(data.map(async (intent) => {
        if (intent.link_type === 'product' && intent.product_id) {
          const product = await base44.entities.Product.get(intent.product_id);
          return {
            ...intent,
            product_price: product?.price || 0,
            product_commission_percent: product?.commission_percent || 0,
            managed_commission: product ? (product.price * product.commission_percent) / 100 : 0
          };
        } else if (intent.link_type === 'banner' && intent.banner_id) {
          const banner = await base44.entities.StoreBanner.get(intent.banner_id);
          return {
            ...intent,
            banner_price: banner?.price || 0,
            banner_commission_percent: banner?.commission_percent || 0,
            managed_commission: 0
          };
        }
        return intent;
      }));
      
      setIntents(enrichedData);
    } catch (error) {
      console.error('Erro ao carregar intenções:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (intent) => {
    if (!confirm('Deseja excluir esta intenção de compra?')) return;
    await base44.entities.ExternalLinkClick.delete(intent.id);
    setIntents(prev => prev.filter(i => i.id !== intent.id));
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
                <div className="flex items-center gap-3 mt-1 text-xs">
                  <span className="text-muted-foreground">
                    R$ {(intent.product_price || 0).toFixed(2)}
                  </span>
                  <span className="text-green-600 font-semibold">
                    Comissão: R$ {(intent.managed_commission || 0).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDateTime(intent.created_date)}
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
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7 text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
                  onClick={() => handleDelete(intent)}
                >
                  <Trash2 size={13} />
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
             <div className="grid grid-cols-2 gap-3">
               <div>
                 <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Valor</p>
                 <p className="text-sm font-semibold text-foreground mt-1">
                   R$ {(detailsModal.product_price || 0).toFixed(2)}
                 </p>
               </div>
               <div>
                 <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Comissão</p>
                 <p className="text-sm font-semibold text-green-600 mt-1">
                   R$ {(detailsModal.managed_commission || 0).toFixed(2)}
                 </p>
               </div>
             </div>
             <div>
               <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Data e Hora</p>
               <p className="text-sm text-foreground mt-1">
                 {formatDateTime(detailsModal.created_date)}
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
          clickId={selectedIntent.id}
          isOpen={showProofModal}
          onClose={() => {
            setShowProofModal(false);
            setSelectedIntent(null);
          }}
          productName={selectedIntent.product_name || selectedIntent.banner_name}
          onSubmitted={handleProofSubmitted}
        />
      )}
    </>
  );
}