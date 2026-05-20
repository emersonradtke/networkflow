import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  LayoutDashboard, ShoppingBag, Users, Wallet, Bell, Settings,
  LogOut, Menu, X, ChevronRight, Shield, Package, BarChart3, UserCheck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function Layout() {
  const [user, setUser] = useState(null);
  const [associate, setAssociate] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const me = await base44.auth.me();
    setUser(me);
    if (me) {
      const associates = await base44.entities.Associate.filter({ user_id: me.id });
      if (associates.length > 0) setAssociate(associates[0]);
      const notifs = await base44.entities.Notification.filter({ associate_id: me.id, is_read: false });
      setUnreadCount(notifs.length);
    }
  };

  const isAdmin = user?.role === 'admin';

  const adminNav = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/associates', label: 'Associados', icon: Users },
    { path: '/admin/products', label: 'Produtos', icon: Package },
    { path: '/admin/orders', label: 'Pedidos', icon: ShoppingBag },
    { path: '/admin/withdrawals', label: 'Saques', icon: Wallet },
    { path: '/admin/network', label: 'Rede', icon: BarChart3 },
    { path: '/admin/settings', label: 'Configurações', icon: Settings },
  ];

  const userNav = [
    { path: '/dashboard', label: 'Início', icon: LayoutDashboard },
    { path: '/store', label: 'Loja', icon: ShoppingBag },
    { path: '/network', label: 'Minha Rede', icon: Users },
    { path: '/wallet', label: 'Carteira', icon: Wallet },
    { path: '/notifications', label: 'Notificações', icon: Bell, badge: unreadCount },
  ];

  const navItems = isAdmin ? adminNav : userNav;

  const NavLink = ({ item }) => {
    const Icon = item.icon;
    const active = location.pathname === item.path;
    return (
      <Link
        to={item.path}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
          active
            ? 'bg-primary/15 text-primary border border-primary/20'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
        }`}
      >
        <Icon size={18} className={active ? 'text-primary' : 'group-hover:text-foreground'} />
        <span className="font-medium text-sm">{item.label}</span>
        {item.badge > 0 && (
          <Badge className="ml-auto bg-primary text-primary-foreground text-xs px-1.5 py-0.5 min-w-[20px] text-center">
            {item.badge}
          </Badge>
        )}
        {active && <ChevronRight size={14} className="ml-auto text-primary" />}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-surface fixed inset-y-0 left-0 z-30">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 gold-gradient rounded-lg flex items-center justify-center">
              <span className="text-xs font-black text-background">BL</span>
            </div>
            <div>
              <span className="font-black text-foreground text-lg tracking-tight">Bold Life</span>
              {isAdmin && <div className="flex items-center gap-1"><Shield size={10} className="text-primary" /><span className="text-xs text-primary font-medium">Admin</span></div>}
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(item => <NavLink key={item.path} item={item} />)}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 gold-gradient rounded-full flex items-center justify-center text-sm font-bold text-background">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{user?.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground gap-2"
            onClick={() => base44.auth.logout()}
          >
            <LogOut size={14} /> Sair
          </Button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 bg-surface border-r border-border flex flex-col h-full">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 gold-gradient rounded-lg flex items-center justify-center">
                  <span className="text-xs font-black text-background">BL</span>
                </div>
                <span className="font-black text-foreground text-lg">Bold Life</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                <X size={18} />
              </Button>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {navItems.map(item => <NavLink key={item.path} item={item} />)}
            </nav>
            <div className="p-4 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground gap-2"
                onClick={() => base44.auth.logout()}
              >
                <LogOut size={14} /> Sair
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-20 bg-surface/90 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </Button>
            <span className="font-black text-foreground">Bold Life</span>
          </div>
          <Link to="/notifications" className="relative">
            <Bell size={20} className="text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full text-xs text-primary-foreground flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </Link>
        </header>

        <div className="flex-1 p-4 lg:p-8">
          <Outlet context={{ user, associate, reloadUser: loadUser }} />
        </div>
      </main>
    </div>
  );
}