import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Package } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export default function TopProductsWidget() {
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopProducts();
  }, []);

  const fetchTopProducts = async () => {
    setLoading(true);
    try {
      const orders = await base44.entities.Order.filter({ status: 'paid' });
      
      const productMap = {};
      orders.forEach(order => {
        if (!productMap[order.product_id]) {
          productMap[order.product_id] = {
            id: order.product_id,
            name: order.product_name,
            quantity: 0,
            revenue: 0
          };
        }
        productMap[order.product_id].quantity += order.quantity;
        productMap[order.product_id].revenue += order.amount;
      });

      const sorted = Object.values(productMap)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      setTopProducts(sorted);
    } catch (err) {
      console.error('Erro ao buscar produtos top:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp size={20} />
            Produtos Mais Vendidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp size={20} />
          Produtos Mais Vendidos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topProducts.map((product, idx) => (
            <div key={product.id} className="flex items-center gap-3 pb-3 border-b last:border-b-0">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                {idx + 1}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{product.name}</p>
                <p className="text-xs text-gray-500">{product.quantity} unidades vendidas</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(product.revenue)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {topProducts.length === 0 && (
          <div className="text-center py-8">
            <Package className="mx-auto text-gray-300 mb-2" size={32} />
            <p className="text-gray-500 text-sm">Sem vendas registradas</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}