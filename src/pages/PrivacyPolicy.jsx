import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LOGO_URL = 'https://media.base44.com/images/public/6a0cfdbc574effcdedd29da9/ece195d55_BOLDLIFE01-LOGO.png';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-slate-800">
          <ArrowLeft size={20} />
        </button>
        <img src={LOGO_URL} alt="Bold Life" className="h-7 w-auto object-contain" />
        <h1 className="text-sm font-bold text-slate-800">Política de Privacidade</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 text-slate-700 text-sm leading-relaxed">
        <p className="text-xs text-slate-400">Última atualização: maio de 2026</p>

        <section>
          <h2 className="font-bold text-base text-slate-800 mb-2">1. Quem somos</h2>
          <p>
            A <strong>Bold Life</strong> é uma plataforma de associados que oferece produtos, serviços e oportunidades de geração de renda por meio de rede de indicações.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base text-slate-800 mb-2">2. Dados que coletamos</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Nome completo, e-mail e telefone</li>
            <li>CPF ou CNPJ para fins de conformidade fiscal</li>
            <li>Endereço para entrega de produtos</li>
            <li>Dados bancários para pagamento de comissões (PIX, conta corrente)</li>
            <li>Histórico de pedidos e interações na plataforma</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-base text-slate-800 mb-2">3. Como usamos seus dados</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Processar pedidos e pagamentos</li>
            <li>Calcular e pagar comissões</li>
            <li>Enviar notificações sobre sua conta</li>
            <li>Cumprir obrigações legais e fiscais</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-base text-slate-800 mb-2">4. Compartilhamento de dados</h2>
          <p>
            Não vendemos seus dados. Podemos compartilhá-los com parceiros de pagamento e logística estritamente para processar transações.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base text-slate-800 mb-2">5. Segurança</h2>
          <p>
            Utilizamos criptografia e boas práticas de segurança para proteger suas informações. O acesso é restrito a pessoal autorizado.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base text-slate-800 mb-2">6. Seus direitos (LGPD)</h2>
          <p>
            Você pode solicitar acesso, correção ou exclusão de seus dados a qualquer momento entrando em contato conosco pelo app.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base text-slate-800 mb-2">7. Contato</h2>
          <p>
            Para dúvidas sobre privacidade, entre em contato pelo suporte disponível na plataforma Bold Life.
          </p>
        </section>
      </div>
    </div>
  );
}