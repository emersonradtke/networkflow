import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ShoppingCart, ExternalLink, Tag, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

export default function Store() {
  const { associate } = useOutletContext();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const prods = await base44.entities.Product.filter({ is_active: true });
    setProducts(prods);
    setLoading(false);
  };

  if (associate?.status !== 'active') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
          <ShoppingCart size={28} className="text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Loja Bloqueada</h2>
        <p className="text-muted-foreground">Sua conta precisa estar ativa para acessar a loja.</p>
      </div>
    );
  }

  const categories = ['all', ...new Set(products.filter(p => p.category).map(p => p.category))];
  const filtered = category === 'all' ? products : products.filter(p => p.category === category);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Loja Virtual</h1>
        <p className="text-muted-foreground text-sm mt-1">Compre produtos e gere comissões para sua rede</p>
      </div>

      {/* Categories */}
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                category === cat
                  ? 'gold-gradient text-background'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat === 'all' ? 'Todos' : cat}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="dark-card rounded-xl h-64 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">Nenhum produto disponível no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <ProductCard product={product} associate={associate} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, associate }) {
  const [loading, setLoading] = useState(false);

  const handleBuy = async () => {
    if (product.type === 'external_link') {
      window.open(product.external_url, '_blank');
      return;
    }
    setLoading(true);
    await base44.entities.Order.create({
      associate_id: associate.id,
      associate_name: associate.full_name,
      product_id: product.id,
      product_name: product.name,
      product_type: product.type,
      amount: product.price,
      commission_percent: product.commission_percent,
      status: 'pending',
    });
    alert('Pedido criado! Aguarde a confirmação do pagamento.');
    setLoading(false);
  };

  return (
    <div className="dark-card rounded-xl overflow-hidden flex flex-col hover:border-primary/30 transition-all duration-200 group">
      <div className="relative aspect-square bg-secondary overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingCart size={32} className="text-muted-foreground" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge className="bg-primary/90 text-primary-foreground text-xs flex items-center gap-1">
            <Percent size={10} /> {product.commission_percent}%
          </Badge>
        </div>
        {product.type === 'external_link' && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-blue-500/80 text-white text-xs">Externo</Badge>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-bold text-foreground text-sm leading-tight">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 flex-1">{product.description}</p>
        )}
        <div className="mt-3">
          <p className="text-lg font-black text-primary">R$ {product.price?.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">{product.commission_percent}% de comissão</p>
          <Button
            size="sm"
            className="w-full mt-2 gold-gradient text-background font-bold gap-1.5"
            onClick={handleBuy}
            disabled={loading}
          >
            {product.type === 'external_link' ? (
              <><ExternalLink size={13} /> Ver Produto</>
            ) : (
              <><ShoppingCart size={13} /> Comprar</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}