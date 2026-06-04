import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, CheckCircle2, AlertTriangle, RefreshCw, Eye } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const SEVERITY_CONFIG = {
  none: { label: '✓ Nenhum', color: 'green', bg: 'bg-green-50', border: 'border-green-200' },
  minor: { label: '⚠ Menor', color: 'yellow', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  warning: { label: '⚠ Aviso', color: 'orange', bg: 'bg-orange-50', border: 'border-orange-200' },
  critical: { label: '✕ Crítico', color: 'red', bg: 'bg-red-50', border: 'border-red-200' }
};

export default function ContinuousAuditPanel() {
  const { toast } = useToast();
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    runAudit();
  }, []);

  const runAudit = async () => {
    setLoading(true);
    try {
      const resp = await base44.functions.invoke('continuousAudit', {});
      setAudit(resp.data);
      if (resp.data?.summary?.issues_found > 0) {
        toast({
          title: `${resp.data.summary.issues_found} problemas detectados`,
          description: `Severidade: ${resp.data.summary.severity}`,
          variant: resp.data.summary.severity === 'critical' ? 'destructive' : 'default'
        });
      } else {
        toast({
          title: 'Auditoria completa!',
          description: 'Nenhum problema detectado.'
        });
      }
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  if (!audit) return <div className="text-center py-8 text-muted-foreground">Carregando auditoria...</div>;

  const config = SEVERITY_CONFIG[audit.summary.severity];

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="text-2xl font-black text-foreground">Auditoria de Integridade Contínua</h2>
        <p className="text-sm text-muted-foreground mt-1">Valida dados em tempo real — órfãos, ciclos, duplicatas</p>
      </div>

      {/* Status Card */}
      <div className={`dark-card rounded-2xl p-6 space-y-4 border ${config.border} ${config.bg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {audit.summary.severity === 'none' ? (
              <CheckCircle2 size={24} className="text-green-600" />
            ) : audit.summary.severity === 'critical' ? (
              <AlertCircle size={24} className="text-red-600" />
            ) : (
              <AlertTriangle size={24} className="text-yellow-600" />
            )}
            <div>
              <h3 className="font-black text-foreground">Status da Auditoria</h3>
              <p className="text-sm text-muted-foreground">Última execução: {new Date(audit.timestamp).toLocaleString('pt-BR')}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-foreground">{audit.summary.issues_found}</div>
            <p className="text-xs text-muted-foreground">problemas encontrados</p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-background/50 border border-border">
          <p className="text-sm font-bold text-foreground">Severidade: {config.label}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {audit.summary.severity === 'none' && 'Integridade dos dados está OK'}
            {audit.summary.severity === 'minor' && 'Alguns problemas menores detectados — revisar'}
            {audit.summary.severity === 'warning' && 'Problemas moderados detectados — investigar'}
            {audit.summary.severity === 'critical' && 'Problemas críticos detectados — resolver com urgência'}
          </p>
        </div>
      </div>

      {/* Issues Summary */}
      {audit.summary.issues_found > 0 && (
        <div className="dark-card rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-foreground">Resumo de Problemas</h3>
          
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            {audit.checks.orphaned_orders.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700 font-bold">Orders Órfãs</p>
                <p className="text-lg font-black text-red-900">{audit.checks.orphaned_orders.length}</p>
              </div>
            )}
            {audit.checks.orphaned_commissions.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700 font-bold">Comissões Órfãs</p>
                <p className="text-lg font-black text-red-900">{audit.checks.orphaned_commissions.length}</p>
              </div>
            )}
            {audit.checks.orphaned_support_tickets.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700 font-bold">Tickets Órfãos</p>
                <p className="text-lg font-black text-red-900">{audit.checks.orphaned_support_tickets.length}</p>
              </div>
            )}
            {audit.checks.sponsor_cycles.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700 font-bold">Ciclos Detectados</p>
                <p className="text-lg font-black text-red-900">{audit.checks.sponsor_cycles.length}</p>
              </div>
            )}
            {audit.checks.duplicate_emails.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-700 font-bold">Emails Duplicados</p>
                <p className="text-lg font-black text-yellow-900">{audit.checks.duplicate_emails.length}</p>
              </div>
            )}
            {audit.checks.invalid_dates.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-700 font-bold">Datas Inválidas</p>
                <p className="text-lg font-black text-yellow-900">{audit.checks.invalid_dates.length}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Details */}
      {expanded && audit.summary.issues_found > 0 && (
        <div className="dark-card rounded-2xl p-5 space-y-4 max-h-96 overflow-y-auto">
          <h3 className="font-bold text-foreground sticky top-0 bg-card">Detalhes</h3>

          {audit.checks.orphaned_orders.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-red-700">Orders Órfãs:</p>
              {audit.checks.orphaned_orders.slice(0, 5).map((o, i) => (
                <p key={i} className="text-xs text-muted-foreground ml-2">
                  #{o.order_number} (Associate: {o.missing_associate.slice(0, 8)}...)
                </p>
              ))}
              {audit.checks.orphaned_orders.length > 5 && (
                <p className="text-xs text-muted-foreground ml-2">... e mais {audit.checks.orphaned_orders.length - 5}</p>
              )}
            </div>
          )}

          {audit.checks.sponsor_cycles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-red-700">Ciclos em Sponsorship:</p>
              {audit.checks.sponsor_cycles.slice(0, 5).map((c, i) => (
                <p key={i} className="text-xs text-muted-foreground ml-2">
                  {c.associate_name} ({c.associate_id.slice(0, 8)}...)
                </p>
              ))}
              {audit.checks.sponsor_cycles.length > 5 && (
                <p className="text-xs text-muted-foreground ml-2">... e mais {audit.checks.sponsor_cycles.length - 5}</p>
              )}
            </div>
          )}

          {audit.checks.duplicate_emails.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-yellow-700">Emails Duplicados:</p>
              {audit.checks.duplicate_emails.slice(0, 5).map((d, i) => (
                <p key={i} className="text-xs text-muted-foreground ml-2">
                  {d.email} ({d.count}x)
                </p>
              ))}
              {audit.checks.duplicate_emails.length > 5 && (
                <p className="text-xs text-muted-foreground ml-2">... e mais {audit.checks.duplicate_emails.length - 5}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={runAudit}
          disabled={loading}
          className="gold-gradient text-background font-bold gap-2"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Auditando...' : 'Executar Auditoria'}
        </Button>

        {audit.summary.issues_found > 0 && (
          <Button
            onClick={() => setExpanded(!expanded)}
            variant="outline"
            className="gap-2"
          >
            <Eye size={16} />
            {expanded ? 'Ocultar Detalhes' : 'Ver Detalhes'}
          </Button>
        )}
      </div>

      {/* Info */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
        <p className="text-sm font-semibold text-blue-800">ℹ️ Sobre a Auditoria Contínua</p>
        <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
          <li>Valida orphaned records (órfãos em FK)</li>
          <li>Detecta ciclos em relacionamentos (ex: sponsor circular)</li>
          <li>Identifica duplicatas (emails)</li>
          <li>Verifica datas inválidas (futuras)</li>
          <li>Roda diariamente via automation — resultado salvo em AuditLog</li>
          <li>100% não-invasiva — leitura apenas</li>
        </ul>
      </div>
    </div>
  );
}