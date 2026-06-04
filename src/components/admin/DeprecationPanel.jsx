import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, CheckCircle2, Trash2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function DeprecationPanel() {
  const { toast } = useToast();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deprecating, setDeprecating] = useState(false);

  useEffect(() => {
    checkDeprecationStatus();
  }, []);

  const checkDeprecationStatus = async () => {
    setLoading(true);
    try {
      const resp = await base44.functions.invoke('deprecateLegacyFields', { action: 'status' });
      setStatus(resp.data);
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleDeprecate = async () => {
    if (!confirm('Isso vai limpar todos os campos legados de endereço. Certifique-se de que a migração foi bem-sucedida!')) return;
    setDeprecating(true);
    try {
      const resp = await base44.functions.invoke('deprecateLegacyFields', { action: 'deprecate' });
      if (resp.data?.status === 'success') {
        toast({
          title: 'Depreciação concluída!',
          description: `${resp.data.associates_updated} Associates e ${resp.data.orders_updated} Orders atualizadas.`
        });
        checkDeprecationStatus();
      } else {
        toast({
          title: 'Erro na depreciação',
          description: resp.data?.errors?.[0] || 'Erro desconhecido',
          variant: 'destructive'
        });
      }
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
    setDeprecating(false);
  };

  const isDeprecated = status?.status === 'deprecated';
  const summary = status?.summary;

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="text-2xl font-black text-foreground">Depreciação de Campos Legados</h2>
        <p className="text-sm text-muted-foreground mt-1">Fase 3: Remover campos redundantes após migração para schema normalizado</p>
      </div>

      {/* Status */}
      {summary && (
        <div className="dark-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground">Status dos Campos Legados</h3>
            {isDeprecated ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 border border-green-200">
                <CheckCircle2 size={14} className="text-green-600" />
                <span className="text-xs font-semibold text-green-700">Deprecados</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-50 border border-yellow-200">
                <AlertTriangle size={14} className="text-yellow-600" />
                <span className="text-xs font-semibold text-yellow-700">Ativos</span>
              </div>
            )}
          </div>

          {!isDeprecated && (
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {summary.associates_with_legacy} Associates e {summary.orders_with_legacy} Orders ainda possuem dados legados.
              </AlertDescription>
            </Alert>
          )}

          {isDeprecated && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Todos os campos legados foram removidos com sucesso!
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-muted-foreground">Total de Associates</p>
              <p className="font-bold text-foreground">{summary.total_associates}</p>
            </div>
            <div className={`p-3 rounded-lg ${summary.associates_with_legacy > 0 ? 'bg-yellow-50 border border-yellow-100' : 'bg-green-50 border border-green-100'}`}>
              <p className={`text-xs ${summary.associates_with_legacy > 0 ? 'text-yellow-700' : 'text-green-700'}`}>
                Com dados legados
              </p>
              <p className={`font-bold ${summary.associates_with_legacy > 0 ? 'text-yellow-900' : 'text-green-900'}`}>
                {summary.associates_with_legacy}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-muted-foreground">Total de Orders</p>
              <p className="font-bold text-foreground">{summary.total_orders}</p>
            </div>
            <div className={`p-3 rounded-lg ${summary.orders_with_legacy > 0 ? 'bg-yellow-50 border border-yellow-100' : 'bg-green-50 border border-green-100'}`}>
              <p className={`text-xs ${summary.orders_with_legacy > 0 ? 'text-yellow-700' : 'text-green-700'}`}>
                Com dados legados
              </p>
              <p className={`font-bold ${summary.orders_with_legacy > 0 ? 'text-yellow-900' : 'text-green-900'}`}>
                {summary.orders_with_legacy}
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg space-y-2">
            <p className="text-xs font-bold text-slate-800">Campos a serem deprecados:</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-slate-700 font-semibold mb-1">Associate ({summary.legacy_fields.associate} campos)</p>
                <ul className="text-xs text-slate-600 space-y-0.5">
                  <li>• address</li>
                  <li>• shipping_*</li>
                  <li>• billing_*</li>
                  <li>• addresses_completed</li>
                </ul>
              </div>
              <div>
                <p className="text-xs text-slate-700 font-semibold mb-1">Order ({summary.legacy_fields.order} campos)</p>
                <ul className="text-xs text-slate-600 space-y-0.5">
                  <li>• shipping_*</li>
                  <li>• billing_*</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {!isDeprecated ? (
          <Button
            onClick={handleDeprecate}
            disabled={deprecating || loading}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold gap-2"
          >
            <Trash2 size={16} className={deprecating ? 'animate-pulse' : ''} />
            {deprecating ? 'Deprecando...' : 'Deprecar Campos Legados'}
          </Button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 size={16} className="text-green-600" />
            <span className="text-sm font-semibold text-green-700">Depreciação concluída</span>
          </div>
        )}
        <Button
          onClick={checkDeprecationStatus}
          disabled={loading}
          variant="outline"
        >
          {loading ? 'Atualizando...' : 'Atualizar Status'}
        </Button>
      </div>

      {/* Info */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
        <p className="text-sm font-semibold text-blue-800">ℹ️ Sobre a Depreciação</p>
        <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
          <li>Remove todos os campos de endereço legados da Associate e Order</li>
          <li>Dados já foram migrados para AssociateAddress (normalizado)</li>
          <li>Libera espaço e melhora performance das queries</li>
          <li>100% seguro — dados estão em AssociateAddress</li>
          <li>Dados não podem ser restaurados — use backups se necessário</li>
        </ul>
      </div>
    </div>
  );
}