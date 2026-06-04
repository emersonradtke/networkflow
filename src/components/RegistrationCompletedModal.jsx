import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Clock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const LOGO_URL = 'https://media.base44.com/images/public/6a0cfdbc574effcdedd29da9/ece195d55_BOLDLIFE01-LOGO.png';

export default function RegistrationCompletedModal({ associate, onPaymentSuccess }) {
  const [adhesionFee, setAdhesionFee] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAdhesionFee();
  }, []);

  const loadAdhesionFee = async () => {
    try {
      const configs = await base44.entities.NetworkConfig.list();
      if (configs.length > 0 && configs[0].adhesion_fee) {
        setAdhesionFee(configs[0].adhesion_fee);
      }
    } catch (err) {
      console.error('Erro ao carregar taxa de adesão:', err);
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('createInfinitePayCheckout', {
        associate_id: associate.id,
        amount: adhesionFee,
        checkout_type: 'adhesion'
      });

      if (response.data?.checkout_url) {
        window.location.href = response.data.checkout_url;
      }
    } catch (err) {
      console.error('Erro ao criar checkout:', err);
      setLoading(false);
    }
  };

  const handleSkipPayment = () => {
    // Voltar ao painel (refresh para ver a dashboard normal)
    window.location.href = '/dashboard';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 flex items-center justify-center p-6 bg-black/50 z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl p-8 max-w-md w-full space-y-6"
      >
        {/* Icon */}
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
            <Clock className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Logo */}
        <div className="flex justify-center">
          <img src={LOGO_URL} alt="Bold Life" className="h-10 w-auto object-contain" />
        </div>

        {/* Title */}
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-bold text-primary">Cadastro Realizado!</h2>
          <p className="text-sm text-slate-600">
            Sua conta está <span className="text-accent font-semibold">pendente de ativação</span>. Realize o pagamento da adesão de <span className="font-bold">R$ {adhesionFee.toFixed(2)}</span> para ter acesso completo à plataforma.
          </p>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 border-l-4 border-primary rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-primary text-sm">Próximos passos:</h3>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-sm text-slate-700">
              <span className="text-primary font-bold">✓</span>
              <span>Realize o pagamento da taxa de adesão</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-slate-700">
              <span className="text-primary font-bold">✓</span>
              <span>Aguarde a confirmação do pagamento</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-slate-700">
              <span className="text-primary font-bold">✓</span>
              <span>Acesse a loja e comece a ganhar!</span>
            </li>
          </ul>
        </div>

        {/* Primary Button */}
        <Button
          onClick={handlePayment}
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-6 text-base"
        >
          {loading ? 'Processando...' : `Pagar Adesão — R$ ${adhesionFee.toFixed(2)}`}
        </Button>

        {/* Skip Link */}
        <div className="text-center">
          <button
            onClick={handleSkipPayment}
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            Pagar depois → Ir para o Painel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}