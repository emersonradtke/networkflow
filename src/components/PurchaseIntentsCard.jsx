import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ExternalLink, Zap, Trash2, X, FileText } from 'lucide-react';
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
      const allData = await base44.entities.ExternalLinkClick.filter(
        { associate_id: associateId },
        '-created_date'
      );
      // Mostrar apenas intent e submitted (não approved/rejected)
      const data = allData.filter(d => d.status === 'intent' || d.status === 'submitted');
      
      // Enriquecer dados com preço e comissão do produto/banner
      const enrichedData = await Promise.all(data.map(async (intent) => {
        if (intent.link_type === 'product' && intent.product_id) {
          const products = await base44.entities.Product.filter({ id: intent.product_id });
          const product = products[0];
          return {
            ...intent,
            product_price: product?.price || 0,
            product_commission_percent: product?.commission_percent || 0,
            managed_commission: product ? (product.price * (product.commission_percent || 0)) / 100 : 0
          };
        } else if (intent.link_type === 'banner' && intent.banner_id) {
          const banners = await base44.entities.StoreBanner.filter({ id: intent.banner_id });
          const banner = banners[0];
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

  const handleRemoveProof = async (intent, urlIndex) => {
    if (!confirm('Deseja remover este comprovante?')) return;
    const urls = intent.purchase_proof_urls?.length
      ? [...intent.purchase_proof_urls]
      : intent.purchase_proof_url ? [intent.purchase_proof_url] : [];
    urls.splice(urlIndex, 1);
    const update = {
      purchase_proof_urls: urls,
      purchase_proof_url: urls[0] || null,
    };
    // Se não sobrar nenhum comprovante, volta status para intent
    if (urls.length === 0) {
      update.status = 'intent';
      update.purchase_amount = null;
    }
    await base44.entities.ExternalLinkClick.update(intent.id, update);
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
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {intent.product_name || intent.banner_name}
                  </p>
                  {intent.status === 'submitted' && (
                    <Badge className="bg-yellow-100 text-yellow-800 text-xs shrink-0">Enviado</Badge>
                  )}
                </div>
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
                {intent.status === 'intent' && (
                  <Button
                    size="sm"
                    className="text-xs h-7 gold-gradient text-background font-bold"
                    onClick={() => handleConfirm(intent)}
                  >
                    Confirmar
                  </Button>
                )}
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

             {/* Comprovantes enviados com opção de excluir */}
             {(() => {
               const urls = detailsModal.purchase_proof_urls?.length
                 ? detailsModal.purchase_proof_urls
                 : detailsModal.purchase_proof_url ? [detailsModal.purchase_proof_url] : [];
               if (urls.length === 0) return null;
               return (
                 <div>
                   <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">
                     Comprovante{urls.length > 1 ? 's' : ''} enviados ({urls.length})
                   </p>
                   <div className="space-y-2">
                     {urls.map((url, idx) => {
                       const isImage = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
                       return (
                         <div key={idx} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-secondary/30">
                           {isImage
                             ? <img src={url} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                             : <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center shrink-0"><FileText size={16} className="text-primary" /></div>
                           }
                           <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex-1 truncate">
                             Abrir comprovante {idx + 1}
                           </a>
                           <button
                             onClick={() => { handleRemoveProof(detailsModal, idx); setDetailsModal(null); }}
                             className="text-muted-foreground hover:text-destructive shrink-0"
                             title="Remover comprovante"
                           >
                             <X size={15} />
                           </button>
                         </div>
                       );
                     })}
                   </div>
                 </div>
               );
             })()}

             {detailsModal.status === 'intent' && (
              <Button
                className="w-full gold-gradient text-background font-bold"
                onClick={() => {
                  setDetailsModal(null);
                  handleConfirm(detailsModal);
                }}
              >
                Confirmar Compra
              </Button>
             )}
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