import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Users, RefreshCw, AlertTriangle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function AuthMigrationTool() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = async () => {
    try {
      setLoading(true);
      const response = await base44.functions.invoke('auditAuthMigration', {});
      setStatus(response.data?.migration_status);
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      setError('Erro ao carregar status de migração');
    } finally {
      setLoading(false);
    }
  };

  const handleMigrateAll = async () => {
    setMigrating(true);
    setError(null);
    setSuccess(null);

    try {
      // Get all active DirectUsers
      const directUsers = await base44.asServiceRole.entities.DirectUser.filter({ is_active: true });
      
      if (directUsers.length === 0) {
        setSuccess('Nenhum usuário para migrar');
        setMigrating(false);
        return;
      }

      let migrated = 0;
      let failed = 0;

      for (const directUser of directUsers) {
        try {
          await base44.functions.invoke('migrateUserToBase44', {
            directUserId: directUser.id,
            email: directUser.email,
            role: directUser.role
          });
          migrated++;
        } catch (err) {
          console.error(`Erro migrando ${directUser.email}:`, err);
          failed++;
        }
      }

      setSuccess(`Migração concluída: ${migrated} sucesso, ${failed} falharam`);
      await checkMigrationStatus();
    } catch (error) {
      console.error('Erro na migração:', error);
      setError('Erro ao processar migração: ' + error.message);
    } finally {
      setMigrating(false);
      setShowConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="dark-card rounded-2xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 font-semibold">Erro ao carregar status de migração</p>
      </div>
    );
  }

  const progress = status.migration_progress || 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold mb-2">Migração de Autenticação</h3>
        <p className="text-sm text-muted-foreground">
          Migrando de autenticação customizada para Base44 native auth
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="dark-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Sistema Legacy (DirectUser)</p>
            <Badge variant="outline">Ativo</Badge>
          </div>
          <p className="text-2xl font-bold">{status.direct_user_total}</p>
          <p className="text-xs text-muted-foreground mt-1">usuários cadastrados</p>
        </div>

        <div className="dark-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Base44 Native Auth</p>
            <Badge className="bg-green-100 text-green-800">Novo</Badge>
          </div>
          <p className="text-2xl font-bold">{status.base44_users_total}</p>
          <p className="text-xs text-muted-foreground mt-1">usuários migrados</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="dark-card rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">Progresso da Migração</p>
          <span className="text-lg font-bold text-primary">{progress}%</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {status.direct_user_migrated} de {status.direct_user_total} usuários migrados
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="dark-card rounded-2xl p-4 border-l-4 border-yellow-500">
          <p className="text-xs text-muted-foreground mb-1">Ainda no Legacy</p>
          <p className="text-2xl font-bold text-yellow-600">{status.still_on_legacy}</p>
        </div>

        <div className="dark-card rounded-2xl p-4 border-l-4 border-blue-500">
          <p className="text-xs text-muted-foreground mb-1">Pronto para Migrar</p>
          <p className="text-2xl font-bold text-blue-600">{status.ready_to_migrate}</p>
        </div>

        <div className="dark-card rounded-2xl p-4 border-l-4 border-green-500">
          <p className="text-xs text-muted-foreground mb-1">Já Migrados</p>
          <p className="text-2xl font-bold text-green-600">{status.already_migrated}</p>
        </div>
      </div>

      {/* Phase Info */}
      <div className="dark-card rounded-2xl p-4 bg-blue-50 border-l-4 border-blue-500">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900">FASE 1: Preparação</p>
            <p className="text-xs text-blue-700 mt-1">
              Ambos os sistemas rodando em paralelo. Novos usuários vão para Base44, usuários antigos ainda podem usar o legacy.
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="dark-card rounded-2xl p-4 bg-red-50 border-l-4 border-red-500 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="dark-card rounded-2xl p-4 bg-green-50 border-l-4 border-green-500 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-900">{success}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={checkMigrationStatus}
          variant="outline"
          className="gap-2"
          disabled={loading || migrating}
        >
          <RefreshCw size={18} /> Atualizar Status
        </Button>
        
        <Button
          onClick={() => setShowConfirm(true)}
          className="bg-primary hover:bg-primary/90 gap-2"
          disabled={status.still_on_legacy === 0 || migrating}
        >
          <Users size={18} /> {migrating ? 'Migrando...' : `Migrar Todos (${status.still_on_legacy})`}
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Migração</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a migrar <strong>{status.still_on_legacy} usuários</strong> do sistema legacy para Base44 native auth. Esta ação:
              <ul className="list-disc pl-5 mt-3 space-y-1 text-sm">
                <li>Desativará login via DirectUser para esses usuários</li>
                <li>Criará contas Base44 correspondentes</li>
                <li>Enviará convites para os novos emails</li>
                <li>Mantém histórico original para audit</li>
              </ul>
              <p className="mt-3 font-semibold text-red-600">Não é possível desfazer automaticamente. Prosseguir?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <AlertDialogCancel disabled={migrating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMigrateAll}
              disabled={migrating}
              className="bg-red-600 hover:bg-red-700"
            >
              {migrating ? 'Migrando...' : 'Confirmar Migração'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Phase Documentation */}
      <div className="dark-card rounded-2xl p-4">
        <h4 className="font-semibold mb-3 text-sm">Próximas Fases</h4>
        <div className="space-y-3 text-sm">
          <div>
            <p className="font-semibold text-gray-700">Fase 2: Suporte Dual</p>
            <p className="text-xs text-muted-foreground">DirectUser + Base44 coexistem, novos registros em Base44</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Fase 3: Migração Gradual</p>
            <p className="text-xs text-muted-foreground">Migrar usuários ativos, manter compatibilidade</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Fase 4: Remoção do Legacy</p>
            <p className="text-xs text-muted-foreground">Remover DirectUser, session storage login, funções customizadas</p>
          </div>
        </div>
      </div>
    </div>
  );
}