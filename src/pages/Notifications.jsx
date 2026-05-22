import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Bell, CheckCheck, Zap, Wallet, ShoppingBag, Shield, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const iconMap = {
  activation: Shield,
  commission: Wallet,
  withdrawal: Wallet,
  order: ShoppingBag,
  system: Zap,
};

export default function Notifications() {
  const { associate } = useOutletContext();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (associate?.id) loadNotifications();
  }, [associate]);

  const loadNotifications = async () => {
    const notifs = await base44.entities.Notification.filter(
      { associate_id: associate.id }, '-created_date', 30
    );
    setNotifications(notifs);
    setLoading(false);
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    loadNotifications();
  };

  const deleteNotification = async (id) => {
    await base44.entities.Notification.delete(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast.success('Notificação excluída');
  };

  const deleteAll = async () => {
    if (!confirm('Excluir todas as notificações?')) return;
    await Promise.all(notifications.map(n => base44.entities.Notification.delete(n.id)));
    setNotifications([]);
    toast.success('Todas as notificações foram excluídas');
  };

  const colorMap = {
    activation: 'text-green-400 bg-green-400/10',
    commission: 'text-yellow-400 bg-yellow-400/10',
    withdrawal: 'text-blue-400 bg-blue-400/10',
    order: 'text-purple-400 bg-purple-400/10',
    system: 'text-muted-foreground bg-secondary',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Notificações</h1>
          <p className="text-muted-foreground text-sm mt-1">Suas atualizações recentes</p>
        </div>
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.is_read) && (
            <Button variant="ghost" size="sm" className="text-primary gap-1.5" onClick={markAllRead}>
              <CheckCheck size={14} /> Marcar todas como lidas
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" className="text-red-500 gap-1.5" onClick={deleteAll}>
              <Trash2 size={14} /> Excluir todas
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 dark-card rounded-xl animate-pulse" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell size={40} className="text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhuma notificação ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const Icon = iconMap[n.type] || Zap;
            const colors = colorMap[n.type] || colorMap.system;
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                  n.is_read ? 'border-border bg-surface opacity-60' : 'border-primary/20 bg-primary/5'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${colors}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${n.is_read ? 'text-muted-foreground' : 'text-foreground'}`}>{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                </div>
                {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
                <button
                  onClick={() => deleteNotification(n.id)}
                  className="text-muted-foreground hover:text-red-500 transition-colors shrink-0 p-1"
                  title="Excluir notificação"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}