import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function Checkout() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const initCheckout = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) {
          setError('Você precisa estar autenticado');
          return;
        }

        // Buscar dados do associado
        const associates = await base44.entities.Associate.filter({ user_id: user.id });
        if (associates.length === 0) {
          setError('Nenhum associado encontrado para este usuário');
          return;
        }

        const associate = associates[0];

        // Gerar link de pagamento
        const res = await base44.functions.invoke('createInfinitePayCheckout', {
          order_nsu: `CHECKOUT-${Date.now()}`,
          items: [
            {
              description: 'Pagamento direto',
              price: 0, // será ajustado pelo usuário
              quantity: 1,
            }
          ],
          customer: {
            name: associate.full_name,
            email: associate.email,
            phone_number: associate.phone || '',
          },
          redirect_url: `${window.location.origin}/dashboard`,
        });

        if (res.data?.url) {
          // Redirecionar para o checkout
          window.location.href = res.data.url;
        } else {
          setError('Não foi possível gerar o link de pagamento');
        }
      } catch (e) {
        setError('Erro ao inicializar pagamento: ' + e.message);
      } finally {
        setLoading(false);
      }
    };

    initCheckout();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando pagamento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full bg-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-destructive" />
            <h1 className="text-lg font-bold text-destructive">Erro</h1>
          </div>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90"
          >
            Voltar ao Painel
          </button>
        </div>
      </div>
    );
  }

  return null;
}