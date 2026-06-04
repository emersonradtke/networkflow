import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, CheckCircle2, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function CleanupPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [adminCode, setAdminCode] = useState('');

  const handleCleanup = async () => {
    if (!confirmed || !adminCode) {
      alert('Confirme a ação e insira o código de segurança');
      return;
    }

    setLoading(true);
    try {
      const res = await base44.functions.invoke('cleanupAllAssociatesData', {});
      setResult(res.data);
      setAdminCode('');
      setConfirmed(false);
    } catch (e) {
      alert('Erro: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-black text-foreground">Limpeza de Dados</h2>
        <p className="text-sm text-muted-foreground mt-1">⚠️ Remover todos os associados e suas movimentações</p>
      </div>

      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800 ml-2">
          <strong>Aviso Crítico:</strong> Esta ação é IRREVERSÍVEL e deletará permanentemente todos os associados, pedidos, comissões, saques e movimentações relacionadas. Use apenas em ambiente de teste.
        </AlertDescription>
      </Alert>

      {result && (
        <div className="dark-card rounded-2xl p-6 border border-green-200 bg-green-50">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 size={24} className="text-green-600" />
            <h3 className="font-bold text-green-900">Limpeza Concluída!</h3>
          </div>
          <p className="text-sm text-green-800 mb-4">{result.message}</p>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-white rounded border border-green-200">
              <p className="font-semibold text-green-700">Usuários</p>
              <p className="text-2xl font-black text-green-900">{result.summary.users_deleted}</p>
            </div>
            <div className="p-3 bg-white rounded border border-green-200">
              <p className="font-semibold text-green-700">Associados</p>
              <p className="text-2xl font-black text-green-900">{result.summary.associates_deleted}</p>
            </div>
            <div className="p-3 bg-white rounded border border-green-200">
              <p className="font-semibold text-green-700">Pedidos</p>
              <p className="text-2xl font-black text-green-900">{result.summary.orders_deleted}</p>
            </div>
            <div className="p-3 bg-white rounded border border-green-200">
              <p className="font-semibold text-green-700">Comissões</p>
              <p className="text-2xl font-black text-green-900">{result.summary.commissions_deleted}</p>
            </div>
            <div className="p-3 bg-white rounded border border-green-200">
              <p className="font-semibold text-green-700">Saques</p>
              <p className="text-2xl font-black text-green-900">{result.summary.withdrawals_deleted}</p>
            </div>
            <div className="p-3 bg-white rounded border border-green-200">
              <p className="font-semibold text-green-700">Tickets</p>
              <p className="text-2xl font-black text-green-900">{result.summary.support_tickets_deleted}</p>
            </div>
            <div className="p-3 bg-white rounded border border-green-200">
              <p className="font-semibold text-green-700">Avaliações</p>
              <p className="text-2xl font-black text-green-900">{result.summary.reviews_deleted}</p>
            </div>
            <div className="p-3 bg-white rounded border border-green-200">
              <p className="font-semibold text-green-700">Solicitações Cartão</p>
              <p className="text-2xl font-black text-green-900">{result.summary.card_requests_deleted}</p>
            </div>
            <div className="p-3 bg-white rounded border border-green-200">
              <p className="font-semibold text-green-700">Notificações</p>
              <p className="text-2xl font-black text-green-900">{result.summary.notifications_deleted}</p>
            </div>
          </div>

          <Button 
            onClick={() => setResult(null)} 
            className="w-full mt-4"
            variant="outline"
          >
            Fazer Outra Limpeza
          </Button>
        </div>
      )}

      {!result && (
        <div className="dark-card rounded-2xl p-6 space-y-4">
          <div className="space-y-3">
            <label className="block">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm font-semibold text-foreground">
                  Confirmo que desejo deletar TODOS os associados e suas movimentações (irreversível)
                </span>
              </div>
            </label>
          </div>

          {confirmed && (
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm font-semibold text-foreground block mb-2">
                  Código de Segurança
                </span>
                <input
                  type="text"
                  placeholder="Digite 'boldlife@2024' para confirmar"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono"
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Digite exatamente: <strong>boldlife@2024</strong>
              </p>
            </div>
          )}

          <Button
            onClick={handleCleanup}
            disabled={loading || !confirmed || adminCode !== 'boldlife@2024'}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold gap-2 py-6 text-base"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Limpando...
              </>
            ) : (
              <>
                <Trash2 size={18} /> Deletar TODOS os Associados
              </>
            )}
          </Button>
        </div>
      )}

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2 text-sm text-blue-800">
        <p className="font-semibold">ℹ️ O que será deletado:</p>
        <ul className="ml-4 space-y-1 list-disc">
          <li>Todos os Associates (membros da rede)</li>
          <li>Todos os Orders (pedidos dos associados)</li>
          <li>Todas as Commissions (comissões geradas)</li>
          <li>Todos os WithdrawalRequests (solicitações de saque)</li>
          <li>Todos os SupportTickets, Reviews, CardRequests</li>
          <li>Todas as Notifications, ExternalLinkClicks</li>
          <li>CardSpendingProofs, AssociatePlacements</li>
        </ul>
      </div>
    </div>
  );
}