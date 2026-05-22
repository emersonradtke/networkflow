import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star } from 'lucide-react';

export default function ReviewModal({ order, isOpen, onClose, onSubmit }) {
  const [products, setProducts] = useState(
    order?.products || [{ id: order?.product_id, name: order?.product_name }]
  );
  const [productRatings, setProductRatings] = useState({});
  const [productComments, setProductComments] = useState({});
  const [orderRating, setOrderRating] = useState(0);
  const [orderComment, setOrderComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleProductRatingChange = (productId, rating) => {
    setProductRatings(prev => ({ ...prev, [productId]: rating }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      for (const product of products) {
        await base44.entities.Review.create({
          order_id: order.id,
          associate_id: order.associate_id,
          product_id: product.id,
          product_name: product.name,
          rating: productRatings[product.id] || 0,
          comment: productComments[product.id] || '',
          order_rating: orderRating,
          order_comment: orderComment
        });
      }
      onSubmit?.();
      onClose();
    } catch (err) {
      console.error('Erro ao salvar avaliação:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Avaliar Compra #{order?.order_number}</DialogTitle>
          <DialogDescription>Avalie o pedido e os produtos recebidos</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Avaliação geral do pedido */}
          <div>
            <Label className="font-semibold mb-2">Avaliação geral do pedido</Label>
            <div className="flex gap-2 mb-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setOrderRating(star)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    size={28}
                    className={star <= orderRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                  />
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Comentário sobre o pedido (opcional)"
              value={orderComment}
              onChange={(e) => setOrderComment(e.target.value)}
              className="mt-2"
              rows={2}
            />
          </div>

          {/* Avaliação dos produtos */}
          <div className="border-t pt-4">
            <Label className="font-semibold block mb-4">Avaliação dos produtos</Label>
            <div className="space-y-4">
              {products.map(product => (
                <div key={product.id} className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">{product.name}</h4>
                  <div className="flex gap-2 mb-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => handleProductRatingChange(product.id, star)}
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star
                          size={24}
                          className={star <= (productRatings[product.id] || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                        />
                      </button>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Comentário sobre o produto (opcional)"
                    value={productComments[product.id] || ''}
                    onChange={(e) => setProductComments(prev => ({ ...prev, [product.id]: e.target.value }))}
                    className="mt-2"
                    rows={2}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-primary">
              {loading ? 'Salvando...' : 'Enviar Avaliação'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}