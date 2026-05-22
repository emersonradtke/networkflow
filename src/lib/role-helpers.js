import { base44 } from '@/api/base44Client';

let rolesCache = null;
let rolesCacheTime = 0;

// Buscar roles do banco de dados com cache
export const loadRoles = async (forceRefresh = false) => {
  const now = Date.now();
  
  // Cache de 5 minutos
  if (!forceRefresh && rolesCache && (now - rolesCacheTime) < 5 * 60 * 1000) {
    return rolesCache;
  }

  try {
    const roles = await base44.entities.Role.list('-created_date', 100);
    rolesCache = roles;
    rolesCacheTime = now;
    return roles;
  } catch (error) {
    console.error('Erro ao carregar roles:', error);
    return rolesCache || [];
  }
};

// Obter role por nome
export const getRoleByName = async (roleName) => {
  const roles = await loadRoles();
  return roles.find(r => r.name === roleName);
};

// Verificar se usuário tem permissão
export const userHasPermission = async (userRole, permission) => {
  const role = await getRoleByName(userRole);
  if (!role) return false;
  return role.permissions?.includes(permission) || false;
};

// Verificar se usuário tem múltiplas permissões
export const userHasPermissions = async (userRole, permissions) => {
  const role = await getRoleByName(userRole);
  if (!role) return false;
  return permissions.every(p => role.permissions?.includes(p) || false);
};

// Obter label do role
export const getRoleLabel = async (roleName) => {
  const role = await getRoleByName(roleName);
  return role?.label || roleName;
};

// Obter cor do role
export const getRoleColor = async (roleName) => {
  const role = await getRoleByName(roleName);
  return role?.color || 'bg-gray-100 text-gray-800';
};

// Obter ícone do role
export const getRoleIcon = async (roleName) => {
  const role = await getRoleByName(roleName);
  return role?.icon || 'Users';
};

// Obter permissões do role
export const getRolePermissions = async (roleName) => {
  const role = await getRoleByName(roleName);
  return role?.permissions || [];
};