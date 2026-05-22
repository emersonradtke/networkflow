// Configuração centralizada de roles e permissões
export const ROLES = {
  ADMIN: 'admin',
  ASSOCIATE: 'associate',
  EMPLOYEE: 'employee',
  GUEST: 'guest',
  FRANCHISE: 'franchise',
  PARTNER: 'partner'
};

export const ROLE_CONFIG = {
  [ROLES.ADMIN]: {
    label: 'Administrador',
    description: 'Acesso total ao sistema',
    color: 'bg-red-100 text-red-800',
    icon: 'Shield',
    permissions: ['all'],
    menuItems: [
      { path: '/admin', label: 'Dashboard', icon: 'LayoutDashboard' },
      { path: '/admin/users', label: 'Usuários', icon: 'Users' },
      { path: '/admin/associates', label: 'Associados', icon: 'User' },
      { path: '/admin/products', label: 'Produtos', icon: 'Package' },
      { path: '/admin/orders', label: 'Pedidos', icon: 'ShoppingBag' },
      { path: '/admin/withdrawals', label: 'Saques', icon: 'Wallet' },
      { path: '/admin/external-links', label: 'Links Externos', icon: 'ExternalLink' },
      { path: '/admin/network', label: 'Rede', icon: 'BarChart3' },
      { path: '/admin/suppliers', label: 'Fornecedores', icon: 'Building2' },
      { path: '/admin/shipping', label: 'Envio', icon: 'Truck' },
      { path: '/admin/settings', label: 'Configurações', icon: 'Settings' }
    ]
  },
  [ROLES.ASSOCIATE]: {
    label: 'Associado',
    description: 'Acesso ao programa de afiliados',
    color: 'bg-blue-100 text-blue-800',
    icon: 'User',
    permissions: ['view_store', 'make_purchases', 'view_network', 'view_wallet', 'view_orders'],
    menuItems: [
      { path: '/dashboard', label: 'Início', icon: 'LayoutDashboard' },
      { path: '/store', label: 'Loja', icon: 'ShoppingBag' },
      { path: '/network', label: 'Minha Rede', icon: 'Users' },
      { path: '/orders', label: 'Meus Pedidos', icon: 'ShoppingBag' },
      { path: '/withdrawals', label: 'Saques', icon: 'ArrowUpCircle' },
      { path: '/notifications', label: 'Notificações', icon: 'Bell' }
    ]
  },
  [ROLES.EMPLOYEE]: {
    label: 'Funcionário',
    description: 'Acesso limitado para gerenciar operações',
    color: 'bg-green-100 text-green-800',
    icon: 'Briefcase',
    permissions: ['view_orders', 'manage_shipping', 'view_products'],
    menuItems: [
      { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
      { path: '/admin/orders', label: 'Pedidos', icon: 'ShoppingBag' },
      { path: '/admin/shipping', label: 'Envio', icon: 'Truck' },
      { path: '/admin/products', label: 'Produtos', icon: 'Package' }
    ]
  },
  [ROLES.GUEST]: {
    label: 'Visitante',
    description: 'Acesso somente leitura',
    color: 'bg-gray-100 text-gray-800',
    icon: 'Eye',
    permissions: ['view_store'],
    menuItems: [
      { path: '/store', label: 'Loja', icon: 'ShoppingBag' }
    ]
  },
  [ROLES.FRANCHISE]: {
    label: 'Franquia',
    description: 'Gerenciamento de entregas e operações de franquia',
    color: 'bg-purple-100 text-purple-800',
    icon: 'Building',
    permissions: ['manage_shipping', 'view_orders', 'view_products'],
    menuItems: [
      { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
      { path: '/admin/orders', label: 'Pedidos', icon: 'ShoppingBag' },
      { path: '/admin/shipping', label: 'Gerenciar Entregas', icon: 'Truck' }
    ]
  },
  [ROLES.PARTNER]: {
    label: 'Parceiro',
    description: 'Gerenciamento de entregas e operações de parceiro',
    color: 'bg-orange-100 text-orange-800',
    icon: 'Handshake',
    permissions: ['manage_shipping', 'view_orders'],
    menuItems: [
      { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
      { path: '/admin/orders', label: 'Pedidos', icon: 'ShoppingBag' },
      { path: '/admin/shipping', label: 'Gerenciar Entregas', icon: 'Truck' }
    ]
  }
};

// Funções auxiliares
export const hasPermission = (userRole, permission) => {
  const config = ROLE_CONFIG[userRole];
  if (!config) return false;
  if (config.permissions.includes('all')) return true;
  return config.permissions.includes(permission);
};

export const canAccessPath = (userRole, path) => {
  const config = ROLE_CONFIG[userRole];
  if (!config) return false;
  return config.menuItems.some(item => item.path === path);
};

export const getRoleLabel = (role) => {
  return ROLE_CONFIG[role]?.label || 'Desconhecido';
};

export const getRoleColor = (role) => {
  return ROLE_CONFIG[role]?.color || 'bg-gray-100 text-gray-800';
};

export const getAvailableMenuItems = (userRole) => {
  return ROLE_CONFIG[userRole]?.menuItems || [];
};