import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LOGO_URL = 'https://media.base44.com/images/public/6a0cfdbc574effcdedd29da9/ece195d55_BOLDLIFE01-LOGO.png';

export default function TermsOfUse() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-slate-800">
          <ArrowLeft size={20} />
        </button>
        <img src={LOGO_URL} alt="Bold Life" className="h-7 w-auto object-contain" />
        <h1 className="text-sm font-bold text-slate-800">Termos de Serviço</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 text-slate-700 text-sm leading-relaxed">
        <p className="text-xs text-slate-400">Última atualização: maio de 2026</p>

        <section>
          <h2 className="font-bold text-base text-slate-800 mb-2">1. Aceitação dos Termos</h2>
          <p>
            Ao utilizar a plataforma <strong>Bold Life</strong>, você concorda com estes Termos de Serviço. Caso não concorde, não utilize a plataforma.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base text-slate-800 mb-2">2. Cadastro e Adesão</h2>
          <p>
            Para se tornar associado, é necessário realizar o cadastro completo com dados verdadeiros e efetuar o pagamento da taxa de adesão. O cadastro é pessoal e intransferível.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base text-slate-800 mb-2">3. Comissões e Pagamentos</h2>
          <p>
            As comissões são calculadas conforme as regras da rede disponíveis na plataforma. A Bold Life se reserva o direito de alterar percentuais e regras mediante comunicação prévia.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base text-slate-800 mb-2">4. Conduta do Associado</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>É proibido fornecer informações falsas no cadastro</li>
            <li>É proibido usar a plataforma para atividades ilegais</li>
            <li>O associado é responsável pelas informações que fornece</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-base text-slate-800 mb-2">5. Encerramento de Conta</h2>
          <p>
            A Bold Life pode suspender ou encerrar contas que violem estes termos, sem prejuízo das comissões já creditadas.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base text-slate-800 mb-2">6. Limitação de Responsabilidade</h2>
          <p>
            A Bold Life não se responsabiliza por ganhos futuros, nem por interrupções temporárias do serviço por razões técnicas ou de força maior.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base text-slate-800 mb-2">7. Foro</h2>
          <p>
            Estes termos são regidos pela legislação brasileira. Fica eleito o foro da comarca de domicílio da Bold Life para dirimir quaisquer disputas.
          </p>
        </section>
      </div>
    </div>
  );
}