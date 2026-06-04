import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, CheckCircle2, Clock, RefreshCw, Trash2, Eye } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function MigrationRefactorPanel() {
  const { toast } = useToast();
  const [status, setStatus] = useState(null);
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = async () => {
    setLoading(true);
    try {
      const resp = await base44.functions.invoke('migrateDataRefactor', { action: 'status' });
      setStatus(resp.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const resp = await base44.functions.invoke('migrateDataRefactor', { action: 'migrate' });
      if (resp.data?.status === 'success') {
        toast({
          title: 'Migração concluída!',
          description: `${resp.data.counts.associate_roles_created} roles, ${resp.data.counts.associate_placements_created} placements, ${resp.data.counts.associate_addresses_created} endereços criados.`
        });
        checkMigrationStatus();
      } else {
        toast({
          title: 'Erro na migração',
          description: resp.data?.counts?.errors?.[0] || 'Erro desconhecido',
          variant: 'destructive'
        });
      }
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
    setMigrating(false);
  };

  const handleValidate = async () => {
    setLoading(true);
    try {
      const resp = await base44.functions.invoke('migrateDataRefactor', { action: 'validate' });
      setValidation(resp.data);
      if (resp.data?.checks?.summary?.migration_valid) {
        toast({
          title: 'Integridade validada!',
          description: 'Nenhum órfão ou ciclo detectado.'
        });
      } else {
        toast({
          title: 'Aviso de integridade',
          description: 'Alguns problemas foram encontrados. Verifique abaixo.',
          variant: 'warning'
        });
      }
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleRollback = async () => {
    if (!confirm('Tem certeza? Todos os dados das novas tabelas serão deletados.')) return;
    setLoading(true);
    try {
      const resp = await base44.functions.invoke('migrateDataRefactor', { action: 'rollback' });
      toast({
        title: 'Rollback concluído',
        description: `${resp.data.deleted.associate_roles} roles, ${resp.data.deleted.associate_placements} placements, ${resp.data.deleted.associate_addresses} endereços deletados.`
      });
      checkMigrationStatus();
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const migrationComplete = status?.migration_completed;

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="text-2xl font-black text-foreground">Migração de Dados</h2>
        <p className="text-sm text-muted-foreground mt-1">Fase 2: Migrar dados para novo esquema refatorado</p>
      </div>

      {/* Status */}
      {status && (
        <div className="dark-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground">Status da Migração</h3>
            {migrationComplete ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 border border-green-200">
                <CheckCircle2 size={14} className="text-green-600" />
                <span className="text-xs font-semibold text-green-700">Concluída</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-50 border border-yellow-200">
                <Clock size={14} className="text-yellow-600" />
                <span className="text-xs font-semibold text-yellow-700">Pendente</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-muted-foreground">AssociateRole</p>
              <p className="text-lg font-black text-foreground">{status.tables.AssociateRole || 0}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-muted-foreground">AssociatePlacement</p>
              <p className="text-lg font-black text-foreground">{status.tables.AssociatePlacement || 0}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-muted-foreground">AssociateAddress</p>
              <p className="text-lg font-black text-foreground">{status.tables.AssociateAddress || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {!migrationComplete ? (
          <Button
            onClick={handleMigrate}
            disabled={migrating || loading}
            className="gold-gradient text-background font-bold gap-2"
          >
            <RefreshCw size={16} className={migrating ? 'animate-spin' : ''} />
            {migrating ? 'Migrando...' : 'Executar Migração'}
          </Button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 size={16} className="text-green-600" />
            <span className="text-sm font-semibold text-green-700">Migração executada</span>
          </div>
        )}

        {migrationComplete && (
          <>
            <Button
              onClick={handleValidate}
              disabled={loading}
              variant="outline"
              className="gap-2"
            >
              <Eye size={16} />
              {loading ? 'Validando...' : 'Validar Integridade'}
            </Button>
            <Button
              onClick={handleRollback}
              disabled={loading}
              variant="outline"
              className="gap-2 border-red-200 text-red-700 hover:bg-red-50"
            >
              <Trash2 size={16} />
              Desfazer Migração
            </Button>
          </>
        )}
      </div>

      {/* Validation Results */}
      {validation && (
        <div className="dark-card rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-foreground">Resultado da Validação</h3>

          {!validation.checks.summary.migration_valid && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Problemas encontrados na integridade dos dados.
              </AlertDescription>
            </Alert>
          )}

          {validation.checks.summary.migration_valid && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Integridade validada! Nenhum órfão ou ciclo detectado.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-muted-foreground">Total de Orders</p>
              <p className="font-bold text-foreground">{validation.checks.summary.total_orders}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg border border-red-100">
              <p className="text-xs text-red-700">Orders Órfãs</p>
              <p className="font-bold text-red-900">{validation.checks.summary.orphaned_orders}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-muted-foreground">Total de Comissões</p>
              <p className="font-bold text-foreground">{validation.checks.summary.total_commissions}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg border border-red-100">
              <p className="text-xs text-red-700">Comissões Órfãs</p>
              <p className="font-bold text-red-900">{validation.checks.summary.orphaned_commissions}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-muted-foreground">Total de Associados</p>
              <p className="font-bold text-foreground">{validation.checks.summary.total_associates}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg border border-red-100">
              <p className="text-xs text-red-700">Ciclos Detectados</p>
              <p className="font-bold text-red-900">{validation.checks.summary.associates_with_cycles}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-muted-foreground">Total de Tickets</p>
              <p className="font-bold text-foreground">{validation.checks.summary.total_support_tickets}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg border border-red-100">
              <p className="text-xs text-red-700">Tickets Órfãs</p>
              <p className="font-bold text-red-900">{validation.checks.summary.orphaned_support_tickets}</p>
            </div>
          </div>

          {validation.checks.orphaned_orders.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
              <p className="text-xs font-bold text-red-800">Orders Órfãs:</p>
              {validation.checks.orphaned_orders.slice(0, 3).map((o, i) => (
                <p key={i} className="text-xs text-red-700">#{o.order_number} (assoc: {o.associate_id})</p>
              ))}
              {validation.checks.orphaned_orders.length > 3 && (
                <p className="text-xs text-red-700">... e mais {validation.checks.orphaned_orders.length - 3}</p>
              )}
            </div>
          )}

          {validation.checks.sponsor_cycles.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
              <p className="text-xs font-bold text-red-800">Ciclos em Sponsorship:</p>
              {validation.checks.sponsor_cycles.slice(0, 3).map((c, i) => (
                <p key={i} className="text-xs text-red-700">{c.associate_name} ({c.associate_id})</p>
              ))}
              {validation.checks.sponsor_cycles.length > 3 && (
                <p className="text-xs text-red-700">... e mais {validation.checks.sponsor_cycles.length - 3}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
        <p className="text-sm font-semibold text-blue-800">ℹ️ Sobre a Migração</p>
        <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
          <li>Migra dados para AssociateRole, AssociatePlacement, AssociateAddress</li>
          <li>Valida integridade referencial (órfãos, ciclos)</li>
          <li>Todos os dados originais são preservados</li>
          <li>Pode fazer rollback se necessário</li>
          <li>100% compatível com aplicação existente</li>
        </ul>
      </div>
    </div>
  );
}